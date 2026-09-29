# Odoo project collaborator sync by selected contact ID

## Objective

Synchronize only project collaborators with a selected numeric `odooId` to the Odoo project collaborator relation on project create/update. Keep the local collaborator UUID as the ownership identity and preserve manually maintained Odoo rows.

## Why and current state

The original `odoo-project-sync` receiver still resolves collaborator UUIDs using `odoo_collaborator_partner_mappings` and ignores the `odooId` stored in `projects.projectCollaborators`. The previously attempted exact-name receiver was rolled back after webhook parsing failed; do not route traffic to it. The local UI now saves optional `odooId` in JSONB. Odoo's `x_partner_id` relation requires the selected `res.partner` record ID.

## Authorized scope and constraints

- Original implementation scope was local changes to the original project-sync receiver and this feature tracker only. A later, separate user authorization covered only deployment of this receiver. No Odoo invocation, migration, database write, secret inspection, or webhook routing change was authorized.
- User owns Git: no agent branch, commit, staging, push, or unrelated worktree changes.
- Do not change other project fields, gallery sync, customer selection, event parsing, original webhook sender, unrelated Edge Functions, `res.partner` rows, or manual/reclassified Odoo collaborator rows.
- TDD off per repository AGENTS.md (no test suite). Use focused offline verification if feasible and run applicable build/lint checks; record actual results. The ~400 authored-line planning heuristic is advisory, not a code-size cap. Delivery strategy: ask-on-risk.

## Tasks

- [x] OI-01 — Parse optional `odooId` from the JSONB collaborator, accept absence as no selection, reject invalid IDs before any Odoo project write, and resolve the selected Odoo contact safely. Stop using the legacy UUID-to-partner mapping table for this receiver without altering its schema or history.
- [x] OI-02 — Reconcile existing Odoo project collaborator rows by the verified project-scoped UUID marker and `x_origen='formulario'`: create/update only entries with `odooId`; remove only verified receiver-owned rows when the collaborator is removed or loses `odooId`; update only verified receiver-owned rows when `odooId` changes; never modify manual, unmarked, or reclassified rows. Preserve existing order, profession, website, project and gallery behavior.
- [ ] OI-03 — Verify offline scenarios covering add, edit, removal, ID change, no ID, malformed/missing Odoo contact and manual-row preservation; run local applicable build/lint/diff checks. Distinguish offline proof from any future remote Odoo verification.

## Acceptance and next step

Only collaborators with valid selected `odooId` appear as receiver-owned rows in the Odoo project; replacing the selected contact updates the owned row, and deleting/deselecting removes only the owned row. An unknown or invalid ID must fail safely rather than silently creating a wrong relation. Local proof and user-authorized deployment are separate phases. The initial project-sync receiver remains the only project webhook target; no second writer or rerouting.

## Evidence

- Git evidence intentionally absent under the user's explicit Git ownership instruction.
- OI-01 and OI-02 implemented locally. `pnpm exec eslint supabase/functions/odoo-project-sync/index.ts`, `pnpm build`, and `git diff --check` passed. OI-03 remains unchecked: no Deno runtime is installed locally, and the repository has no test suite or permitted test files, so the requested in-memory Edge Function harness could not be run. No remote service was called during local implementation.
- With separate explicit user authorization, deployed only `odoo-project-sync` to Supabase project `mygqfdbloqojffhsurgo`. Deployment reported version 16, `ACTIVE`, `verify_jwt=true`; remote source readback matched the local `index.ts`. No webhook routing, project rows, migrations, secrets, or other Edge Functions were changed by this operation.
- A user-driven project create/edit and its Odoo collaborator outcome remain unverified. OI-03 remains pending; deployment status is not proof of synchronization.
