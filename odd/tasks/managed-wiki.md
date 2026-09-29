# Managed Wiki — implementation tasks

**Repository locator:** `odd/tasks/managed-wiki.md`  
**Status:** Implementation complete; verification PARTIAL: browser/admin/Storage HTTP pending; native review unavailable.  
**Parent handoff:** Read this file and Engram topic `odd/managed-wiki/tasks` before source, schema, dependency, or remote work. RDD remains enabled globally.

## Objective and boundaries

Replace the static SPA `/wiki` page with an initially empty managed Spanish wiki. Public visitors browse published sections, subsections, and articles. Administrators manage drafts, revisions, assets, and publication without exposing drafts or mutating a published revision.

- Keep `/wiki` in the current React SPA and `PublicRoute`.
- Exclude SSR, SEO, seed/initial-content migration, scheduled publication, translations, comments, collaboration, analytics, external search, tenant work, and unrelated refactors.
- No fixture or real wiki data was persisted; the public wiki starts empty.
- Authorized roots are wiki source/routes/navigation/Redux/types and `supabase/migrations/` only.
- Preserve protected unrelated paths: `supabase/functions/stripe-webhook/index.ts`, `synology/photo_processor/config.json`, `.atl/`, `supabase/functions/project-analytics/`, and `supabase/functions/stripe-webhook/config.toml`.
- Do not deploy frontend, commit, push, or repeat production DDL.

## Shared expectations

- Public reader: empty state, continuous section reading, responsive navigation, scrollspy, stable deep links, and published-only search.
- CMS: `AdminRoute`, typed Redux hooks/thunks/slices, `IRequest`, CRUD/order, rich text, managed media, and reference protection.
- Publication: draft save/preview, explicit publish/unpublish, immutable published revisions, history, and restore-to-draft.
- Security: database RLS/Storage, not route checks alone, protect editorial data and assets.
- No tests: `AGENTS.md` prohibits test files. Evidence is build, focused ESLint, source assertions, database verification, and pending manual checks.

## Task ledger

### MW-00 — Role and UID safeguard

**Status:** Implemented and independently database-verified; native review was not started, so no approval is claimed.

- Applied `20260916210901_guard_user_data_role_and_uid` to authorized project `mygqfdbloqojffhsurgo`.
- The private empty-search-path `SECURITY DEFINER` trigger protects self-registration/edit roles and UID while preserving authorized admin/service/maintenance flows.
- Rollback-only synthetic SQL and independent read-only verification passed; fixtures left no rows and did not alter profiles, `auth.users`, or identity sequences.
- Rollback boundary: this migration only. Removing it reopens the original role/UID escalation; remove `private` only if empty.

### MW-01 — Wiki backend foundation

**Status:** Implemented and database-verified.

- All seven wiki migrations match remote history by normalized MD5 metadata: foundation, unchanged-publish prevention, reorder constraints, published-only reads, archive restore, and the two media lifecycle corrections.
- The backend provides admin editorial RPCs, immutable revisions, validated JSON/media references, private `wiki-media`, published-only RPCs, RLS, ordering constraints, and media lifecycle protection.
- No production DDL was repeated. Historical exact-match proof is not a local pristine PostgreSQL replay.
- Final read-only check found zero rows in all eight wiki tables and zero `wiki-media` `storage.objects`. All 13 public `SECURITY DEFINER` wiki admin RPCs call `private.wiki_require_admin()`, deny anon `EXECUTE`, and use a fixed empty search path.
- Rollback boundary: the seven wiki migrations and dependent wiki behavior only; do not remove unrelated schema or data.

### MW-02 — Typed public data layer

**Status:** Implemented; source and technical checks complete.

- Typed wiki domain/JSON contracts, public RPC thunks, request-state slice, stale section/search protection, and store registration are present.
- Public routes remain `/wiki` and `/wiki/:sectionId/:sectionSlug?`.

### MW-03 — Public reader

**Status:** Implemented; source and technical checks complete; browser proof pending.

- Published-only reader includes responsive navigation, scoped fetches, debounced search, deep links, safe JSON rendering, and private-media Blob downloads.
- Rendered articles now expose canonical `article-{id}` anchors and `data-wiki-article`; deterministic scrollspy consumes those markers.
- Browser proof is still required for responsive drawer, keyboard/focus, hash and back navigation, scrollspy, real image download, and empty/published/error states.

### MW-04 — Admin editor and structure

**Status:** Implemented and database-verified; browser/admin-session proof pending.

- Lazy protected `/wiki/admin` and feature-local structure management support section/subsection/article CRUD, moves, archive/restore, and complete sibling ordering.
- Structure reads normalize `draft: WikiDraft | null` and sort each nested level by `position`.
- Static/public and Navbar exits are guarded when an article has unsaved work.
- Archive/restore migration `20260916221909_restore_archived_wiki_articles` passed rollback-only synthetic database checks.

### MW-05 — Rich editor and managed media

**Status:** Implemented and database-verified; browser/Storage HTTP proof pending.

- Feature-local Tiptap toolbar/media library supports safe rich text, tables, typed callouts, and managed image metadata only. External image paste is visibly rejected.
- Media uses Blob thumbnails, compression/validation, immutable IDs, `upsert: false`, readiness confirmation, reusable node-local metadata, and reserve/remove/finalize lifecycle handling.
- Applied media corrections `20260917061652_fix_wiki_media_storage_lifecycle` and `20260917062013_clear_ready_timestamp_when_reserving_wiki_media`.
- Rollback-only synthetic checks passed for authorized helpers/lifecycle/reference denial and existing upload RLS metadata INSERT. No real HTTP Storage upload/download occurred.

