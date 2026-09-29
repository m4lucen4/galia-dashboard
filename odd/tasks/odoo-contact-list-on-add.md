# Odoo contact list on Add collaborator

## Objective

Provide a secure, read-only contact lookup path that lists Odoo `res.partner` records as `id` and `name`, then invoke it when a user clicks the existing Add collaborator control and log the returned contacts in the browser console.

## Why

Project creators need visibility into available Odoo contacts at the point where collaborators are added, without exposing Odoo credentials to the frontend or changing the existing local collaborator-add behavior.

## Authorized Scope

- Local repository work only.
- All authenticated users who are permitted to create projects.
- Add a separate authenticated Supabase Edge Function for the Odoo contact listing.
- Wire the existing Add collaborator click path to invoke that function and log contacts to the browser console.
- Run the specified local checks.

## Constraints

- The endpoint is read-only and queries only Odoo `res.partner` fields `id` and `name`.
- Use bounded, deterministic pagination. If the complete Odoo list cannot be retrieved within the configured cap, report the result as incomplete; never silently truncate it.
- Keep Odoo secrets exclusively server-side. Do not expose frontend secrets.
- Require secure authenticated-user authorization in the Edge Function.
- Preserve the existing local Add collaborator behavior exactly; the contact invocation must be additive.
- Prior rollback restored the original receiver. The new endpoint must not modify or depend on that receiver.
- Do not inspect secrets, invoke remote services, deploy, create migrations, or change webhooks.
- Preserve all unrelated dirty-worktree changes.
- Do not make agent Git mutations: no branch, commit, stage, push, or commit evidence. Git ownership remains with the user.
- No new tests: the repository AGENTS.md states that no test suite exists. Add tests only if pre-existing applicable infrastructure is discovered, which is not expected.

## Tasks

### OC-01 — Implement a secure Odoo partner-list Edge Function

1. Locate the existing local Edge Function and Odoo integration conventions without inspecting credentials.
2. Add a separate authenticated Supabase Edge Function that validates the calling user and authorizes authenticated project creators.
3. Query Odoo `res.partner` read-only for `id` and `name`, with an explicit deterministic sort and bounded pagination.
4. Return a complete/incomplete status and pagination metadata so a cap breach is visible to the caller rather than silently truncated.
5. Keep the previously restored original receiver untouched.
6. Add tests only if relevant existing test infrastructure is present.

**Acceptance:** An authenticated authorized caller can obtain deterministic pages of Odoo partner `id`/`name` records through a separate server-side function; unauthenticated or unauthorized callers are rejected; the result explicitly reports incompleteness when the cap prevents a full list.

**Status:** Implemented locally. Added `odoo-contacts` with JWT user validation, service-role rejection, HTTPS-only Odoo origin validation, `id asc` pagination capped at 1,000 returned contacts, per-request and 30-second total deadlines, and an additional one-record probe to distinguish complete from incomplete results. Oversized pages and duplicate or non-ascending IDs are rejected as invalid remote responses. No commit was created because the user explicitly prohibited Git mutations. Remote deployment and integration verification remain pending.

### OC-02 — Invoke contact listing from Add collaborator

1. Locate the existing Add collaborator click handler.
2. Invoke the new Edge Function from that click path without altering the current local add behavior, ordering, state updates, or validation.
3. Log returned contacts and any incomplete status to the browser console using safe, useful diagnostics.
4. Run the local checks below.

**Acceptance:** Clicking Add collaborator retains its current local behavior and additionally invokes the authorized contact-list endpoint; successful responses are logged in the browser console, including a visible incomplete indication when applicable.

**Status:** Implemented locally. The existing synchronous `onChange` executes first and the contact lookup is launched without awaiting it. Successful contact lists, pagination metadata, incomplete status, and lookup failures are logged to the browser console. HTTP 200 payloads are validated before being logged, so malformed responses are reported only as lookup failures. No commit was created because the user explicitly prohibited Git mutations. Remote deployment and authenticated end-to-end verification remain pending.

## Checks

- Run `pnpm build`.
- Run `pnpm lint`, or a focused ESLint command if the full lint command is impractical; record the exact command and result.
- No remote invocation, deployment, secret inspection, migration, webhook modification, or Git mutation is authorized.

## Delivery Strategy

- Default: `ask-on-risk`.
- Advisory review heuristic: approximately 400 authored changed lines (additions plus deletions). This is a review-sizing signal, not code-golf guidance.
- Forecast: two cohesive local work units (OC-01 server boundary, OC-02 UI invocation), likely medium risk due to authorization and external-pagination correctness. If implementation exceeds the heuristic or reveals a delivery risk, stop and ask before proposing a split; do not commit or create a branch.
- TDD: off, resolved from repository AGENTS.md because the repository has no test suite. If applicable pre-existing test infrastructure is discovered, use it only within the authorized scope.
- Rollback boundaries: OC-01 is the new separate Edge Function only; OC-02 is the additive invocation in the existing Add collaborator handler only. Neither rollback may modify unrelated dirty changes or the restored receiver.

## Evidence

