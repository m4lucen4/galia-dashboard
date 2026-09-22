# Odoo project sync operator runbook

## Status

The collaborator mapping table, normal Edge Function handler, direct `pg_net` sender, and the single `public.projects` trigger are deployed to production. The last recorded deployment is v14 of `odoo-project-sync` with JWT verification and the user-owned `ODOO_SYNC_ENABLED=true` environment gate. Its deployed customer resolver used the historical external-key chain. The current local direct-ID policy is not deployed or remotely audited. The sender adds no queue, Cron, dashboard feedback, catch-up, or automatic retry.

## Deployed baseline

1. Migration `20260921150302_add_odoo_collaborator_partner_mappings.sql` is recorded as version `20260921150302`. It created the only integration table, `public.odoo_collaborator_partner_mappings`, for service-only collaborator UUID to existing Odoo partner ID mappings.
2. The last recorded deployment is version 14 (`e15c0a47-e8d6-4637-8eec-cc249eb38c4c`), status `ACTIVE`, with `verify_jwt=true`, entrypoint `index.ts`, and bundle SHA-256 `11650718033de79d667254b396cd5272d8d8644a38e77cde21290b396c772d4a`. Its source readback matched the then-local Maps and collaborator changes, but its customer resolver still used the historical external-key contract. The bundle SHA identifies the deployed bundle, not a byte-hash proof of the reviewed source. `ACTIVE` means hosting is ready, not that synchronization is enabled or Odoo is verified.
3. Readback confirmed the mapping table is empty, RLS is enabled with no policies, anon/authenticated CRUD is denied, and service-role CRUD is allowed. The policy-free RLS advisory is intentional for this server-only table; no public access policy is required.
4. Migration `20260921181019_prepare_odoo_direct_webhook.sql` is recorded as version `20260921181019`. Readback confirmed `pg_net` 0.14.0, `public.odoo_project_webhook()` as `SECURITY DEFINER` with `search_path=pg_catalog`, and no EXECUTE privilege for anon, authenticated, or service_role. It uses the verified `net.http_post(text, jsonb, jsonb, jsonb, integer)` signature. No HTTP enqueue, invocation, Vault lookup, trigger attachment, Odoo request, project 421 change, extra business table, Cron, or platform bootstrap was performed.
5. Migration `20260921181906_attach_odoo_project_webhook.sql` is recorded as version `20260921181906`. Readback confirmed exactly one non-internal `public.projects` trigger: `odoo_project_sync`, enabled, `AFTER INSERT OR UPDATE OR DELETE FOR EACH ROW`, executing `public.odoo_project_webhook()`. `SET LOCAL lock_timeout = '5s'` precedes its `CREATE TRIGGER`. No project 421 update, manual HTTP enqueue, Odoo call, or Edge Function change was performed.

## Current operational status

1. The user reports the required Edge Function secrets are configured and that synchronization works. This is user confirmation, not a fresh secret or remote configuration audit; no values are recorded. Required names are `ODOO_SYNC_ENABLED`, `ODOO_JSON2_URL`, `ODOO_API_KEY`, `ODOO_PROJECT_SYNC_WORKER_SECRET`, and `ODOO_CATEGORY_MAPPINGS`; `ODOO_DATABASE` and `ODOO_SYNC_EXTRA_IMAGE_HOSTS` are optional. Set `ODOO_DATABASE` only when the Odoo host requires database selection; when omitted or blank, the function omits `X-Odoo-Database`. `SUPABASE_URL` and the matching legacy `SUPABASE_SERVICE_ROLE_KEY` are runtime values. DELETE needs only the Odoo connection/authentication settings; category and image settings are evaluated only for a live source row.
2. Populate collaborator mappings only for existing Odoo contacts. INSERT/UPDATE synchronizes the parent and collaborators with valid mappings; unmapped collaborators are skipped with a bounded, non-PII warning and retain their Galia data. The function never guesses, creates, or changes `res.partner` records, and never removes an existing Odoo collaborator merely because its source mapping is absent.
3. **Current local source policy — not deployed:** each INSERT/UPDATE resolves `projects.user → userData.uid → userData.odoo_id`, validates a positive signed 32-bit integer, and writes it directly to `project.project.partner_id`. There is no `res.partner` customer call and no fallback to `userData.id` or `x_studio_mocklab_id`. Invalid/null IDs fail closed with `invalid_project_customer_id`; missing owner/account and owner-query failures retain their existing reason codes. The reported contact-28 mismatch for project 426 owner `id=51, odoo_id=13` is user-reported, not a fresh remote audit.
4. Vault readiness was checked without exposing values: both `odoo_webhook_service_role` and `odoo_webhook_worker_secret` have exactly one nonempty value with no line breaks; the service-role value is JWT-shaped. This does not prove JWT cryptographic validity, service identity, or that the worker secret matches the Edge secret.
5. The function sends only `{ type, schema, table, record, old_record }` with project IDs, matching the handler's current-row reread contract. `pg_net` enqueues after commit; no replay, backfill, or delivery guarantee exists. HTTP outcomes are recorded by `net._http_response`, not returned to the original project mutation.
6. The approved scope is unfiltered future synchronization with normal project titles; the function has no title-prefix filter. Do not manually write Odoo, create another Dashboard UI webhook, manually invoke HTTP, enqueue a request, or replay a project.
7. Project 421 produced the recorded live UPDATE delivery. The visible description and customer are user-confirmed working after the v10/v11 corrections. This does not independently prove a fresh post-hook INSERT, physical DELETE, gallery deltas, or collaborator reconciliation; ask the user whether these have already been exercised before proposing a destructive pilot.
8. The pilot does not backfill events. When explicitly authorized, inspect only sanitized `net._http_response` metadata and redacted logs; do not read request headers, Vault plaintext, or secrets.

