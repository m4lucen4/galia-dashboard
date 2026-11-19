-- Project video limits: 100 MB and 5 minutes (task odd/tasks/social-video-publishing.md, T5; specs S4, S9).
--
-- The team lowered the per-video maximum from 300 MB / 15 min (20261120000100_project_videos.sql, kept as
-- history) to 100000000 bytes / 300000 ms. Minimums are unchanged (75000 bytes, 3000 ms).
--
-- 1. public.project_videos: constraints project_videos_bytes_range and project_videos_duration_range are
--    replaced (bytes between 75000 and 100000000, duration_ms between 3000 and 300000).
-- 2. storage.buckets 'project-videos': file_size_limit = 100000000.
--
-- Guard: if any existing video is outside the new limits the migration fails with a clear message BEFORE
-- altering anything (no row is deleted or modified; fix or remove those videos first).
-- Idempotent: safe to run more than once. Apply after 20261120000100. Do not re-run 20261120000100 afterwards:
-- its upsert would put the bucket limit back to 300000000.
begin;
set local lock_timeout = '5s';

do $$
declare
  v_over bigint;
begin
  if to_regclass('public.project_videos') is null then
    raise exception 'public.project_videos missing: apply 20261120000100 first';
  end if;
  if to_regclass('storage.buckets') is null then
    raise exception 'storage.buckets missing';
  end if;
  if not exists (select 1 from storage.buckets where id = 'project-videos') then
    raise exception 'bucket project-videos missing: apply 20261120000100 first';
  end if;

  select count(*) into v_over
  from public.project_videos
  where bytes not between 75000 and 100000000
     or duration_ms not between 3000 and 300000;
  if v_over > 0 then
    raise exception 'project_video_limits: % project_videos row(s) exceed the new limits (75000-100000000 bytes, 3000-300000 ms); resolve them before applying this migration', v_over;
  end if;
end;
$$;

alter table public.project_videos drop constraint if exists project_videos_bytes_range;
alter table public.project_videos
  add constraint project_videos_bytes_range check (bytes between 75000 and 100000000);

alter table public.project_videos drop constraint if exists project_videos_duration_range;
alter table public.project_videos
  add constraint project_videos_duration_range check (duration_ms between 3000 and 300000);

update storage.buckets
   set file_size_limit = 100000000
 where id = 'project-videos'
   and file_size_limit is distinct from 100000000;

commit;
