# Publication generation in Projects

Creation now uses the authenticated `generate-project` function. **This is not an activated deployment.** Until the backend and scheduler are ready, the UI reports that the service is unavailable; it never silently falls back to n8n. The authoritative wire/read contract and operator activation instructions are in [publication-generation.md](publication-generation.md).

## User-visible behavior (S1–S4)

- Launch confirmation closes immediately. Project cards, filters, editing and navigation remain usable while the request or job runs.
- Each generation shows its project title (or project ID when project data is unavailable). “En cola” is distinct from actual generation. There is no simulated stage sequence, ETA or three-minute generation failure.
- Progress is **finished variants / total**, with separate successful and failed counts. Failed variants show safe, localized reasons. Partial results remain available through the existing `/preview-projects` route.
- Retry is offered only for a consistent terminal job with `canRetry`. It sends `retry_failed` for that exact job, not a new creation; successful preview IDs are not changed by the frontend.
- AI and non-AI creation use the same acceptance/completion lifecycle. Neither HTTP acceptance nor an unrelated preview insert means completion. The server alone chooses the model and materializes previews.
- Status text uses polite live regions; unchanged poll values do not change the announced text. Buttons and links reuse the dashboard styling and `PillButton`. Spanish, English and Catalan have matching translation keys.

## Request safety and restoration

`localStorage` holds only `{projectId, action, requestId, jobId?}`, under an authenticated actor-specific key. UUIDs are written and read back **before** authentication verification/invocation. No project content, titles, model settings or tokens are persisted by this feature.

A synchronous per-project lock prevents double clicks in the mounted screen. An outstanding identity takes precedence over a new action. Transport errors, timeouts, invalid success responses and ambiguous server errors retain that identity. “Comprobar la misma solicitud” replays the exact UUID, including for `retry_failed`. Confirmed responses acknowledge only that actor's identity; definitive safe rejections allow a later deliberate action to use a new UUID. Storage failure prevents new requests rather than risking duplicates.

Unmounting does not cancel server work. A late response cannot clear the receipt or update an unmounted/other-actor screen. Response guards check the live Redux actor as well as the lifecycle token, including the interval before passive-effect cleanup. On return, server jobs restore independently of local receipts; an unacknowledged request can still be replayed even if its job has finished. Another actor's records are neither displayed nor cleared. Browser-local coordination is not a cross-tab mutex; backend receipts and active-job locking remain the authority.

Restoration reads only narrow columns from the RLS jobs/slots tables, without an initiating-actor filter: currently authorized owner/admin/assigned collaborators see the same job. Auth identity is verified before and after restoration; request identities remain actor-scoped and restoration never acknowledges another actor's local requests. Project and preview bigint IDs use PostgREST text casts. Project-list IDs are also selected as text so creation never starts from a rounded bigint. History is paginated using exact counts and actual returned page lengths, including when a server cap is below the requested page size: an active older job after explicit retry wins over a newer settled job for the same project. No snapshot, lease fields, service receipts or privileged RPCs are fetched.

The server attempts an immediate background worker wake after accepting pending work, without blocking this screen. The persistent queue and minute cron remain the fallback if that wake fails; there is no guaranteed completion time or client-side worker credential. Polling runs every five seconds after the previous read finishes while jobs are active or their job/slot snapshot is inconsistent. A response superseded by a new action is discarded and read again. Unmount/account changes abort reads and clear timers. Unauthorized reads stop polling and require a new authenticated lifecycle. Read failures are explicitly distinguished from generation failures, with manual refresh. A failed initial read does not poll forever.

Job and slot reads may straddle commits. Nonempty inconsistent snapshots remain “Sincronizando” and are polled again, without success announcements or retry eligibility. Slots are created atomically and never deleted by this flow: a successful empty slot read removes that job from the restored view, rather than retaining revoked details as a stale syncing job. An empty successful job refresh likewise replaces the local job list. Unknown/null responses are read failures, not authoritative empty results. Project data refreshes only when consistent preview IDs or settled state change, not on every poll. Creation no longer uses `useProjectPreviewRealtime`; its old implementation is untouched and has no callers in this flow.

## Assigned-editor drafts (T9, S7–S9)

The existing `/preview-projects` link now loads owned previews plus valid-parent previews assigned to the authenticated UID. `fetchPreviewProjectsByUserId` verifies that its argument, Auth user and live Redux actor agree; its read-only `preview_projects_for_current_user` RPC accepts no actor parameter and filters in SQL, before returning content. Every page uses fresh parent/assignment checks, bigint text casts and exact-count pagination. Missing/unknown pages reject the listing instead of silently truncating drafts.

Owned legacy orphan/mismatched previews remain visible. The existing administrator list remains unchanged. Newly visible assigned-only rows retain existing edit/publication controls, but do not gain delete controls: both card layouts and the open/confirm handlers require existing owner/admin eligibility. No publication permission or role restriction was introduced. These UI controls and the narrow RPC do **not** harden the preexisting broad base-table preview policies.

