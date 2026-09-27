# Odoo project sync operator runbook

## Status

This runbook describes the checked-in `odoo-project-sync` handler. Local configuration sets `verify_jwt = true` and uses `index.ts` as its entrypoint.

Historical task evidence records a version 16 deployment of that function with source readback matching the then-local handler. It records neither a current remote audit nor a user-driven project create/edit after that deployment. Do not infer the current deployed receiver, sender route, secret state, or Odoo result from this repository.

## Operator quick path

1. Do not populate `odoo_collaborator_partner_mappings`. It is a historical migration artifact; the checked-in handler does not read it.
2. In the collaborator UI, select an existing Odoo contact from the suggestions. The selection saves its numeric `odooId` in `projects.projectCollaborators` JSONB.
3. Treat an absent `odooId` as an instruction not to synchronize that collaborator. Do not manually mutate JSONB, use exact-name matching, or create a contact as a substitute.
4. Before any remote investigation or corrective action, obtain explicit authorization for the destination, operation, and credential/session. Do not manually invoke the function, enqueue HTTP, write Odoo data, replay an event, or inspect secret values.

## Local handler behavior

| Area | Checked-in behavior |
| --- | --- |
| Activation | Synchronization runs only when `ODOO_SYNC_ENABLED` is exactly `"true"`; otherwise an authenticated request returns `204` without an Odoo call. |
| Authentication | The handler requires the gateway JWT check, the exact service-role bearer token, and the `x-odoo-sync-worker-secret` header. Never place these values in browser code, SQL, logs, URLs, or source files. |
| Events | INSERT and UPDATE reread the current `public.projects` row by ID. DELETE uses `old_record.id`. A missing current row follows the delete path. |
| Customer | INSERT and UPDATE resolve `projects.user → userData.uid → userData.odoo_id`, validate a positive signed 32-bit integer, and write it to `project.project.partner_id`. There is no fallback to `userData.id` or `x_studio_mocklab_id`. |
| Project identity | The handler searches Odoo projects by exact `x_mocklab_id`, including archived records: zero matches create, one match updates or deletes, and multiple matches fail. |
| Collaborators | Each selected `odooId` is validated and confirmed against an existing Odoo `res.partner` before project or collaborator writes. The handler creates, updates, or removes only rows with its project-scoped UUID marker and `x_origen = formulario`; manual, unmarked, and reclassified rows are preserved. |
| Description | The escaped description is written to both `description` and `x_studio_html_field_292_1jh13q299`; an empty value clears both. |
| Google Maps | Legacy `{lat,lng}` JSON is supported. Links must be credential-free HTTPS on `google.com`, `www.google.com`, `maps.google.com`, or `maps.app.goo.gl`; legacy `goo.gl` links must use `/maps` or a path below it. Regional hosts and redirects are unsupported. |
| Gallery | Only allowed public HTTPS URLs from `image_data` are synchronized as deterministic URL attachments. Reconciliation changes only verified gallery relations; it never copies binaries or deletes `ir.attachment` records. |
| Delete | DELETE unlinks only one exact matched Odoo project and treats no match as success. It does not require owner, category, or image configuration. |

An invalid collaborator ID, a selected contact that cannot be resolved, an invalid owner customer ID, an unmapped category, or an ambiguous remote identity fails the request closed. The handler does not create or modify `res.partner` records.

## Configuration names

Required names are `ODOO_SYNC_ENABLED`, `ODOO_JSON2_URL`, `ODOO_API_KEY`, `ODOO_PROJECT_SYNC_WORKER_SECRET`, and `ODOO_CATEGORY_MAPPINGS`. `ODOO_DATABASE` and `ODOO_SYNC_EXTRA_IMAGE_HOSTS` are optional. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are runtime values.

When `ODOO_DATABASE` is absent or blank, the handler omits `X-Odoo-Database`; otherwise it trims and sends the value. DELETE requires only the Odoo connection and authentication settings because category and image settings are evaluated only for a current source row.

## Delivery limits and recovery

- The checked-in direct sender is asynchronous and future-change only. It provides no queue, backfill, replay, Cron, dashboard feedback, automatic retry, ordering, or exactly-once guarantee.
- The handler bounds each Odoo request to 10 seconds and the full run to 45 seconds. It returns generic response bodies and logs only correlation metadata and stable reason codes.
- Do not blindly retry after a timeout or uncertain write. Obtain authorization, inspect only sanitized response metadata and redacted logs, then reconcile manually.
- Do not add a second trigger, a Dashboard webhook, a queue, Cron, or platform bootstrap objects as a recovery mechanism.

## Historical context

Earlier local outbox and scheduler migrations were removed without being applied. The UUID-to-partner mapping table belongs to an earlier collaborator approach and remains a historical schema artifact. The exact-name collaborator receiver is separate local-only work and must not be routed alongside this handler. Historical mocked checks and deployment readbacks demonstrate only the recorded local or point-in-time conditions; they are not evidence of current remote configuration or successful end-to-end synchronization. In particular, the version 16 record is historical deployment evidence, not a current audit.
