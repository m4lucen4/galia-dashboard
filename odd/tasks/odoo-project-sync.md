# Odoo project sync — implementation tracker

**Repository locator:** `odd/tasks/odoo-project-sync.md`
**Status:** The collaborator mapping migration, normal Edge Function deployment, direct `pg_net` sender preparation, and the single projects trigger are deployed. Vault presence/format checks passed without revealing values; this is not proof of secret validity or matching. The visible Odoo description is confirmed by screenshot. Customer UI confirmation remains pending the user's next source-field edit and save for project 421.

## Objective

Synchronize future Galia project INSERT, UPDATE, and DELETE events one-way to Odoo without changing browser CRUD, adding a queue, or providing browser feedback.

## Active simplified scope

The direct authenticated Database Webhook architecture supersedes all earlier local outbox and scheduler work. It accepts the standard Supabase webhook body, rereads current projects for INSERT/UPDATE, and uses `old_record.id` for DELETE.

| ID | Outcome | Status |
| --- | --- | --- |
| OD-S01 | Replaced the worker with authenticated webhook parsing, current-row reads, and bounded JSON-2 calls. | [x] |
| OD-S02 | Added exact project identity lookup, physical delete/no-op behavior, deterministic URL-gallery reconciliation, and owned collaborator reconciliation using service-only partner mappings. | [x] |
| OD-S03 | Removed the two unshipped outbox/scheduler migrations; added the sole mapping-table migration and replaced the operator runbook. | [x] |
| OD-S04 | Independent verification executed 24/24 passing mocked scenarios against the corrected source, covering current-state UPDATE, idempotent DELETE, stale events, optional field clearing, owned relation removal, authentication, failure handling, and the four corrected issues. Build and scoped lint passed. Real backend execution remains pending. | [x] |
| OD-S05 | Applied only the collaborator mapping migration to `mygqfdbloqojffhsurgo` as version `20260921150302`; readback confirmed an empty RLS-enabled, service-only table with no policies and no `projects` custom trigger. | [x] |
| OD-S06 | Deployed `odoo-project-sync` disabled with JWT verification; readback confirmed `ACTIVE` version 1 uses `disabled.ts`, which forces synchronization off before loading the handler. | [x] |
| OD-S07 | Made `ODOO_DATABASE` optional locally and omit `X-Odoo-Database` when unset or blank; locally verified absent, whitespace, and trimmed provided cases without remote calls. The earlier user-run JSON-2 metadata request already succeeded without this header. | [x] |
| OD-S08 | User accepted normal-title, unfiltered synchronization of future project changes in the controlled environment. Supabase MCP readback confirmed normal `index.ts` version 8 on `mygqfdbloqojffhsurgo`, retaining JWT and the environment enable switch; webhook setup and activation remain user-owned. | [x] |
| OD-S09 | Applied direct `pg_net` preparation as migration `20260921181019`: `pg_net` is installed and restricted `public.odoo_project_webhook()` metadata and ACLs were read back. No trigger was created; private Vault setup, readiness confirmation, and separate attachment consent remain pending. | [x] |
| OD-S10 | User-approved unfiltered future-change connection is attached through migration `20260921181906`. Vault metadata-only checks confirmed both entries are nonempty and line-break-free, with a JWT-shaped service key; this does not prove validity, service identity, or shared-secret matching. Readback confirmed exactly one enabled non-internal `odoo_project_sync` trigger for each-row AFTER INSERT/UPDATE/DELETE on `public.projects`, calling `public.odoo_project_webhook()`. No project 421 mutation, manual HTTP enqueue, or Odoo call was made. | [x] |
| OD-S11 | The user-supplied computed visible field `x_studio_html_field_292_1jh13q299` on `project.project` and the confirmed Studio screenshot establish a missing mapping, not missing Supabase text, as the root mismatch. Local checks passed and version 10 deploys the same escaped HTML (or `false` to clear) to it and standard `description`, with JWT, enable gate, and optional database header unchanged. UI effect remains pending the user's actual text change and save for project 421, then Odoo Datos reload. No Odoo view/schema edit or automatic replay. | [x] |
| OD-S12 | Version 11 deploys customer resolution from `projects.user → userData.uid → userData.id → res.partner.x_studio_mocklab_id`, writing the exact unique matched internal partner ID to `project.partner_id` on INSERT/UPDATE. `userData.id` is the external identity authority; `userData.odoo_id` is not used. Missing/ambiguous/mismatched identities fail closed before project or child writes; DELETE and missing-source UPDATE remain customer-read independent. No contact creation, new table, automatic replay, role-filter change, or photo-owner change. Customer UI confirmation remains pending the user's next project 421 save. | [x] |

## Files and boundaries

