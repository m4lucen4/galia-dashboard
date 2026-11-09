-- Requires generation001 and the project authority guard002. No base-table
-- policies, assignment permissions, publication workflows or data are changed.
begin;

-- One predicate for current generation authority. The admin historical-read
-- exception is preserved; mutation RPCs additionally require an extant project
-- and the original owner snapshot. Never expose an arbitrary-actor oracle.
create function private.publication_generation_authorized(
  p_actor uuid, p_project bigint, p_owner uuid
) returns boolean language sql stable security definer set search_path = '' as $$
  select p_actor is not null and (
    exists (select 1 from public."userData" u where u.uid = p_actor and u.role = 'admin')
    or exists (
      select 1 from public.projects p where p.id = p_project and p."user" = p_owner
        and (p."user" = p_actor or p.assigned = p_actor)
    )
  );
$$;
revoke all on function private.publication_generation_authorized(uuid, bigint, uuid)
  from public, anon, authenticated, service_role;

create or replace function public.publication_generation_can_read(p_project bigint, p_owner uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.publication_generation_authorized(auth.uid(), p_project, p_owner);
$$;
revoke all on function public.publication_generation_can_read(bigint, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.publication_generation_can_read(bigint, uuid) to authenticated;

create or replace function public.publication_generation_start(
  p_actor uuid, p_project bigint, p_action text, p_request uuid,
  p_job uuid, p_model text, p_prompt_version text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_project jsonb;
  v_owner uuid;
  v_job public.publication_generation_jobs%rowtype;
  v_receipt public.publication_generation_requests%rowtype;
  v_snapshot jsonb;
  v_total numeric;
begin
  perform pg_advisory_xact_lock(740219, 1);
  if p_actor is null or p_project is null or p_project <= 0 or p_request is null
    or p_action is null or p_action not in ('start', 'retry_failed')
    or (p_action = 'start' and p_job is not null)
    or (p_action = 'retry_failed' and p_job is null) then
    raise exception 'invalid_request';
  end if;
  select to_jsonb(p), p."user" into v_project, v_owner
    from public.projects p where p.id = p_project for update;
  -- Authorization precedes receipts, active-job reuse and retry no-ops.
  if v_project is null or not private.publication_generation_authorized(p_actor, p_project, v_owner) then
    raise exception 'forbidden';
  end if;

  select * into v_receipt from public.publication_generation_requests
    where actor_id = p_actor and request_id = p_request;
  if found then
    if v_receipt.project_id <> p_project or v_receipt.action <> p_action
      or (p_action = 'retry_failed' and v_receipt.job_id <> p_job) then
      raise exception 'conflict';
    end if;
    select * into v_job from public.publication_generation_jobs where id = v_receipt.job_id for update;
    if v_job.owner_id is distinct from v_owner then raise exception 'project_changed'; end if;
    return public.publication_generation_summary(v_job.id);
  end if;

  if p_action = 'start' then
    select * into v_job from public.publication_generation_jobs
      where project_id = p_project and status in ('queued', 'running') for update;
    if found then
      if v_job.owner_id is distinct from v_owner then raise exception 'project_changed'; end if;
      insert into public.publication_generation_requests values (p_actor, p_request, p_project, p_action, v_job.id);
      return public.publication_generation_summary(v_job.id);
    end if;
  else
    select * into v_job from public.publication_generation_jobs where id = p_job and project_id = p_project for update;
    if not found then raise exception 'conflict'; end if;
    if v_job.owner_id is distinct from v_owner then raise exception 'project_changed'; end if;
    if v_job.status in ('queued', 'running', 'succeeded') then
      insert into public.publication_generation_requests values (p_actor, p_request, p_project, p_action, v_job.id);
      return public.publication_generation_summary(v_job.id);
    end if;
    if exists (select 1 from public.publication_generation_jobs where project_id = p_project and status in ('queued', 'running')) then
      raise exception 'conflict';
    end if;
    if v_job.retry_count >= 2 or not exists (
      select 1 from public.publication_generation_slots where job_id = p_job and state = 'failed' and retryable
    ) then raise exception 'retry_exhausted'; end if;
  end if;

  -- Replays above remain available during an outage, but only to current actors.
  if p_model is null or p_prompt_version is null or not exists (
    select 1 from public.publication_generation_readiness
    where singleton and last_seen > clock_timestamp() - interval '3 minutes'
      and model = p_model and prompt_version = p_prompt_version
  ) then raise exception 'not_ready'; end if;

  if p_action = 'start' then
    v_total := (v_project->>'publications')::numeric;
    if v_owner is null or v_total is null or v_total < 1 or v_total > 4 or v_total <> trunc(v_total) then
      raise exception 'invalid_project';
    end if;
    v_snapshot := jsonb_build_object(
      'title', coalesce(v_project->>'title', ''),
      'description', coalesce(v_project->>'description', ''),
      'requiredAI', coalesce((v_project->>'requiredAI')::boolean, false),
      'prompt', coalesce(v_project->>'prompt', ''),
      'keywords', coalesce(v_project->>'keywords', ''),
      'weblink', coalesce(v_project->>'weblink', ''),
      'image_data', coalesce(nullif(v_project->'image_data', 'null'::jsonb), '[]'::jsonb),
      'projectCollaborators', coalesce(nullif(v_project->'projectCollaborators', 'null'::jsonb), '[]'::jsonb)
    );
    if (v_snapshot->>'title') !~ '[^[:space:]]' or (v_snapshot->>'description') !~ '[^[:space:]]'
      or length(v_snapshot->>'description') > 30000 or length(v_snapshot->>'prompt') > 10000
      or length(v_snapshot->>'title') > 1000 or length(v_snapshot->>'keywords') > 4000
      or length(v_snapshot->>'weblink') > 4000
      or jsonb_typeof(v_snapshot->'image_data') <> 'array'
      or jsonb_typeof(v_snapshot->'projectCollaborators') <> 'array' then
      raise exception 'invalid_project';
    end if;
    if jsonb_array_length(v_snapshot->'projectCollaborators') > 100 or exists (
      select 1 from jsonb_array_elements(v_snapshot->'projectCollaborators') c
      where jsonb_typeof(c) <> 'object' or jsonb_typeof(c->'name') is distinct from 'string'
        or jsonb_typeof(c->'profession') is distinct from 'string'
        or length(c->>'name') > 1000 or length(c->>'profession') > 100
    ) then raise exception 'invalid_project'; end if;
    insert into public.publication_generation_jobs(project_id, owner_id, actor_id, snapshot, requested_model, prompt_version, total)
      values (p_project, v_owner, p_actor, v_snapshot, p_model, p_prompt_version, v_total::smallint)
      returning * into v_job;
    insert into public.publication_generation_slots(job_id, slot)
      select v_job.id, n from generate_series(1, v_total::integer) n;
  else
    update public.publication_generation_slots set state = 'queued', cycle_attempts = 0,
      error_code = null, retryable = false, available_at = clock_timestamp(), updated_at = clock_timestamp()
      where job_id = p_job and state = 'failed' and retryable;
    update public.publication_generation_jobs set retry_count = retry_count + 1 where id = p_job;
  end if;
  insert into public.publication_generation_requests values (p_actor, p_request, p_project, p_action, v_job.id);
  perform public.publication_generation_refresh(v_job.id);
  return public.publication_generation_summary(v_job.id);
end;
$$;

create or replace function public.publication_generation_claim()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_candidate public.publication_generation_jobs%rowtype;
  v_job public.publication_generation_jobs%rowtype;
  v_slot public.publication_generation_slots%rowtype;
  v_owner uuid;
begin
  perform pg_advisory_xact_lock(740219, 1);
  -- Revoked initiating actors are fenced in the same bounded sweep as deletions.
  for v_candidate in select * from public.publication_generation_jobs
    where status in ('queued', 'running') order by updated_at, id limit 20
  loop
    v_owner := null;
    select p."user" into v_owner from public.projects p where p.id = v_candidate.project_id for update;
    select * into v_job from public.publication_generation_jobs where id = v_candidate.id for update;
    if v_owner is distinct from v_job.owner_id
      or not private.publication_generation_authorized(v_job.actor_id, v_job.project_id, v_job.owner_id) then
      update public.publication_generation_slots set state = 'failed', error_code = 'project_changed',
        retryable = false, lease_token = null, lease_until = null, updated_at = clock_timestamp()
        where job_id = v_job.id and state in ('queued', 'running');
      perform public.publication_generation_refresh(v_job.id);
      continue;
    end if;
    update public.publication_generation_slots set
      state = case when cycle_attempts < 3 then 'queued' else 'failed' end,
      error_code = case when cycle_attempts < 3 then null else 'lease_expired' end,
      retryable = cycle_attempts >= 3 and v_job.retry_count < 2,
      lease_token = null, lease_until = null, available_at = clock_timestamp(), updated_at = clock_timestamp()
      where job_id = v_job.id and state = 'running' and lease_until <= clock_timestamp();
    select * into v_slot from public.publication_generation_slots
      where job_id = v_job.id and state = 'queued' and available_at <= clock_timestamp()
      order by slot limit 1 for update;
    if found then
      update public.publication_generation_slots set state = 'running', attempts = attempts + 1,
        cycle_attempts = cycle_attempts + 1, lease_token = gen_random_uuid(),
        lease_until = clock_timestamp() + interval '120 seconds', updated_at = clock_timestamp()
        where job_id = v_job.id and slot = v_slot.slot returning * into v_slot;
      perform public.publication_generation_refresh(v_job.id);
      return jsonb_build_object('jobId', v_job.id, 'slot', v_slot.slot,
        'leaseToken', v_slot.lease_token, 'snapshot', v_job.snapshot,
        'model', v_job.requested_model, 'promptVersion', v_job.prompt_version);
    end if;
    perform public.publication_generation_refresh(v_job.id);
  end loop;
  return null;
end;
$$;

create or replace function public.publication_generation_finish(
  p_job uuid, p_slot integer, p_token uuid,
  p_description text, p_actual_model text, p_error text
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_job public.publication_generation_jobs%rowtype;
  v_slot public.publication_generation_slots%rowtype;
  v_owner uuid;
  v_project bigint;
  v_preview bigint;
begin
  perform pg_advisory_xact_lock(740219, 1);
  select project_id into v_project from public.publication_generation_jobs where id = p_job;
  if not found then return false; end if;
  select p."user" into v_owner from public.projects p where p.id = v_project for update;
  select * into v_job from public.publication_generation_jobs where id = p_job for update;
  select * into v_slot from public.publication_generation_slots where job_id = p_job and slot = p_slot for update;
  if not found or v_slot.state <> 'running' or v_slot.lease_token is distinct from p_token
    or v_slot.lease_until <= clock_timestamp() then return false; end if;
  if v_owner is distinct from v_job.owner_id
    or not private.publication_generation_authorized(v_job.actor_id, v_job.project_id, v_job.owner_id) then
    update public.publication_generation_slots set state = 'failed', error_code = 'project_changed',
      retryable = false, lease_token = null, lease_until = null, updated_at = clock_timestamp()
      where job_id = p_job and state in ('queued', 'running');
    perform public.publication_generation_refresh(p_job);
    return false;
  end if;
  if p_error is not null then
    if p_error not in ('provider_unavailable', 'provider_refusal', 'invalid_response', 'invalid_project', 'internal_error') then
      raise exception 'invalid_request';
    end if;
    update public.publication_generation_slots set
      state = case when p_error = 'provider_unavailable' and cycle_attempts < 3 then 'queued' else 'failed' end,
      error_code = p_error, retryable = p_error <> 'invalid_project' and v_job.retry_count < 2,
      lease_token = null, lease_until = null, available_at = clock_timestamp() + interval '30 seconds' * cycle_attempts,
      updated_at = clock_timestamp() where job_id = p_job and slot = p_slot;
  else
    if p_description is null or btrim(p_description) = '' or length(p_description) > 150000
      or ((v_job.snapshot->>'requiredAI')::boolean and (p_actual_model is null or btrim(p_actual_model) = ''))
      or length(p_actual_model) > 200 then raise exception 'invalid_response'; end if;
    insert into public."projectsPreview"(project_id, "user", title, state, description_rich, weblink, image_data, versions)
      values (v_job.project_id, v_job.owner_id, v_job.snapshot->>'title', 'preview', p_description,
        v_job.snapshot->>'weblink', v_job.snapshot->'image_data',
        jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'description', p_description, 'main', true)))
      returning id into v_preview;
    update public.publication_generation_slots set state = 'succeeded', preview_id = v_preview,
      actual_model = p_actual_model, error_code = null, retryable = false,
      lease_token = null, lease_until = null, updated_at = clock_timestamp()
      where job_id = p_job and slot = p_slot;
    update public.projects set state = 'preview' where id = v_job.project_id;
  end if;
  perform public.publication_generation_refresh(p_job);
  return true;
end;
$$;

revoke all on function public.publication_generation_start(uuid, bigint, text, uuid, uuid, text, text),
  public.publication_generation_claim(),
  public.publication_generation_finish(uuid, integer, uuid, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.publication_generation_start(uuid, bigint, text, uuid, uuid, text, text),
  public.publication_generation_claim(),
  public.publication_generation_finish(uuid, integer, uuid, text, text, text) to service_role;

-- Narrow current-user listing, not a new general preview policy. Owned legacy
-- rows remain visible even with missing/mismatched parents. Assigned-only rows
-- require a current parent and matching owner; never fetch unrelated rows first.
create function public.preview_projects_for_current_user()
returns setof public."projectsPreview"
language sql stable security definer set search_path = '' as $$
  select preview.* from public."projectsPreview" preview
  where auth.uid() is not null and (
    preview."user" = auth.uid()
    or exists (
      select 1 from public.projects p where p.id = preview.project_id
        and p.assigned = auth.uid() and p."user" = preview."user"
    )
  );
$$;
revoke all on function public.preview_projects_for_current_user()
  from public, anon, authenticated, service_role;
grant execute on function public.preview_projects_for_current_user() to authenticated;

notify pgrst, 'reload schema';
commit;
