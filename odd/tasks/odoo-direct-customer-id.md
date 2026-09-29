# Odoo direct customer ID — task tracker

**Repository locator:** `odd/tasks/odoo-direct-customer-id.md`  
**Status:** Implemented, independently verified locally, and deployed with explicit user authorization as `odoo-project-sync` version 15 in Supabase project `mygqfdbloqojffhsurgo`. Full textual source readback matched the local file; `verify_jwt=true` was preserved. No SQL, manual synchronization, Odoo call, or credential/environment access occurred.

## Objective

Set each Odoo `project.project.partner_id` directly from the current project owner's `userData.odoo_id`.

## Why

The previous resolution chain uses `userData.id` as an external key to search `res.partner.x_studio_mocklab_id`. The user reported that for project 426 the owner account has `userData.id = 51` and `userData.odoo_id = 13`, while the external-key match selected Odoo contact 28. This is not a fresh remote audit. `odoo_id = 13` is the settled, direct Odoo partner ID and must be sent as `partner_id` without an Odoo partner lookup.

## Authorized scope

| Area | Authorized change | Explicit boundary |
| --- | --- | --- |
| `supabase/functions/odoo-project-sync/index.ts` | Replace customer resolution with `projects.user` UUID → `userData.uid` → `userData.odoo_id` → validated `partner_id`. | Do not fall back to `userData.id`, query `res.partner.x_studio_mocklab_id`, create/search/validate Odoo partners remotely, or change creator/ownership semantics. |
| `docs/odoo-project-sync-operator.md` | Record the direct-ID contract in the current runbook. | Preserve this version 15 deployment history as historical evidence and qualify the external-key behavior as superseded. |
| `docs/odoo-project-sync-operator.md` | Update the operator mapping and failure contract. | Do not add setup, retry, or remote-operation guidance. |

## Readback evidence

- Before this change, `resolveProjectCustomer` selected `userData.id`, then called `res.partner.search_read` by `x_studio_mocklab_id`.
- The project form creates with `user: user.uid`. `addProject` persists that value, while `assignProject` duplicates a project with `user: assignedUserId`. The resolved owner remains the persisted `projects.user`; this task does not add session-derived creator tracking or alter either flow.
- The current safe integer helper accepts only positive safe integers at or below `2,147,483,647`; reuse it for `userData.odoo_id`.
- The active source already supports Google Maps URLs and coordinate JSON, and it skips unmapped collaborators. These paths are unrelated and must remain unchanged.

## Stable tasks

| ID | Task | Status |
| --- | --- | --- |
| OD-DC01 | Parent reads this tracker and confirms the bounded local source scope before implementation. | [x] |
| OD-DC02 | Change the resolver to select only `odoo_id` for the `uid`-matched owner account and return its validated positive signed-32-bit value directly. | [x] |
| OD-DC03 | Preserve fail-closed owner failures: invalid/missing UUID (`missing_project_owner`), account-read failure (`project_owner_read_failed`), missing account (`missing_project_owner_account`), and invalid/null `odoo_id` (`invalid_project_customer_id`). | [x] |
| OD-DC04 | Remove only types, parameters, and Odoo partner-search logic made unused by the direct resolver. | [x] |
| OD-DC05 | Update handoff and operator documentation to state the direct-ID contract and no remote partner lookup. | [x] |
| OD-DC06 | Verify CREATE and UPDATE write `partner_id: 13` for a mocked owner with `id: 51, odoo_id: 13`; verify no `res.partner` call, no fallback for invalid/null IDs, signed-32-bit bounds, owner errors, Google Maps preservation, and unmapped-collaborator preservation. | [x] |

## Acceptance criteria

- INSERT and UPDATE resolve the persisted `projects.user` through `userData.uid` and write the validated `userData.odoo_id` directly to `partner_id`.
- The resolver selects `odoo_id`, not `id`, and does not call `res.partner` for project customer resolution.
- A null, zero, negative, unsafe, fractional, or value above `2,147,483,647` `odoo_id` fails closed with `invalid_project_customer_id`; it never falls back to `userData.id` or omits `partner_id`.
- Existing owner UUID, missing account, and account-query failures retain stable fail-closed reason codes.
- DELETE and missing-source UPDATE remain independent of customer resolution.
- Google Maps URL/coordinate behavior and skipped unmapped-collaborator behavior are unchanged.

## Test configuration and checks

**TDD mode:** Not configured. `package.json` declares only `dev`, `build`, `lint`, and `preview`; it has no test script or test framework. `tsconfig.json` includes only `src`, so it does not type-check this Deno Edge Function. `AGENTS.md` prohibits persistent test files. Native `deno` is unavailable on the local PATH.

Use an inline in-memory Node TypeScript-transpile/VM harness with mocked Deno, Supabase, Odoo, and network-disabled `fetch`; do not create a harness file. The exact command is recorded with verification evidence after execution.

The harness must capture Odoo request bodies for CREATE and UPDATE, assert `partner_id: 13`, and reject any `res.partner` call. It must cover valid and invalid direct IDs, missing owner/account/read failure, both signed-32-bit boundaries, Maps URL/coordinates, and unmapped collaborators without performing network access.

## Progress

- The resolver now selects only `odoo_id`, validates it through `safeInteger`, and maps expected validation failures to `invalid_project_customer_id`. It has no Odoo-client parameter, partner type, partner lookup, or fallback.
- Maps and collaborator code was not edited.
- `pnpm exec eslint supabase/functions/odoo-project-sync/index.ts` and `git diff --check` passed after source normalization.
- The writer's three harness starts failed before a completed scenario: a null client stub, a harness syntax error, and inspection of CREATE `vals` instead of `vals_list[0]`. These were fixture defects, not handler failures. A fresh independent verifier subsequently executed an inline `node <<'NODE'` TypeScript-transpile/VM harness against the real captured Deno handler: 22/22 scenarios passed, with no network or file writes. CREATE and UPDATE sent partner 13, no `res.partner` calls occurred, invalid IDs failed without fallback, and owner errors, deletion/missing-row bypasses, Maps, and collaborators were covered.
- The independent verifier and parent reran focused ESLint and `git diff --check` successfully. Deno-native typechecking remains unavailable. Native RDD preflight requires untracked-file selection and includes unrelated changes; no START, consent, or approval was obtained.
- `pnpm exec eslint --version` reports `v9.39.1`; `pnpm exec tsc --version` reports `Version 5.9.3`.
- The working tree contains pre-existing unrelated modifications and untracked files. Preserve them.
- The required Engram mirror was attempted without a session ID. Engram rejected it because multiple active runtime sessions match this project and directory; no session ID was invented or bypass used. It remains pending.

## Next step

The user authorized the single-function deployment via Supabase MCP. The worker confirmed the previous v14 source had no unexpected drift, deployed v15 (`ACTIVE`, entrypoint `index.ts`, `verify_jwt=true`), and compared the complete returned source against the local file with no differences. No source hash was claimed.

Next step: the user saves project 426 again to apply `partner_id: 13` and checks the Odoo customer. No manual invocation or project reassignment was performed during deployment; a live synchronization result remains unverified.
