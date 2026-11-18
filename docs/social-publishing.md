# Social publishing (LinkedIn and Instagram)

Publishing a publication (`projectsPreview` row) to the social networks the user connected is moving from n8n to Supabase. This document describes the new pipeline. The migration plan and its status live in `odd/tasks/social-publishing-migration.md`.

> **Status:** phase 1 (database foundation) and phase 4 (publishers, worker). n8n still publishes in production until the cutover phase. The phase 1 migration is not applied to production yet, so nothing calls these RPCs there. The worker `process-publication-targets` is written and deployable, but it is **deployed and not scheduled until the cutover** (no cron, no caller); until then it never runs.

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
| `transient` | Network down, 5xx, rate limit, publish window too short | Automatic retry with backoff (1, 2, 4 ... minutes, at most 1 hour, or the provider's hint), up to `max_attempts` (5). Then `failed`. |
| `action_required` | Expired token, `permission_missing`, `invalid_account`, image not valid, text too long, `outcome_unknown` | `needs_action`. The user fixes it (or checks the network) and retries. |
| `permanent` | The network rejected the request itself (`invalid_request`, `provider_rejected`, `api_version_unsupported`) | `failed`. The user changes the content or retries once the cause is gone. |

### Never publish twice

Before an irreversible call (for example Instagram `media_publish` or LinkedIn `POST /rest/posts`), the publisher calls `publication_target_checkpoint` with `side_effect_pending = true`. If the worker dies before `publication_target_finish`, the expired lease turns the target into `needs_action` with `error_code = 'outcome_unknown'` instead of retrying. A `transient` failure reported after that checkpoint (timeout, 5xx) is turned into the same `outcome_unknown`, and a later checkpoint cannot clear the flag; only finish or recovery does. A manual retry of that target requires `p_acknowledge_unknown_outcome = true`, which the UI asks for after the user has checked the network.

**`notPublished` (`p_not_published`).** The only way to retry automatically after the guard is a definitive provider answer to the irreversible call, which proves nothing was published. The publisher sets `notPublished = true` only for this explicit allow-list:

| Network | Definitive answers (allow-list) |
|---|---|
| Instagram (Graph) | error code 4, 17, 32, 613 or 9, or HTTP 429 (rate limit); 190 (token); 10 and 200-299 (permission); 100 (invalid parameter); 368 (restricted) |
| LinkedIn | HTTP 400, 401, 403, 422 or 429 with a JSON body |

Never `notPublished` (checked first, they win over the list): Graph code 1 or 2, `is_transient = true`, subcodes 2207xxx, HTTP 408 and 5xx, network errors and timeouts, an answer without `id` / `x-restli-id`, a body that is not JSON, and every answer not on the list. All of those after the publishing checkpoint are `outcome_unknown` (`action_required`). The worker forwards the flag as `p_not_published` and drops it when the code is `outcome_unknown`; `publication_target_finish` only honours it when the target had `side_effect_pending`.

When honoured, `finish` does not convert a transient failure to `outcome_unknown` (so it goes back to `pending` with the provider's retry hint) and it **resets `step` to `'processing'`, keeping `step_state`**. The next attempt therefore re-polls readiness (containers / images) and publishes again, with the same containers or image URNs, instead of resuming at `'publishing'`, which both publishers always treat as an unknown outcome (`outcome_unknown`, no network call to publish). That check runs first, before account and payload validation.

**Publish window.** Before setting the guard, a publisher checks `deadline - now` against the 30 s publish timeout plus a 5 s margin. If less remains it returns transient `processing` (retry after 30 s) keeping the checkpointed state: no checkpoint with the guard and no network call.

**Starting over.** Publishing again after a success requires `publication_targets_reset` first; `publication_targets_schedule` refuses with `already_published`. Both `publication_targets_schedule` and `publication_targets_reset` also refuse with `confirmation_required` while any current target has `error_code = 'outcome_unknown'`, unless the last parameter `p_acknowledge_unknown_outcome` (default `false`) is `true`: replacing or clearing a target whose post may exist is as risky as retrying it.

## RPCs

All are `SECURITY DEFINER`, `search_path = ''`, executable only by `service_role`.

### Actor RPCs

Called by an Edge Function after it resolves the actor through Supabase Auth. Authorization is the same as publication iteration: admin, preview owner, or the project's owner or assigned editor. Unknown and foreign publications both return `forbidden`, including publications without an owner (the check never evaluates to NULL).

| RPC | Purpose |
|---|---|
| `publication_targets_schedule(actor, preview, request, run_at, targets, acknowledge_unknown_outcome default false)` | Schedule (`run_at` in the future) or publish now (`run_at` = now). `targets` is `[{network, accountKind, accountExternalId, accountName?, format?}]`, one per network. Idempotent per `(actor, request)`: a replay returns the current targets, even after a reset (send a new request id for a new action). Replaces current unpublished targets; `confirmation_required` over an `outcome_unknown` target unless acknowledged. |
| `publication_target_retry(actor, target, acknowledge_unknown_outcome)` | Retry one `failed` or `needs_action` target now. Resets its attempts. |
| `publication_targets_reset(actor, preview, acknowledge_unknown_outcome default false)` | Unschedule, or prepare to publish again. Archives current targets and clears the legacy columns; `confirmation_required` over an `outcome_unknown` target unless acknowledged. |

`run_at` is a real instant (`timestamptz`). The client converts the Europe/Madrid wall-clock time the user picks; it must stay between 5 minutes in the past and 366 days in the future.

### Worker RPCs

Every write is fenced by the `leaseToken` returned by `claim`; a stale worker gets `lease_lost`.

| RPC | Purpose |
|---|---|
| `publication_targets_claim(limit, lease_seconds)` | First recovers expired leases (see "Never publish twice"), then leases up to `limit` (1–20) due `pending` targets. |
| `publication_target_payload(target, lease)` | Content at publish time (see "Payload"): text = main version, else `description_rich`; images = `image_data` entries whose status is not `not_selected`, in order, each with its per-network variant when one exists. Stable read; `lease_lost` when the lease is not ours. |
| `publication_target_checkpoint(target, lease, step, step_state, side_effect_pending, lease_seconds)` | Saves publisher progress (container ids, upload URNs; never secrets, max 4 KB) and extends the lease. |
| `publication_target_finish(target, lease, outcome, external_post_id, permalink, error_code, error_kind, retry_after_seconds, diagnostics, not_published default false)` | Records the attempt result. `outcome` is `published` or `failed`. `not_published = true` (definitive provider rejection of the irreversible call, see "Never publish twice") keeps a transient failure retryable and resets `step` to `'processing'`. |

### Payload

`publication_target_payload` returns one JSON object:

```json
{
  "targetId": "…", "previewId": 12, "ownerId": "<uuid>", "network": "instagram", "format": "image",
  "accountKind": "instagram_business", "accountExternalId": "1784…",
  "title": "…", "weblink": "https://…" , "text": "main version, else description_rich",
  "images": [
    { "url": "https://…/publication-variants/12/instagram/<uuid>.jpg", "sourceUrl": "https://…/original.png",
      "isVariant": true, "width": 1080, "height": 1350 },
    { "url": "https://…/original2.jpg", "sourceUrl": "https://…/original2.jpg",
      "isVariant": false, "width": null, "height": null }
  ],
  "step": null, "stepState": {}
}
```

- `images` keeps the order of `image_data` and skips entries with status `not_selected`, without url, or that are not objects.
- For each entry the function looks for a `publication_media_variants` row with the **same preview, the same network and `source_url` = the entry url** (phase 3, `docs/social-media-variants.md`). When there is one, `url` is its `public_url`, `isVariant` is `true` and `width`/`height` come from the row. A variant is used only for its own network: the other network receives the original. Without a variant, `url` = `sourceUrl`, `isVariant` is `false` and `width`/`height` are `null` (originals are never measured on the server; the publishers let the network judge them).
- `ownerId`, `network` and `accountExternalId` are what the worker needs to fetch the owner's credentials (see below). The payload never contains tokens.
- The migration reads `publication_media_variants` at run time only (created by `20261118000600`, applied before this one in production); it is `SECURITY DEFINER`, `stable`, `service_role` only.

### Error codes raised


`invalid_request`, `forbidden`, `conflict`, `invalid_project`, `run_at_out_of_range`, `in_progress`, `already_published`, `not_retryable`, `confirmation_required` (retry, schedule and reset over an unknown outcome), `lease_lost`.

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

## Worker `process-publication-targets`

Edge Function `supabase/functions/process-publication-targets/index.ts` (`verify_jwt = false` in `supabase/config.toml`; the secret is the only gate). Pieces: the publishers `_shared/social-publish-instagram.ts` (`publishInstagram`) and `_shared/social-publish-linkedin.ts` (`publishLinkedin`) implement the contract in `_shared/social-publisher.ts`; `_shared/social-publication-store.ts` wraps the RPCs and resolves credentials.

> **Deployed but not scheduled until the cutover (T8).** Nothing calls it: no cron entry and no trigger exist. n8n publishes until then. Do not schedule it before the cutover steps (stop n8n first, convert the scheduled rows).

### Request

`POST` only (`OPTIONS` answers CORS, anything else 405), no body. Header `X-Social-Worker-Secret`: 64 hex characters, compared in constant time with the environment variable `SOCIAL_WORKER_SECRET` (same worker secret as `social-credentials-check`); missing or wrong → 401 `{code: "unauthorized"}`. A `{targetId}` body is not supported: the worker only claims.

Environment: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SOCIAL_WORKER_SECRET`. The publishers need no other variable (tokens come from `social_credentials`); `SUPABASE_URL` also defines which image URLs are accepted (see "Image URLs").

### Loop

1. Time budget ≈ 120 s per invocation. Claiming stops when less than 15 s remain.
2. `publication_targets_claim(3, 300)`: up to 3 due targets with a 300 s lease (the SQL first recovers expired leases). An empty claim ends the run; a full batch asks again (at most 10 batches).
3. For each claimed target, one at a time:
   1. `publication_target_payload`, then credentials (below).
   2. If less than 15 s of budget or lease remain the target is handed back instead of started: `failed`, `lease_expired`, `transient`, retry after 30 s, diagnostics `{reason: "worker_budget"}` (it costs one attempt).
   3. Image URLs are validated (see "Image URLs"); an invalid one finishes the target as `media_url_invalid` without resolving credentials or running the publisher.
   4. The publisher runs with a `PublishContext`: `checkpoint(step, stepState, sideEffectPending)` → `publication_target_checkpoint` with a 300 s lease (the lease end the database returns is tracked); `fetch` = `socialFetch` of `social-http.ts` (timeout, default 10 s and never beyond the deadline, `redirect: "error"`; a failure throws `SocialError`); `deadline` = `min(budget end, lease end − 20 s)`, re-evaluated after every checkpoint; `now`, `sleep`.
   5. The result goes to `publication_target_finish`: `published` → external id and permalink; `failed` → code, kind, retry-after and diagnostics. The worker sanitises first: code must match `^[a-z_]{1,60}$` (else `internal_error`), kind in the closed set (else `transient`), retry-after 1–86400, permalink https ≤ 500 characters, diagnostics cleaned (no NUL or lone surrogates, depth ≤ 4, at most 30 keys, 20 items, strings ≤ 500 characters, the access token redacted) and cut to ≤ 1800 bytes of jsonb text (the SQL limit is 2048). A `published` result whose id cannot be stored becomes `outcome_unknown` / `action_required` (a post may exist).
4. If the finish call fails for an infrastructure reason it is retried once with the same value; if that fails too the target is counted `unfinished` and lease recovery takes it (it becomes `outcome_unknown` when the publisher had set the guard, otherwise a transient retry).

### Failure handling

| Situation | Result |
|---|---|
| `LeaseLostError` (checkpoint, payload or finish answered `lease_lost`) | Stop that target, **do not finish**, count `leaseLost`. |
| Unexpected exception, publisher never set `side_effect_pending` | `finish` failed `internal_error`, `transient`, diagnostics `{errorName}` only (class name, never the message). |
| Unexpected exception after `side_effect_pending` | `finish` failed `outcome_unknown`, `action_required` (the SQL enforces the same for any transient failure after the guard). A checkpoint with `sideEffectPending = true` counts as set even if its own answer was lost. |
| No credentials | `finish` failed with the credential code below; the publisher does not run. |

### Image URLs

The worker validates `payload.images[].url` before running any publisher (LinkedIn downloads it, Instagram makes Meta fetch it): `https`, host equal to the host of `SUPABASE_URL`, default port only, no userinfo, and a normalised path starting with `/storage/v1/object/public/` (any bucket: user-media, projects-images, publication-variants). Anything else (other hosts, `http`, `@` tricks, signed or authenticated paths, `..` segments) finishes the target as `media_url_invalid` / `action_required` with diagnostics `{reason: "url_not_allowed", index}` (the URL is never stored).

The LinkedIn publisher then downloads each image with these rules: content-type must be `image/jpeg`, `image/png` or `image/gif` (else `media_format`) and the first bytes must match it (else `media_unreadable`); the body is streamed with a hard cap of 30 MB and the read is cancelled as soon as the cap is exceeded (`media_too_large`), never buffered whole first; a declared `Content-Length` over the cap is refused without reading.

### Publisher rules

- Resume order: `step = 'publishing'` is checked first, before account or payload validation (`outcome_unknown`).
- Instagram quota: `content_publishing_limit` is read as `quota_usage` against `config.quota_total` or `config.quota_value` (and `quota_duration` for the retry hint). If the limit cannot be read the check fails open and the failure diagnostics of that attempt carry `quota_unknown: true`.
- LinkedIn commentary: the 3000 limit is measured on the escaped text that is actually posted (each reserved character costs two), not on the text the user typed.

### Credentials

Resolved with the service role from `publication_targets.owner_id` and `network`; tokens are passed to the publisher in memory only and are never logged or stored.

1. `social_connection_for_user(ownerId, network)`: no connection or `disconnected` → `not_connected`; `expired`, `revoked` or `error` → `connection_expired` (diagnostics: status and reason code); `connected` and `expiring` continue. Both are `action_required`: the user reconnects in Settings and retries.
2. `social_credentials_get(connectionId)`: Instagram → the `page_access` credential whose `externalId` = the target's `accountExternalId`; none → `page_not_authorized` (`action_required`: the page is no longer authorized, reconnect and select it again). LinkedIn → the `user_access` credential (none → `not_connected`).

### Answer

```json
{"claimed": 3, "published": 1, "retrying": 1, "needsAction": 1, "failed": 0, "leaseLost": 0, "unfinished": 0, "budgetReached": false}
```

`retrying` = the target went back to `pending` (transient, includes targets handed back for lack of time), `needsAction` = `needs_action` (including `outcome_unknown`), `failed` = `failed`. The count follows the status `publication_target_finish` answered, so a transient failure that the SQL turned into `outcome_unknown` counts as `needsAction`. A claim failure before any work answers 500 `{code: "internal_error"}`.

## Error codes of a target

`error_code` is shown to the user through i18n; `error_kind` decides the behaviour (see "Error kinds"). Union of what the publishers and the worker produce:

| Code | Kind | Meaning |
|---|---|---|
| `no_images` | action_required | The publication has no selected image. |
| `too_many_images` | action_required | More images than the network accepts (Instagram carousel 20, LinkedIn multi-image 20). |
| `media_needs_crop` | action_required | An original image has a ratio the network rejects; crop it in the publish configuration. |
| `media_format` | action_required | Format, weight, pixels or width are not valid for the network and no converted copy exists; also a LinkedIn download whose content-type is not JPEG, PNG or GIF. |
| `media_rejected` | action_required | The network refused the image (Instagram container `ERROR`, LinkedIn image processing failed, invalid media code). |
| `caption_too_long` | action_required | Instagram caption over the limit (also when the text has too many characters). |
| `commentary_too_long` | action_required | LinkedIn commentary over 3000 characters, measured on the escaped text actually posted. *(emitted by the publishers' validation; not in the original list)* |
| `too_many_hashtags` | action_required | Instagram: more than 30 hashtags. |
| `too_many_mentions` | action_required | Instagram: more than 20 mentions. |
| `rate_limited` | transient | Provider rate or publishing quota; retried with the provider's hint. |
| `processing` | transient | The network is still processing the media (retried after about 60 s), or too little time was left to publish safely (retried after 30 s). |
| `container_expired` | transient | Instagram container expired or was lost; created again on the next attempt. |
| `token_invalid` | action_required | Expired or invalid token (HTTP 401 / Graph code 190): reconnect. |
| `permission_missing` | action_required | A required permission was not granted or was removed (Graph 10 / 200-299 / HTTP 403, LinkedIn 403). |
| `account_restricted` | action_required | The account cannot publish (restriction, PPA / 2FA requirement). |
| `provider_unavailable` | transient | Network error, timeout, 5xx / 408. |
| `invalid_request` | permanent | The network rejected the request itself (HTTP 400 / 422 on LinkedIn). |
| `not_connected` | action_required | No connection, disconnected, or no stored token (worker). |
| `connection_expired` | action_required | The connection expired, was revoked or errored (worker). |
| `page_not_authorized` | action_required | Instagram: no page token for the selected business account (worker). |
| `outcome_unknown` | action_required | The irreversible call may have happened (anything after the publishing checkpoint that is not an allow-listed definitive rejection); never retried automatically, manual retry, schedule and reset need acknowledgement. |
| `lease_expired` | transient | The lease ran out (SQL recovery) or the worker handed the target back for lack of time. |
| `internal_error` | transient | Unexpected failure inside the worker or a publisher. |

Also emitted by the publishers in their current form (kinds as in the source, `_shared/social-publish-*.ts`; re-sync this table when they change): `provider_rejected` (permanent, the network refused the request without a specific reason), `provider_response_invalid` (transient, unreadable answer), `api_version_unsupported` (permanent, LinkedIn 426), `invalid_account` (action_required, the stored account id is not valid), `media_url_invalid` (action_required, an image URL is not a valid https URL, or the worker refused it because it is not a public object of this Supabase project), `media_too_large` and `media_unreadable` (action_required, LinkedIn image download: over 30 MB, empty, or bytes that do not match the content-type).
