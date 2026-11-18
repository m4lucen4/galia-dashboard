# Publication (projectsPreview) access rules

Migration: `supabase/migrations/20261118000200_preview_access_security.sql`.

Who can do what with a publication from the browser (`authenticated` role, Row Level Security):

| Action | Allowed |
|---|---|
| Read, edit | Admin, the publication owner, or the owner / assigned editor of its project (the same rule as publication generation and iteration, `private.publication_iteration_authorized`). |
| Delete | Admin or the publication owner. |
| Insert | Nobody. Publications are created by service-side RPCs (generation) and n8n. |
| Change owner (`user`) or `project_id` | Admin only (trigger `guard_preview_ownership`). |
| Anonymous | No access. |

`service_role` (Edge Functions, n8n) bypasses RLS and is unaffected. SECURITY DEFINER RPCs (generation, iteration, social publishing) keep their own authorization.

`private.publication_iteration_authorized` is null-safe: it returns `false`, never `NULL`, so callers written as `not found or not helper(...)` always reach their `forbidden` branch (previously a stranger passed on a publication without owner).

Before this migration any authenticated user could read, edit and delete every publication.
