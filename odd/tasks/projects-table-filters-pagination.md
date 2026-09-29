# Projects Table Filters and Pagination

**Repository locator:** `odd/tasks/projects-table-filters-pagination.md`
**Status:** Implementation complete — focused static verification complete; browser and global lint remain pending.

## Objective

Add client-side project title search for every role, an admin-only owner filter, and combined filtering with the existing status filter. Pagination must remain on the current page after a save or refetch, reset only after a deliberate filter change, and clamp to the final available page when the filtered dataset shrinks.

## Scope

### Included

- Search project titles for all roles using the already loaded project list.
- Retain and combine the existing status filter with the new title and owner filters.
- Show an owner dropdown only when `currentUser.role === "admin"`; use the project creator relationship (`project.user`) and available user data for its choices and labels.
- Make pagination state intentional so data refreshes preserve the current page.
- Reset pagination to page one after an explicit title, status, owner, or clear-filters action.
- Clamp the current page to the final valid page after a refresh, mutation, or filter result removes enough rows to invalidate it.
- Add Spanish UI strings through the existing i18n catalog during implementation; identifiers and implementation artifacts remain English.

### Excluded

- Server-side filtering, query changes, Supabase, Redux thunk, schema, or API changes.
- Changing which projects a non-admin receives; `useProjectsData` continues to fetch by user for non-admin roles.
- New dependencies, installs, test files, commits, remote work, or modifications to unrelated dirty/untracked files.
- Source implementation outside the included project filter and pagination work.

## Current Evidence

| Locator | Finding |
| --- | --- |
| `src/features/projects/screens/Projects.tsx:39-40,87-93` | The screen owns a single `stateFilter`, derives `uniqueStates`, and passes filtered projects to the table. |
| `src/features/projects/screens/Projects.tsx:95-100,129-230` | Initial load and post-save/refetch paths call `fetchProjectsData`; filtering must not accidentally reset pagination on these paths. |
| `src/features/projects/components/projectsTable/index.tsx:174-190` | TanStack Table owns pagination internally with `pageSize: 10`; the page is currently uncontrolled. |
| `src/features/projects/components/projectsTable/index.tsx:89-103,168-172` | The creator column is available only to admins and derives its label from `project.userData`. |
| `src/types/index.tsx:62-70` | `ProjectDataProps` provides `title`, `state`, creator ID `user`, and optional creator data `userData`. |
| `src/hooks/useProjectsData.ts:18-32` | Admins load all projects; non-admin roles load only their own projects. |

## TDD Mode

- **Status:** Disabled.
- **Reason:** Project `AGENTS.md` prohibits test files and states that no test suite exists. `package.json` has no test script or runner.
- **Verification mode:** Ordinary static checks only; do not install or configure a runner.

## Implementation Tasks

### PTF-001 — Add combined, role-aware filter controls

**Status:** Complete

Update `Projects.tsx` to own title, status, and owner filter values and derive the displayed project list by applying all active filters together. Keep title matching case-insensitive against `project.title`. Derive owner options from loaded project/user data, use `project.user` as the selected owner value, and render the owner control only for admins. Extend the existing clear action to clear every filter deliberately.

**Acceptance checks:**

- A title search is rendered and filters the loaded project list for every role.
- Status and title criteria combine with logical AND; an admin owner criterion joins the same combined result.
- Non-admin users never receive the owner dropdown and retain their existing project dataset behavior.
- Owner labels safely handle missing `userData` without making the filter unusable.
- Changing any individual filter or using clear filters is an explicit pagination-reset event.
- New visible labels use existing Spanish i18n conventions; no hard-coded new UI copy is introduced.

**Rollback:** Revert only the filter-control and derived-list changes in `Projects.tsx` plus the corresponding locale entries.

**Review advisory:** Target roughly 400 changed lines or fewer. This is an advisory review budget, not a hard cap; keep the task cohesive rather than compressing code to meet it.

### PTF-002 — Control pagination across refreshes and dataset shrinkage

**Status:** Complete

Update `projectsTable/index.tsx` (and its minimal screen integration) so pagination state is controlled or otherwise explicitly preserved when the `projects` array refreshes after save/refetch. Accept a deliberate filter-change signal or reset mechanism from the screen, reset to page one only for that signal, and clamp an invalid current page when the row count drops. Preserve the existing page size and sorting behavior.

**Acceptance checks:**

- Saving or refetching data while the current page still exists keeps that page selected.
- A deliberate title, status, owner, or clear-filters change resets to page one.
- If deletion, refresh, or filtering reduces the total pages below the selected page, the table moves to the final valid page instead of rendering an empty invalid page.
- A zero-result filter shows the existing empty state without an out-of-range pagination error.
- Pagination remains at 10 rows per page and sorting continues to work.

**Rollback:** Revert only the pagination-state changes in `src/features/projects/components/projectsTable/index.tsx` and the minimal reset wiring in `Projects.tsx`.

