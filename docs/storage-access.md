# Storage access rules

| Bucket | Public read | Who can write from the browser |
|---|---|---|
| `projects-images` | Yes (public URL) | Admin, or the owner / assigned editor of the project in the first folder (`<projectId>/<file>`). Migration `20261118000700_projects_images_storage_policies.sql`. |
| `publication-variants` | Yes (public URL) | Whoever may edit the publication in the first folder (`<previewId>/<network>/<uuid>.jpg`). See `docs/social-media-variants.md`. |
| `user-media` | Yes (public URL) | Each user in their own `<uid>/` folder; admins everywhere. |

`service_role` (Edge Functions) bypasses these rules.

`projects-images` previously allowed any authenticated user to upload or overwrite any object and had no delete rule, so deleting a project left its images behind. 64 objects of already deleted projects remain and are publicly readable by URL only.
