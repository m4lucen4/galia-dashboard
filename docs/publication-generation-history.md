# Publication generation history

Projects now shows one generation: an active job first, otherwise the newest by creation date and ID. **Generation history** beside the card opens `/projects/generation-history`, with ten generations per server page, details and eligible retries. The link remains available without a card. The generation modal is unchanged; no backend, policies, grants, migrations or deployment changes are included.

## Quick path

1. Open **Projects → Generation history**. Generations are newest first, based on creation rather than last update.
2. Inspect a row's project identifier, creation date, status and completed/total progress; expand **Available details** for slots and diagnostics. Identifiers also work for admin-visible deleted projects, without a separate all-project lookup.
3. Use **Retry failed only** when available. An existing pending receipt instead offers **Check the same request**. Successful variants are preserved.
4. Check **Pending requests and notices** for recovery across all tracked projects, including projects outside the current page. Loading, read errors and storage limitations remain visible; refresh retries reads. If a page disappears, a successful count clamps to the last page; a range error offers the first page.

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

## Selection, recovery and retry boundaries

- Card selection does not truncate the hook's tracking collection or polling. Inconsistent snapshots remain active for selection. Creation ordering retains sub-millisecond precision and uses ID to break ties.
- Immediate RPC summaries can lack creation time. Merging preserves a known timestamp for the same job; otherwise the latest accepted undated submission gets feedback until server restoration supplies its creation time. Neither update time nor the client clock is substituted.
- Pending receipts remain in the existing actor-scoped storage. The history link carries transient errors for the same actor so hiding an unselected project's card does not hide its recovery path. Those errors are not persisted independently; a new tab/direct visit restores receipts and current server state, not another view's transient errors.
- `readGenerationJob(actor, jobId, signal)` reads exactly one RLS-visible job and its slots, verifying the actor before and after. A historical retry uses that fresh job plus existing restoration to exclude active jobs in the same project. No initiating-actor filter or role override is added.
- The existing hook owns submission, synchronous per-project locks, receipt preparation/acknowledgement and response handling. Pending receipts take precedence both before and after asynchronous validation. Actor switches cancel reads and prevent obsolete responses from submitting or acknowledging requests.
- `canRetry` is slot/status eligibility, **not mutation authorization**. Admin-readable deleted/changed-owner projects may show an eligible action that the unchanged server rejects. Final server checks, successful slots and retry limits remain authoritative.
- Page reads are separate from background recovery; changing pages cannot replace the tracking collection. Rows use existing details and buttons; on narrow screens their project/date, status/progress and actions stack in DOM order. The shared pagination component is unchanged.

## Verification and remaining proof

Disposable in-memory TypeScript probes cover compact selection, pagination wiring/stale responses, historical retry guards, receipts, actor switches and request locks. Differential probes compare existing public service/hook behavior with T1 (`3abbdbe`). No test files or dependencies are added. Focused ESLint and `git diff --check` are worker checks; the parent owns the emitting build.

These checks are not browser, visual, live Auth/PostgREST or deployed-policy proof. Inspect narrow/wide layouts, zoom, keyboard focus, screen-reader announcements and the existing shared pagination controls before release. Risk item 2 remains authorization-sensitive despite unchanged RLS; risk item 4 remains receipt/retry-concurrency-sensitive despite reusing the mutation path. Independent verification belongs to T3.