The managed Database Webhook feature remains uninitialized because its `supabase_functions` schema is missing and the enable action is absent. Do not create platform-owned schemas, roles, Docker bootstrap objects, or another UI webhook to repair it. The custom direct trigger does not change that UI state. Do not add a second SQL trigger, Cron job, queue, or custom business table.

## Authentication and activation

The Edge gateway JWT check and the function both require the exact service-role token. The function also requires the shared `x-odoo-sync-worker-secret`, compared in constant time. Do not put either secret in browser code, SQL, logs, URLs, or source files.

The active normal handler evaluates `ODOO_SYNC_ENABLED` exactly as `"true"`. A valid authenticated webhook returns `204` without any Odoo call while the flag is absent or any other value. When `ODOO_DATABASE` is omitted or blank, it omits `X-Odoo-Database`; a non-blank value is trimmed and sent. Enabling starts with future changes only; the webhook does not backfill existing projects.

## Sync behavior

| Event | Behavior |
| --- | --- |
| INSERT / UPDATE | Ignores snapshot business fields and rereads the current `public.projects` row by ID with service role. The current local policy resolves the persisted owner to its validated direct `odoo_id` and writes it as `partner_id`; cloned projects naturally use their current owner. It searches projects by exact `x_mocklab_id`, including archived records: zero creates, one writes supplied fields, more than one fails. A missing current row follows the delete path. |
| DELETE | Uses `old_record.id`, searches the same exact ID including archived records, physically unlinks exactly one remote project, and treats zero matches as success. Duplicates fail. |
| Gallery | Uses only canonical allowed public HTTPS URLs from `image_data`. It creates URL attachments with deterministic `mocklab-project:<projectId>:<sha256(url)>` names, adds/removes only verified `type='url'` owned gallery relations, and never copies binaries or deletes `ir.attachment` rows. |
| Collaborators | Uses UUID markers in `x_name` plus `x_origen='formulario'` to identify ownership. It updates/removes only verified owned rows, preserves manually reclassified rows, and does not manage the legacy `x_studio_contactos_relacionados` field. |

Nullable optional fields are sent as `false` to clear their mapped Odoo fields. The function never broad-writes stage, CRM, tags, photo-owner, manual attachment, or manual collaborator data. Customer resolution does not alter role filters, photo ownership, or collaborator ownership behavior.

## Failure handling and limits

- Invalid input, missing configuration, owner/customer mapping failures, unmapped categories, duplicate remote identities, and ambiguous owned child markers fail with a non-2xx response and a redacted backend log containing correlation ID, event type, project ID where available, and a stable reason code. Unmapped collaborators are skipped and warned without personal data. Response bodies remain generic.
- There are no blind retries after a remote timeout or write ambiguity. Operators must inspect logs and reconcile manually.
- The function validates payload identity before network access, bounds requests to 10 seconds each and 45 seconds overall, and does not log Odoo response bodies, descriptions, images, or secrets.
- Current-row checks before create and after success reduce stale resurrection, but this is not a distributed transaction. Database Webhooks do not guarantee ordering, delivery, exactly-once processing, or complete concurrent-delete protection. Duplicate requests can still cause operator-owned reconciliation.
- The sender function catches only errors inside its credential lookup/enqueue branch so a configured delivery failure logs a fixed tag, project ID, event, and SQLSTATE while preserving the Mocklab mutation. It explicitly rethrows query cancellation. It never logs secret values, HTTP headers, SQL error text, or payload business fields.
- An UPDATE after a DELETE rereads the missing source and issues a delete/no-op rather than recreating stale snapshot data.
- The prior project 421 update was reported at `2026-09-21T18:24:39.195Z`; `pg_net` request 1 returned HTTP 200 `synced` at `2026-09-21T18:24:39.999Z` with correlation `b2a7a9b7-fd6c-4300-bbb2-f74c08c79bcb`. The user subsequently confirmed the visible description, customer, and overall integration work. This is user-reported end-to-end proof, not a fresh independent API audit; fresh INSERT, DELETE, gallery, and collaborator cases remain individually unrecorded.

## Advisory context

The production security advisor reports `rls_enabled_no_policy` for the new mapping table. This is expected because access is intentionally service-only: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy. Other reported warnings were pre-existing and unrelated; no changes were made to them.

## Historical note

The previous local outbox and scheduler migrations were never applied and have been removed. The earlier version 1 disabled-entrypoint deployment, version 10 description-mapping deployment, and prior no-trigger state are historical only; version 11 is the active normal-handler deployment and migration `20260921181906` attached the current trigger. The 24 historical mocked handler checks and seven customer-mapping VM cases validate handler behavior only; they are not proof of post-deployment Odoo delivery. There is no legacy queue or Cron state to activate or recover.
