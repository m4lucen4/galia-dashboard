# Projects Drawer NAS Refactor

## Objective

Prepare a behavior-preserving refactor of the Projects drawer in two stable work units:

1. Centralize pure NAS path construction.
2. Extract drawer state and handlers into `useProjectDrawer`, then integrate it into `Projects`.

Implementation is limited to the approved helper, drawer hook, and screen
integration described below.

## Scope

### Included

- Add pure NAS path helpers under `src/helpers/nasPaths.ts`.
- Preserve the current NAS path rules from `Projects.tsx` lines 366-418:
  - A photographer editing their own project takes precedence.
  - The display/file folder includes a leading slash.
  - The base folder has no leading slash.
  - Multimedia projects use the `_min` suffix; traditional projects use `_alta`.
  - Folder names retain the current project ID, optional Odoo ID, and initials format.
- Extract drawer-specific state and handlers from `Projects.tsx` into
  `src/features/projects/hooks/useProjectDrawer.ts`.
- Keep the existing create flow order exactly: create project, rename NAS folder,
  restructure NAS files, translate photo tags through `fileMapping`, then save
  project photos.
- Integrate the hook back into `Projects.tsx` without changing UI text or visual
  behavior.

### Excluded

- Edit-mode loading behavior and data loading changes.
- Changes to NAS endpoints, Redux thunks, Supabase, Photo Processor, or Edge
  Functions.
- UI, i18n, dependency, test-file, commit, or remote changes.
- Any modification to existing dirty or untracked work, including Stripe webhook,
  Photo Processor config, `.atl/`, analytics files, and other `odd/tasks` files.

## Evidence

- `src/features/projects/screens/Projects.tsx` is 665 lines.
- NAS getter duplication is at lines 366-418.
- Drawer handlers are at lines 139-187 and submit orchestration is at lines
  217-288.
- `skills/synology.md` confirms `/restructure` returns `fileMapping`, which must
  translate filenames before `addProjectPhotos`.
- `AGENTS.md` states that this project has no test suite and test files must not
  be created.

## TDD Mode

- **Status:** Not enabled.
- **Source:** `AGENTS.md` states “No tests”; `package.json` exposes only `dev`,
  `build`, `lint`, and `preview`; no test files or TDD configuration were found.
- **Runner:** None configured. Do not add one and do not create test files.
- **Verification mode:** Ordinary static checks only.

## Tasks

### 1. NAS pure helpers

**Status:** Complete

Create `src/helpers/nasPaths.ts` with typed, side-effect-free
helpers that derive the current project NAS file folder and base folder. Replace
the duplicate `Projects.tsx` getter logic only after confirming the helpers
preserve photographer precedence, slash conventions, suffix selection, Odoo ID,
and initials behavior.

**Acceptance checks:**

- File-folder output remains `/{folder_nas}/{project-folder}/{project-id}_{size}`.
- Base-folder output remains `{folder_nas}/{project-folder}`.
- No NAS request or async workflow moves into these helpers.

**Rollback:** Revert `nasPaths.ts` and restore the two local getters in
`Projects.tsx`; no external state or remote data requires recovery.

### 2. Project drawer extraction and integration

**Status:** Complete

Create `src/features/projects/hooks/useProjectDrawer.ts` and move only drawer
state, open/close/edit/create-from-multimedia handlers, derived drawer props, and
submit orchestration into it. Keep table, launch, recovery, deletion, assignment,
filters, realtime handling, and edit-mode loading behavior in `Projects.tsx`.
Integrate the hook by passing the same `ProjectsForm`, `Drawer`, and multimedia
modal values currently used by the screen.

**Acceptance checks:**

- The drawer receives the same title, initial data, NAS folder, project ID, Odoo
  ID, loading state, and submit handler.
- Create-from-multimedia still derives the same prefill and `_min` folder.
- Post-create async order remains rename → restructure → translate tags → save
  photos.
- Edit-mode loading remains unchanged.

**Rollback:** Revert `useProjectDrawer.ts` and the integration changes in
`Projects.tsx`; the previous screen-local drawer implementation remains the
recovery point.

## Verification

Run after implementation, not during this preparation-only task:

```bash
pnpm exec eslint src/features/projects/screens/Projects.tsx src/features/projects/hooks/useProjectDrawer.ts src/helpers/nasPaths.ts
pnpm build
```

The first command is the exact targeted command supported by the existing ESLint
configuration. The second is the repository's ordinary TypeScript and Vite build
check. No test command exists.

## Progress

- [x] Inspected `skills/synology.md` and the work-unit-commits skill.
- [x] Inspected `Projects.tsx`, NAS actions, ESLint configuration, and package
  scripts.
- [x] Resolved TDD mode as not enabled and identified ordinary verification.
- [x] Created this preparation plan.
- [x] Implement Task 1.
- [x] Implement Task 2.
- [x] Run verification after source changes.

## Status

Implementation complete. The NAS helper resides in `src/helpers/nasPaths.ts` as
approved. `pnpm exec eslint src/features/projects/screens/Projects.tsx
src/features/projects/hooks/useProjectDrawer.ts src/helpers/nasPaths.ts` passed.
`pnpm build` passed with the existing Vite chunk-size warning. This plan is
advisory for review sizing; the 400-line threshold is not a hard limit. The
required Engram task mirror is pending: the session-less save was rejected
because multiple active runtime sessions match this project and directory.
