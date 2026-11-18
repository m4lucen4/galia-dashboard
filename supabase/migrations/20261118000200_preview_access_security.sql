-- Restrict projectsPreview (publications) to the people who may work on them.
--
-- Before: any authenticated user could read, edit and delete every publication
-- (policies qualified only by auth.role() = 'authenticated'), and the shared
-- publication authorization helper returned NULL instead of false for a stranger
-- on a publication without owner.
--
-- After, through the browser (authenticated role):
--   read / edit : admin, publication owner, or the owner / assigned editor of its project
--                 (same rule as publication generation and iteration)
--   delete      : admin or publication owner (the UI already restricts it this way)
--   insert      : nobody (publications are created by service-side RPCs and n8n)
--   owner / project of a publication can only be changed by an admin.
-- service_role (Edge Functions, n8n) bypasses RLS and is unaffected.
begin;
set local lock_timeout = '5s';

do $$
begin
  if to_regprocedure('private.publication_generation_authorized(uuid,bigint,uuid)') is null
    or to_regprocedure('private.current_user_is_admin()') is null then
    raise exception 'Authorization helpers missing';
  end if;
end;
$$;

-- Null-safe: "not NULL" skipped the forbidden branch in callers such as
-- publication_iteration_begin. Signature, owner and grants are unchanged.
create or replace function private.publication_iteration_authorized(
  p_actor uuid, p_preview_owner uuid, p_project bigint
) returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(p_actor is not null and (
    p_preview_owner = p_actor
    or exists (select 1 from public."userData" u where u.uid = p_actor and u.role = 'admin')
    or (p_project is not null and private.publication_generation_authorized(p_actor, p_project, p_preview_owner))
  ), false);
$$;

-- Policy helper bound to the caller's own identity (no arbitrary actor argument).
create function private.preview_access_allowed(p_owner uuid, p_project bigint)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.publication_iteration_authorized(auth.uid(), p_owner, p_project);
$$;
alter function private.preview_access_allowed(uuid, bigint) owner to postgres;
revoke all on function private.preview_access_allowed(uuid, bigint) from public, anon, authenticated, service_role;
grant execute on function private.preview_access_allowed(uuid, bigint) to authenticated;

drop policy if exists "users can see projects" on public."projectsPreview";
drop policy if exists "user can edit preview project" on public."projectsPreview";
drop policy if exists "user can delete preview project" on public."projectsPreview";

create policy "preview_select_authorized" on public."projectsPreview"
  for select to authenticated
  using (private.preview_access_allowed("user", project_id));

create policy "preview_update_authorized" on public."projectsPreview"
  for update to authenticated
  using (private.preview_access_allowed("user", project_id))
  with check (private.preview_access_allowed("user", project_id));

create policy "preview_delete_owner_or_admin" on public."projectsPreview"
  for delete to authenticated
  using ("user" = auth.uid() or private.current_user_is_admin());

-- An assigned editor must not be able to take over a publication by rewriting
-- its owner or project. Service-side code (SECURITY DEFINER, service_role) is not
-- the authenticated role and is not affected. SECURITY INVOKER on purpose: current_user
-- must be the caller's role, not the function owner.
create function private.guard_preview_ownership()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  -- Nested on purpose: SQL does not guarantee AND evaluation order, and other roles
  -- (service_role) may not execute current_user_is_admin().
  if current_user = 'authenticated'
    and (new."user" is distinct from old."user" or new.project_id is distinct from old.project_id)
  then
    if not private.current_user_is_admin() then
      raise exception 'Only an admin can change the owner or project of a publication'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
alter function private.guard_preview_ownership() owner to postgres;
revoke all on function private.guard_preview_ownership() from public, anon, authenticated, service_role;

create trigger guard_preview_ownership
  before update of "user", project_id on public."projectsPreview"
  for each row execute function private.guard_preview_ownership();

-- The browser never needs anonymous access, nor TRUNCATE/TRIGGER/REFERENCES.
revoke all on table public."projectsPreview" from anon;
revoke truncate, trigger, references on table public."projectsPreview" from authenticated;

notify pgrst, 'reload schema';
commit;
