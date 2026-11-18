-- Video formats for publication targets (task odd/tasks/social-video-publishing.md, T3; specs S6, S8).
--
-- Instagram Reels and Stories and LinkedIn video are published by the existing pipeline. This migration is
-- the database half; the publishers and the worker are Edge Function code.
--
-- Apply AFTER 20261120000100 (project_videos) and 20261121000100 (projectsPreview.video_id). Nothing calls
-- the new formats until the client sends them (T4, behind VITE_SOCIAL_VIDEO); the entry function only
-- accepts them when the client asks. Additive and idempotent:
--
-- 1. publication_targets.format accepts image | reel | story_image | story_video | video. Instagram allows
--    image, reel, story_image, story_video; LinkedIn allows image, video (table check, so even service_role
--    cannot store another pair). `image` keeps today's behaviour byte for byte.
-- 2. publication_targets.video_id (uuid, FK project_videos on delete set null): copied from
--    projectsPreview.video_id when a reel / story_video / video target is scheduled. If the video is deleted
--    afterwards the payload carries video = null and the publisher answers video_missing before any call.
-- 3. publication_targets_schedule(...) (same signature) validates the per-network formats, requires the
--    publication to reference a video of its own project for video formats (video_required), and enforces
--    the schedule-time limits (video_limits): story_video <= 60 s and <= 100000000 bytes; reel and video use
--    the project limits (3 s - 15 min, 75000 - 300000000 bytes). Image targets are validated exactly as before.
-- 4. publication_target_payload(...) adds `video` for video formats (null otherwise or when the video is gone):
--    {storagePath, posterPath, bytes, durationMs, width, height, faststart}. The database does not know the
--    public host, so the Edge Function builds the public URLs of bucket project-videos from SUPABASE_URL.
-- 5. Processing polls. A publisher of a non-image format whose network is still processing the media answers
--    failed("processing", "transient", {step, reason: "media_processing"}, 60); publication_target_finish
--    then does NOT count it as an attempt (the claim incremented attempts; the poll gives it back) and gives
--    up after 60 minutes of processing with media_processing_timeout (permanent -> failed; safe: nothing was
--    published, the user can retry). publication_targets.processing_started_at records the first poll of a
--    continuous phase (LinkedIn multi-part upload progress, answered as `processing` too, is part of it); any
--    other outcome and a manual retry clear it. The retry hint is honoured down to 10 s (default 60 s).
--    Targets of format `image` keep their old behaviour: the same `processing` code still counts as an
--    attempt there (up to max_attempts) and keeps the 30 s floor.
--    The same code also covers the publish-window hand-back (retry in 30 s) of the non-image formats.
-- 4b. story_image: the payload images are the ORIGINALS (never the per-network feed-cropped variants),
--    because stories are 9:16.
-- 6. public.publication_target_uploads: resumable upload progress of the publishers across runs (LinkedIn
--    upload token, video urn, instructions, ETags). service_role only; removed when the target is published.
--
-- The function bodies below are copies of the live definitions in 20261118000100 with only the changes
-- listed above.
begin;
set local lock_timeout = '5s';

do $$
begin
  if to_regclass('public.publication_targets') is null then
    raise exception 'public.publication_targets missing (apply 20261118000100 first)';
  end if;
  if to_regclass('public.project_videos') is null then
    raise exception 'public.project_videos missing (apply 20261120000100 first)';
  end if;
  if not exists (select 1 from pg_attribute
    where attrelid = to_regclass('public."projectsPreview"') and attname = 'video_id' and not attisdropped) then
    raise exception 'projectsPreview.video_id missing (apply 20261121000100 first)';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1 and 2. Formats, video reference, processing clock
-- ---------------------------------------------------------------------------

alter table public.publication_targets
  add column if not exists video_id uuid
    constraint publication_targets_video_id_fkey references public.project_videos (id) on delete set null,
  add column if not exists processing_started_at timestamptz;

alter table public.publication_targets drop constraint if exists publication_targets_format_check;
alter table public.publication_targets
  add constraint publication_targets_format_check
  check (format in ('image', 'reel', 'story_image', 'story_video', 'video'));

alter table public.publication_targets drop constraint if exists publication_targets_format_network_check;
alter table public.publication_targets
  add constraint publication_targets_format_network_check
  check (format = 'image'
    or (network = 'instagram' and format in ('reel', 'story_image', 'story_video'))
    or (network = 'linkedin' and format = 'video'));

-- Only video formats reference a video.
alter table public.publication_targets drop constraint if exists publication_targets_video_id_format_check;
alter table public.publication_targets
  add constraint publication_targets_video_id_format_check
  check (video_id is null or format in ('reel', 'story_video', 'video'));

-- The foreign key on delete set null looks the referencing rows up by video_id.
create index if not exists publication_targets_video_id_idx
  on public.publication_targets (video_id) where video_id is not null;

