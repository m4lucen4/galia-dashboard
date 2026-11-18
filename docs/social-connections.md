# Social connections (LinkedIn and Instagram accounts)

How users connect LinkedIn and Instagram, where the tokens live, and how the user learns that a connection is about to stop working. Part of the n8n migration (`odd/tasks/social-publishing-migration.md`, phase 2).

## Data

Migration: `supabase/migrations/20261118000300_social_connections.sql`.

| Table | Content | Access |
|---|---|---|
| `social_connections` | One row per user and network: `status`, `status_reason`, account id and name, scopes, publishable `pages` (no tokens), expiry dates, last check, last notice. | Owner and admins read it from the browser (RLS). Only `service_role` writes. |
| `social_credentials` | Tokens: `user_access`, `refresh` (LinkedIn), `page_access` (Instagram, one per page id). | `service_role` only. Never returned to the browser. |

### Status

| Status | Meaning | Shown to the user |
|---|---|---|
| `connected` | Works. | Connected |
| `expiring` | Stops working within 7 days. | Reconnect soon (date) |
| `expired` | The effective expiry passed. | Reconnect |
| `revoked` / `error` | The network rejected the token or a permission (`status_reason`). | Reconnect, with the reason |
| `disconnected` | The user disconnected. Credentials deleted. | Connect |

Effective expiry (`expires_at`):