- Git evidence: intentionally absent. The user retains Git ownership and forbids agent Git mutations.
- [x] OC-01/OC-02 source implementation observed locally.
- [x] Latest bounded correction: `pnpm build` passed.
- [x] Latest bounded correction: `pnpm exec eslint src/components/shared/ui/Collaborators.tsx supabase/functions/odoo-contacts/index.ts` passed.
- [x] Latest bounded correction: `git diff --check` passed.
- [ ] Offline mocked scenarios were not run: `deno --version` reports that Deno is not installed, and the Edge Function does not expose local test seams. No temporary files, dependency fetches, or remote activity were authorized.
- [x] With separate user authorization, deployed only `odoo-contacts` to Supabase project `mygqfdbloqojffhsurgo`: version 1, `ACTIVE`, `verify_jwt=true`; remote source readback matched the local `index.ts` at deployment. No Odoo request or browser invocation was performed.
- [ ] Authenticated browser click and live Odoo contact retrieval remain unverified. The frontend change remains local until the user delivers it.

## Current phase — Odoo contact name search and optional identity

**User-approved scope:** Change only the project collaborator name input and its local JSONB payload. The user confirms `public.projects.projectCollaborators` is JSONB. Keep the Odoo project-sync receivers, contact-list Edge Function, database schema, profession, website, and unrelated changes untouched. No remote deployment or Git mutations are authorized for this phase. TDD remains off (no project test suite); use `pnpm build` and focused ESLint, reporting global lint honestly.

- [x] OC-03 — Source behavior and static verification observed locally. Matches appear after three typed characters from the loaded `odoo-contacts` response, using case- and diacritic-insensitive matching and at most 10 rendered suggestions. The original Add collaborator local add executes before the asynchronous request and existing console diagnostics are preserved. Loading, error, and incomplete-list states are shown without claiming an incomplete list has no Odoo-wide match. Mouse and keyboard selection set the name and optional numeric `odooId` while retaining the local UUID.
- [x] OC-04 — Source behavior and static verification observed locally. A manual name has no `odooId`; editing a selected name removes its stale `odooId`; selecting a suggestion assigns it again. Existing collaborator entries preserve their `odooId` when their name is unchanged, and profession/website remain untouched. The existing create and edit actions persist the same `projectCollaborators` array to JSONB, now typed with optional `odooId`.

**Acceptance:** Existing JSONB collaborator entries remain compatible; a selected contact saves both name and `odooId`, a manually entered name saves without `odooId`, and changing a previously selected name removes the stale association. No Odoo project synchronization changes are included.

**Delivery/evidence:** This is a local continuation of the same feature, not a new task document. The user retains Git ownership; no commit or branch will be created by the assistant. Record actual checks and any missing browser verification here after implementation.

- [x] `pnpm build` passed after OC-03/OC-04.
- [x] `pnpm exec eslint src/components/shared/ui/Collaborators.tsx src/types/index.tsx` passed after OC-03/OC-04.
- [x] `git diff --check` passed after OC-03/OC-04.
- [x] Latest bounded OC-03/OC-04 correction: contact loads use a request generation so only the latest request updates contacts, errors, incomplete status, and loading state. A latest failure clears contact data, preventing stale cached suggestions from being presented as current.
- [x] Latest bounded OC-03/OC-04 correction: active suggestion rendering and Enter selection are bounds-checked; the dropdown closes when focus leaves its combobox; listbox option semantics now identify the selectable button targeted by `aria-activedescendant`.
- [x] `pnpm build` passed after the latest bounded OC-03/OC-04 correction.
- [x] `pnpm exec eslint src/components/shared/ui/Collaborators.tsx src/types/index.tsx` passed after the latest bounded OC-03/OC-04 correction.
- [x] `git diff --check` passed after the latest bounded OC-03/OC-04 correction.
- [ ] `pnpm lint` remains blocked by 38 pre-existing errors and 9 warnings outside the changed scope; the focused command passed with no findings.
- [ ] Browser verification remains pending: confirm contact loading, mouse/keyboard selection, manual-name save, selected-name edit, and create/edit JSONB payloads in an authenticated local session. No remote operation was attempted.
- [ ] Offline runtime mock was not run: the repository has no test suite and this interactive browser component has no existing local runtime harness; creating test files or adding dependencies is outside the authorized scope.

## Current correction — existing collaborator edit lookup

**User report:** Existing collaborators do not show Odoo suggestions in edit mode. Verified locally: contact lookup is initiated only by `addCollaborator`; an existing name field has no loading path without another Add click. The user also requested removing the browser console listing of all contacts.

- [x] OC-05 — Focusing any collaborator name input now lazily loads the authenticated contact list, so existing collaborators can show matches without Add. In-flight loads are deduplicated, successful lists are reused, and a focus after an error retries. Request generation continues to gate loading, error, incomplete, and contact updates. The full contact-record console dump was removed; only sanitized lookup failures and incomplete-list warnings remain.

**Acceptance:** In project editing, focusing and searching an existing collaborator name can display Odoo matches from the loaded list after three characters without adding another collaborator; selecting still saves `odooId`, typing manually still clears it. No Odoo project-sync changes, remote deployment, Git mutations, or unrelated edits. Run `pnpm build`, focused ESLint and `git diff --check`; record actual results and pending browser proof.

**Supersession:** OC-05 supersedes OC-02's historical browser-console listing of contact records. The OC-01/OC-02 descriptions above remain preserved as implementation history; current behavior does not log Odoo contact records, names, or IDs.

**OC-05 evidence:**

- [x] `pnpm build` passed.
- [x] `pnpm exec eslint src/components/shared/ui/Collaborators.tsx src/types/index.tsx` passed with no findings.
- [x] `git diff --check` passed.
- [ ] Browser verification remains pending: in an authenticated local edit session, focus an existing collaborator, type at least three characters, and verify loading, suggestions, keyboard/mouse selection, manual-name `odooId` removal, retry after failure, and no contact-record console dump. No browser or remote invocation was performed.