- `supabase/functions/odoo-project-sync/index.ts` — sole direct webhook handler. JWT gateway verification remains enabled in `supabase/config.toml`; the handler also requires the exact service-role bearer token and shared worker secret.
- `supabase/functions/odoo-project-sync/disabled.ts` — historical staged fail-closed entrypoint from version 1; it is not the current deployed entrypoint.
- `supabase/migrations/20260921150302_add_odoo_collaborator_partner_mappings.sql` — applied only integration table: `public.odoo_collaborator_partner_mappings` with service-only RLS/grants.
- `supabase/migrations/20260921181019_prepare_odoo_direct_webhook.sql` — applied direct `pg_net` preparation and restricted `public.odoo_project_webhook()` definition; it has no trigger, queue, Cron, or custom table.
- `supabase/migrations/20260921181906_attach_odoo_project_webhook.sql` — applied attachment of the sole `odoo_project_sync` trigger; do not edit this migration.
- `docs/odoo-project-sync-operator.md` — deployed baseline, remaining Dashboard setup, secrets, auth, mapping, and operational limits.
- Removed only `20260921140000_add_odoo_project_sync_outbox.sql` and `20260921150000_add_odoo_project_sync_scheduler.sql`. They were local and unapplied.

No source-of-truth RPC, attached SQL trigger, queue, lease, Cron, new Vault object, attachment mapping table, project mapping table, or contact mutation remains in the active implementation.

## Verification evidence

| Check | Result |
| --- | --- |
| `pnpm build` | Passed. Existing Vite warning remains: main bundle exceeds 500 kB. |
| Scoped `pnpm exec eslint` for all changed TypeScript | Passed. |
| Temporary external-stub `pnpm exec tsc --project ...` | Passed. It checks TypeScript against a minimal Deno/Supabase surface, not real Deno/Jsr execution. |
| `git diff --check` | Passed before the final tracker update; rerun required at handoff. |
| In-memory fetch-stub scenarios | A fresh independent rerun executed 24/24 passing scenarios against the corrected source using TypeScript transpilation, VM, and mocked Supabase/Odoo/fetch responses. Temporary files were removed; no test suite or test file was added to the repository. |
| Disabled-entrypoint local proof | Prior local preparation passed: a controlled TypeScript-transpile/VM stub started with `ODOO_SYNC_ENABLED=true`, evaluated `disabled.ts`, and confirmed it became `false` before `index.ts` evaluation; the network stub was not invoked. This proof did not itself establish remote completion. |
| Mapping migration deployment | Supabase MCP applied `add_odoo_collaborator_partner_mappings` successfully to `mygqfdbloqojffhsurgo`; migration history records version `20260921150302`. The local SQL was renamed to match the authoritative ledger without changing its 10 lines. |
| Mapping table readback | `row_count=0`, RLS enabled, no policies, anon/authenticated select/insert/update/delete denied, service-role CRUD allowed, and `projects_custom_trigger_count=0`. Policy-free RLS is intentional for a server-only table. |
| Disabled function deployment | Supabase MCP deployed `odoo-project-sync`: ID `e15c0a47-e8d6-4637-8eec-cc249eb38c4c`, version 1, `ACTIVE`, `verify_jwt=true`, entrypoint `disabled.ts`, bundle SHA-256 `619e2cb51e96e929f76b551ffac5f5b9f80b63f5a8f788531564af20a5c9226c`. Readback confirmed `Deno.env.set("ODOO_SYNC_ENABLED", "false")` occurs before `await import("./index.ts")`. |
| Optional database header correction | Local TypeScript-transpile/VM fetch-stub check passed: absent and whitespace-only `ODOO_DATABASE` omitted `X-Odoo-Database`; a named value added the exact trimmed header. No network request or credentials were used. |
| Normal function deployment | Supabase MCP readback confirmed `odoo-project-sync`: ID `e15c0a47-e8d6-4637-8eec-cc249eb38c4c`, version 8, `ACTIVE`, `verify_jwt=true`, entrypoint `index.ts`, bundle SHA-256 `927febab4ea0c876393616f20a5f8c9f2c71c0ff29909d888323fa1a8d46cd82`. Returned source contains the exact `ODOO_SYNC_ENABLED === "true"` gate and optional, trimmed `ODOO_DATABASE` header behavior. |
| Direct sender preparation | Supabase MCP applied `prepare_odoo_direct_webhook` successfully to `mygqfdbloqojffhsurgo` as version `20260921181019`. Readback confirmed `pg_net` 0.14.0, `public.odoo_project_webhook()` with `SECURITY DEFINER` and `search_path=pg_catalog`, and EXECUTE denied to anon, authenticated, and service_role. `net.http_post(text, jsonb, jsonb, jsonb, integer)` matches the call. The prior zero-trigger state is historical; `supabase_functions` remains absent intentionally. |
| Trigger attachment | Supabase MCP applied `attach_odoo_project_webhook` successfully as version `20260921181906`. Readback confirmed exactly one non-internal enabled `odoo_project_sync` trigger, for each-row AFTER INSERT, UPDATE, and DELETE, executing `public.odoo_project_webhook()`. `SET LOCAL lock_timeout = '5s'` preceded `CREATE TRIGGER`. No source row was updated and no HTTP request was enqueued. |
| First live delivery | The user reported project 421 updated at `2026-09-21T18:24:39.195Z`; `pg_net` request 1 returned HTTP 200 with `synced` at `2026-09-21T18:24:39.999Z` under correlation `b2a7a9b7-fd6c-4300-bbb2-f74c08c79bcb`. This proves that one authenticated delivery completed, not that the visible Odoo description field was mapped or that CREATE/DELETE are validated. |
| Description mapping correction | Local `projectValues` computes `plainHtml(project.description)` once and sends it to both standard `description` and the user-supplied visible Studio field `x_studio_html_field_292_1jh13q299`. ESLint, build, `git diff --check`, and five TypeScript-transpile/VM cases (plain text, newline, special characters, null, empty) passed. Version 10 deployed this correction; the visible description is now confirmed by screenshot. |
| Customer mapping deployment readback | Parent deployed version 11 of `odoo-project-sync`, `ACTIVE`, ID `e15c0a47-e8d6-4637-8eec-cc249eb38c4c`, `verify_jwt=true`, entrypoint `index.ts`, bundle SHA-256 `fa16b1b68821d15ae04e1c674ede41329b7358fe93c257af6a47ab4e528a0487`. Fresh independent readback verified the authentication guard, optional database header, dual description mapping, and customer resolution before project or child writes; DELETE remains independent. ESLint and `git diff --check` passed. No post-deployment Odoo functional query or customer UI confirmation was performed. |

