# Odoo collaborator name sync

**Repository locator:** `odd/tasks/odoo-collaborator-name-sync.md`
**Status:** Local implementation planned; no deployment or production migration authorized.

## Objective and boundary

Keep the deployed `odoo-project-sync` Edge Function untouched. Prepare a replacement receiver that preserves project/gallery synchronization while writing an Odoo project collaborator only when exactly one existing `res.partner` has the same name. With zero or multiple contacts, that collaborator must not appear in the project; other collaborators and the project still synchronize. Do not create or change Odoo contacts. Keep manually managed Odoo rows intact.

The user authorized local adaptation and rerouting the webhook to the new receiver, but a local checkout is not proof of isolated Supabase/Odoo infrastructure. Do not deploy, apply remote SQL, call Odoo, inspect credentials, or enqueue live events under this authorization.

## Constraints and decisions

- Current receiver is a conditional collaborator writer using explicit UUID-to-partner mappings. It must remain byte-for-byte unchanged and cannot be run alongside a second writer for the same events.
- Use a new receiver as the sole target of the existing sender after a separate authorized deployment; the existing trigger remains single. A new local migration may redefine the sender URL without running it.
- Match the exact declared name with a bounded two-result Odoo query. If a previously owned child loses its unique match, remove only that verified owned child. Preserve other-origin/manual rows and fail closed on ambiguous identities or remote request failure.
- TDD: not configured (project has no test runner and prohibits persistent test files). Use focused lint/build and a disposable network-disabled mocked runtime harness where feasible. Never claim these prove live Odoo behavior.
- Delivery strategy: ask-on-risk. Forecast: roughly 450–650 authored changed lines across the new receiver, migration and documentation; 400 lines per task is an advisory heuristic, not a cap. Running count pending.

## Work units

- [ ] **ON-01 — New isolated receiver.** Create a function under `supabase/functions/` with the existing project's security, parent, gallery, deletion and validation behavior; implement exact unique-name collaborator matching and owned-child cleanup. Add focused operator documentation for its local-only status and rollback boundaries. Verify using lint/build and mocked cases (one, zero, multiple, previously owned, manual, auth); record actual outcomes. **Route:** delegated writer, because the handler and documentation are both nontrivial and preparatory reading belongs with writing. **Commit:** pending.
- [ ] **ON-02 — Local routing preparation.** Add a migration that changes the existing sender's destination to the new receiver without a second trigger or invoking the migration. Validate SQL body against prior migration, verify no secret values, update documentation and checks. **Route:** delegated writer if more than one nontrivial file changes; otherwise inline after bounded readback. **Commit:** pending.

## Acceptance and checks

- Exactly one existing contact with the exact collaborator name yields a child linked to that partner; zero or multiple matches yield no child for that collaborator, including after a previously matched child existed. Different collaborators continue.
- No contact is created, updated or deleted by the receiver. Manually owned/reclassified child records are preserved. Duplicate own markers and malformed responses fail closed.
- Parent and gallery parity, request authorization, time bounds and sanitized logs stay equivalent to the old receiver.
- The migration changes only the URL of the existing sender; no second webhook, automatic replay or deployment is performed.
- Required: `pnpm exec eslint` on new TS, `pnpm build`, `git diff --check`, focused offline handler scenarios and a source comparison of unchanged old handler. Record failures, skips and commit IDs below.

## Progress

- Branch: `feat/odoo-collaborator-name-sync`, created from local `main` with unrelated working-tree changes preserved.
- Source baseline: `284fff7`; prior reviewed boundary: branch point; RDD state/assessment pending.
- No implementation verification, commit, deployment or remote call yet.

## Next step

Implement ON-01 locally. Remote rollout requires explicit destination/operation/credential authorization and coordinated function-before-routing deployment; local code does not isolate shared environments.
