# Odoo project sync handoff

**Primary source of truth for the next agent.** Last verified from local repository evidence and user-supplied production proof on 2026-09-22. This is **not a fresh remote audit**; do not infer remote state beyond the evidence recorded here.

## Resume quick start

1. Read this handoff, then `docs/odoo-project-sync-operator.md` for operational limits and `odd/tasks/odoo-project-sync.md` for implementation history.
2. Do **not** redo migrations, deployment, secret setup, Dashboard webhook setup, or the pilot edit. The user reported the integration is working and may push their committed work.
3. If further work is requested, first identify the exact unverified scenario. Do not perform destructive pilots or remote calls without explicit authorization.
4. Keep this one-way: Mocklab project CRUD may update Odoo; Odoo must not update the Mocklab UI, including for admins.

## Architecture

| Layer | Implemented behavior |
| --- | --- |
| Source | `public.projects` in Galia / Supabase. Browser CRUD is unchanged. |
| Sender | One `AFTER INSERT OR UPDATE OR DELETE FOR EACH ROW` trigger calls `public.odoo_project_webhook()`. |
| Transport | The trigger retrieves runtime Vault credentials and asynchronously enqueues `pg_net` HTTP. It sends a minimal ID-only webhook body. |
| Receiver | Authenticated `odoo-project-sync` Edge Function rereads current Supabase state for INSERT/UPDATE and calls Odoo JSON-2. |
| Destination | `https://mocklab.odoo.com`; documentation states Odoo SaaS 19.2. The initial JSON-2 metadata check used no database header. |
| Direction | Future Mocklab changes only. No feedback, backfill, queue, Cron, retry guarantee, ordering guarantee, or exactly-once guarantee. |

The rejected alternatives were eleven custom tables, an outbox, and a scheduler/Cron. The two related local migrations were deleted **unapplied**; no legacy service cleanup is needed. Built-in Vault and `pg_net` metadata are not a business framework.

## Deployed state

### Supabase

- Project: `mygqfdbloqojffhsurgo`, PostgreSQL 15.8.
- Do not reapply migrations blindly, rebuild namespaces, or alter existing `projects` RLS/columns.
- `20260921150302_add_odoo_collaborator_partner_mappings.sql` is applied.
  - Creates the sole custom table: `public.odoo_collaborator_partner_mappings`.
  - `collaborator_id uuid` is the primary key; `odoo_partner_id integer > 0`.
  - RLS is enabled with no policies intentionally; anon/authenticated CRUD is denied and `service_role` CRUD is allowed.
  - Last verified empty; no mapping rows were inserted by the assistant.
- `20260921181019_prepare_odoo_direct_webhook.sql` is applied.
  - `pg_net` 0.14 is installed in schema `extensions`; the callable function is `net.http_post`.
  - Pre-existing Vault extension metadata was observed as `supabase_vault` 0.3.1 in schema `vault` with plaintext column `decrypted_secret`.
  - `public.odoo_project_webhook()` is `SECURITY DEFINER`, fixed `search_path=pg_catalog`, and has no EXECUTE for `PUBLIC`, anon, authenticated, or service_role.
  - It uses a fixed Edge URL, runtime-only Vault lookup, no CR/LF credentials, 60-second `pg_net` timeout, redacted SQLSTATE-only delivery-preparation logs, and rethrows cancellation.
- `20260921181906_attach_odoo_project_webhook.sql` is applied.
  - Exactly one enabled non-internal trigger exists: `odoo_project_sync` on `public.projects`.
  - It is `AFTER INSERT OR UPDATE OR DELETE FOR EACH ROW`; installation used a five-second lock timeout.
- Managed Dashboard Webhook creation failed because `supabase_functions` is absent and the Enable control was absent. This is intentional: do not create platform schemas, roles, Docker bootstrap SQL, or a second Dashboard/SQL webhook.

### Edge Function