-- ---------------------------------------------------------------------------
-- 6. Upload progress (service_role only)
-- ---------------------------------------------------------------------------

create table if not exists public.publication_target_uploads (
  target_id uuid primary key references public.publication_targets (id) on delete cascade,
  state jsonb not null
    check (jsonb_typeof(state) = 'object' and octet_length(state::text) <= 262144),
  updated_at timestamptz not null default clock_timestamp()
);

alter table public.publication_target_uploads enable row level security;
-- No policies: with RLS on, only roles that bypass it (service_role, owner) can read or write.
revoke all on table public.publication_target_uploads from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.publication_target_uploads to service_role;

create or replace function private.publication_target_uploads_touch()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists publication_target_uploads_touch on public.publication_target_uploads;
create trigger publication_target_uploads_touch
  before update on public.publication_target_uploads
  for each row execute function private.publication_target_uploads_touch();

-- ---------------------------------------------------------------------------
-- 3. Schedule
-- ---------------------------------------------------------------------------

create or replace function public.publication_targets_schedule(
  p_actor uuid, p_preview bigint, p_request uuid, p_run_at timestamptz, p_targets jsonb,
  p_acknowledge_unknown_outcome boolean default false
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_preview record;
  v_replay record;
  v_video record;
  v_has_video boolean := false;
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

  select p.id, p."user", p.project_id, p.video_id into v_preview
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

  -- The video of the publication, only when it still belongs to the publication's own project.
  if v_preview.video_id is not null and v_preview.project_id is not null then
    select v.bytes, v.duration_ms into v_video from public.project_videos v
      where v.id = v_preview.video_id and v.project_id = v_preview.project_id;
    v_has_video := found;
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
      or not ((v_network = 'instagram' and v_format in ('image', 'reel', 'story_image', 'story_video'))
        or (v_network = 'linkedin' and v_format in ('image', 'video')))
    then raise exception 'invalid_request'; end if;

    if v_format in ('reel', 'story_video', 'video') then
      if not v_has_video then raise exception 'video_required'; end if;
      if v_format = 'story_video' then
        if v_video.duration_ms > 60000 or v_video.bytes > 100000000 then raise exception 'video_limits'; end if;
      elsif v_video.duration_ms not between 3000 and 900000 or v_video.bytes not between 75000 and 300000000 then
        raise exception 'video_limits';
      end if;
    end if;

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
  -- An unknown outcome (the network may have published) is never replaced silently.
  if not coalesce(p_acknowledge_unknown_outcome, false) and exists (select 1 from public.publication_targets t
    where t.preview_id = p_preview and t.archived_at is null and t.error_code = 'outcome_unknown') then
    raise exception 'confirmation_required';
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

  insert into public.publication_targets (preview_id, owner_id, network, format, video_id, account_kind,
    account_external_id, account_name, run_at, requested_by, schedule_request)
  select p_preview, v_preview."user", e.value->>'network', coalesce(e.value->>'format', 'image'),
    case when coalesce(e.value->>'format', 'image') in ('reel', 'story_video', 'video')
      then v_preview.video_id end,
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

-- ---------------------------------------------------------------------------
-- Retry: also clears the processing clock
-- ---------------------------------------------------------------------------

create or replace function public.publication_target_retry(
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
    processing_started_at = null,
    requested_by = p_actor, updated_at = clock_timestamp()
  where id = p_target;
  perform private.publication_targets_sync_legacy(v_preview_id);

  return jsonb_build_object('status', 'retrying', 'targets', private.publication_targets_summary(v_preview_id));
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Payload
-- ---------------------------------------------------------------------------

create or replace function public.publication_target_payload(p_target uuid, p_lease uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_target public.publication_targets;
  v_preview record;
  v_video record;
  v_video_json jsonb := null;
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

  select coalesce(jsonb_agg(jsonb_build_object(
      'url', coalesce(mv.public_url, e.i->>'url'),
      'sourceUrl', e.i->>'url',
      'isVariant', mv.id is not null,
      'width', mv.width,
      'height', mv.height) order by e.n), '[]'::jsonb) into v_images
    from jsonb_array_elements(case when jsonb_typeof(v_preview.image_data) = 'array'
      then v_preview.image_data else '[]'::jsonb end) with ordinality e(i, n)
    left join public.publication_media_variants mv
      on mv.preview_id = v_target.preview_id and mv.network = v_target.network
      and mv.source_url = e.i->>'url'
      -- Stories are 9:16: the feed-cropped network variants never apply, the originals do.
      and v_target.format <> 'story_image'
    where jsonb_typeof(e.i) = 'object' and coalesce(e.i->>'status', '') <> 'not_selected'
      and coalesce(e.i->>'url', '') <> '';

  -- Video formats only. The video row is gone (deleted after scheduling, video_id set null): video = null
  -- and the publisher answers video_missing before any network call.
  if v_target.format in ('reel', 'story_video', 'video') and v_target.video_id is not null then
    select v.storage_path, v.poster_path, v.bytes, v.duration_ms, v.width, v.height, v.faststart into v_video
      from public.project_videos v where v.id = v_target.video_id;
    if found then
      v_video_json := jsonb_build_object('storagePath', v_video.storage_path, 'posterPath', v_video.poster_path,
        'bytes', v_video.bytes, 'durationMs', v_video.duration_ms, 'width', v_video.width,
        'height', v_video.height, 'faststart', v_video.faststart);
    end if;
  end if;

  return jsonb_build_object('targetId', v_target.id, 'previewId', v_target.preview_id,
    'ownerId', v_target.owner_id, 'network', v_target.network, 'format', v_target.format,
    'accountKind', v_target.account_kind, 'accountExternalId', v_target.account_external_id,
    'title', v_preview.title, 'weblink', v_preview.weblink, 'text', v_text, 'images', v_images,
    'video', v_video_json,
    'step', v_target.step, 'stepState', v_target.step_state);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Finish: processing polls are not attempts
-- ---------------------------------------------------------------------------

create or replace function public.publication_target_finish(
  p_target uuid, p_lease uuid, p_outcome text, p_external_post_id text, p_permalink text,
  p_error_code text, p_error_kind text, p_retry_after_seconds integer, p_diagnostics jsonb,
  p_not_published boolean default false
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_preview_id bigint;
  v_target public.publication_targets;
  v_status text;
  v_outcome text;
  v_delay integer;
  v_next timestamptz;
  v_not_published boolean;
  v_processing boolean;
  v_since timestamptz;
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
  -- published anyway: never retry it automatically. p_not_published is set only when the
  -- provider answered with a definitive rejection (nothing was published).
  v_not_published := p_outcome = 'failed' and coalesce(p_not_published, false)
    and v_target.side_effect_pending and p_error_code is distinct from 'outcome_unknown';
  if p_outcome = 'failed' and p_error_kind = 'transient' and v_target.side_effect_pending
    and not v_not_published then
    p_error_code := 'outcome_unknown'; p_error_kind := 'action_required';
  end if;

  -- A poll of media the network is still processing (non-image formats). Evaluated after the guard above, so a
  -- transient failure that became outcome_unknown is never a poll. Image targets keep their old behaviour.
  v_processing := p_outcome = 'failed' and p_error_kind = 'transient' and p_error_code = 'processing'
    and v_target.format <> 'image';
  if v_processing then
    v_since := coalesce(v_target.processing_started_at, clock_timestamp());
    if clock_timestamp() - v_since >= interval '60 minutes' then
      -- Still processing after an hour: give up. Nothing was published, so the user can retry safely.
      p_error_code := 'media_processing_timeout'; p_error_kind := 'permanent';
      v_processing := false;
    end if;
  end if;

  if p_outcome = 'published' then
    v_status := 'published'; v_outcome := 'published';
  elsif v_processing then
    v_status := 'pending'; v_outcome := 'retry_scheduled';
    v_delay := greatest(coalesce(p_retry_after_seconds, 60), 10);
    v_next := clock_timestamp() + make_interval(secs => v_delay);
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
    step = case when v_not_published then 'processing' else step end,
    -- The claim counted this run; a processing poll gives it back.
    attempts = case when v_processing then greatest(attempts - 1, 0) else attempts end,
    -- The cap measures one continuous processing phase: any other outcome closes it.
    processing_started_at = case when v_processing then v_since else null end,
    error_code = p_error_code, error_kind = p_error_kind,
    external_post_id = p_external_post_id, permalink = p_permalink,
    published_at = case when v_status = 'published' then clock_timestamp() end,
    run_at = coalesce(v_next, run_at),
    lease_token = null, lease_expires_at = null, side_effect_pending = false,
    updated_at = clock_timestamp()
  where id = p_target;
  insert into public.publication_target_attempts (target_id, attempt, outcome, error_code, error_kind, diagnostics)
    values (p_target, v_target.attempts, v_outcome, p_error_code, p_error_kind, p_diagnostics);
  -- Upload tokens and URLs are no longer needed once the post exists.
  if v_status = 'published' then
    delete from public.publication_target_uploads where target_id = p_target;
  end if;
  perform private.publication_targets_sync_legacy(v_preview_id);

  return jsonb_build_object('status', v_status, 'nextRunAt', v_next);
end;
$$;

-- Same owner and grants as every RPC of the pipeline (create or replace keeps them; stated again).
do $$
declare
  v_fn text;
begin
  foreach v_fn in array array[
    'private.publication_target_uploads_touch()',
    'public.publication_targets_schedule(uuid,bigint,uuid,timestamptz,jsonb,boolean)',
    'public.publication_target_retry(uuid,uuid,boolean)',
    'public.publication_target_payload(uuid,uuid)',
    'public.publication_target_finish(uuid,uuid,text,text,text,text,text,integer,jsonb,boolean)'
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