The independent rerun confirmed DELETE without category/image/partner settings, missing-source UPDATE without category/image mappings, rejection of null/blank/invalid coordinates, preservation of binary forged-marker attachments, safe structured error logs, and malformed JSON `400`. Captured write bodies used current source values and omitted stage/CRM fields. These are mocked local checks, not proof of real Odoo or Database Webhook end-to-end execution. The deployed function and migration were read back; one prior user-initiated delivery completed, while no manual invocation was performed.

## Remaining operational limits

- The managed Dashboard webhook helper remains uninitialized; its unavailable enable action is not repaired by the deployed custom function. The custom trigger is attached; do not create a second Dashboard or SQL webhook.
- Version 11 uses the normal `index.ts` entrypoint. Synchronization requires the user-owned `ODOO_SYNC_ENABLED=true` Dashboard setting; `ACTIVE` does not prove the flag is true, a webhook exists, or Odoo works. There is no backfill or automatic catch-up.
- Missing collaborator mappings and unmapped categories block before remote writes. No fuzzy contact matching or `res.partner` mutation exists.
- There are no blind retries after remote write timeout/ambiguity. Operators recover from redacted backend logs.
- Current-row checks reduce stale events, but webhook delivery/order/duplicates and concurrent deletion are not fully transactional across Supabase and Odoo.
- The migrations, normal Edge Function deployment, and trigger attachment were completed. Vault checks confirmed only presence/format booleans; no values were recorded or returned. Edge keys and category mappings are user-reported as configured, while the user-owned enable flag has not been independently read. No mapping rows were inserted. One user-initiated project 421 update produced the recorded HTTP 200 delivery. Version 10 includes the corrected visible-description mapping, but Odoo visual validation remains pending.
- Version 10 retains the optional database-header behavior: absent or blank `ODOO_DATABASE` omits `X-Odoo-Database`, while a non-blank value is trimmed and sent.
- The `rls_enabled_no_policy` advisor for the new mapping table is expected for intentional service-only access: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy. Other advisory warnings are pre-existing and unrelated; no changes were made to them.
- Native review remains pending at the provider's untracked-file selection step; no approval or receipt is claimed. User-approved remote delivery under ordinary repository policy is separate from native review.

## Historical rationale — superseded

Earlier local drafts used an outbox/scheduler to pursue durable ordering and retry semantics. They were never deployed. The approved replacement deliberately trades that complexity for a direct authenticated webhook, retaining explicit failure reporting and source rereads while documenting the residual delivery and ordering limits.

## Next step

The managed Dashboard webhook attempt failed with schema `supabase_functions` missing, and its enable action is not present. The direct sender and its sole trigger were applied without repairing platform schemas or Dashboard UI. Version 11 contains the corrected description and customer mappings. Next, make an actual source-field change to project 421 in Mocklab and save it, then refresh Odoo and check the customer. Do not manually write Odoo, create another UI webhook, manually invoke HTTP, or replay the project. This is future-change only, not a backfill; real Odoo CREATE and DELETE verification remains pending.
