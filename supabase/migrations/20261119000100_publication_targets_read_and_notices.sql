-- Phase 5 server (T7): browser read access, realtime and failure notices for publication targets.
--
-- Apply BEFORE the client that reads publication_targets ships. Nothing here changes what n8n reads
-- or writes, and nothing calls these objects until the client switch (VITE_SOCIAL_PUBLISHING_EDGE) is on.
--
-- 1. Read access. The people who may read a publication (admin, owner, project owner or assigned editor:
--    the projectsPreview rule, private.preview_access_allowed) may read its targets through RLS. They get
--    SELECT only, and only on the columns the client uses (column grants; no table-level SELECT, so
--    lease_token, lease_expires_at, step, step_state, diagnostics, owner_id, requested_by and the notice
--    columns are never readable and `select *` is refused). publication_target_attempts is NOT readable
--    from the browser (the client never reads it). Every write stays service_role only.
-- 2. Realtime. publication_targets joins the supabase_realtime publication (when it exists) so cards
--    update live. publication_target_attempts does not.
-- 3. Failure notices. publication_target_claim_notice returns the email recipient once per new terminal
--    problem status (needs_action | failed) of a current target, publication_target_release_notice gives it
--    back when the email could not be sent, publication_targets_notice_due lists the targets whose notice is
--    still owed and due (retry after a failed send, lease recovery that ended in needs_action). A failed
--    send is retried with backoff (1, 5, 15, 60 minutes, then every 6 hours) and given up after 8 attempts
--    (notice_attempts / notice_next_at). Notices are reset by a trigger whenever the target leaves
--    needs_action/failed or changes terminal status (retry, publish, new schedule).
-- 4. publication_targets_owner: authorizes the actor and returns the publication owner, so the entry
--    function can validate the requested accounts against the OWNER's connections only after the actor
--    proved access (a stranger gets forbidden, never information about connections).
begin;
set local lock_timeout = '5s';

do $$
begin
  if to_regclass('public.publication_targets') is null
    or to_regclass('public.publication_target_attempts') is null then
    raise exception 'Publication targets tables missing (apply 20261118000100 first)';
  end if;
  if to_regprocedure('private.preview_access_allowed(uuid,bigint)') is null
    or to_regprocedure('private.publication_targets_authorized(uuid,uuid,bigint)') is null then
    raise exception 'Authorization helpers missing (apply 20261118000100 and 20261118000200 first)';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. RLS read
-- ---------------------------------------------------------------------------

-- Reads the preview row as its owner (the policy must not depend on the caller's own projectsPreview
-- visibility) and applies the caller-bound rule (auth.uid()). Never NULL.
create function private.publication_target_preview_readable(p_preview bigint)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select private.preview_access_allowed(p."user", p.project_id)
    from public."projectsPreview" p where p.id = p_preview
  ), false);
$$;

create function private.publication_attempt_readable(p_target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select private.publication_target_preview_readable(t.preview_id)
    from public.publication_targets t where t.id = p_target
  ), false);
$$;

create policy "publication_targets_select_authorized" on public.publication_targets
  for select to authenticated
  using (private.publication_target_preview_readable(preview_id));

create policy "publication_target_attempts_select_authorized" on public.publication_target_attempts
  for select to authenticated
  using (private.publication_attempt_readable(target_id));

-- Column grants, no table-level SELECT. The policy helpers read the tables as their owner.
revoke select on table public.publication_targets from authenticated;
revoke select on table public.publication_target_attempts from authenticated;
grant select (
  id, preview_id, network, status, run_at, attempts, max_attempts, error_code, error_kind,
  account_kind, account_name, external_post_id, permalink, published_at, archived_at, updated_at
) on table public.publication_targets to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Realtime
-- ---------------------------------------------------------------------------