- **LinkedIn:** the refresh token expiry (365 days after the first authorization) when there is a refresh token, because the access token (60 days) is renewed automatically; otherwise the access token expiry.
- **Instagram:** the data access expiry (Meta stops data access 90 days after the user's last activity; long-lived page tokens do not expire by themselves); otherwise the user token expiry.

### RPCs (service_role only)

| RPC | Use |
|---|---|
| `social_connection_store(user, network, account_id, account_name, scopes, access_expires_at, refresh_expires_at, data_access_expires_at, credentials)` | After OAuth. Replaces every credential, resets health and notices. `credentials`: `[{kind, externalId?, token, expiresAt?}]`. |
| `social_connection_set_pages(user, network, pages, page_credentials)` | Publishable pages `[{id, name, type, username?, facebookPageId?, facebookPageName?, vanityName?}]` (keys containing "token"/"secret" are rejected) and their page tokens. |
| `social_connection_report(connection, status, reason, access_expires_at, refresh_expires_at, data_access_expires_at, credentials, refreshed, expected_connected_at)` | Result of a health check or refresh. `status` null recomputes from dates; `revoked`/`error` need a reason. No-op on disconnected connections. `expected_connected_at` (last parameter, default null): the `connected_at` the worker read when the check started; when given and different from the row's, the user reconnected during the run and the stale report is dropped (nothing changes, the current summary is returned). When the recomputed status is `connected`, `notified_status` / `notified_at` are cleared so a later expiry notifies again. |
| `social_connection_disconnect(user, network)` | Deletes credentials and pages. |
| `social_connection_for_user(user, network)` | Summary without tokens. |
| `social_credentials_get(connection)` | Tokens, for server-side use only. |
| `social_connections_due_check(limit)` | Connections not checked in the last 20 hours, plus `revoked` connections whose notice is still pending (they are not checked again, only their email is retried). |
| `social_connection_claim_notice(connection)` | Returns `{connection, email, firstName, language}` once per new `expiring`/`expired`/`revoked`/`error` status, null otherwise. |
| `social_connection_release_notice(connection, status)` | Gives the notice back (`notified_status` / `notified_at` to null) when they still equal `status`; returns whether it did. Called when the Resend send fails, so the next run retries. |

## Edge Functions

The two OAuth functions take `POST` with the user's Supabase session (`Authorization: Bearer <JWT>`) and a JSON body `{ action, ... }`. They resolve the user through Supabase Auth `/user` (never a decoded JWT), so they are deployed with `verify_jwt = false` like the other handlers that validate identity themselves. They answer `{ connection }` (the summary above; `null` for `status` when the user never connected) or `{ code, message, retryable }`. They never return tokens.

| Function | Actions (`body.action`) |
|---|---|
| `social-connect-linkedin` | `exchange` `{code, redirectUri}` (code → access + refresh token, member id and name through `/v2/userinfo`) · `pages` (the member plus the organizations where they are an approved `ADMINISTRATOR`, versioned REST API `Linkedin-Version: 202611`) · `status` · `disconnect` |
| `social-connect-instagram` | `exchange` `{code, redirectUri}` (Graph v27.0: short-lived → long-lived user token, `debug_token`, `/me`, then the pages with an `instagram_business_account` and their page tokens) · `pages` · `status` · `disconnect` |
| `social-credentials-check` | `POST` only, worker header `X-Social-Worker-Secret` (64 hex, constant-time comparison with `SOCIAL_WORKER_SECRET`). Loops `social_connections_due_check(50)`. LinkedIn: refreshes the access token when it expires within 7 days and a refresh token exists (`invalid_grant` → `revoked` / `token_invalid`). Instagram: `debug_token` on the user token and on every page token, and the decision comes from the **page tokens** (the ones that publish): `revoked` / `token_invalid` only when every page token is invalid (or there are no page tokens and the user token is invalid); `revoked` / `permission_missing` when no valid page token carries `instagram_content_publish` (a page token that reports no scopes is not judged; with no page tokens the user token is checked); otherwise status null with the reported `data_access_expires_at`, so the dates drive `expiring` / `expired`. An invalid or expired user token alone is therefore not a revocation. Network or 5xx errors leave the status untouched. Every report carries `expected_connected_at` (the `connectedAt` read from `social_connections_due_check`); when the database drops it because of a reconnection during the run, the worker skips that connection and does not touch the mirror. After each report it calls `social_connection_claim_notice` and sends the Resend email when a recipient comes back; if the send fails it calls `social_connection_release_notice` so the next run retries (a `revoked` connection is listed by the due check only for that retry). Answers counts: `checked, refreshed, revoked, unchanged, skipped, failed, mirrorRepairs, mirrorUserDataMissing, notices, emailsSent, emailsFailed, noticesReleased, deadlineReached`. |

Rules of `exchange`: `redirectUri` must belong to an origin of `SOCIAL_OAUTH_REDIRECT_ORIGINS` (no credentials, query or fragment; `http` only for localhost) and must be the exact string used in the authorization request; `code` is 8–2048 printable ASCII characters. Instagram refuses a token without `instagram_content_publish` (`permission_missing`) and keeps the connection if the immediate page fetch fails (`pages` retries it).

Errors (closed set): `invalid_request` 400, `unauthorized` 401, `forbidden` 403, `not_connected` 409, `provider_unavailable` 503 (retryable), `provider_rejected` 422, `token_invalid` 422, `permission_missing` 422, `internal_error` 500 (retryable). Provider text is never returned or logged; logs carry the code only.

The worker stops after about 110 s; connections not reached stay due, so cron may call it more often than daily (a connection is checked at most every 20 hours anyway).

Email (Resend, `Mocklab <noreply@mocklab.app>`): Spanish by default, English when `userData.language` starts with `en`, Catalan when it starts with `ca` (`cat`). It names the network, the status (expiring with date, expired, revoked with the reason) and links to `${APP_BASE_URL}/settings`. A failed email is logged and never fails the run.

### Browser

- The OAuth `state` (CSRF) is 32 bytes from `crypto.getRandomValues`, hex encoded, kept in `localStorage` until the callback.
- The publish configuration warns that the connection "expires before publishing" whenever the connection is `connected` or `expiring` and its `expiresAt` is earlier than the selected publish instant. The stored `publishDate` (`YYYY-MM-DD HH:mm:ss+00`) is Madrid wall-clock labelled `+00`, so it is read as Europe/Madrid wall-clock (DST included) to get the real instant before comparing.

### Server configuration

| Variable | Used by |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | all three (RPCs and the `userData` mirror) |
| `SUPABASE_ANON_KEY` | OAuth functions (Auth `/user`) |
| `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` | `social-connect-linkedin`, worker (refresh) |
| `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` | `social-connect-instagram`, worker (`debug_token` with the app token) |
| `SOCIAL_OAUTH_REDIRECT_ORIGINS` | OAuth functions: comma-separated allowed origins, e.g. `https://www.mocklab.app,http://localhost:5173` |
| `SOCIAL_WORKER_SECRET` | worker: 64 hex characters |
| `RESEND_API_KEY` | worker |
| `APP_BASE_URL` | worker, optional (default `https://www.mocklab.app`) |

Shared code: `supabase/functions/_shared/social-*.ts`.

## Coexistence with n8n (until the cutover)

n8n still publishes with tokens it reads from `userData.linkedln_data.access_token` (plus `linkedin_person_id`, `permissions_granted`) and from `projectsPreview.checkSocialNetworks.instagram.accessToken`. Until the cutover:

- The OAuth functions and the worker also write those `userData` fields in the same shape as the old functions (`linkedln_data`: `linkedin_person_id, access_token, refresh_token, id_token, token_expires_at, is_connected, permissions_granted, user_name, connected_at, admin_pages, pages_fetched_at`; `instagram_data`: `instagram_user_id, access_token, token_expires_at, data_access_expires_at, is_connected, username, user_id, app_id, connected_at, permissions_granted, granular_scopes, token_type, application, issued_at, business_pages` (with `page_access_token`), `pages_fetched_at`). The write merges into the existing JSON, so unknown keys survive. `permissions_granted` is written as the old client wrote it: the old hard-coded list (`openid, profile, w_member_social, email, r_organization_admin, w_organization_social, r_basicprofile, rw_organization_admin, r_organization_social`) first, then any other scope LinkedIn returned, without duplicates. On every LinkedIn check (not only right after a refresh) the worker re-syncs the mirror: when `userData.linkedln_data.access_token` differs from the current server `user_access` token (and the connection is not disconnected) it rewrites `access_token`, `token_expires_at` and `refresh_token` (when there is one) and keeps every other key, so a failed mirror write is repaired on the next run; repairs outside a refresh are counted in `mirrorRepairs`. Tokens are never logged. A disconnect only sets `is_connected: false`. A mirror failure is logged and does not undo the stored connection. A missing `userData` row is never a silent no-op: it is logged as `user_data_missing` (and counted in `mirrorUserDataMissing` by the worker); an existing row with an empty column is left alone.
- **Page token exposure (accepted, transitional).** The bridged page token in `projectsPreview.checkSocialNetworks.instagram.accessToken` is readable from the browser by the publication owner and by admins through the `projectsPreview` RLS (the dashboard loads rows with `select("*")` and keeps them in Redux). Page tokens are not returned by the social functions and are not readable in `social_credentials`, but this copy is. The cost is accepted only while n8n still reads that column; it disappears at the cutover, when the trigger and the column content are removed and the publisher reads `social_credentials` server-side. The new client never writes or displays it.
- The trigger `bridge_instagram_page_token` fills `checkSocialNetworks.instagram.accessToken` from `social_credentials` when the browser saves an Instagram selection without a token.
- The old functions (`linkedin-*`, `instagram-*`) stay deployed and untouched.

Browser access to the token columns of `userData` is revoked only after the new client is deployed.