**Review advisory:** Target roughly 400 changed lines or fewer. This is an advisory review budget, not a hard cap; split only by independent behavior if the implementation genuinely exceeds it.

### PTF-003 — Verify filters and pagination behavior

**Status:** Partially complete — focused static checks complete; browser and global lint pending.

Run the repository-supported static checks after PTF-001 and PTF-002. Manually inspect the implemented behavior in the development UI if a local session is available; this is not a substitute for a test runner and creates no test files.

**Acceptance checks:**

- `pnpm exec eslint src/features/projects/screens/Projects.tsx src/features/projects/components/projectsTable/index.tsx` passes.
- `pnpm lint` passes.
- `pnpm build` passes; record any pre-existing warnings separately from failures.
- Verify title search for a non-admin view, owner-filter visibility for an admin view, combined filter results, filter-triggered reset, refresh preservation, and shrinkage clamping.
- `git diff --check` passes and unrelated dirty/untracked files remain untouched.

**Rollback:** No production behavior is introduced by verification. Do not alter unrelated files to make checks pass.

**Previous verification results:**

- `pnpm exec eslint src/features/projects/screens/Projects.tsx src/features/projects/components/projectsTable/index.tsx` passed with one existing TanStack React Compiler compatibility warning in `projectsTable/index.tsx`.
- `pnpm lint` failed on 38 existing errors outside this task's scope, plus warnings; no unrelated files were changed to address them.
- `pnpm build` passed, with Vite's existing chunk-size warning.
- Browser verification is pending because no local browser session is available without using ambient credentials.

**Reopened verification:**

- `pnpm exec eslint src/features/projects/screens/Projects.tsx src/features/projects/components/ProjectsFilters.tsx src/features/projects/hooks/useProjectFilters.ts src/features/projects/components/projectsTable/index.tsx` passed with the existing TanStack React Compiler compatibility warning in `projectsTable/index.tsx`.
- `pnpm build` passed with Vite's existing chunk-size warning.
- `git diff --check` passed.
- Global `pnpm lint` remains pending: two prior workers observed 38 errors outside this task's scope, so it must not be reported as complete without a fresh full-lint result.
- Browser verification remains pending; no browser session was used.
- Parent inspection confirmed the dedicated row, admin owner/state/title control order, title `md:flex-1 md:min-w-64` sizing, and hook extraction. A focused ESLint rerun reported 0 errors and the existing TanStack React Compiler warning only.
- Native review remains pending because its candidate scope includes unrelated existing changes; no user authorization has been provided for that scope.

### PTF-004 — Extract filters into a dedicated responsive row

**Status:** Complete

Move the filter state, derived options, combined predicate, reset handlers, and pagination-reset version from `Projects.tsx` into `useProjectFilters.ts`. Render the controls through `ProjectsFilters.tsx` in a dedicated row directly below the create and analytics actions. Keep the controls ordered as owner (admin-only), state, and title; make the title input expand on desktop, wrap or stack safely on mobile, and place the clear action at the row end.

**Acceptance checks:**

- Filters are no longer embedded in the create and analytics action row.
- `ProjectsFilters.tsx` owns the filter markup and `useProjectFilters.ts` owns filter state, derived values, predicates, and reset handlers.
- Admins see owner, state, and title controls in that order; non-admins do not see an owner control.
- The title input has the widest responsive allocation, controls do not overflow narrow screens, and clear filters remains at the row end.
- Existing title, state, owner, combined-filter, clear, and `filterChangeVersion` behavior is unchanged.
- Refreshes after edits preserve the selected table page; only filter interactions reset it.
- Controls have accessible Spanish labels using the existing i18n catalog.

**Rollback:** Revert only `ProjectsFilters.tsx`, `useProjectFilters.ts`, and their integration in `Projects.tsx`; preserve the existing pagination logic in `projectsTable/index.tsx`.

**Review advisory:** Target roughly 400 changed lines or fewer. This is an advisory review budget, not a hard cap; keep this extraction and layout correction cohesive.

## Progress

- [x] Read `Projects.tsx`, `projectsTable/index.tsx`, `useProjectsData.ts`, shared project types, and package scripts.
- [x] Confirmed the current status-only filtering and uncontrolled table pagination boundary.
- [x] Confirmed TDD is disabled by repository policy and absent test tooling.
- [x] Created this tracking document only.
- [x] Implement PTF-001.
- [x] Implement PTF-002.
- [x] Implement PTF-004.
- [x] Re-run focused PTF-003 verification after PTF-004.
- [ ] Complete global lint and browser verification when those environments are available.
- [ ] Complete native review only after the user authorizes its unrelated candidate scope.

## Next Step

Complete global lint and browser verification when those environments are available, and native review only after its candidate scope is authorized; do not mark any of them complete without observed results.