do $$
begin
  -- Plain Postgres (tests) has no such publication; a FOR ALL TABLES one already includes the table.
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime' and not puballtables)
    and not exists (select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'publication_targets') then
    alter publication supabase_realtime add table public.publication_targets;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Failure notices
-- ---------------------------------------------------------------------------

alter table public.publication_targets
  add column notified_status text,
  add column notified_at timestamptz,
  add constraint publication_targets_notified_status_check
    check (notified_status is null or notified_status in ('needs_action', 'failed')),
  add constraint publication_targets_notified_pair_check
    check ((notified_status is null) = (notified_at is null));

-- Retry bookkeeping of a notice whose send failed: how many sends failed for the current terminal status
-- and when the next one may be tried (null = now). Reset together with the notice.
alter table public.publication_targets
  add column notice_attempts integer not null default 0,
  add column notice_next_at timestamptz,
  add constraint publication_targets_notice_attempts_check check (notice_attempts >= 0);

create index publication_targets_notice_due
  on public.publication_targets (notice_next_at nulls first, updated_at)
  where archived_at is null and status in ('needs_action', 'failed');

-- The notice belongs to one terminal status: any other status (retry -> pending, running, published)
-- clears it, so the next failure notifies again. A change of status also restarts the send backoff.
-- Runs for every writer, including the existing RPCs.
create function private.publication_targets_reset_notice()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status not in ('needs_action', 'failed') then
    new.notified_status := null;
    new.notified_at := null;
  end if;
  if new.status is distinct from old.status then
    new.notice_attempts := 0;
    new.notice_next_at := null;
  end if;
  return new;
end;
$$;

create trigger publication_targets_reset_notice
  before update on public.publication_targets
  for each row execute function private.publication_targets_reset_notice();

-- Failures that already exist when this migration is applied are not emailed (same rule as the
-- social connections backfill): only new problems notify.
update public.publication_targets set notified_status = status, notified_at = clock_timestamp()
  where status in ('needs_action', 'failed') and notified_status is null;

