# myWeb editorial cards — implementation tasks

**Repository locator:** `odd/tasks/myweb-editorial-cards.md`
**Objective:** Add a two-column editorial card block to the myWeb builder, with a 4:3 image, title, rich description and secondary-style CTA in each column.
**Problem / why:** Studios need to compose the paired image/text/link section shown in the supplied reference; the builder has no block for two independent editorial cards.
**Authorized scope:** `src/features/myWeb/components/**`, `src/redux/actions/SiteComponentActions.ts`, `src/redux/slices/SiteComponentSlice.ts` if required, `src/types/index.tsx`, and this tracker. Do not change `../mocklab-sites`, unrelated dirty files, dependencies, database schema or remote services.
**Constraints:** Use the existing RichTextInput and ImageUploader, existing CTA secondary text/URL field naming, Spanish UI and English code. Two fixed columns, with one optional image and optional button per card; 4:3 is a display crop, not a new cropping workflow. Preserve current JSON config and site component behavior. The public renderer is a separate repository: deliver an implementation prompt, not edits.
**Branch point:** `main` at `e688e7d`; feature branch `feat/myweb-editorial-cards`. Existing dirty `FontSelector.tsx`, `synology/photo_processor/config.json` and `.atl/` are unrelated and must not be staged or modified.
**Route:** delegated direct for MEC-01 (multiple nontrivial files and write preparation). ~400 authored changed lines per task is advisory only; do not omit necessary code for the number.
**TDD:** off (project AGENTS.md says no test suite or test files); runner: none. Functional checks: focused ESLint on modified files, `pnpm build`, `git diff --check`; manual authenticated builder verification when available.
**Delivery strategy:** ask-on-risk; estimated total ~300–450 authored changed lines, reassess accumulated authored lines before next commit. No PR, push or merge authorized.

## Checklist

- [x] **MEC-01 — Register and edit editorial cards:** Added typed two-card config/defaults, picker, dispatcher and editor with existing rich-text/image controls, per-card scoped upload, title and secondary CTA fields, and explicit save. Uploads are queued; failures are visible, and save uses a stable snapshot without overwriting newer local edits. Route: delegated (type, actions, picker, dispatcher, editor). **Verification:** `pnpm build`, focused ESLint for five modified files and `git diff --check` passed. `SiteComponentActions.ts` has 14 pre-existing lint errors (unused catch variables), reproduced against the pre-change base; no new lint errors identified there. No browser/authenticated site runtime available; upload, persistence after reload and public rendering remain unverified manually. **Rollback boundary:** new type/default, picker, dispatcher, editor and upload thunk. **Commit:** `b058934` (`feat(myweb): add two-column editorial cards`). **RDD:** medium, `under_budget` (373 authored changed lines against branch point); no review started; boundary remains `e688e7d` until a later due slice.
- [x] **MEC-02 — Use editor space efficiently:** The card configuration panels share a two-column grid when their container is at least 44rem wide and stack below that width. Button fields remain single-column inside each narrower panel; save controls stay below both. Route: inline (already-understood mechanical layout edit in one source file). **Verification:** focused ESLint, `pnpm build`, and `git diff --check` passed; visual browser check unavailable. **Rollback boundary:** layout-only classes and grid wrapper in `EditorialCardsEditor.tsx`. **Commit:** `e802a82` (`fix(myweb): show editorial card settings side by side`). **RDD:** medium, `under_budget` (380 net changed lines against `e688e7d`); no review started. PR organization remains user-owned per explicit reply; no push or PR created.

## Acceptance criteria

- The component can be added, edited, hidden, reordered and removed like existing regular-page blocks.
- Each of exactly two cards independently stores image URL, title, rich HTML description, secondary CTA label and URL; optional buttons do not render without both label and URL in the public renderer.
- Image uploads are scoped to the current user/component/card, with existing site image conventions; the public renderer will display images at 4:3 with `object-fit: cover`.
- Both cards survive reload; existing blocks continue working; no new dependency, migration or test suite.
- The builder shows both card editors in two columns when there is enough space and one column on narrow screens; fields remain usable without overflow.
- Applicable build, focused lint and diff checks pass before closing tasks; any unverified manual or public renderer behavior is reported honestly.

## Progress and next step

- MEC-01 committed with static checks passed; manual authenticated flow and public renderer are still pending. The new renderer is a separate change for `mocklab-sites`; provide a prompt without editing that repository. Unrelated dirty work remains untouched.
- MEC-02 layout-only correction passes static checks. Manual authenticated flow and public renderer remain pending; unrelated dirty work must remain untouched. User will handle PR organization.
