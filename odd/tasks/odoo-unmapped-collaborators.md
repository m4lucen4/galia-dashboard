# Odoo unmapped collaborators — task tracker

**Repository locator:** `odd/tasks/odoo-unmapped-collaborators.md`
**Status:** Implemented, functionally verified locally, and deployed with explicit user authorization as `odoo-project-sync` version 12 in Supabase project `mygqfdbloqojffhsurgo`. Postdeployment source readback matched the deployed local source and `verify_jwt=true` was preserved. Live synchronization remains unverified. The required Engram mirror at `odd/odoo-unmapped-collaborators/tasks` is pending because Engram rejected the session-less save due to multiple active runtime sessions. No manual synchronization, data writes, dependency changes, credential reads, commits, or test-file changes were made.

## Objective

Synchronize the Odoo project and every collaborator with a valid explicit mapping. Skip collaborators without a mapping, retain their Galia data, and never delete an existing Odoo collaborator solely because its source collaborator lacks a mapping.

## Authorized scope

| Area | Authorized change | Explicit boundary |
| --- | --- | --- |
| `supabase/functions/odoo-project-sync/index.ts` | Adjust collaborator mapping and reconciliation behavior for absent mapping rows. | Preserve actual mapping-query failures, invalid mapped partner IDs, collaborator validation failures, and current mapped write/delete ownership rules. |
| Edge logs | Add a bounded, non-PII warning for skipped unmapped collaborators using the existing correlation context where practical. | Do not log collaborator names, websites, UUIDs, Odoo IDs, secrets, payload content, or credentials. |
| Local verification | Run only existing check commands and a temporary in-memory mocked harness; remove all temporary artifacts. | Do not add test files, dependencies, remote calls, deployments, or credential reads. |

## Stable checklist

- [x] Read the Odoo sync handoff, operator runbook, existing tracker, handler, package scripts, and TypeScript configuration.
- [x] Confirm the current blockers: `partnerMappings` rejects incomplete query results before parent writes; `reconcileCollaborators` throws when an individual mapping is absent.
- [x] Confirm deletion protection already uses all validated source collaborator IDs before the mapped-write loop.
- [x] OD-UC01 — `partnerMappings` returns validated mapping rows without rejecting absent rows; query errors and invalid mapped IDs still fail.
- [x] OD-UC02 — Parent create and update complete before collaborator reconciliation when every collaborator mapping is absent.
- [x] OD-UC03 — Unmapped collaborators skip child create/update while all source IDs remain in the owned-row deletion guard.
- [x] OD-UC04 — One warning emits only `correlationId`, `projectId`, and `unmappedCount` when collaborators are skipped.
- [x] OD-UC05 — Mocked cases observed mapped existing-child update, mapped new-child create, owned removed-child delete, and manually reclassified-child protection.
- [x] OD-UC06 — Final focused lint and `git diff --check` passed after documentation normalization.

## Acceptance and checks

| Acceptance criterion | Planned evidence |
| --- | --- |
| Mixed mapped/unmapped collaborators synchronize the parent and mapped collaborators. | Temporary in-memory mocked handler scenario, with no network access. |
| Unmapped collaborators cause no Odoo child create/update call and remain represented in Galia source input. | Captured mock Odoo calls and source input assertion. |
| An existing owned Odoo collaborator whose source ID is present but unmapped is not deleted. | Temporary mocked reconciliation scenario. |
| An owned collaborator absent from all source IDs is still deleted only under the existing marker and `x_origen='formulario'` rule. | Temporary mocked reconciliation scenario. |
| Mapping query errors and invalid mapped partner IDs still fail. | Temporary mocked mapping scenarios. |
| Logs contain only bounded count/context metadata, not personal data or identifiers. | Captured `console.warn` mock assertion. |

## Test process configuration evidence

- No explicit TDD-mode configuration was found in project Markdown or JSON/YAML configuration. Ordinary verification applies; no strict-TDD claim is made.
- The repository declares no test script or test framework in `package.json`; `AGENTS.md` explicitly prohibits adding test files.
- `tsconfig.json` includes only `src`, so it does not type-check the Deno Edge Function.
- Historical local evidence documents a temporary TypeScript-transpile/VM fetch-stub harness for this handler. The same disposable, in-memory approach is planned; no dependency installation is required.
- Available repository commands are `pnpm build` and `pnpm lint`; locally confirmed tool versions are ESLint `9.39.1` and TypeScript `5.9.3`. The focused command is `pnpm exec eslint supabase/functions/odoo-project-sync/index.ts`.
- `deno` and the Supabase CLI are not available on this local PATH, so the handler cannot receive a native Deno or Supabase CLI check in this invocation.

## Progress

Implementation observed through a disposable Node TypeScript-transpile/VM harness with network mocks. It passed parent create and update with all mappings absent; mixed mapping behavior; retention of an existing unmapped child; mapped update/create; owned removal; manual-child protection; mapping-query failure; invalid partner ID; bounded warning metadata; and source immutability. Final focused lint and `git diff --check` passed. The Engram mirror remains pending as recorded above.

Independent read-only functional verification passed 8 mocked cases with 0 failures, plus focused ESLint and `git diff --check`. The parent also reran both commands successfully. Native Deno typechecking remains unavailable. Native RDD is enabled but its preflight requires untracked-file selection and includes unrelated pre-existing changes; no START, consent, or review approval was obtained. Functional verification is not an RDD receipt.

Deployment: the user explicitly authorized the existing function deployment via Supabase MCP. The deployment worker confirmed version 12 active, entrypoint `index.ts`, and `verify_jwt=true`, with matching postdeployment source readback. No function invocation, Odoo call, SQL, or other remote mutation was performed.

Next step: the user saves project 424 again because the failed INSERT is not retried automatically, then checks its presence in Odoo. Deployment confirmation is not live synchronization proof.