-- Claims the right to email the publication owner about the current terminal status of a target,
-- once per status. Returns the recipient, or null when nothing is due (not terminal, archived,
-- already notified, backing off after a failed send, or the owner has no email: that case is closed as
-- notified because there is nobody to write to). The owner is the recipient because reconnecting an
-- account is theirs to do.
create function public.publication_target_claim_notice(p_target uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_target public.publication_targets;
  v_user record;
  v_title text;
begin
  if p_target is null then raise exception 'invalid_request'; end if;
  select * into v_target from public.publication_targets t where t.id = p_target for update;
  if not found or v_target.archived_at is not null or v_target.status not in ('needs_action', 'failed')
    or v_target.notified_status is not distinct from v_target.status
    or coalesce(v_target.notice_next_at > clock_timestamp(), false) then
    return null;
  end if;
  update public.publication_targets set notified_status = status, notified_at = clock_timestamp()
    where id = p_target;
  select u.email, u.first_name, u.language into v_user
    from public."userData" u where u.uid = v_target.owner_id;
  if not found or coalesce(btrim(v_user.email), '') = '' then return null; end if;
  select p.title into v_title from public."projectsPreview" p where p.id = v_target.preview_id;
  return jsonb_build_object('email', v_user.email, 'firstName', v_user.first_name, 'language', v_user.language,
    'network', v_target.network, 'status', v_target.status, 'errorCode', v_target.error_code,
    'previewId', v_target.preview_id, 'title', v_title);
end;
$$;

-- Gives the notice back when the email could not be sent (a transient failure: mail service down,
-- 408/429/5xx, network). Only while the claim still matches p_status (a newer terminal status keeps its
-- own claim). Each release counts an attempt and delays the next one: 1, 5, 15, 60 minutes, then 6 hours.
-- After 8 failed attempts the notice is given up: the claim stays closed (notified) and nothing is
-- sent for this status any more. Returns true only when the notice is owed again (released for a retry).
-- A permanent failure (the mail service refuses this email) is NOT released: the worker leaves the claim.
create function public.publication_target_release_notice(p_target uuid, p_status text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_attempts integer;
begin
  if p_target is null or p_status is null then raise exception 'invalid_request'; end if;
  select t.notice_attempts + 1 into v_attempts from public.publication_targets t
    where t.id = p_target and t.notified_status = p_status for update;
  if v_attempts is null then return false; end if;
  if v_attempts >= 8 then
    update public.publication_targets set notice_attempts = v_attempts, notice_next_at = null where id = p_target;
    return false;
  end if;
  update public.publication_targets set notified_status = null, notified_at = null, notice_attempts = v_attempts,
    notice_next_at = clock_timestamp() + case v_attempts
      when 1 then interval '1 minute' when 2 then interval '5 minutes' when 3 then interval '15 minutes'
      when 4 then interval '1 hour' else interval '6 hours' end
    where id = p_target;
  return true;
end;
$$;

-- Targets whose notice is still owed and due: a send that failed (released, once its backoff has passed)
-- or a terminal status reached without the worker finishing it (lease recovery). Only recent problems:
-- anything older than 3 days is history and is never emailed. Targets never tried (notice_next_at null)
-- come first, so a target whose sends keep failing cannot starve the others; then the oldest.
create function public.publication_targets_notice_due(p_limit integer)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if p_limit is null or p_limit not between 1 and 100 then raise exception 'invalid_request'; end if;
  return (select coalesce(jsonb_agg(d.id order by d.notice_next_at nulls first, d.updated_at), '[]'::jsonb) from (
    select t.id, t.notice_next_at, t.updated_at from public.publication_targets t
    where t.archived_at is null and t.status in ('needs_action', 'failed')
      and t.notified_status is distinct from t.status
      and t.updated_at > clock_timestamp() - interval '3 days'
      and (t.notice_next_at is null or t.notice_next_at <= clock_timestamp())
    order by t.notice_next_at nulls first, t.updated_at limit p_limit) d);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Authorize and resolve the owner (entry function)
-- ---------------------------------------------------------------------------

-- Returns the owner of a publication the actor may act on. Unknown and foreign publications are
-- both 'forbidden'; a publication without owner cannot publish ('invalid_project', like schedule).
create function public.publication_targets_owner(p_actor uuid, p_preview bigint)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare
  v_preview record;
begin
  if p_actor is null or p_preview is null then raise exception 'invalid_request'; end if;
  select p."user", p.project_id into v_preview from public."projectsPreview" p where p.id = p_preview;
  if not found or not private.publication_targets_authorized(p_actor, v_preview."user", v_preview.project_id) then
    raise exception 'forbidden';
  end if;
  if v_preview."user" is null then raise exception 'invalid_project'; end if;
  return v_preview."user";
end;
$$;

-- ---------------------------------------------------------------------------
-- Ownership and grants
-- ---------------------------------------------------------------------------

do $$
declare
  v_fn text;
begin
  foreach v_fn in array array[
    'private.publication_target_preview_readable(bigint)',
    'private.publication_attempt_readable(uuid)',
    'private.publication_targets_reset_notice()',
    'public.publication_target_claim_notice(uuid)',
    'public.publication_target_release_notice(uuid,text)',
    'public.publication_targets_notice_due(integer)',
    'public.publication_targets_owner(uuid,bigint)'
  ] loop
    execute format('alter function %s owner to postgres', v_fn);
    execute format('revoke all on function %s from public, anon, authenticated, service_role', v_fn);
    if v_fn like 'public.%' then
      execute format('grant execute on function %s to service_role', v_fn);
    end if;
  end loop;
  -- The RLS policies call these as the browser role.
  grant execute on function private.publication_target_preview_readable(bigint) to authenticated;
  grant execute on function private.publication_attempt_readable(uuid) to authenticated;
end;
$$;

notify pgrst, 'reload schema';
commit;
