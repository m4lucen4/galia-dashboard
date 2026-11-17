# Publication iteration ("Iterar publicación")

Creates a new version of a preview publication's text with OpenAI. Replaces the n8n workflow "Iteración de publicaciones", which accepted unauthenticated `GET ?id=&instructions=` calls.

## Flow

1. `PreviewProjectForm` calls `iteratePublication()` (`src/features/postPreview/services/publicationIteration.ts`). This sends `POST /functions/v1/iterate-publication` with `{ previewId, requestId, instructions }`. A new `requestId` is created on each click; the client waits up to 75 s.
2. `supabase/functions/iterate-publication` resolves the user through Supabase Auth `/auth/v1/user`. The gateway JWT check is disabled in `supabase/config.toml`, as for `generate-project`.
3. `publication_iteration_begin` (SQL, `service_role` only):
   - Authorizes the user: the preview owner, an admin, or the project owner or assigned editor (`private.publication_generation_authorized`).
   - Creates a content-free receipt keyed by `(actor, requestId)`.
   - Returns the source text. The source is the main version, or the first version if none is main, or `description_rich` if there are no versions.
4. The function splits a trailing credits/hashtags block off the source text (see below) and makes one synchronous OpenAI Responses call with a 50 s timeout.
5. `publication_iteration_finish`:
   - Locks the preview row and re-checks authorization.
   - Appends the new version with a UUID text id, makes it the main version and unmarks the previous main, all in one transaction.
   - If there were no versions, it first stores `description_rich` as a non-main version, as n8n did.
   - Records the outcome and safe diagnostics.
6. The editor shows the new version as the current one. The list is refreshed.

## Rules

| Rule | Where |
|---|---|
| Admin, preview owner, project owner or assigned editor; unknown and foreign previews both return `forbidden` | `private.publication_iteration_authorized` |
| Only one running iteration per publication (`in_progress`); a running receipt older than 3 minutes is treated as `lease_expired` | `publication_iteration_begin` |
| Same `requestId` replays the stored result and makes no new provider call | `publication_iteration_begin` |
| Maximum 10 versions (`version_limit`) | begin and finish |
| Instructions ≤ 200 characters, sent in the request body | `parseIterationRequest` |
| Model: `OPENAI_GENERATION_MODEL` (same as generation) | `modelFromEnv` |

## Credits and hashtags

A trailing block is detected when the text ends with lines in the form `Profesión: Nombre` and/or lines that contain only hashtags, separated from the body by a blank line. That block is never sent to the model and is re-appended verbatim. If no such block is detected, the model rewrites the whole text, as in n8n.

## Prompt

The editorial text is the one from the n8n "Message a model" node, with technical fixes only:

- The original text is no longer embedded in the JSON example.
- The API enforces a strict JSON schema `{ publicacion: { texto } }`.
- 75 words is guidance, not a limit.
- A short system instruction marks the user's description as content, not instructions.

## Errors

The function returns `{ code, message, retryable }` and the client translates the code (`publicationIteration.errors.*` in `src/locales/*`). The codes are:

`invalid_request`, `unauthorized`, `forbidden`, `conflict`, `in_progress`, `version_limit`, `invalid_project`, `project_changed`, `not_ready`, `provider_unavailable`, `provider_refusal`, `invalid_response`, `lease_expired`, `internal_error`.

When the client cannot know the outcome (timeout or network), it uses `uncertain`.

Diagnostics stored in `publication_iteration_requests.diagnostics` are content-free. They hold the reason, tokens, duration and HTTP status, never text.

## Configuration

Secrets: `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` and the optional `OPENAI_GENERATION_MODEL`. These are already configured for generation.

The old variable `VITE_SUPABASE_FUNCTION_N8N_ITERATE_PUBLICATION` is no longer read by this branch's client.

**Transitional `GET ?id=&instructions=`.** The production function slug `iterate-publication` already existed (version 45, created 2025-11-26) before this migration, and its source is not in the repository. Dashboards deployed before the POST client may still send that request with the user's bearer token. The function therefore accepts it and runs the same authenticated flow with a fresh `requestId`. Remove this branch once the new client is deployed. Disable the n8n webhook once the new flow is verified in production.
