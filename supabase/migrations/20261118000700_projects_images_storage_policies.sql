-- projects-images: only people who may edit a project can write its images.
--
-- Before: any authenticated user could upload or overwrite any object of the bucket
-- (insert/update policies checked only bucket_id), and nobody could delete objects
-- from the browser (no delete policy, so project deletion left orphans).
--
-- Paths are "<projectId>/<file>" (src/redux/actions/ProjectActions.ts). After this
-- migration, insert / update / delete / select through the API require the first folder
-- to be an existing project whose owner or assigned editor is the caller, or an admin.
-- Public reads through the public URL are unchanged (public bucket). service_role
-- (Edge Functions) bypasses RLS and is unaffected.
begin;
set local lock_timeout = '5s';

create function private.project_image_path_allowed(p_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  v_project bigint;
  v_match text[];
begin
  v_match := regexp_match(coalesce(p_name, ''), '^([1-9][0-9]{0,17})/[^/]+$');
  if v_match is null then return false; end if;
  v_project := v_match[1]::bigint;
  return coalesce(
    private.current_user_is_admin()
    or exists (
      select 1 from public.projects p
      where p.id = v_project and auth.uid() is not null
        and (p."user" = auth.uid() or p.assigned = auth.uid())
    ), false);
end;
$$;
alter function private.project_image_path_allowed(text) owner to postgres;
revoke all on function private.project_image_path_allowed(text) from public, anon, authenticated, service_role;
grant execute on function private.project_image_path_allowed(text) to authenticated;

drop policy if exists "user can upload images to bucket 159r3fv_0" on storage.objects;
drop policy if exists "use can edit images 159r3fv_0" on storage.objects;

create policy "projects_images_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'projects-images' and private.project_image_path_allowed(name));
create policy "projects_images_update" on storage.objects for update to authenticated
  using (bucket_id = 'projects-images' and private.project_image_path_allowed(name))
  with check (bucket_id = 'projects-images' and private.project_image_path_allowed(name));
create policy "projects_images_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'projects-images' and private.project_image_path_allowed(name));
create policy "projects_images_select" on storage.objects for select to authenticated
  using (bucket_id = 'projects-images' and private.project_image_path_allowed(name));

commit;
