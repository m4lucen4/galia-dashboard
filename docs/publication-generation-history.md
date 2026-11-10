# Publication generation history — read contract

T1 adds a local, typed history service using the existing authenticated Supabase client and project-authority RLS. **The history screen, route, compact status card and historical retry integration are not implemented yet.** No backend, policies, grants, migrations or deployment change is required by this slice.

The [existing operational guide](publication-generation.md) remains the reference for generation, receipts, retries and recovery. This document describes only the additive history contract; it does not supersede that guide's rollout or verification limitations.

## Read one page

```ts
import { readGenerationHistory } from "@/features/projects/services/publicationGeneration";

const controller = new AbortController();
const result = await readGenerationHistory(actorUid, 1, controller.signal);
// result: { jobs, page: 1, pageSize: 10, totalCount }
const pageCount = Math.ceil(result.totalCount / result.pageSize);
// Abort on navigation/session changes; discard responses from an obsolete view.
controller.abort();
```

| Field / rule | Contract |
|---|---|
| Input | Verified actor UUID, one-based safe-integer page, required AbortSignal. Invalid pages or unsafe offsets fail with `invalid_request`. |
| Pagination | One server-side inclusive range: `(page - 1) * 10` through `page * 10 - 1`. Fixed size **10**, with an exact RLS-visible job count. No full-history scan or client pagination. |
| Order | Database `created_at DESC, id DESC`; retries changing `updated_at` do not move a job to the top. |
| Result | `GenerationHistoryPage`: `jobs: PersistedGenerationJob[]`, `page`, `pageSize: 10`, `totalCount`. Count is from the job query, not the number of hydrated jobs. |
| Details | Slot reads are restricted to the selected page's job IDs (at most ten reads), in slot order. No off-page slot or snapshot reads. |
| Project/date/state | Each job supplies string `projectId`, trustworthy database `createdAt`, and existing `status`. Resolve project labels in the screen, with an ID fallback for unavailable/deleted projects. |
| Progress/details | Existing `succeeded`, `failed`, `pending`, `total`, slots, preview IDs, diagnostics, model, prompt version, retry count, `consistent` and `canRetry` are retained. Completed count is `succeeded + failed`. Bigint IDs stay strings. |

An empty visible history returns `jobs: []`, `totalCount: 0`. A successful empty out-of-range response retains the requested page and server count; the service does not clamp pages. PostgREST range errors remain read errors. Missing/invalid counts, malformed rows or a server row cap truncating a ten-row page fail rather than silently skip jobs. Offset pagination is not a frozen snapshot: concurrent insertions can shift page boundaries; refresh to reconcile.

## Authority and consistency

- Jobs and slots use existing SELECT policies and `publication_generation_can_read`, whose current predicate is defined in `20261109000300_generation_assigned_editor.sql`. There is **no initiating-actor filter**, client-side role override or new RPC.
- Non-admin readers must own or be the currently assigned UID on an extant project whose current owner matches the job's owner snapshot. Unrelated users, removed assignees and mismatched owners do not gain history access. Admins retain historical reads, including deleted projects, under the existing predicate.
- The service verifies the expected authenticated actor before reading and again before returning. The screen must still discard obsolete actor/page responses and abort on cleanup.
- Separate job/slot SELECTs can straddle a worker commit. Existing parser consistency checks remain authoritative: inconsistent jobs must not be announced as settled or offered retry. Empty slot reads discard that job, matching restoration's access-revocation behavior; the page may then contain fewer than ten jobs while retaining the earlier count. Refresh rather than backfill from another page.
- Read errors use existing sanitized issue codes (`unauthorized`, `not_ready`, `read_failed`; malformed job fields use `invalid_response`). Use `safeGenerationIssue` at the UI boundary; never display raw SDK/provider text.

This is source-level preservation of existing RLS, **not live Auth/PostgREST proof**. In-memory probes cannot demonstrate deployed policy enforcement or eliminate races between independent reads.

## Creation timestamps and existing callers

`GenerationJob.createdAt` is optional because existing start/retry/replay RPC summaries omit it. The parser accepts those summaries unchanged and preserves a supplied valid timestamp; it never fabricates creation time from update time or the client clock.

Database reads require a valid `created_at` and preserve its original string, including fractional precision. History jobs expose it as required through `PersistedGenerationJob`. `restoreGenerationJobs` now also supplies it while retaining its existing `GenerationJob[]` signature, latest-per-project/active-first recovery scan and all prior fields. Do not use `updatedAt` as a creation-order fallback; restore missing creation timestamps before selecting the newest settled job. Database ordering retains timestamp precision beyond JavaScript milliseconds.

## T2 integration boundary

1. Build the screen's loading, empty, error and pagination states around `readGenerationHistory`; keep page state separate from background restoration. No historical page should replace the hook's compact recovery collection.
2. Reuse existing details and progress fields. `canRetry` expresses slot/status eligibility, **not mutation authorization**: deleted/changed-owner projects can remain admin-readable without being retryable by the backend.
3. Integrate retries for the exact historical job deliberately: the current hook accepts retries only for jobs in its compact collection. Preserve active-project exclusion, persisted request precedence, same-ID replay and successful slots; do not bypass the existing guard merely to show a button.
4. Leave the generation modal unchanged. Compact-card selection, navigation, translations and browser verification belong to later tasks.

T1 verification uses disposable in-memory TypeScript/Supabase probes, focused ESLint and whitespace checks. The parent owns build verification; browser, live RLS and historical retry integration proof remain pending.