### MW-06 — Draft lifecycle and stale-response safety

**Status:** Implemented; source and technical checks complete; browser proof pending.

- Serial debounced autosave uses local snapshots and acknowledged versions. Manual save flushes it; blank titles are rejected; failures remain dirty; `40001` CAS pauses save/publish without overwriting local text.
- Publish flushes and locks editing; restore reloads through a local token; history is article/request scoped; structure mutations are disabled during writes.
- Explicit discard cancels queued saves and invalidates late callbacks. Guarded article/public/Navbar exits prevent accidental loss.
- Public/admin caches reset on auth changes and ignore stale structure/history/media responses by request ID.
- Known limitation: existing `BrowserRouter` cannot reliably block browser back/forward without a data-router migration. Users must wait for saved status before those controls; no data-router rewrite is authorized or implemented.

### MW-07 — Delivery and acceptance verification

**Status:** PARTIAL. Technical evidence is complete; browser and HTTP checks remain pending. Native review is unavailable and was not started.

- Parent final `pnpm build` and `git diff --check` passed after the three verifier corrections.
- Focused wiki ESLint passed. Parent final full `pnpm lint` has exactly 38 errors and 9 warnings, all unrelated baseline findings; it reports no wiki diagnostics. The existing bundle warning over 500 kB remains.
- Public reader, structure, editor, media, and lifecycle compile/focused checks passed. The editor bundle remains separately lazy-loaded.
- Independent functional verifier ran reducer/Vite assertions for stale public section/search/history/media responses and `logout.pending` followed by late fulfillment: passed.
- The verifier rechecked all three corrections by source readback and confirmed them resolved. It attempted populated Documentation Vite/React SSR, but Navbar requires the React Aria `HTMLElement.prototype` DOM API; the attempt did not run. Its Vite process closed with no process left. This is neither SSR nor browser proof.

## Independent verifier corrections

The independent functional verifier found three actual issues, all corrected by the writer and rechecked by source readback:

1. Rendered articles lacked stable anchors. The reader now emits canonical article ID/data markers and has deterministic scrollspy.
2. The public “Ver wiki pública” exit was unguarded. `WikiAdmin`, structure, public links, and Navbar exits now confirm/discard safely; discard cancels queued saves and invalidates async callbacks.
3. Local migration content duplicated a remote column/policies. Local foundation SQL was recovered from remote history; normalized MD5 metadata now matches all seven wiki migrations.

## Package permission

The user authorized pnpm only, and only these exact dependencies: `@tiptap/extension-image@3.23.6` and `@tiptap/extension-table@3.23.6`. They are installed. No other dependency is authorized.

`TableKit` from `@tiptap/extension-table` supplies table, cell, header, and row; separate packages are unnecessary. Callouts use a local extension through existing `@tiptap/react` APIs, not `@tiptap/core`.

## Pending manual acceptance

- [ ] Browser public-reader paths: empty/published/error, drawer, keyboard/focus, scrollspy, deep links, hash, and back navigation.
- [ ] Real authenticated admin session: CRUD, validation/FK errors, reorder, archive/restore, autosave, CAS conflict, publish/unpublish, history/restore, and exit/discard flows.
- [ ] Real HTTP Storage upload, private download, readiness, reserve/remove/finalize, and retry behavior.
- [ ] Native review final candidate, currently unavailable/not started. The canonical status requests `external.select_intended_untracked` with schema `gentle-ai.review-intended-untracked-selection/v1`; the installed runtime exposes no exact input shape, so the parent did not guess, retry malformed input, or start review.

No Chrome or Chromium is installed, so browser, real admin-session, and real HTTP Storage checks were not run.

## Advisory baseline

Keep these unrelated advisories visible; the authorized predicate must be inspected before dismissing any authenticated `SECURITY DEFINER` RPC notice.

- [Mutable `public.update_updated_at` search path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- [OTP expiry over one hour](https://supabase.com/docs/guides/platform/going-into-prod#security)
- [Leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- [Available PostgreSQL security patches](https://supabase.com/docs/guides/platform/upgrading)
- [Authenticated `SECURITY DEFINER` executable notice](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable): 13 warnings are expected for intentionally auth-callable, admin-guarded wiki RPCs. Inspect the authorized predicate; never dismiss automatically.

## Native review boundary

The final native review is unavailable and was not started or approved. The high-risk intended-path assessment requires the canonical external selection above. No lineage, consent/frozen transaction, review receipt, malformed reattempt, or RDD mode change exists. The earlier MW-00 invalid submission is historical only and is not a final-candidate review attempt.

## Implementation gotchas

- `AdminRoute` uses raw `useSelector`; do not refactor it incidentally.
- The browser uses a public anon Supabase client, so database/Storage authorization—not routes—enforces protection.
- Wiki assets must never use public buckets/URLs; drafts and immutable published data remain separate.
- Stable article links require immutable IDs in addition to scoped slugs. Do not reuse static wiki prose as data.
- MW-00 protects role/UID writes; wiki authorization must still be enforced by database policy.
