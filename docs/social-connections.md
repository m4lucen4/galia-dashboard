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
| `social_connection_report(connection, status, reason, access_expires_at, refresh_expires_at, data_access_expires_at, credentials, refreshed)` | Result of a health check or refresh. `status` null recomputes from dates; `revoked`/`error` need a reason. No-op on disconnected connections. |
| `social_connection_disconnect(user, network)` | Deletes credentials and pages. |
| `social_connection_for_user(user, network)` | Summary without tokens. |
| `social_credentials_get(connection)` | Tokens, for server-side use only. |
| `social_connections_due_check(limit)` | Connections not checked in the last 20 hours. |
| `social_connection_claim_notice(connection)` | Returns `{connection, email, firstName, language}` once per new `expiring`/`expired`/`revoked`/`error` status, null otherwise. |

## Edge Functions

All take `POST` with the user's Supabase session (`Authorization: Bearer <JWT>`), resolve the user through Supabase Auth, and answer `{ connection }` (the summary above) or `{ code, message, retryable }` on error. They never return tokens.

| Function | Actions (`body.action`) |
|---|---|
| `social-connect-linkedin` | `exchange` `{code, redirectUri}` · `pages` · `status` · `disconnect` |
| `social-connect-instagram` | `exchange` `{code, redirectUri}` (short-lived → long-lived user token, `debug_token`, pages with `instagram_business_account`) · `pages` · `status` · `disconnect` |
| `social-credentials-check` | Worker, called by cron with the worker secret header. Refreshes LinkedIn access tokens expiring within 7 days, checks Instagram tokens with `debug_token`, reports status, sends the Resend email when `social_connection_claim_notice` returns a recipient. |

Server configuration: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `RESEND_API_KEY`, worker secret.

## Coexistence with n8n (until the cutover)

n8n still publishes with tokens it reads from `userData.linkedln_data.access_token` (plus `linkedin_person_id`, `permissions_granted`) and from `projectsPreview.checkSocialNetworks.instagram.accessToken`. Until the cutover:

- The OAuth functions and the worker also write those `userData` fields in the same shape as the old functions.
- The trigger `bridge_instagram_page_token` fills `checkSocialNetworks.instagram.accessToken` from `social_credentials` when the browser saves an Instagram selection without a token.
- The old functions (`linkedin-*`, `instagram-*`) stay deployed and untouched.

Browser access to the token columns of `userData` is revoked only after the new client is deployed.
