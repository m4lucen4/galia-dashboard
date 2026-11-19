-- Story image choice (task odd/tasks/social-video-publishing.md, T7; spec S13, server half).
--
-- "Historia (imagen)" publishes ONE photo. Until now the publisher took the first image of the payload; the
-- user can now choose which selected photo goes to the story. Additive and idempotent. Apply AFTER
-- 20261122000100 (formats) and 20261123000100 (format read grant).
--
-- 1. publication_targets.story_image_url (text null): only for format story_image; the image_data `url` (the
--    original, never a feed variant) of a published photo of the publication (status not not_selected). The
--    table check keeps it null for any other format and bounded (2048 chars).
-- 2. authenticated may read the column (column-level SELECT grant, same as the other readable columns; the RLS
--    policy publication_targets_select_authorized still decides which rows).
-- 3. publication_targets_schedule(...) (same signature, copy of the live body of 20261122000100): each target
--    accepts an optional `storyImageUrl` string. Only with format story_image, and it must equal the url of a
--    published photo of the publication; otherwise story_image_invalid (nothing is written). Without it a
--    story_image target stores the first published photo (null when the publication has none: like before,
--    there is no schedule-time error and the publisher answers story_image_missing). Rescheduling archives the
--    old rows and inserts new ones with the value, exactly like `format` and `video_id`; a replay of the same
--    request returns the current targets before any of this is evaluated.
-- 4. publication_target_payload(...) (same signature, copy of the live body of 20261122000100): for story_image
--    `images` is exactly one element, the original of story_image_url while it is still a published photo of
--    the publication; if the photo was removed or deselected after scheduling, `images` is empty (the Instagram
--    publisher then answers story_image_missing before any network call). A story_image target without a stored
--    choice (scheduled before this migration) keeps its old meaning: the first published photo.
--
-- Every other format, every other function and the owner/grants of both functions are unchanged
-- (owner postgres, security definer, search_path '', execute only for service_role).
begin;
set local lock_timeout = '5s';

do $$
begin
  if to_regclass('public.publication_targets') is null then
    raise exception 'public.publication_targets missing (apply 20261118000100 first)';
  end if;
  if not exists (select 1 from pg_attribute
    where attrelid = to_regclass('public.publication_targets') and attname = 'video_id' and not attisdropped) then
    raise exception 'publication_targets.video_id missing (apply 20261122000100 first)';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1 and 2. Column, check, read grant
-- ---------------------------------------------------------------------------

alter table public.publication_targets add column if not exists story_image_url text;

alter table public.publication_targets drop constraint if exists publication_targets_story_image_url_check;
alter table public.publication_targets
  add constraint publication_targets_story_image_url_check
  check (story_image_url is null or (format = 'story_image' and char_length(story_image_url) <= 2048));

grant select (story_image_url) on table public.publication_targets to authenticated;

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
  v_story_first text;
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

  select p.id, p."user", p.project_id, p.video_id, p.image_data into v_preview
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

  -- The first published photo (status not not_selected, in order) is the default story image.
  select e.i->>'url' into v_story_first
    from jsonb_array_elements(case when jsonb_typeof(v_preview.image_data) = 'array'
      then v_preview.image_data else '[]'::jsonb end) with ordinality e(i, n)
    where jsonb_typeof(e.i) = 'object' and coalesce(e.i->>'status', '') <> 'not_selected'
      and coalesce(e.i->>'url', '') <> ''
    order by e.n limit 1;

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

    -- storyImageUrl (optional, story_image only) must be the url of a published photo of the publication.
    if v_target ? 'storyImageUrl' and jsonb_typeof(v_target->'storyImageUrl') <> 'null' then
      if v_format <> 'story_image' or jsonb_typeof(v_target->'storyImageUrl') <> 'string'
        or not exists (
          select 1 from jsonb_array_elements(case when jsonb_typeof(v_preview.image_data) = 'array'
            then v_preview.image_data else '[]'::jsonb end) e(i)
          where jsonb_typeof(e.i) = 'object' and coalesce(e.i->>'status', '') <> 'not_selected'
            and coalesce(e.i->>'url', '') <> '' and e.i->>'url' = v_target->>'storyImageUrl')
      then raise exception 'story_image_invalid'; end if;
    end if;

    if v_format in ('reel', 'story_video', 'video') then
      if not v_has_video then raise exception 'video_required'; end if;
      if v_format = 'story_video' then
        if v_video.duration_ms > 60000 or v_video.bytes > 100000000 then raise exception 'video_limits'; end if;
      elsif v_video.duration_ms not between 3000 and 300000 or v_video.bytes not between 75000 and 100000000 then
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

  insert into public.publication_targets (preview_id, owner_id, network, format, video_id, story_image_url, account_kind,
    account_external_id, account_name, run_at, requested_by, schedule_request)
  select p_preview, v_preview."user", e.value->>'network', coalesce(e.value->>'format', 'image'),
    case when coalesce(e.value->>'format', 'image') in ('reel', 'story_video', 'video')
      then v_preview.video_id end,
    -- story_image: the chosen photo, else the first published one (null when there is none).
    case when coalesce(e.value->>'format', 'image') = 'story_image'
      then coalesce(e.value->>'storyImageUrl', v_story_first) end,
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

  -- story_image: exactly one photo, the original of story_image_url while it is still a published photo of the
  -- publication; none when it was removed or deselected (the publisher answers story_image_missing). A target
  -- without a stored choice (scheduled before story_image_url existed) keeps the first published photo.
  if v_target.format = 'story_image' then
    if v_target.story_image_url is null then
      v_images := case when jsonb_array_length(v_images) > 0 then jsonb_build_array(v_images->0) else '[]'::jsonb end;
    else
      v_images := coalesce((select jsonb_build_array(x) from jsonb_array_elements(v_images) x
        where x->>'sourceUrl' = v_target.story_image_url limit 1), '[]'::jsonb);
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

-- Same owner and grants as before (create or replace keeps them; stated again).
do $$
declare
  v_fn text;
begin
  foreach v_fn in array array[
    'public.publication_targets_schedule(uuid,bigint,uuid,timestamptz,jsonb,boolean)',
    'public.publication_target_payload(uuid,uuid)'
  ] loop
    execute format('alter function %s owner to postgres', v_fn);
    execute format('revoke all on function %s from public, anon, authenticated, service_role', v_fn);
    execute format('grant execute on function %s to service_role', v_fn);
  end loop;
end;
$$;

-- The schedule / retry answers list the targets through this summary; it now also carries the
-- story image so the browser keeps showing the chosen photo right after scheduling. Body copied
-- from 20261118000100 (unchanged since) plus 'storyImageUrl'; create or replace keeps owner and ACL.
create or replace function private.publication_targets_summary(p_preview bigint)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id, 'network', t.network, 'format', t.format, 'status', t.status,
      'runAt', t.run_at, 'attempts', t.attempts, 'maxAttempts', t.max_attempts,
      'errorCode', t.error_code, 'errorKind', t.error_kind,
      'accountKind', t.account_kind, 'accountName', t.account_name,
      'externalPostId', t.external_post_id, 'permalink', t.permalink,
      'publishedAt', t.published_at, 'storyImageUrl', t.story_image_url) order by t.network), '[]'::jsonb)
  from public.publication_targets t
  where t.preview_id = p_preview and t.archived_at is null;
$$;

notify pgrst, 'reload schema';
commit;
