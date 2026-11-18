# Project videos

Videos are project media: they are uploaded in a project, selected when publications are generated, and published to Instagram (Reels, Stories) and LinkedIn by the existing Edge Function pipeline. They live in their own table and bucket and never inside `projects.image_data`.

Task document: [`odd/tasks/social-video-publishing.md`](../odd/tasks/social-video-publishing.md) (T1, specs S3, S4, S9). Migration: `supabase/migrations/20261120000100_project_videos.sql`.

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
