-- Social publishing foundation (phase 1 of the n8n -> Supabase migration).
--
-- One publication (projectsPreview row) has one target per selected network.
-- Each target is published by its own network publisher and keeps its own
-- state, attempts, error and external post id, so a failure on one network
-- never blocks or repeats the other one.
--
-- Callers:
--   * actor RPCs (schedule, retry, reset) are called by an Edge Function after it
--     resolves the actor through Supabase Auth; the actor is never trusted from the
--     browser directly.
--   * worker RPCs (claim, checkpoint, payload, finish) are called by the publishing
--     worker. Every write is fenced by the lease token returned by claim.
-- Everything is service_role only. Tokens and credentials are never stored here.
--
-- Safety rule: a target whose irreversible network call may have happened
-- (side_effect_pending) is never retried automatically; it becomes needs_action
-- with error_code outcome_unknown and a manual retry must acknowledge the risk.
--
-- Lock order everywhere: projectsPreview row first, then its targets.
--
-- Legacy projection: until the client is migrated, projectsPreview.state,
-- "instagramResult" and "linkedlnResult" keep the values n8n writes today.
begin;
set local lock_timeout = '5s';

do $$
begin
  if to_regprocedure('private.publication_iteration_authorized(uuid,uuid,bigint)') is null then
    raise exception 'Publication authority helper missing';
  end if;
end;
$$;

create table public.publication_targets (
  id uuid primary key default gen_random_uuid(),
  preview_id bigint not null references public."projectsPreview" (id) on delete cascade,
  -- The preview owner: their connected accounts publish the target.
  owner_id uuid not null,
  network text not null check (network in ('instagram', 'linkedin')),
  -- 'image' covers one or many images. Video and reels are added in a later phase.
  format text not null default 'image' check (format in ('image')),
  account_kind text not null check (account_kind in ('instagram_business', 'linkedin_person', 'linkedin_organization')),
  account_external_id text not null check (account_external_id ~ '^[A-Za-z0-9:_-]{1,100}$'),
  account_name text check (account_name is null or char_length(account_name) <= 200),
  status text not null default 'pending'
    check (status in ('pending', 'running', 'published', 'failed', 'needs_action', 'cancelled')),
  run_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 10),
  lease_token uuid,
  lease_expires_at timestamptz,
  -- Publisher progress (container ids, upload URNs). Never secrets.
  step text check (step is null or step ~ '^[a-z_]{1,40}$'),
  step_state jsonb not null default '{}'::jsonb
    check (jsonb_typeof(step_state) = 'object' and octet_length(step_state::text) <= 4096),
  side_effect_pending boolean not null default false,
  error_code text check (error_code is null or error_code ~ '^[a-z_]{1,60}$'),
  error_kind text check (error_kind is null or error_kind in ('transient', 'action_required', 'permanent')),
  external_post_id text check (external_post_id is null or external_post_id ~ '^[A-Za-z0-9:_.-]{1,200}$'),
  permalink text check (permalink is null or (permalink ~ '^https://' and char_length(permalink) <= 500)),
  requested_by uuid not null,
  schedule_request uuid not null,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check ((network = 'instagram') = (account_kind = 'instagram_business')),
  check ((status = 'running') = (lease_token is not null)),
  check ((lease_token is null) = (lease_expires_at is null)),
  check ((status = 'published') = (external_post_id is not null and published_at is not null)),
  check ((error_code is null) = (error_kind is null)),
  check (status not in ('failed', 'needs_action') or error_code is not null),
  check (not side_effect_pending or status = 'running'),
  check (archived_at is null or status not in ('pending', 'running'))
);

-- One current target per publication and network; archived ones are history.
create unique index publication_targets_current
  on public.publication_targets (preview_id, network) where archived_at is null;
create index publication_targets_due
  on public.publication_targets (run_at) where status = 'pending';
create index publication_targets_leases
  on public.publication_targets (lease_expires_at) where status = 'running';
create index publication_targets_request
  on public.publication_targets (requested_by, schedule_request);

