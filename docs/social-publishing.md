# Social publishing (LinkedIn and Instagram)

Publishing a publication (`projectsPreview` row) to the social networks the user connected is moving from n8n to Supabase. This document describes the new pipeline. The migration plan and its status live in `odd/tasks/social-publishing-migration.md`.

> **Status:** phase 1 (database foundation) only. n8n still publishes in production until the cutover phase. Nothing calls these RPCs yet.

## Model

One publication has **one target per selected network**. Each target is published by its own network publisher and keeps its own state, attempts, error and post id. A failure on Instagram never blocks or repeats LinkedIn, and the other way round.

| Table | Purpose |
|---|---|
| `publication_targets` | One row per publication and network. Only one current row per pair (`archived_at is null`); archived rows are history. |
| `publication_target_attempts` | Content-free log of each attempt: outcome, error code and kind, bounded diagnostics. |

Both tables are service_role only (RLS on, no `anon`/`authenticated` grants). They never store tokens or credentials.

### Target states

| Status | Meaning | Next |
|---|---|---|
| `pending` | Waiting for `run_at` (scheduled, publish-now, or automatic retry). | `running` |
| `running` | Leased by a worker. | `published`, `pending` (transient retry), `failed`, `needs_action` |
| `published` | Posted. `external_post_id` and `published_at` are set. | — |
| `failed` | Permanent error, or transient retries exhausted. | Manual retry |
| `needs_action` | The user must fix something (reconnect, crop, edit text) or check an unknown outcome. | Manual retry |
| `cancelled` | Unscheduled before running. | — |

### Error kinds

| Kind | Example | Behaviour |
|---|---|---|
| `transient` | Network down, 5xx, rate limit | Automatic retry with backoff (1, 2, 4 ... minutes, at most 1 hour, or the provider's hint), up to `max_attempts` (5). Then `failed`. |
| `action_required` | Expired token, image not valid, text too long | `needs_action`. The user fixes it and retries. |
| `permanent` | Revoked permission, invalid account | `failed`. The user fixes it and retries. |

### Never publish twice

Before an irreversible call (for example Instagram `media_publish` or LinkedIn `POST /rest/posts`), the publisher calls `publication_target_checkpoint` with `side_effect_pending = true`. If the worker dies before `publication_target_finish`, the expired lease turns the target into `needs_action` with `error_code = 'outcome_unknown'` instead of retrying. A `transient` failure reported after that checkpoint (timeout, 5xx) is turned into the same `outcome_unknown`, and a later checkpoint cannot clear the flag; only finish or recovery does. A manual retry of that target requires `p_acknowledge_unknown_outcome = true`, which the UI asks for after the user has checked the network.

Publishing again after a success requires `publication_targets_reset` first; `publication_targets_schedule` refuses with `already_published`.

## RPCs

All are `SECURITY DEFINER`, `search_path = ''`, executable only by `service_role`.

### Actor RPCs

Called by an Edge Function after it resolves the actor through Supabase Auth. Authorization is the same as publication iteration: admin, preview owner, or the project's owner or assigned editor. Unknown and foreign publications both return `forbidden`, including publications without an owner (the check never evaluates to NULL).

| RPC | Purpose |
|---|---|
| `publication_targets_schedule(actor, preview, request, run_at, targets)` | Schedule (`run_at` in the future) or publish now (`run_at` = now). `targets` is `[{network, accountKind, accountExternalId, accountName?, format?}]`, one per network. Idempotent per `(actor, request)`: a replay returns the current targets, even after a reset (send a new request id for a new action). Replaces current unpublished targets. |
| `publication_target_retry(actor, target, acknowledge_unknown_outcome)` | Retry one `failed` or `needs_action` target now. Resets its attempts. |
| `publication_targets_reset(actor, preview)` | Unschedule, or prepare to publish again. Archives current targets and clears the legacy columns. |

`run_at` is a real instant (`timestamptz`). The client converts the Europe/Madrid wall-clock time the user picks; it must stay between 5 minutes in the past and 366 days in the future.

### Worker RPCs

Every write is fenced by the `leaseToken` returned by `claim`; a stale worker gets `lease_lost`.

| RPC | Purpose |
|---|---|
| `publication_targets_claim(limit, lease_seconds)` | First recovers expired leases (see "Never publish twice"), then leases up to `limit` (1–20) due `pending` targets. |
| `publication_target_payload(target, lease)` | Content at publish time, as n8n reads it: text = main version, else `description_rich`; images = `image_data` URLs whose status is not `not_selected`, in order. |
| `publication_target_checkpoint(target, lease, step, step_state, side_effect_pending, lease_seconds)` | Saves publisher progress (container ids, upload URNs; never secrets, max 4 KB) and extends the lease. |
| `publication_target_finish(target, lease, outcome, external_post_id, permalink, error_code, error_kind, retry_after_seconds, diagnostics)` | Records the attempt result. `outcome` is `published` or `failed`. |

### Error codes raised

`invalid_request`, `forbidden`, `conflict`, `invalid_project`, `run_at_out_of_range`, `in_progress`, `already_published`, `not_retryable`, `confirmation_required`, `lease_lost`.

## Legacy projection

Until the client is migrated, every change writes the values the current UI and n8n use on `projectsPreview`:

| Column | Value |
|---|---|
| `state` | `scheduled` while any current target is `pending` or `running`; `published` when all are settled; `preview` after reset. |
| `instagramResult` / `linkedlnResult` | `true` (published), `false` (`failed` or `needs_action`), `notSelected` (no target or cancelled), `null` (pending or running). |
| `publishDate` | `run_at`. |
| `checkSocialNetworks` | `{instagram, linkedln}` with `{id, name, type}` or `false`. **No access tokens.** |

## Locking

Every RPC that touches a publication locks the `projectsPreview` row first and its targets second. `claim` leases targets with `FOR UPDATE SKIP LOCKED` and does not touch the publication; lease recovery takes the publication lock with `SKIP LOCKED` and retries later if busy.
