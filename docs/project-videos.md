# Project videos

Videos are project media: they are uploaded in a project, selected when publications are generated, and published to Instagram (Reels, Stories) and LinkedIn by the existing Edge Function pipeline. They live in their own table and bucket and never inside `projects.image_data`.

Task document: [`odd/tasks/social-video-publishing.md`](../odd/tasks/social-video-publishing.md) (T1, specs S3, S4, S9; T2, specs S2, S5, S10). Migrations: `supabase/migrations/20261120000100_project_videos.sql` (videos), `supabase/migrations/20261121000100_preview_video.sql` (publication reference).

## Data model: `public.project_videos`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()`; the client generates it and uses it in the file names |
| `project_id` | `bigint` | FK to `public.projects(id)`, `on delete cascade` |
| `storage_path` | `text` unique | `<project_id>/<id>.mp4`; must start with `<project_id>/` |
| `poster_path` | `text` null | `<project_id>/<id>.jpg`; when set, must start with `<project_id>/` |
| `original_name` | `text` | 1 to 255 characters |
| `bytes` | `bigint` | 75000 to 300000000 |
| `duration_ms` | `integer` | 3000 to 900000 (3 s to 15 min) |
| `width`, `height` | `integer` | `> 0` |
| `faststart` | `boolean` | `moov` atom before `mdat`; Instagram may reject videos without it |
| `position` | `integer` | default 0; index `(project_id, position)` |
| `created_by` | `uuid` null | default `auth.uid()` |
| `created_at` | `timestamptz` | default `now()` |

Size is stored per video so a per-plan quota can be added later (no quota today).

## Limits

- Format: MP4 only (`video/mp4`, `.mp4`).
- Size: 300 MB (300000000 bytes) per video, also the bucket `file_size_limit`.
- Duration: 3 s to 15 min.
- Bucket `allowed_mime_types`: `video/mp4` and `image/jpeg` (the poster).

The browser validates before uploading; the table checks and the bucket are the server-side backstop.

## Policies

Table `project_videos` (RLS enabled): `select`, `insert`, `update`, `delete` for `authenticated` when `private.project_media_allowed(project_id)` is true, that is, the caller is an admin, the project owner (`projects."user"`) or the assigned editor (`projects.assigned`). `insert` and `update` also require `storage_path` and `poster_path` to start with `<project_id>/` (the same rule is a table check constraint, which also covers `service_role`). `anon` has no privileges and no policies.

`private.project_media_allowed(bigint)` is `security definer`, owned by `postgres`, executable only by `authenticated`, and returns `false` (never `NULL`) for a missing project, NULL owner or assigned, NULL input or no session.

Bucket `project-videos` is public, because Instagram downloads `video_url` from a public URL. Writes and listing through the API (`storage.objects`, `insert` / `update` / `delete` / `select` for `authenticated`) require `private.project_video_path_allowed(name)`: the name matches `^([1-9][0-9]{0,17})/[0-9a-f-]{36}\.(mp4|jpg)$` and the caller may edit that project. `service_role` (Edge Functions) bypasses RLS.

## Path layout

```
project-videos/<project_id>/<id>.mp4   video
project-videos/<project_id>/<id>.jpg   poster (frame at about 1 s, JPEG)
```

## Deletion responsibility

Direct SQL deletes on `storage.objects` are not allowed, so the database cannot remove files. The cascade on `projects` only removes rows. The client is responsible for removing objects:

- Deleting a video: remove the `.mp4` and `.jpg` objects through the Storage API, then delete the row.
- Deleting a project (`deleteProject`): remove every object under `<project_id>/` in `project-videos`, then delete the project.
- Uploading: if the row insert fails after the objects were uploaded, the client removes the uploaded objects.

A project deleted by other means (SQL, admin tooling) leaves its objects orphaned in the bucket.

## Publication reference (`projectsPreview.video_id`)

Each publication (row of `public."projectsPreview"`) references at most one video of its own project: "Sin vídeo" or one video, chosen per publication in the publication editor (S10). The publication keeps its photos; at publish time each network will choose its format (photos or video). The publishing pipeline does not read `video_id` yet.

- Column: `video_id uuid null references public.project_videos(id) on delete set null`, index `projects_preview_video_id_idx`. Deleting a video (or its project, through the cascade) leaves the publication without video.
- Link to the project: `projectsPreview.project_id` (`bigint`, nullable for legacy rows). Trigger `private.guard_preview_video()` (`before insert or update of video_id, project_id`, security invoker) accepts a `video_id` only when `project_videos.project_id = projectsPreview.project_id`; otherwise it raises `check_violation` (`23514`). A publication without project cannot get a video. If an admin moves the publication to another project (or the link is lost), the old video is cleared instead of blocking the update.
- Access: unchanged policies of `projectsPreview` (admin, publication owner, or owner/assigned editor of the project can edit; `guard_preview_ownership` still restricts owner/project changes to admins). Because the trigger is security invoker, the caller must also see the video through the `project_videos` policies (admin, project owner or assigned editor). The editor writes the column through the existing `updatePreviewProject` update; `authenticated` also has an explicit `update (video_id)` grant.
- Client: `PublicationVideoPicker` (`src/components/previewProjects/`) lists the project's videos (`listProjectVideos`) with poster thumbnails, "Sin vídeo" plus each video, and on-demand playback (`preload="none"`); with no videos it shows "Este proyecto no tiene vídeos. Súbelos desde el proyecto." `PreviewProjectForm` sends `video_id` with the rest of the form only when it changed, so saving works even before the migration is applied (picking a video does not). Publication cards show a "Vídeo" badge and, when no image is selected, use the video poster as thumbnail (`getVideoPosterUrls`, one query per page).
- Deploy order: apply `20261121000100` before the client that saves `video_id`.
