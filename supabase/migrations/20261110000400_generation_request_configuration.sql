-- Forward-only request configuration. Requires the applied config foundation,
-- assigned-editor authorization and v2 readiness migrations. No backfill.
begin;

alter table public.publication_generation_jobs add column config_id uuid
  references public.publication_generation_configs(id) on delete set null;
create unique index publication_generation_job_config
  on public.publication_generation_jobs(config_id) where config_id is not null;
-- Content-free request fingerprint; null identifies legacy receipts and retries.
alter table public.publication_generation_requests add column configuration jsonb;
-- Configs remain inaccessible to API roles. SECURITY DEFINER is the only writer;
-- the dashboard needs job summaries, not another snapshot-reading policy.
comment on table public.publication_generation_configs is
  'Immutable per-generation settings, created atomically by the service-only start RPC; no historical backfill.';

create function public.publication_generation_start(
  p_actor uuid, p_project bigint, p_action text, p_request uuid,
  p_job uuid, p_model text, p_prompt_version text, p_configuration jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_project jsonb;
  v_owner uuid;
  v_job public.publication_generation_jobs%rowtype;
  v_receipt public.publication_generation_requests%rowtype;
  v_snapshot jsonb;
  v_total numeric;
  v_ai boolean;
  v_prompt_id bigint;
  v_prompt text;
  v_config uuid;
  v_active_configuration jsonb;
  v_active_prompt text;
begin
  perform pg_advisory_xact_lock(740219, 1);
  if p_actor is null or p_project is null or p_project <= 0 or p_request is null
    or p_action is null or p_action not in ('start', 'retry_failed')
    or (p_action = 'start' and p_job is not null)
    or (p_action = 'retry_failed' and (p_job is null or p_configuration is not null)) then
    raise exception 'invalid_request';
  end if;
  select to_jsonb(p), p."user" into v_project, v_owner
    from public.projects p where p.id = p_project for update;
  if v_project is null or not private.publication_generation_authorized(p_actor, p_project, v_owner) then
    raise exception 'forbidden';
  end if;

  if p_configuration is not null then
    if jsonb_typeof(p_configuration) is distinct from 'object' then raise exception 'invalid_request'; end if;
    if not (p_configuration ?& array['publicationsCount', 'requiresAI', 'promptId'])
      or (p_configuration - array['publicationsCount', 'requiresAI', 'promptId']) <> '{}'::jsonb
      or jsonb_typeof(p_configuration->'publicationsCount') is distinct from 'number'
      or jsonb_typeof(p_configuration->'requiresAI') is distinct from 'boolean' then
      raise exception 'invalid_request';
    end if;
    v_total := (p_configuration->>'publicationsCount')::numeric;
    v_ai := (p_configuration->>'requiresAI')::boolean;
    if v_total < 1 or v_total > 4 or v_total <> trunc(v_total) then raise exception 'invalid_request'; end if;
    if v_ai then
      if jsonb_typeof(p_configuration->'promptId') is distinct from 'string'
        or (p_configuration->>'promptId') !~ '^[1-9][0-9]{0,18}$' then raise exception 'invalid_request'; end if;
      if (p_configuration->>'promptId')::numeric > 9223372036854775807 then raise exception 'invalid_request'; end if;
      v_prompt_id := (p_configuration->>'promptId')::bigint;
    elsif p_configuration->'promptId' <> 'null'::jsonb then
      raise exception 'invalid_request';
    end if;
  end if;

  -- Replay precedes eligibility/readiness: accepted snapshots survive catalog edits.
  select * into v_receipt from public.publication_generation_requests
    where actor_id = p_actor and request_id = p_request;
  if found then
    if v_receipt.project_id <> p_project or v_receipt.action <> p_action
      or v_receipt.configuration is distinct from p_configuration
      or (p_action = 'retry_failed' and v_receipt.job_id <> p_job) then
      raise exception 'conflict';
    end if;
    select * into v_job from public.publication_generation_jobs where id = v_receipt.job_id for update;
    if v_job.owner_id is distinct from v_owner then raise exception 'project_changed'; end if;
    return public.publication_generation_summary(v_job.id);
  end if;

  if p_action = 'start' then
    -- Use the actor's catalog, even for admins/assigned editors. Never trust
    -- browser prompt text or project legacy generation settings.
    if v_ai then
      select p.description into v_prompt from public.prompts p
        where p.id = v_prompt_id and (p."user"::text = p_actor::text or p."isPrivate" = false) for share;
      if not found then raise exception 'forbidden'; end if;
      if v_prompt is null or v_prompt !~ '[^[:space:]]' or length(v_prompt) > 10000 then
        raise exception 'invalid_project';
      end if;
    end if;
    select * into v_job from public.publication_generation_jobs
      where project_id = p_project and status in ('queued', 'running') for update;
    if found then
      if v_job.owner_id is distinct from v_owner then raise exception 'project_changed'; end if;
      if p_configuration is not null then
        select jsonb_build_object('publicationsCount', c.publications_count,
          'requiresAI', c.requires_ai, 'promptId', c.prompt_id::text), c.prompt_snapshot
          into v_active_configuration, v_active_prompt from public.publication_generation_configs c where c.id = v_job.config_id;
        -- A new selection must never silently join different (or legacy) settings.
        if v_active_configuration is distinct from p_configuration or v_active_prompt is distinct from v_prompt then
          raise exception 'conflict';
        end if;
      end if;
      insert into public.publication_generation_requests
        values (p_actor, p_request, p_project, p_action, v_job.id, p_configuration);
      return public.publication_generation_summary(v_job.id);
    end if;
    -- Old identity-only requests can recover receipts/active jobs, not create work.
    if p_configuration is null then raise exception 'invalid_request'; end if;
  else
    select * into v_job from public.publication_generation_jobs where id = p_job and project_id = p_project for update;
    if not found then raise exception 'conflict'; end if;
    if v_job.owner_id is distinct from v_owner then raise exception 'project_changed'; end if;
    if v_job.status in ('queued', 'running', 'succeeded') then
      insert into public.publication_generation_requests
        values (p_actor, p_request, p_project, p_action, v_job.id, null);
      return public.publication_generation_summary(v_job.id);
    end if;
    if exists (select 1 from public.publication_generation_jobs where project_id = p_project and status in ('queued', 'running')) then
      raise exception 'conflict';
    end if;
    if v_job.retry_count >= 2 or not exists (
      select 1 from public.publication_generation_slots where job_id = p_job and state = 'failed' and retryable
    ) then raise exception 'retry_exhausted'; end if;
  end if;

  if p_model is null or p_prompt_version is null or not exists (
    select 1 from public.publication_generation_readiness
    where singleton and last_seen > clock_timestamp() - interval '3 minutes'
      and model = p_model and prompt_version = p_prompt_version
  ) then raise exception 'not_ready'; end if;

  if p_action = 'start' then
    if v_owner is null then raise exception 'invalid_project'; end if;
    v_snapshot := jsonb_build_object(
      'title', coalesce(v_project->>'title', ''),
      'description', coalesce(v_project->>'description', ''),
      'requiredAI', v_ai,
      'prompt', coalesce(v_prompt, ''),
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
    insert into public.publication_generation_configs(project_id, publications_count, requires_ai, prompt_id, prompt_snapshot)
      values (p_project, v_total::smallint, v_ai, v_prompt_id, v_prompt) returning id into v_config;
    insert into public.publication_generation_jobs(project_id, owner_id, actor_id, snapshot, requested_model, prompt_version, total, config_id)
      values (p_project, v_owner, p_actor, v_snapshot, p_model, p_prompt_version, v_total::smallint, v_config)
      returning * into v_job;
    insert into public.publication_generation_slots(job_id, slot)
      select v_job.id, n from generate_series(1, v_total::integer) n;
  else
    update public.publication_generation_slots set state = 'queued', cycle_attempts = 0,
      error_code = null, retryable = false, available_at = clock_timestamp(), updated_at = clock_timestamp()
      where job_id = p_job and state = 'failed' and retryable;
    update public.publication_generation_jobs set retry_count = retry_count + 1 where id = p_job;
  end if;
  insert into public.publication_generation_requests
    values (p_actor, p_request, p_project, p_action, v_job.id, p_configuration);
  perform public.publication_generation_refresh(v_job.id);
  return public.publication_generation_summary(v_job.id);
end;
$$;

-- Keep old entry deployments/receipts and retries recoverable without leaving
-- the old legacy-settings creation path callable through its original signature.
create or replace function public.publication_generation_start(
  p_actor uuid, p_project bigint, p_action text, p_request uuid,
  p_job uuid, p_model text, p_prompt_version text
) returns jsonb language sql security definer set search_path = '' as $$
  select public.publication_generation_start(p_actor, p_project, p_action, p_request,
    p_job, p_model, p_prompt_version, null);
$$;
revoke all on function public.publication_generation_start(uuid, bigint, text, uuid, uuid, text, text, jsonb),
  public.publication_generation_start(uuid, bigint, text, uuid, uuid, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.publication_generation_start(uuid, bigint, text, uuid, uuid, text, text, jsonb),
  public.publication_generation_start(uuid, bigint, text, uuid, uuid, text, text) to service_role;

notify pgrst, 'reload schema';
commit;
