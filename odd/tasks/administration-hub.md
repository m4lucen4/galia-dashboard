# Administration hub — implementation tasks

**Repository locator:** `odd/tasks/administration-hub.md`
**Objective:** Give administrators a dedicated, extensible administration screen with an initial link to the existing wiki manager.
**Problem / why:** The wiki manager currently appears directly in the profile menu; there is no central entry point for future administrator settings.
**Authorized scope:** Add `src/features/administration/` using existing screen/component conventions; wire the admin-only navigation entry and guarded route; adjust the relevant locale strings. Do not change the wiki editor or unrelated work.
**Constraints:** Keep the existing `/wiki/admin` editor and `AdminRoute`; preserve non-admin behavior and the project's Spanish UI/i18n conventions. No new dependencies, tests, or folder reorganization outside the new feature.
**Route / delegation:** Delegated direct implementation: screen, routing, navigation, and locales span multiple non-trivial files; the writer reads implementation context.
**TDD:** Off, from project `AGENTS.md` (no test suite or test files); runner unavailable. Functional checks: `pnpm build`, focused `pnpm exec eslint` on touched TSX files, and navigation/guard structural readback.
**Delivery:** `ask-on-risk`; estimated authored changes <400 lines, generated files excluded. Initial reviewed boundary: branch point `main` at `3a3d0e4`. Running authored count: 89 lines in AH-01 (`87` additions, `2` deletions).

## Checklist

- [x] **AH-01 — Administration hub:** Implement the new screen and initial wiki-management card/link; add an `AdminRoute`-protected entry and replace the admin profile-menu wiki shortcut with a hub shortcut. Include locale changes. Acceptance: admins reach the hub from the navbar and navigate from it to `/wiki/admin`; non-admins see neither menu entry nor accessible hub route; existing wiki route still works. Verify with build, focused lint and structural readback. Commit one coherent work unit with its checks.

## Progress and evidence

- Implemented `/administration` under `AdminRoute`, its feature-local screen, admin navbar entry, and ES/EN/CAT labels; the wiki card targets the unchanged `/wiki/admin` route.
- Verification: `pnpm build` passed (existing >500 kB chunk warning); `pnpm exec eslint src/components/shared/ui/Navbar.tsx src/routes/index.tsx src/features/administration/screens/Administration.tsx` passed (writer and parent rerun); three locale JSON files parsed; `git diff --check` passed; structural readback confirmed menu role gate and route guard. Runtime browser/admin journey not executed; no test runner exists by project policy.
- Rollback boundary: remove the new administration screen and route, restore the admin profile-menu wiki link, remove the newly added locale keys. Existing `/wiki/admin` remains independent.
- Work-unit commit: `fce5f6c` (`feat: add administration hub for wiki management`). Native assessment over committed-only diff against `3a3d0e4` excluding unrelated untracked inventory: `medium`, `review_due: false`, `review_due_reason: under_budget`; no review/receipt started. Initial assessment without explicit untracked selection was unassessable; inventory-qualified assessment succeeded. RDD remains on (global).
- Next: manually validate the admin and non-admin browser journeys when a browser session is available; further medium changes in this slice remain pending native review until due.