-- Content-free attempt history for feedback and support.
create table public.publication_target_attempts (
  id bigint generated always as identity primary key,
  target_id uuid not null references public.publication_targets (id) on delete cascade,
  attempt integer not null check (attempt >= 0),
  outcome text not null
    check (outcome in ('published', 'retry_scheduled', 'failed', 'needs_action', 'lease_expired', 'outcome_unknown')),
  error_code text check (error_code is null or error_code ~ '^[a-z_]{1,60}$'),
  error_kind text check (error_kind is null or error_kind in ('transient', 'action_required', 'permanent')),
  diagnostics jsonb check (diagnostics is null or (
    jsonb_typeof(diagnostics) = 'object' and octet_length(diagnostics::text) <= 2048)),
  created_at timestamptz not null default clock_timestamp()
);
create index publication_target_attempts_target on public.publication_target_attempts (target_id, id);

alter table public.publication_targets enable row level security;
alter table public.publication_target_attempts enable row level security;
revoke all on table public.publication_targets from public, anon, authenticated, service_role;
revoke all on table public.publication_target_attempts from public, anon, authenticated, service_role;
grant select, insert, update on table public.publication_targets to service_role;
grant select, insert on table public.publication_target_attempts to service_role;

-- Same rule as publication iteration, but never NULL: the shared helper returns NULL
-- for a non-admin stranger when the preview has no owner, and "not NULL" would skip
-- the forbidden branch.
create function private.publication_targets_authorized(p_actor uuid, p_preview_owner uuid, p_project bigint)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(private.publication_iteration_authorized(p_actor, p_preview_owner, p_project), false);
$$;

-- Current targets of a publication, as returned to callers.
create function private.publication_targets_summary(p_preview bigint)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id, 'network', t.network, 'format', t.format, 'status', t.status,
      'runAt', t.run_at, 'attempts', t.attempts, 'maxAttempts', t.max_attempts,
      'errorCode', t.error_code, 'errorKind', t.error_kind,
      'accountKind', t.account_kind, 'accountName', t.account_name,
      'externalPostId', t.external_post_id, 'permalink', t.permalink,
      'publishedAt', t.published_at) order by t.network), '[]'::jsonb)
  from public.publication_targets t
  where t.preview_id = p_preview and t.archived_at is null;
$$;

