-- Publication video: each publication may reference at most one video of its own project.
--
-- Purpose (task odd/tasks/social-video-publishing.md, T2; specs S2, S5, S10): the publication
-- editor chooses "Sin vídeo" or one video of the project; the publication keeps its photos.
-- The video is not sent to the networks yet (the publishing pipeline reads it in a later task).
--
-- * public."projectsPreview".video_id: nullable, references public.project_videos(id)
--   ON DELETE SET NULL (deleting a video, or its project, leaves the publication without video).
-- * A publication is linked to its project through projectsPreview.project_id (bigint, nullable:
--   legacy rows may have no project). The trigger private.guard_preview_video() only accepts a
--   video_id whose project_videos.project_id equals the row's project_id. A publication without
--   project cannot get a video. If the publication moves to another project (admin only) or loses
--   its project, a video that no longer belongs to it is cleared instead of blocking the update
--   (this also keeps project deletion working).
-- * The trigger is SECURITY INVOKER on purpose: the caller must be able to see the video through
--   the project_videos RLS (admin, project owner or assigned editor), so nobody attaches a video
--   they cannot see. service_role bypasses RLS and is unaffected.
-- * Existing RLS policies and the guard_preview_ownership trigger of projectsPreview are untouched:
--   read/edit stays admin, publication owner, or owner/assigned editor of the project.
--   The editor's update path is the table UPDATE grant of authenticated; the explicit column
--   grant below keeps it working even if the table were ever moved to column-level grants.
--
-- Additive only: no existing column, policy, function or RPC is changed.
begin;
set local lock_timeout = '5s';

do $$
begin
  if to_regclass('public."projectsPreview"') is null then
    raise exception 'public.projectsPreview missing';
  end if;
  if to_regclass('public.project_videos') is null then
    raise exception 'public.project_videos missing (apply 20261120000100 first)';
  end if;
end;
$$;

alter table public."projectsPreview"
  add column if not exists video_id uuid
    constraint "projectsPreview_video_id_fkey"
    references public.project_videos(id) on delete set null;

create index if not exists projects_preview_video_id_idx
  on public."projectsPreview" (video_id);

-- Same project as the publication (see header). Raises check_violation otherwise.
create or replace function private.guard_preview_video()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.video_id is null then
    return new;
  end if;

  -- Only the project changed (admin move, or the project link was lost): the old video no
  -- longer belongs to the publication, so clear it unless it still belongs to the new project.
  if tg_op = 'UPDATE'
    and new.video_id is not distinct from old.video_id
    and new.project_id is distinct from old.project_id
  then
    if new.project_id is null or not exists (
      select 1 from public.project_videos v
      where v.id = new.video_id and v.project_id = new.project_id
    ) then
      new.video_id := null;
    end if;
    return new;
  end if;

  if new.project_id is null or not exists (
    select 1 from public.project_videos v
    where v.id = new.video_id and v.project_id = new.project_id
  ) then
    raise exception 'The video must belong to the same project as the publication'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
alter function private.guard_preview_video() owner to postgres;
revoke all on function private.guard_preview_video() from public, anon, authenticated, service_role;

drop trigger if exists guard_preview_video on public."projectsPreview";
create trigger guard_preview_video
  before insert or update of video_id, project_id on public."projectsPreview"
  for each row execute function private.guard_preview_video();

-- No-op while authenticated holds the table-level UPDATE grant; explicit for the editor's write.
grant update (video_id) on table public."projectsPreview" to authenticated;

notify pgrst, 'reload schema';
commit;