- Active function: `odoo-project-sync`, ID `e15c0a47-e8d6-4637-8eec-cc249eb38c4c`.
- Last recorded active deployment: v14, entrypoint `index.ts`, `verify_jwt=true`, bundle SHA-256 `11650718033de79d667254b396cd5272d8d8644a38e77cde21290b396c772d4a`. Its complete source readback matched the then-local source; that deployed customer resolver used the historical external-key contract below.
- `disabled.ts` is a historical v1 fallback, not the current entrypoint.
- Supabase version counters may change outside this repository. If remote inspection is explicitly authorized, inspect source/configuration rather than trusting a version number alone.
- Required Edge environment names: `ODOO_SYNC_ENABLED`, `ODOO_JSON2_URL`, `ODOO_API_KEY`, `ODOO_CATEGORY_MAPPINGS`, `ODOO_PROJECT_SYNC_WORKER_SECRET`; optional `ODOO_DATABASE`, `ODOO_SYNC_EXTRA_IMAGE_HOSTS`; managed `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Synchronization is live only when `ODOO_SYNC_ENABLED` is exactly `true`. `ODOO_DATABASE` is trimmed and its `X-Odoo-Database` header is omitted when absent/blank.
- Authentication requires gateway JWT verification, the exact legacy `service_role` JWT bearer, and `x-odoo-sync-worker-secret`. Do not replace this with anon, `sb_secret`, or public access.
- Vault names are `odoo_webhook_service_role` and `odoo_webhook_worker_secret`. Presence, uniqueness, nonempty/no-CRLF, and JWT-shape booleans were checked without exposing values. Vault values and Edge secrets are not automatically the same; user setup reported the intended shared worker value.

## Verified mapping

### Identity and project fields

- Mocklab `projects.id` is a bigint source identifier; Odoo `project.project.x_mocklab_id` is a positive signed 32-bit integer. Values above `2147483647` fail validation.
- Exact Odoo project lookup uses `x_mocklab_id`, `active_test=false`, and `limit: 2`: zero creates, one updates/deletes, duplicates fail. There is no arbitrary duplicate deletion.
- `title → name`; the mapper has a deliberately narrow field list. It does not broad-write stage, CRM, tags, photo ownership, or manual child data.
- Description is escaped once to HTML and written to both `description` and visible Studio field `x_studio_html_field_292_1jh13q299`; `false` clears both.
- `googleMaps → x_studio_google_maps`: legacy `{lat,lng}` JSON remains supported. Links must be normalized, credential-free HTTPS with no non-default port on exactly `google.com`, `www.google.com`, `maps.google.com`, or `maps.app.goo.gl`; legacy `goo.gl` links must use `/maps` or `/maps/...`. The mapper HTML-escapes both anchor URL and text. Regional domains and other hosts are unsupported; it does not follow redirects or fetch links.
- Source category slugs map through `ODOO_CATEGORY_MAPPINGS` to `x_studio_tipologia` using many-to-many commands. Authoritative supplied IDs: residencial 8, docente 2, oficinas 6, planeamiento 7, industrial 10, cultural 1, publico 4, rehabilitacion 11, interiorismo 5, sanitario 9. `equipamiento-publico` 3 is not a current form option. These IDs came from a 17 September colleague document, not a fresh full Odoo catalog.

### Customer and collaborators

- **Current local source policy — not deployed or remotely audited:** INSERT/UPDATE resolve `projects.user` UUID → `userData.uid` → `userData.odoo_id`, validate it as a positive signed 32-bit integer, and send it directly as `project.project.partner_id`. The resolver neither queries nor mutates `res.partner`, and never falls back to `userData.id` or `x_studio_mocklab_id`.
- Missing/invalid direct IDs fail before project or child writes with `invalid_project_customer_id`; missing owner/account and owner-read failures retain their existing fail-closed codes. No customer table or mapping is added.
- The v14 deployed resolver's external-key contract (`userData.id → res.partner.x_studio_mocklab_id`) is historical and superseded locally. The report that it selected contact 28 for project 426 owner `id=51, odoo_id=13` is user-reported evidence, not a fresh remote audit.
- Collaborators require explicit UUID-to-existing-Odoo-partner rows for collaborator writes. INSERT/UPDATE still synchronizes the parent and mapped collaborators when some mappings are absent; unmapped collaborators are skipped with bounded non-PII warning metadata and retain their Galia data. No fuzzy matching or contact creation is allowed.
- Owned collaborators require both an exact terminal `[mocklab:<projectId>:<uuid>]` marker in `x_name` (no space inside the marker) and `x_origen='formulario'`. Origin alone never establishes ownership.
- New owned rows use validation `confirmado`; updates preserve validation and manually reclassified rows are not removed.

### Images and deletes

- Only public source URL references are used. The handler reads `projects.image_data`, not all NAS `project_photos`; it never duplicates binaries.
- Gallery attachment names are deterministic: `mocklab-project:<projectId>:<sha256(url)>`, `type='url'`, `res_model='project.project'`, and verified `res_id`.
- Reconciliation changes gallery relations only with `[4, id]` / `[3, id]`; it never globally deletes `ir.attachment`. Detached metadata remains.
- DELETE uses `old_record.id`, physically unlinks one exact Odoo project, and treats no remote match as a success. It does not require owner/category/image configuration.
- Parent-delete cascade behavior in Odoo remains unverified in a real pilot; preserve shared contacts and manual child rows during reconciliation.

## Decisions and runtime semantics

- The PostgreSQL trigger sends string IDs only: INSERT has `record.id`, UPDATE has both IDs, DELETE has `old_record.id` and null `record`. This avoids bigint and 64 KB body issues.
- INSERT/UPDATE never trust snapshot business data: they reread Supabase. A missing reread routes to delete/no-op.
- Checks before remote create and after remote success reduce, but cannot eliminate, concurrent source-delete races.
- Individual Odoo requests time out at 10 seconds; handler budget is 45 seconds; `pg_net` timeout is 60 seconds.
- Remote timeouts or ambiguous writes are operator-owned reconciliation events. Do not blindly retry.
- `net._http_response` may be queried for response metadata only when remote work is authorized. Do not read request headers or Vault plaintext into output.

## Pilot proof

| Evidence | Recorded result | Scope |
| --- | --- | --- |
| Project 421 | Initial title `test odoo`, category `residencial`, one image, no collaborators; created on 2026-09-21 at 17:39:45Z before hook attachment. | Initial INSERT was not captured. |
| Live update | User edited source at `2026-09-21T18:24:39.195Z`; `pg_net` request 1 returned HTTP 200 `synced` at `18:24:39.999Z`, correlation `b2a7a9b7-fd6c-4300-bbb2-f74c08c79bcb`. | UPDATE-driven create path observed. |
| Description | User screenshot identified the Studio field; v10 deployed dual mapping; user confirmed it became visible. | Confirmed UI mapping. |
| Customer | v11/v14 used the historical external-key chain. The direct `odoo_id` policy exists only in local source. | The contact-28 mismatch report is user-provided, not an independent API audit; the local policy is not deployment proof. |
| Odoo navigation | Correct app is action 589 / external ID `project.open_view_project_all_group_stage`, model `project.project`, domain `is_template=false`. The retired wrong app is action 815 / `x_proyectos`. | Do not change the model or repeat view editing. |

Action 589 initially placed Form before List in its explicit view rows, despite `view_mode` starting with kanban. The user moved List above Form to reach the existing records. This UI configuration issue was separate from successful synchronization.

Not individually evidenced: a fresh INSERT after hook activation, physical DELETE, gallery deltas, and collaborator cases. These are evidence gaps, not recorded failures. Ask whether the user already exercised them before proposing a destructive pilot.

## Code and documentation map

- `supabase/functions/odoo-project-sync/index.ts` — active handler and all mapping/reconciliation logic.
- `supabase/functions/odoo-project-sync/disabled.ts` — historical safety fallback only.
- `supabase/config.toml` — deployed function JWT/entrypoint declaration.
- `supabase/migrations/20260921150302_add_odoo_collaborator_partner_mappings.sql` — sole custom mapping table.
- `supabase/migrations/20260921181019_prepare_odoo_direct_webhook.sql` — direct sender function.
- `supabase/migrations/20260921181906_attach_odoo_project_webhook.sql` — sole trigger attachment.
- `src/types/index.tsx`, `src/features/projects/hooks/useProjectsForm.ts`, `src/components/shared/ui/Collaborators.tsx` — intended frontend integration touchpoints.
- `docs/odoo-project-sync-operator.md` — concise operating runbook.
- `odd/tasks/odoo-project-sync.md` — historical tracker and evidence index.

## Git state

- Local branch: `main`.
- Local `HEAD`: `2b49b0ca10fd5fd45f09121646a4b584485a1610` (`2b49b0c feat: odoo project integration`).
- Local tracking ref `origin/main` was reported aligned by the parent; no fetch or remote verification was performed. The user may have pushed, but this is not proven here.
- Odoo source changes were committed by the user, not the assistant.
- This handoff and the two documentation reconciliations are new uncommitted modifications.
- Preserve these unrelated staged files exactly; do not unstage or edit them:
  - `.atl/.skill-registry.cache.json`, `.atl/skill-registry.md`, `odd/tasks/managed-wiki.md`
  - `supabase/functions/project-analytics/config.toml`, `supabase/functions/project-analytics/index.ts`
  - `supabase/functions/stripe-webhook/config.toml`, `supabase/functions/stripe-webhook/index.ts`
  - `synology/photo_processor/config.json`

## Pending work

1. The base integration is deployed and the user reports success; do not repeat setup. Remaining scenario-specific evidence and collaborator configuration must not be confused with an uninstalled integration.
2. Only perform explicitly requested follow-up, beginning with the smallest missing evidence case.
3. If collaborators are needed, add only verified existing Odoo partner mappings under an authorized operator process.
4. Keep remote status claims qualified unless a fresh authorized audit is performed.

## Guardrails

- Repository context: React 19, TypeScript strict, pnpm, Vite 7, and Supabase; UI copy is Spanish while identifiers and technical artifacts are English.
- Existing broad `projects` RLS is outside this work. The user explicitly excluded audit and hardening work and asserts other protection exists.
- Public source-image references are the only supported image input. Binary storage, NAS-wide photo synchronization, and browser feedback are out of scope.
- No persistent test files were added. Local Deno, `psql`, and Supabase CLI were unavailable; Docker downloads were declined.
- Supabase unified log queries repeatedly returned backend errors. Sanitized `net._http_response` metadata was the delivery evidence path instead.
- Persistent Engram writes failed because multiple active runtime sessions existed for this project. This file is therefore the durable handoff; do not invent a session ID or bypass the conflict.
- No new dependencies, RLS hardening, audit work, source SQL/TS edits, or test files without explicit permission.
- Do not resurrect SDD, the outbox, Cron, eleven tables, a Dashboard webhook, or platform bootstrap objects to solve a non-requested problem.
- Do not expose credentials, inspect `.env`, log secrets, use browser-accessible function auth, or add AI commit attribution.
- No agent commit, staging, push, fetch, deployment, manual HTTP invocation, manual Odoo write, or remote inspection without explicit user authorization for that operation and destination.
- The project has no automated test suite. Historical local checks passed: build, scoped ESLint, diff check, 24 mocked scenarios, five description VM cases, seven customer VM cases, and three optional database-header cases. Global lint baseline had 38 errors and 9 warnings unrelated to this work.
- Native RDD is globally enabled but was not approved: review was blocked at untracked-file selection and has no START/consent/adversarial terminal receipt. Do not claim approval or alter RDD state.
