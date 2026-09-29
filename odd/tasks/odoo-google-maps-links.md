# Odoo Google Maps links — task tracker

**Status:** Implemented, locally verified, and deployed with explicit user authorization to `odoo-project-sync` version 14 in Supabase project `mygqfdbloqojffhsurgo`. Full textual source readback matches the local file; JWT verification remains enabled. Live synchronization is not yet verified.

## Objective

Allow Odoo project synchronization to map a validated HTTPS Google Maps link from `projects.googleMaps`, while retaining support for legacy coordinate JSON.

## Problem

The project form is a URL input and all three locale strings describe a Google Maps link. However, `projectValues` currently parses every non-empty `googleMaps` value as JSON containing `lat` and `lng`, so a valid HTTPS link causes a `validation_error` before Odoo synchronization. The reported project 426 has this URL-shaped value. The previously suspected year-2025 rejection was an over-escaped SQL-regex diagnosis and is not part of this fix.

## Scope

| In scope | Out of scope |
| --- | --- |
| `supabase/functions/odoo-project-sync/index.ts`: accept and safely render supported HTTPS Google Maps links, preserving legacy coordinate JSON behavior. | UI/form, database schema, migrations, deployment, remote inspection, manual invocation, and user-link fetching. |
| `docs/odoo-project-sync-operator.md`: record the accepted mapping and limits in the current runbook after implementation. | New dependencies, test files, commits, staging, unrelated files, and changes to Odoo configuration. |

## Proposed URL policy

Accept a non-empty link only when `URL` parsing succeeds and it has `https:`, no username, no password, and no non-default port. Permit only `google.com`, `www.google.com`, `maps.google.com`, and `maps.app.goo.gl`, plus the legacy `goo.gl` host when its pathname is `/maps` or begins with `/maps/`. Preserve the normalized URL from `URL#toString()` and HTML-escape it for both the anchor `href` and text.

Reject `javascript:`, `data:`, non-HTTPS schemes, credentials, malformed URLs, and all other hosts. Legacy coordinate JSON remains accepted only when `lat` and `lng` are finite and within their existing geographic bounds.

**Product boundary:** Common Google Maps short links are in scope. Regional Google domains and every other host remain unsupported because current UI copy does not establish them; do not follow redirects or fetch links to infer support.

## Checklist

| ID | Task | Status |
| --- | --- | --- |
| OGM-01 | Record the bounded objective, constraints, URL policy, and verification plan. | [x] |
| OGM-02 | Read the Edge mapper, handoff, UI input, locale copy, and relevant project mapping references. | [x] |
| OGM-03 | Verify the repository test/lint configuration and preserve the pre-existing working tree. | [x] |
| OGM-04 | Obtain parent readback and explicit authorization to edit source. | [x] |
| OGM-05 | Implement the smallest Edge mapper change for supported links and legacy coordinates. | [x] |
| OGM-06 | Update the short handoff mapping documentation. | [x] |
| OGM-07 | Run the planned local static, diff, and mocked VM checks; record exact results. | [x] |

## Constraints

- This task is local-only. No remote inspection, deployment, manual HTTP invocation, Odoo write, or network request to a user link is authorized.
- Do not add dependencies, test files, commits, staging changes, or modify unrelated files.
- Preserve existing HTML escaping and add escaping for link `href` and displayed URL.
- Do not weaken the legacy coordinate validation or alter empty-value clearing behavior.
- Preserve all existing user changes, including staged and untracked files.

## Acceptance criteria

- A supported credential-free HTTPS Google Maps link serializes to escaped Odoo anchor HTML.
- Legacy valid `{ "lat": ..., "lng": ... }` JSON produces the existing canonical Google Maps coordinate anchor.
- Empty values still clear the Odoo field with `false`.
- Invalid JSON that is not a supported URL, out-of-range coordinates, malformed URLs, non-HTTPS URLs, credential-bearing URLs, `javascript:` URLs, `data:` URLs, and unapproved hosts fail closed with a validation error.
- No behavior outside Google Maps mapping changes.

## Verification plan

**TDD mode:** Not configured: `package.json` declares lint and build scripts but no test runner, and the repository has no existing test suite. Do not add tests. Before implementation, execute an in-memory Node TypeScript VM harness with mocked Deno/Supabase/Odoo boundaries and no network access.

| Check | Expected evidence |
| --- | --- |
| `pnpm exec eslint supabase/functions/odoo-project-sync/index.ts` | Exit 0. |
| `git diff --check` | Exit 0 for the working tree diff. |
| In-memory Node TypeScript VM | Link acceptance, legacy coordinate preservation, empty clearing, HTML escaping, rejected schemes, credentials, invalid/malformed values, and unapproved hosts; no network calls. |

## Evidence and progress

- OGM-01 through OGM-04 completed on 2026-09-22.
- `ShowGoogleMaps` uses `type="url"`; Spanish locale copy says “Enlace de Google Maps” and “Introduce el enlace de Google Maps.”
- `projectValues` now falls back from the unchanged coordinate parser to a small Google Maps URL validator. `escapeHtml` is shared by existing description HTML and both link anchor values.
- The initial local `git diff --check` and cached-diff check produced no whitespace errors. The working tree already contains unrelated modified and untracked files; no files were changed during exploration before this tracker.
- `pnpm exec eslint supabase/functions/odoo-project-sync/index.ts` exited 0.
- `git diff --check` exited 0.
- An in-memory Node TypeScript-transpiled VM checked 18 mapper scenarios with a network-disabled `fetch` stub: three accepted link forms, numeric and string coordinate JSON, empty/null clearing, query-string HTML escaping, and ten rejected malformed or unsafe values. It reported `network calls: 0`. No test file or dependency was added.
- The URL mapper makes no request. The existing owner-resolution and unmapped-collaborator paths were not modified.
- Independent functional verification passed 27/27 checks: 21 mapper cases, four mocked handler CREATE/UPDATE cases, description escaping, and customer/unmapped-collaborator regression coverage. The first handler fixture lacked a project ID; its four failures were fixture errors, corrected before the final run. No real network requests were performed.
- The parent reran scoped ESLint and `git diff --check` successfully. Native Deno typechecking remains unavailable.
- Native review is enabled but preflight requires untracked-file selection and includes unrelated changes. No review START, consent, or approval was obtained. Functional verification is not a review receipt.
- Engram mirror `odd/odoo-google-maps-links/tasks` remains pending because session-less saves fail with multiple active runtime sessions.
- Deployment authorization was subsequently granted for only `odoo-project-sync` in Supabase project `mygqfdbloqojffhsurgo`, including configuration/source readback. No function invocation, Odoo call, SQL, or data write was performed.
- The first deployment (version 13) contained one transcribed internal error-message difference. Full comparison found no other difference. A corrective deployment (version 14) restored the verified local source; independent complete textual readback of all 353 lines found no differences. Supabase reports `ACTIVE`, `verify_jwt=true`, bundle SHA-256 `11650718033de79d667254b396cd5272d8d8644a38e77cde21290b396c772d4a`. This is a bundle hash, not a computed source hash.
- Next step: the user saves project 426 again and checks the resulting Odoo synchronization. The previous failed INSERT is not retried automatically.