See [generation-assigned-editor.md](generation-assigned-editor.md) for local T9 evidence, the forward migration and remaining browser/PostgREST proof.

## Activation order

1. Independently validate and activate the backend in the order documented in the backend contract: isolated migration/security/race proof, functions/configuration, explicitly authorized scheduler, then a successful readiness heartbeat.
2. Verify authenticated owner/admin/assigned RLS reads, current-user preview RPC pagination and actual PostgREST text casts. No new-table Realtime subscription is required.
3. Verify non-AI completion with the browser closed, then returning/restoring, partial failure and replay behavior. Paid AI validation requires separate authorization.
4. Roll out the UI only after that verification. If the UI arrives first, `not_ready`, missing-function and missing-table responses provide safe unavailable-service feedback, not a legacy fallback.

No deployment, migration, scheduler change, paid request, dependency installation or n8n deactivation was performed during T2.

## Local evidence and remaining proof

All probes ran through Node 24 stdin with mocked transport or in-memory TypeScript compilation; no test files or generated artifacts were written.

| Check | Observed result |
| --- | --- |
| Baseline RED, public creation thunk | Exit 1: the old thunk wrote `state: preview` before a valid result. |
| GREEN thunk/reducer probe | Exit 0: six assertions; queued acceptance, no project mutation/n8n call, actor mismatch prevents invocation. |
| Public service probe | Exit 0: 21 checks, including minimal pre-send storage, reload/replay identity, actor isolation, seven rejected inputs without invocation, non-2xx context parsing, safe messages, bigint precision, partial retry, exhausted/server-disabled retry, torn snapshots and older active jobs beyond 200 history rows. |
| Public hook probe | Exit 0: 15 checks with a mocked React lifecycle; synchronous double-click lock, response loss/unmount, server restore, retry identity, unchanged-poll refresh suppression, read failures, unauthorized stop, actor-switch isolation, nonoverlapping reads and cleanup. |
| Component SSR/translation probe | Exit 0: 16 state/copy/integration checks plus two disabled-control negative cases, all three locales, safe escaping and preview link. This is not visual/browser proof. |
| Baseline integration differential | Exit 0: seven unchanged declarations, project-list changes limited to text casts, 24 non-creation reducer cases identical to HEAD. |
| Focused ESLint | Exit 0 for all seven changed/new TS/TSX files. |
| In-memory root solution build | Exit 0, zero diagnostics; 25 generated outputs retained only in memory. Uses `tsconfig.json` and both references with force enabled. |
| `git diff --check` and untracked-addition whitespace probe | Both exit 0; all five new files checked separately. |

The parent subsequently ran literal `pnpm build` successfully (TypeScript + Vite). Independent verification passed 42 mocked runtime groups and 81 isolated PostgreSQL groups. Global lint has 35 errors/9 warnings, all independently matched to baseline; all 12 changed/new TypeScript files are clean. Real browser and deployed-service proof remain activation prerequisites.

During the writer task, literal `pnpm exec tsc -b` was deferred to the parent because it emits `dist/api`, Vite JS/declarations and build-info files outside the authorized edit surfaces. The equivalent TypeScript solution-builder probe intercepts all writes in memory. An earlier probe mistakenly selected the standalone `tsconfig.app.json`; it reported four existing ES2021.String-related diagnostics, confirmed identical on HEAD. The actual root solution config includes that library and passes.

Probe-only corrections: the first combined service/thunk loader stopped on unrelated `import.meta` syntax after its service checks; the corrected isolated thunk probe passed. The first SSR check compared an unescaped Catalan apostrophe against HTML; normalizing the assertion fixed the probe. The first typecheck differential accidentally included new files against old thunk signatures; excluding additions produced the valid baseline comparison. These are harness corrections, not behavior RED evidence.

Self-check correction: actor isolation was strengthened to read the current Redux actor before applying responses or acknowledging receipts, rather than relying only on passive-effect cleanup. The added before-cleanup race probe passes.

S1 is covered by safe error/status and accepted-versus-complete probes; S2 by partial/retry identity and stable successful preview IDs; S3 by the exact request shape and unified non-AI/AI path; S4 by restoration, lifecycle isolation and polling probes. Required remaining proof: actual browser focus/live-region behavior, narrow/zoomed layouts, navigation/reload across real Auth transitions, PostgREST casts/RLS and activated browser-independent execution. Full build/lint and independent review remain parent-owned.

## Review boundaries

The implementation exceeds the advisory 400-line target without compressing safeguards. Suggested future review slices are (1) typed service, identity/read contract and related documentation; (2) lifecycle hook plus thunk/reducer integration; (3) screen feedback, translations and activation/evidence documentation. Parent owns commits and any final slicing decisions. Removing creation integration must not delete durable receipts, jobs or successful previews.
