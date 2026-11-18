-- Project videos: table, RLS, public bucket and storage policies.
--
-- Purpose: videos become project media (task odd/tasks/social-video-publishing.md, T1).
-- They are stored in their own table and bucket, never inside projects.image_data, and are
-- selected later when publications are generated (Instagram Reels / Stories, LinkedIn video).
--
-- * public.project_videos: one row per video, owned by a project (on delete cascade).
--   Limits: 75000 B - 300000000 B (300 MB), 3 s - 15 min, MP4 only (".mp4" path).
-- * RLS: select / insert / update / delete for authenticated users who are admin, the
--   project owner (projects."user") or the assigned editor (projects.assigned), through the
--   null-safe private.project_media_allowed(). No access for anon.
-- * Bucket project-videos: public (Instagram downloads video_url from a public URL),
--   300000000 B, video/mp4 + image/jpeg (poster). Objects are "<projectId>/<uuid>.mp4" and
--   "<projectId>/<uuid>.jpg". Writes through the API need private.project_video_path_allowed().
--
-- Object deletion is done by the client: direct SQL deletes on storage.objects are not
-- allowed, so the client removes the video and poster objects (Storage API) before deleting
-- the row, and deleteProject removes every object under "<projectId>/" before deleting the
-- project. The cascade only removes rows, never objects.
--
-- service_role (Edge Functions) bypasses RLS and is unaffected.
begin;
set local lock_timeout = '5s';

do $$
begin
  if to_regclass('public.projects') is null then
    raise exception 'public.projects missing';
  end if;
  if to_regprocedure('private.current_user_is_admin()') is null then
    raise exception 'private.current_user_is_admin missing';
  end if;
  if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
    raise exception 'storage schema missing';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER, bound to the caller's identity through auth.uid()).
-- They return false, never NULL.
-- ---------------------------------------------------------------------------

-- The caller is admin, owner or assigned editor of the project. false when the project does not
-- exist, when there is no session, or when owner / assigned are NULL.
create or replace function private.project_media_allowed(p_project bigint)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    p_project is not null
    and auth.uid() is not null
    and (
      coalesce(private.current_user_is_admin(), false)
      or exists (
        select 1 from public.projects p
        where p.id = p_project
          and (p."user" = auth.uid() or p.assigned = auth.uid())
      )
    ), false);
$$;
alter function private.project_media_allowed(bigint) owner to postgres;
revoke all on function private.project_media_allowed(bigint) from public, anon, authenticated, service_role;
grant execute on function private.project_media_allowed(bigint) to authenticated;

-- Object name convention: <projectId>/<uuid>.(mp4|jpg), and the caller may edit that project.
create or replace function private.project_video_path_allowed(p_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  v_match text[];
begin
  v_match := regexp_match(coalesce(p_name, ''), '^([1-9][0-9]{0,17})/[0-9a-f-]{36}\.(mp4|jpg)$');
  if v_match is null then return false; end if;
  return coalesce(private.project_media_allowed(v_match[1]::bigint), false);
end;
$$;
alter function private.project_video_path_allowed(text) owner to postgres;
revoke all on function private.project_video_path_allowed(text) from public, anon, authenticated, service_role;
grant execute on function private.project_video_path_allowed(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.project_videos (
  id uuid primary key default gen_random_uuid(),
  project_id bigint not null references public.projects(id) on delete cascade,
  storage_path text not null unique,
  poster_path text null,
  original_name text not null,
  bytes bigint not null,
  duration_ms integer not null,
  width integer not null,
  height integer not null,
  faststart boolean not null,
  position integer not null default 0,
  created_by uuid null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint project_videos_storage_path_prefix
    check (starts_with(storage_path, project_id::text || '/')),
  constraint project_videos_poster_path_prefix
    check (poster_path is null or starts_with(poster_path, project_id::text || '/')),
  constraint project_videos_original_name_len
    check (char_length(original_name) between 1 and 255),
  constraint project_videos_bytes_range
    check (bytes between 75000 and 300000000),
  constraint project_videos_duration_range
    check (duration_ms between 3000 and 900000),
  constraint project_videos_width_positive check (width > 0),
  constraint project_videos_height_positive check (height > 0)
);

create index if not exists project_videos_project_position_idx
  on public.project_videos (project_id, position);

-- ---------------------------------------------------------------------------
-- Table RLS and grants (authenticated only; nothing for anon)
-- ---------------------------------------------------------------------------

alter table public.project_videos enable row level security;

revoke all on table public.project_videos from public, anon, authenticated;
-- Browsers only reorder videos; every other column is fixed after insert.
grant select, insert, delete on table public.project_videos to authenticated;
grant update (position) on table public.project_videos to authenticated;

drop policy if exists "project_videos_select" on public.project_videos;
drop policy if exists "project_videos_insert" on public.project_videos;
drop policy if exists "project_videos_update" on public.project_videos;
drop policy if exists "project_videos_delete" on public.project_videos;

create policy "project_videos_select" on public.project_videos for select to authenticated
  using (private.project_media_allowed(project_id));

create policy "project_videos_insert" on public.project_videos for insert to authenticated
  with check (
    private.project_media_allowed(project_id)
    and created_by is not distinct from auth.uid()
    and starts_with(storage_path, project_id::text || '/')
    and (poster_path is null or starts_with(poster_path, project_id::text || '/'))
  );

create policy "project_videos_update" on public.project_videos for update to authenticated
  using (private.project_media_allowed(project_id))
  with check (
    private.project_media_allowed(project_id)
    and starts_with(storage_path, project_id::text || '/')
    and (poster_path is null or starts_with(poster_path, project_id::text || '/'))
  );

create policy "project_videos_delete" on public.project_videos for delete to authenticated
  using (private.project_media_allowed(project_id));

-- ---------------------------------------------------------------------------
-- Bucket: public (Instagram fetches video_url), 300 MB, MP4 + JPEG poster
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-videos', 'project-videos', true, 300000000, array['video/mp4', 'image/jpeg'])
on conflict (id) do update
  set public = true,
      file_size_limit = 300000000,
      allowed_mime_types = array['video/mp4', 'image/jpeg'];

-- ---------------------------------------------------------------------------
-- Storage policies
-- ---------------------------------------------------------------------------

drop policy if exists "project_videos_objects_insert" on storage.objects;
drop policy if exists "project_videos_objects_update" on storage.objects;
drop policy if exists "project_videos_objects_delete" on storage.objects;
drop policy if exists "project_videos_objects_select" on storage.objects;

create policy "project_videos_objects_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'project-videos' and private.project_video_path_allowed(name));
create policy "project_videos_objects_update" on storage.objects for update to authenticated
  using (bucket_id = 'project-videos' and private.project_video_path_allowed(name))
  with check (bucket_id = 'project-videos' and private.project_video_path_allowed(name));
create policy "project_videos_objects_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'project-videos' and private.project_video_path_allowed(name));
create policy "project_videos_objects_select" on storage.objects for select to authenticated
  using (bucket_id = 'project-videos' and private.project_video_path_allowed(name));

commit;