-- Legacy values for one network: what n8n writes today.
create function private.publication_target_legacy_result(p_preview bigint, p_network text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  v_status text;
begin
  select t.status into v_status from public.publication_targets t
    where t.preview_id = p_preview and t.network = p_network and t.archived_at is null;
  if not found or v_status = 'cancelled' then return 'notSelected'; end if;
  return case
    when v_status = 'published' then 'true'
    when v_status in ('failed', 'needs_action') then 'false'
    else null
  end;
end;
$$;

-- Projects the current targets onto the legacy projectsPreview columns.
-- The caller must already hold the projectsPreview row lock.
create function private.publication_targets_sync_legacy(p_preview bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_any boolean;
  v_open boolean;
begin
  select count(*) > 0, coalesce(bool_or(t.status in ('pending', 'running')), false)
    into v_any, v_open
    from public.publication_targets t where t.preview_id = p_preview and t.archived_at is null;
  if not v_any then return; end if;
  update public."projectsPreview" set
    state = case when v_open then 'scheduled' else 'published' end,
    "instagramResult" = private.publication_target_legacy_result(p_preview, 'instagram'),
    "linkedlnResult" = private.publication_target_legacy_result(p_preview, 'linkedin')
  where id = p_preview;
end;
$$;

-- Schedules (run_at in the future) or publishes now (run_at = now) a publication.
-- p_targets: [{network, format?, accountKind, accountExternalId, accountName?}], one per network.
-- Idempotent per (actor, request): a replay returns the current targets.
create function public.publication_targets_schedule(
  p_actor uuid, p_preview bigint, p_request uuid, p_run_at timestamptz, p_targets jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_preview record;
  v_replay record;
  v_target jsonb;
  v_networks text[] := '{}';
  v_network text;
  v_kind text;
  v_external text;
  v_name text;
  v_format text;
  v_ig jsonb := 'false'::jsonb;
  v_li jsonb := 'false'::jsonb;
begin
  if p_actor is null or p_preview is null or p_request is null or p_run_at is null
    or p_targets is null or jsonb_typeof(p_targets) <> 'array'
    or jsonb_array_length(p_targets) not between 1 and 2
  then raise exception 'invalid_request'; end if;

  select p.id, p."user", p.project_id into v_preview
    from public."projectsPreview" p where p.id = p_preview for update;
  -- Unknown and foreign publications are indistinguishable to the caller.
  if not found or not private.publication_targets_authorized(p_actor, v_preview."user", v_preview.project_id) then
    raise exception 'forbidden';
  end if;
  -- Targets publish with the owner's accounts; a publication without owner cannot publish.
  if v_preview."user" is null then raise exception 'invalid_project'; end if;

  select t.preview_id into v_replay from public.publication_targets t
    where t.requested_by = p_actor and t.schedule_request = p_request limit 1;
  if found then
    if v_replay.preview_id <> p_preview then raise exception 'conflict'; end if;
    return jsonb_build_object('status', 'replayed', 'targets', private.publication_targets_summary(p_preview));
  end if;

  if p_run_at < clock_timestamp() - interval '5 minutes' or p_run_at > clock_timestamp() + interval '366 days' then
    raise exception 'run_at_out_of_range';
  end if;

  for v_target in select value from jsonb_array_elements(p_targets) loop
    if jsonb_typeof(v_target) <> 'object' then raise exception 'invalid_request'; end if;
    v_network := v_target->>'network';
    v_kind := v_target->>'accountKind';
    v_external := v_target->>'accountExternalId';
    v_name := nullif(btrim(coalesce(v_target->>'accountName', '')), '');
    v_format := coalesce(v_target->>'format', 'image');
    if v_network is null or v_network = any(v_networks)
      or not ((v_network = 'instagram' and v_kind = 'instagram_business')
        or (v_network = 'linkedin' and v_kind in ('linkedin_person', 'linkedin_organization')))
      or v_external is null or v_external !~ '^[A-Za-z0-9:_-]{1,100}$'
      or (v_name is not null and char_length(v_name) > 200)
      or v_format <> 'image'
    then raise exception 'invalid_request'; end if;
    v_networks := v_networks || v_network;
    -- Legacy shape without tokens, read by the current publish configuration.
    if v_network = 'instagram' then
      v_ig := jsonb_build_object('id', v_external, 'name', v_name, 'type', 'BUSINESS');
    else
      v_li := jsonb_build_object('id', v_external, 'name', v_name,
        'type', case when v_kind = 'linkedin_organization' then 'ORGANIZATION' else 'PERSON' end);
    end if;
  end loop;

  -- Lock the current targets first: a claim that leased one of them commits before
  -- this check, so the check sees it running instead of failing on archive.
  perform 1 from public.publication_targets t
    where t.preview_id = p_preview and t.archived_at is null for update;
  if exists (select 1 from public.publication_targets t
    where t.preview_id = p_preview and t.archived_at is null and t.status = 'running') then
    raise exception 'in_progress';
  end if;
  -- Publishing again after a success is an explicit reset, never a silent repeat.
  if exists (select 1 from public.publication_targets t
    where t.preview_id = p_preview and t.archived_at is null and t.status = 'published') then
    raise exception 'already_published';
  end if;

  update public.publication_targets set
    status = case when status = 'pending' then 'cancelled' else status end,
    archived_at = clock_timestamp(), updated_at = clock_timestamp()
  where preview_id = p_preview and archived_at is null;

  insert into public.publication_targets (preview_id, owner_id, network, format, account_kind,
    account_external_id, account_name, run_at, requested_by, schedule_request)
  select p_preview, v_preview."user", e.value->>'network', coalesce(e.value->>'format', 'image'),
    e.value->>'accountKind', e.value->>'accountExternalId',
    nullif(btrim(coalesce(e.value->>'accountName', '')), ''), p_run_at, p_actor, p_request
  from jsonb_array_elements(p_targets) e;

  update public."projectsPreview" set "publishDate" = p_run_at,
    "checkSocialNetworks" = jsonb_build_object('instagram', v_ig, 'linkedln', v_li)
  where id = p_preview;
  perform private.publication_targets_sync_legacy(p_preview);

  return jsonb_build_object('status', 'scheduled', 'targets', private.publication_targets_summary(p_preview));
end;
$$;

-- Manual retry of one failed or needs_action target, after the user fixed the cause
-- or because the failure was external. An unknown outcome needs explicit acknowledgement.
create function public.publication_target_retry(
  p_actor uuid, p_target uuid, p_acknowledge_unknown_outcome boolean
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_preview_id bigint;
  v_preview record;
  v_target public.publication_targets;
begin
  if p_actor is null or p_target is null then raise exception 'invalid_request'; end if;

  select t.preview_id into v_preview_id from public.publication_targets t where t.id = p_target;
  if not found then raise exception 'forbidden'; end if;
  select p.id, p."user", p.project_id into v_preview
    from public."projectsPreview" p where p.id = v_preview_id for update;
  if not found or not private.publication_targets_authorized(p_actor, v_preview."user", v_preview.project_id) then
    raise exception 'forbidden';
  end if;

  select * into v_target from public.publication_targets t where t.id = p_target for update;
  if not found or v_target.preview_id <> v_preview_id then raise exception 'conflict'; end if;
  if v_target.archived_at is not null or v_target.status not in ('failed', 'needs_action') then
    raise exception 'not_retryable';
  end if;
  if v_target.error_code = 'outcome_unknown' and coalesce(p_acknowledge_unknown_outcome, false) is not true then
    raise exception 'confirmation_required';
  end if;

  update public.publication_targets set status = 'pending', run_at = clock_timestamp(), attempts = 0,
    error_code = null, error_kind = null, step = null, step_state = '{}'::jsonb,
    requested_by = p_actor, updated_at = clock_timestamp()
  where id = p_target;
  perform private.publication_targets_sync_legacy(v_preview_id);

  return jsonb_build_object('status', 'retrying', 'targets', private.publication_targets_summary(v_preview_id));
end;
$$;

-- Unschedules a publication, or prepares it to be published again after a result.
-- Same legacy effect as the current client reset: state preview, no date, no results.
create function public.publication_targets_reset(p_actor uuid, p_preview bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_preview record;
begin
  if p_actor is null or p_preview is null then raise exception 'invalid_request'; end if;

  select p.id, p."user", p.project_id into v_preview
    from public."projectsPreview" p where p.id = p_preview for update;
  if not found or not private.publication_targets_authorized(p_actor, v_preview."user", v_preview.project_id) then
    raise exception 'forbidden';
  end if;
  -- Lock the current targets first: a claim that leased one of them commits before
  -- this check, so the check sees it running instead of failing on archive.
  perform 1 from public.publication_targets t
    where t.preview_id = p_preview and t.archived_at is null for update;
  if exists (select 1 from public.publication_targets t
    where t.preview_id = p_preview and t.archived_at is null and t.status = 'running') then
    raise exception 'in_progress';
  end if;

  update public.publication_targets set
    status = case when status = 'pending' then 'cancelled' else status end,
    archived_at = clock_timestamp(), updated_at = clock_timestamp()
  where preview_id = p_preview and archived_at is null;

  update public."projectsPreview" set state = 'preview', "publishDate" = null,
    "checkSocialNetworks" = null, "instagramResult" = null, "linkedlnResult" = null
  where id = p_preview;

  return jsonb_build_object('status', 'reset', 'targets', '[]'::jsonb);
end;
$$;

-- Worker: recovers expired leases, then leases up to p_limit due targets.
create function public.publication_targets_claim(p_limit integer, p_lease_seconds integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_expired record;
  v_target public.publication_targets;
  v_status text;
  v_code text;
  v_kind text;
  v_outcome text;
  v_claimed jsonb;
begin
  if p_limit is null or p_limit not between 1 and 20
    or p_lease_seconds is null or p_lease_seconds not between 30 and 900
  then raise exception 'invalid_request'; end if;

  for v_expired in
    select t.id, t.preview_id from public.publication_targets t
    where t.status = 'running' and t.lease_expires_at < clock_timestamp()
    order by t.lease_expires_at limit 50
  loop
    -- Preview first (lock order); a busy preview is recovered on a later claim.
    perform 1 from public."projectsPreview" p where p.id = v_expired.preview_id for update skip locked;
    if not found then continue; end if;
    select * into v_target from public.publication_targets t where t.id = v_expired.id for update;
    if not found or v_target.status <> 'running' or v_target.lease_expires_at >= clock_timestamp() then
      continue;
    end if;

    if v_target.side_effect_pending then
      v_status := 'needs_action'; v_code := 'outcome_unknown'; v_kind := 'action_required';
      v_outcome := 'outcome_unknown';
    elsif v_target.attempts >= v_target.max_attempts then
      v_status := 'failed'; v_code := 'lease_expired'; v_kind := 'transient'; v_outcome := 'lease_expired';
    else
      v_status := 'pending'; v_code := 'lease_expired'; v_kind := 'transient'; v_outcome := 'lease_expired';
    end if;

    update public.publication_targets set status = v_status, error_code = v_code, error_kind = v_kind,
      lease_token = null, lease_expires_at = null, side_effect_pending = false,
      run_at = case when v_status = 'pending' then clock_timestamp() else run_at end,
      updated_at = clock_timestamp()
    where id = v_target.id;
    insert into public.publication_target_attempts (target_id, attempt, outcome, error_code, error_kind)
      values (v_target.id, v_target.attempts, v_outcome, v_code, v_kind);
    perform private.publication_targets_sync_legacy(v_target.preview_id);
  end loop;

  with due as (
    select t.id from public.publication_targets t
    where t.status = 'pending' and t.run_at <= clock_timestamp()
    order by t.run_at, t.created_at
    limit p_limit
    for update skip locked
  ), claimed as (
    update public.publication_targets t set status = 'running', attempts = t.attempts + 1,
      error_code = null, error_kind = null,
      lease_token = gen_random_uuid(),
      lease_expires_at = clock_timestamp() + make_interval(secs => p_lease_seconds),
      updated_at = clock_timestamp()
    from due where t.id = due.id
    returning t.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'targetId', c.id, 'leaseToken', c.lease_token, 'leaseExpiresAt', c.lease_expires_at,
      'previewId', c.preview_id, 'ownerId', c.owner_id, 'network', c.network, 'format', c.format,
      'accountKind', c.account_kind, 'accountExternalId', c.account_external_id,
      'attempt', c.attempts, 'step', c.step, 'stepState', c.step_state) order by c.run_at), '[]'::jsonb)
    into v_claimed from claimed c;

  return v_claimed;
end;
$$;

-- Worker: content to publish for a leased target, read at publish time as n8n does.
-- Text: main version, else description_rich. Images: image_data entries not marked not_selected.
create function public.publication_target_payload(p_target uuid, p_lease uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_target public.publication_targets;
  v_preview record;
  v_text text;
  v_images jsonb;
begin
  if p_target is null or p_lease is null then raise exception 'invalid_request'; end if;
  select * into v_target from public.publication_targets t where t.id = p_target;
  if not found or v_target.status <> 'running' or v_target.lease_token is distinct from p_lease then
    raise exception 'lease_lost';
  end if;
  select p.title, p.weblink, p.description_rich, p.versions, p.image_data into v_preview
    from public."projectsPreview" p where p.id = v_target.preview_id;
  if not found then raise exception 'lease_lost'; end if;

  if jsonb_typeof(v_preview.versions) = 'array' then
    select v->>'description' into v_text from jsonb_array_elements(v_preview.versions) v
      where v->'main' = 'true'::jsonb limit 1;
  end if;
  v_text := coalesce(v_text, v_preview.description_rich);

  select coalesce(jsonb_agg(i->>'url' order by n), '[]'::jsonb) into v_images
    from jsonb_array_elements(case when jsonb_typeof(v_preview.image_data) = 'array'
      then v_preview.image_data else '[]'::jsonb end) with ordinality e(i, n)
    where jsonb_typeof(i) = 'object' and coalesce(i->>'status', '') <> 'not_selected'
      and coalesce(i->>'url', '') <> '';

  return jsonb_build_object('targetId', v_target.id, 'previewId', v_target.preview_id,
    'ownerId', v_target.owner_id, 'network', v_target.network, 'format', v_target.format,
    'accountKind', v_target.account_kind, 'accountExternalId', v_target.account_external_id,
    'title', v_preview.title, 'weblink', v_preview.weblink, 'text', v_text, 'images', v_images,
    'step', v_target.step, 'stepState', v_target.step_state);
end;
$$;

-- Worker: records publisher progress and extends the lease. Set p_side_effect_pending
-- to true immediately before an irreversible network call (publish), so a crash in
-- between becomes outcome_unknown instead of a duplicate post.
create function public.publication_target_checkpoint(
  p_target uuid, p_lease uuid, p_step text, p_step_state jsonb, p_side_effect_pending boolean,
  p_lease_seconds integer
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_expires timestamptz;
begin
  if p_target is null or p_lease is null or p_step is null or p_step !~ '^[a-z_]{1,40}$'
    or p_step_state is null or jsonb_typeof(p_step_state) <> 'object' or octet_length(p_step_state::text) > 4096
    or p_side_effect_pending is null
    or p_lease_seconds is null or p_lease_seconds not between 30 and 900
  then raise exception 'invalid_request'; end if;

  update public.publication_targets set step = p_step, step_state = p_step_state,
    -- Only finish or recovery clears the guard; a later checkpoint cannot.
    side_effect_pending = side_effect_pending or p_side_effect_pending,
    lease_expires_at = clock_timestamp() + make_interval(secs => p_lease_seconds),
    updated_at = clock_timestamp()
  where id = p_target and status = 'running' and lease_token = p_lease
    and lease_expires_at > clock_timestamp()
  returning lease_expires_at into v_expires;
  if not found then raise exception 'lease_lost'; end if;
  return jsonb_build_object('leaseExpiresAt', v_expires);
end;
$$;

-- Worker: final outcome of one attempt.
--   published                    -> published (external post id required)
--   failed + transient           -> pending again with backoff, or failed when attempts are exhausted
--   failed + action_required     -> needs_action (user fixes, then retries)
--   failed + permanent           -> failed
create function public.publication_target_finish(
  p_target uuid, p_lease uuid, p_outcome text, p_external_post_id text, p_permalink text,
  p_error_code text, p_error_kind text, p_retry_after_seconds integer, p_diagnostics jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_preview_id bigint;
  v_target public.publication_targets;
  v_status text;
  v_outcome text;
  v_delay integer;
  v_next timestamptz;
begin
  if p_target is null or p_lease is null or p_outcome is null or p_outcome not in ('published', 'failed')
    or (p_diagnostics is not null and (jsonb_typeof(p_diagnostics) <> 'object'
      or octet_length(p_diagnostics::text) > 2048))
    or (p_outcome = 'published' and (p_external_post_id is null
      or p_external_post_id !~ '^[A-Za-z0-9:_.-]{1,200}$' or p_error_code is not null or p_error_kind is not null
      or (p_permalink is not null and (p_permalink !~ '^https://' or char_length(p_permalink) > 500))))
    or (p_outcome = 'failed' and (p_error_code is null or p_error_code !~ '^[a-z_]{1,60}$'
      or p_error_kind is null or p_error_kind not in ('transient', 'action_required', 'permanent')
      or p_external_post_id is not null or p_permalink is not null))
    or (p_retry_after_seconds is not null and p_retry_after_seconds not between 1 and 86400)
  then raise exception 'invalid_request'; end if;

  select t.preview_id into v_preview_id from public.publication_targets t where t.id = p_target;
  if not found then raise exception 'lease_lost'; end if;
  perform 1 from public."projectsPreview" p where p.id = v_preview_id for update;
  select * into v_target from public.publication_targets t where t.id = p_target for update;
  -- A matching token is enough: any recovery or reclaim replaces or clears it.
  if not found or v_target.status <> 'running' or v_target.lease_token is distinct from p_lease then
    raise exception 'lease_lost';
  end if;

  -- A transient failure after the irreversible call started (timeout, 5xx) may have
  -- published anyway: never retry it automatically.
  if p_outcome = 'failed' and p_error_kind = 'transient' and v_target.side_effect_pending then
    p_error_code := 'outcome_unknown'; p_error_kind := 'action_required';
  end if;

  if p_outcome = 'published' then
    v_status := 'published'; v_outcome := 'published';
  elsif p_error_kind = 'transient' and v_target.attempts < v_target.max_attempts then
    v_status := 'pending'; v_outcome := 'retry_scheduled';
    -- Provider hint (at least 30 s) or exponential backoff: 1, 2, 4 ... minutes, at most 1 hour.
    v_delay := case when p_retry_after_seconds is not null then greatest(p_retry_after_seconds, 30)
      else least(60 * power(2, greatest(v_target.attempts - 1, 0))::integer, 3600) end;
    v_next := clock_timestamp() + make_interval(secs => v_delay);
  elsif p_error_kind = 'action_required' then
    v_status := 'needs_action'; v_outcome := 'needs_action';
  else
    v_status := 'failed'; v_outcome := 'failed';
  end if;

  update public.publication_targets set status = v_status,
    error_code = p_error_code, error_kind = p_error_kind,
    external_post_id = p_external_post_id, permalink = p_permalink,
    published_at = case when v_status = 'published' then clock_timestamp() end,
    run_at = coalesce(v_next, run_at),
    lease_token = null, lease_expires_at = null, side_effect_pending = false,
    updated_at = clock_timestamp()
  where id = p_target;
  insert into public.publication_target_attempts (target_id, attempt, outcome, error_code, error_kind, diagnostics)
    values (p_target, v_target.attempts, v_outcome, p_error_code, p_error_kind, p_diagnostics);
  perform private.publication_targets_sync_legacy(v_preview_id);

  return jsonb_build_object('status', v_status, 'nextRunAt', v_next);
end;
$$;

do $$
declare
  v_fn text;
begin
  foreach v_fn in array array[
    'private.publication_targets_authorized(uuid,uuid,bigint)',
    'private.publication_targets_summary(bigint)',
    'private.publication_target_legacy_result(bigint,text)',
    'private.publication_targets_sync_legacy(bigint)',
    'public.publication_targets_schedule(uuid,bigint,uuid,timestamptz,jsonb)',
    'public.publication_target_retry(uuid,uuid,boolean)',
    'public.publication_targets_reset(uuid,bigint)',
    'public.publication_targets_claim(integer,integer)',
    'public.publication_target_payload(uuid,uuid)',
    'public.publication_target_checkpoint(uuid,uuid,text,jsonb,boolean,integer)',
    'public.publication_target_finish(uuid,uuid,text,text,text,text,text,integer,jsonb)'
  ] loop
    execute format('alter function %s owner to postgres', v_fn);
    execute format('revoke all on function %s from public, anon, authenticated, service_role', v_fn);
    if v_fn like 'public.%' then
      execute format('grant execute on function %s to service_role', v_fn);
    end if;
  end loop;
end;
$$;

notify pgrst, 'reload schema';
commit;
