-- Facebook Page publishing targets (task odd/tasks/facebook-page-publishing.md, T2; specs S4, S5; server half).
--
-- Publication targets and per-network media variants accept the network `facebook`. A Facebook target
-- publishes to a Page the user manages: account_kind `facebook_page`, account_external_id = the Facebook Page
-- id (an `id` of the user's facebook connection `pages`), formats `image` (one or several photos) and `video`
-- (the publication video), exactly the LinkedIn set. Additive and idempotent. Apply AFTER 20261125000100
-- (Instagram mixed carousel) and 20261126000100 (facebook connections). Nothing calls the new network until
-- the client sends it. Instagram and LinkedIn rules are not touched.
--
-- 1. publication_targets: the network and account_kind checks accept facebook / facebook_page; the
--    network/format check allows `video` for facebook (`image` is allowed everywhere); a new check pairs every
--    network with its own account kinds (the old unnamed check only paired instagram).
-- 2. publication_media_variants: the network check and the storage_path check (`<preview>/<network>/<uuid>.jpg`)
--    accept facebook. No Facebook-specific table rule (photos <= 10 MB; the table keeps its 8 MB cap).
-- 3. private.publication_variant_path_allowed(text) (live body of 20261118000600): the storage policy path
--    accepts `<preview>/facebook/<uuid>.jpg`.
-- 4. public.publication_targets_schedule(...) (live body of 20261125000100, same signature): up to 3 targets
--    (one per network), facebook / facebook_page with formats image and video. A facebook video target needs the
--    publication video with the project limits, like linkedin video (the existing video block). Facebook has no
--    legacy n8n shape: checkSocialNetworks keeps its instagram / linkedln keys exactly as before and, only when a
--    facebook target is scheduled, gains a `facebook` key {id, name, type: 'PAGE'} that the dashboard reads to
--    restore the Page selection of a scheduled publication (publication_targets_reset still clears the column).
--
-- Not recreated because they need no change: public.publication_target_payload (network-agnostic: the variants
-- join uses the target's network, the video block already covers `video`), publication_target_finish / claim /
-- retry / reset / checkpoint / claim_notice, private.publication_targets_summary and sync_legacy (legacy results
-- exist only for instagram and linkedin). Owner postgres, security definer, search_path '' and the ACLs of
-- every function are unchanged.
--
-- The original checks are inline (names derive from the column, but multi-column ones are numbered), so the old
-- ones are found by what they check (single-column on network / account_kind, or the instagram|linkedin text)
-- instead of by guessed names, and replaced by explicitly named checks.
begin;
set local lock_timeout = '5s';

do $$
begin
  if to_regclass('public.publication_targets') is null or to_regclass('public.publication_media_variants') is null then
    raise exception 'publication tables missing (apply 20261118000100 and 20261118000600 first)';
  end if;
  if not exists (select 1 from pg_attribute
    where attrelid = to_regclass('public.publication_targets') and attname = 'video_position' and not attisdropped) then
    raise exception 'publication_targets.video_position missing (apply 20261125000100 first)';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. publication_targets checks
-- ---------------------------------------------------------------------------

do $$
declare
  v_old record;
begin
  -- Single-column checks on network and account_kind that do not know facebook yet.
  for v_old in
    select c.conname from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.conrelid = 'public.publication_targets'::regclass and c.contype = 'c'
      and array_length(c.conkey, 1) = 1 and a.attname in ('network', 'account_kind')
      and pg_get_constraintdef(c.oid) not like '%facebook%'
  loop
    execute format('alter table public.publication_targets drop constraint %I', v_old.conname);
  end loop;
end;
$$;

alter table public.publication_targets drop constraint if exists publication_targets_network_check;
alter table public.publication_targets
  add constraint publication_targets_network_check
  check (network in ('instagram', 'linkedin', 'facebook'));

alter table public.publication_targets drop constraint if exists publication_targets_account_kind_check;
alter table public.publication_targets
  add constraint publication_targets_account_kind_check
  check (account_kind in ('instagram_business', 'linkedin_person', 'linkedin_organization', 'facebook_page'));

alter table public.publication_targets drop constraint if exists publication_targets_network_kind_check;
alter table public.publication_targets
  add constraint publication_targets_network_kind_check
  check ((network = 'instagram' and account_kind = 'instagram_business')
    or (network = 'linkedin' and account_kind in ('linkedin_person', 'linkedin_organization'))
    or (network = 'facebook' and account_kind = 'facebook_page'));

-- Same as 20261125000100 plus facebook video.
alter table public.publication_targets drop constraint if exists publication_targets_format_network_check;
alter table public.publication_targets
  add constraint publication_targets_format_network_check
  check (format = 'image'
    or (network = 'instagram' and format in ('reel', 'story_image', 'story_video', 'carousel_video'))
    or (network = 'linkedin' and format = 'video')
    or (network = 'facebook' and format = 'video'));

-- ---------------------------------------------------------------------------
-- 2 and 3. publication_media_variants checks and storage path policy
-- ---------------------------------------------------------------------------

do $$
declare
  v_old record;
begin
  for v_old in
    select c.conname from pg_constraint c
    where c.conrelid = 'public.publication_media_variants'::regclass and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%instagram%' and pg_get_constraintdef(c.oid) like '%linkedin%'
      and pg_get_constraintdef(c.oid) not like '%facebook%'
      and c.conname not in ('publication_media_variants_instagram_rules', 'publication_media_variants_linkedin_rules')
  loop
    execute format('alter table public.publication_media_variants drop constraint %I', v_old.conname);
  end loop;
end;
$$;

alter table public.publication_media_variants drop constraint if exists publication_media_variants_network_check;
alter table public.publication_media_variants
  add constraint publication_media_variants_network_check
  check (network in ('instagram', 'linkedin', 'facebook'));

alter table public.publication_media_variants drop constraint if exists publication_media_variants_storage_path_check;
alter table public.publication_media_variants
  add constraint publication_media_variants_storage_path_check
  check (storage_path ~ '^[0-9]{1,18}/(instagram|linkedin|facebook)/[0-9a-f-]{36}\.jpg$'
    and starts_with(storage_path, preview_id::text || '/' || network || '/'));

-- Object name convention: <previewId>/<instagram|linkedin|facebook>/<uuid>.jpg, and the caller may edit that
-- publication. Exactly three segments, so nothing can be written elsewhere in the bucket.
create or replace function private.publication_variant_path_allowed(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    p_name ~ '^[0-9]{1,18}/(instagram|linkedin|facebook)/[0-9a-f-]{36}\.jpg$'
    and private.preview_id_access_allowed(substring(p_name from '^([0-9]{1,18})/')::bigint),
    false);
$$;
alter function private.publication_variant_path_allowed(text) owner to postgres;
revoke all on function private.publication_variant_path_allowed(text) from public, anon, authenticated, service_role;
grant execute on function private.publication_variant_path_allowed(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Schedule
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
  v_photo_count integer := 0;
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
  v_fb jsonb := null;
begin
  if p_actor is null or p_preview is null or p_request is null or p_run_at is null
    or p_targets is null or jsonb_typeof(p_targets) <> 'array'
    or jsonb_array_length(p_targets) not between 1 and 3
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

  -- Published photos of the publication (the same filter as the payload images): the carousel_video size and
  -- the range of its video position depend on it.
  select count(*) into v_photo_count
    from jsonb_array_elements(case when jsonb_typeof(v_preview.image_data) = 'array'
      then v_preview.image_data else '[]'::jsonb end) e(i)
    where jsonb_typeof(e.i) = 'object' and coalesce(e.i->>'status', '') <> 'not_selected'
      and coalesce(e.i->>'url', '') <> '';

  for v_target in select value from jsonb_array_elements(p_targets) loop
    if jsonb_typeof(v_target) <> 'object' then raise exception 'invalid_request'; end if;
    v_network := v_target->>'network';
    v_kind := v_target->>'accountKind';
    v_external := v_target->>'accountExternalId';
    v_name := nullif(btrim(coalesce(v_target->>'accountName', '')), '');
    v_format := coalesce(v_target->>'format', 'image');
    if v_network is null or v_network = any(v_networks)
      or not ((v_network = 'instagram' and v_kind = 'instagram_business')
        or (v_network = 'linkedin' and v_kind in ('linkedin_person', 'linkedin_organization'))
        or (v_network = 'facebook' and v_kind = 'facebook_page'))
      or v_external is null or v_external !~ '^[A-Za-z0-9:_-]{1,100}$'
      or (v_name is not null and char_length(v_name) > 200)
      or not ((v_network = 'instagram' and v_format in ('image', 'reel', 'story_image', 'story_video', 'carousel_video'))
        or (v_network = 'linkedin' and v_format in ('image', 'video'))
        or (v_network = 'facebook' and v_format in ('image', 'video')))
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

    if v_format in ('reel', 'story_video', 'video', 'carousel_video') then
      if not v_has_video then raise exception 'video_required'; end if;
      if v_format = 'story_video' then
        if v_video.duration_ms > 60000 or v_video.bytes > 100000000 then raise exception 'video_limits'; end if;
      elsif v_video.duration_ms not between 3000 and 300000 or v_video.bytes not between 75000 and 100000000 then
        raise exception 'video_limits';
      end if;
    end if;

    -- carousel_video: the published photos plus the video make one Instagram carousel (1 to 20 items); an
    -- optional videoPosition (0-based index of the video among the items) must fit in 0..photos. Only for
    -- carousel_video. Absent or null = last.
    if v_target ? 'videoPosition' and jsonb_typeof(v_target->'videoPosition') <> 'null' then
      if v_format <> 'carousel_video' or jsonb_typeof(v_target->'videoPosition') <> 'number' then
        raise exception 'video_position_invalid';
      end if;
      if v_target->>'videoPosition' !~ '^[0-9]{1,3}$' then raise exception 'video_position_invalid'; end if;
      if (v_target->>'videoPosition')::integer > v_photo_count then raise exception 'video_position_invalid'; end if;
    end if;
    if v_format = 'carousel_video' and (v_photo_count < 1 or v_photo_count + 1 > 20) then
      raise exception 'invalid_request';
    end if;

    v_networks := v_networks || v_network;
    -- Legacy shape without tokens, read by the current publish configuration. Facebook is only projected as the
    -- extra `facebook` key set below (n8n never publishes to it).
    if v_network = 'instagram' then
      v_ig := jsonb_build_object('id', v_external, 'name', v_name, 'type', 'BUSINESS');
    elsif v_network = 'linkedin' then
      v_li := jsonb_build_object('id', v_external, 'name', v_name,
        'type', case when v_kind = 'linkedin_organization' then 'ORGANIZATION' else 'PERSON' end);
    else
      v_fb := jsonb_build_object('id', v_external, 'name', v_name, 'type', 'PAGE');
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

  insert into public.publication_targets (preview_id, owner_id, network, format, video_id, story_image_url, video_position,
    account_kind, account_external_id, account_name, run_at, requested_by, schedule_request)
  select p_preview, v_preview."user", e.value->>'network', coalesce(e.value->>'format', 'image'),
    case when coalesce(e.value->>'format', 'image') in ('reel', 'story_video', 'video', 'carousel_video')
      then v_preview.video_id end,
    -- story_image: the chosen photo, else the first published one (null when there is none).
    case when coalesce(e.value->>'format', 'image') = 'story_image'
      then coalesce(e.value->>'storyImageUrl', v_story_first) end,
    -- carousel_video: the chosen 0-based position, null (= last) when none was given.
    case when coalesce(e.value->>'format', 'image') = 'carousel_video'
      and jsonb_typeof(e.value->'videoPosition') = 'number' then (e.value->>'videoPosition')::integer end,
    e.value->>'accountKind', e.value->>'accountExternalId',
    nullif(btrim(coalesce(e.value->>'accountName', '')), ''), p_run_at, p_actor, p_request
  from jsonb_array_elements(p_targets) e;

  update public."projectsPreview" set "publishDate" = p_run_at,
    "checkSocialNetworks" = jsonb_build_object('instagram', v_ig, 'linkedln', v_li)
      -- Only when a facebook target exists: the dashboard restores its Page selection from this key. n8n never
      -- reads it, and schedules without facebook keep the exact two-key value.
      || case when v_fb is null then '{}'::jsonb else jsonb_build_object('facebook', v_fb) end
  where id = p_preview;
  perform private.publication_targets_sync_legacy(p_preview);

  return jsonb_build_object('status', 'scheduled', 'targets', private.publication_targets_summary(p_preview));
end;
$$;


-- Same owner and grants as before (create or replace keeps them; stated again).
alter function public.publication_targets_schedule(uuid,bigint,uuid,timestamptz,jsonb,boolean) owner to postgres;
revoke all on function public.publication_targets_schedule(uuid,bigint,uuid,timestamptz,jsonb,boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.publication_targets_schedule(uuid,bigint,uuid,timestamptz,jsonb,boolean) to service_role;

notify pgrst, 'reload schema';
commit;
