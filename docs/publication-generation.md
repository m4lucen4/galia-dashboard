# Persistent publication generation — operational guide

The canonical guide for **fresh creation only**, with or without AI: user steps, API/UI contracts, authorization, deployment and recovery. Jobs survive navigation; successful variants survive failed siblings. Editing, iteration, subscriptions, social scheduling, publishing and publish-again are unchanged. Existing n8n integrations are retained until replacement is verified; this generation path has no automatic n8n fallback and does not retire n8n.

## Current status — 2026-11-10

| Surface | Verified state / remaining boundary |
|---|---|
| Backend | Activated: `process-publication-generation` **v8**, `generate-project` **v4**, all five forward migrations below applied, minute cron active. |
| Latest worker activation (S15/T24) | 36 independent checks; six deployed files matched the verified payload; 22 other functions unchanged. Public POST401/GET405 bodies passed. Scheduled readiness at **2026-11-10 15:42:01 UTC**, model `gpt-6-luna`, prompt `publication-es-v2`. No agent-triggered paid generation in this activation. |
| Output length | Approximately 75 words is **advisory** in current v2 wording. Shared validation accepts more than 75 words for both versions; the raw 4,000-character bound and other validation remain. Frozen v1 requests and historical failures are preserved. |
| Dashboard | Updated UI and attempt-details implementation is **local-only**, not a production frontend rollout. Backend activation does not prove browser behavior. |
| Open verification | **T22 blocked** by a denied verification-harness preparation; no bypass/retry authorized here. Prior 83 PASS / 23 FAIL and typecheck PASS remain recorded. **T7 pending**: controlled real Auth/browser/provider acceptance and reliability proof. Human reports of successful non-AI, immediate wake and AI output do not close those checks. |
| Safety | Narrow authority guard is applied, but preexisting broad project/preview RLS exposure remains. No general tenant-isolation claim. |

Latest deployment/recovery record: [`advisory-word-count-deployment.json`](../odd/evidence/publication-generation/advisory-word-count-deployment.json). Task state: [`publication-generation.md`](../odd/tasks/publication-generation.md). Older version numbers and failed checks in the evidence sections are **historical**, not current runtime instructions.

## Quick path for users

In the updated dashboard (currently local-only):

1. Open `/projects`, choose a project you own, administer or are explicitly assigned to, review its description/media and select 1–4 publications. Enable AI only when wanted; an optional project prompt adds compatible editorial preferences. The model is server-selected.
2. Confirm creation. The dialog closes; keep editing, navigating or working elsewhere. “En cola” means waiting, not completed generation. Server work does not require the panel to stay open.
3. Return to Projects to restore progress. Finished/total includes both successful and failed variants; open `/preview-projects` to review available results, even after partial failure. Check factual accuracy before publishing.
4. For an ambiguous request, choose “Comprobar la misma solicitud”; do not create another request to recover a lost response. For settled failures, use the offered retry action: it retries only eligible failed variants of that job and preserves successes.
5. Expand attempt details for saved reasons and usage. Missing details are unknown, not zero usage. A read error calls for refresh/re-authentication, not a new generation. Share job/variant identifiers and safe codes with support, not tokens, prompts or generated content.

## Guide map and architecture

- [API and persistence](#frontend-api-quick-path): request IDs, status, retries and bigint reads.
- [Dashboard behavior](#dashboard-status-and-restoration): polling, actor-scoped local identities, diagnostics and assigned drafts.
- [Authority protection](#project-authority-guard): permissions, caller trust, migration prerequisites and residual exposure.
- [Generation and provenance](#generation-and-provenance), [original prompt](#original-n8n-editorial-prompt) and [diagnostics](#safe-attempt-diagnostics-s14).
- [Deployment](#explicit-deployment-and-scheduler-activation-operator-only), [incident recovery](#troubleshooting-and-recovery) and [verification history](#historical-verification-record-and-remaining-proof).

`Projects UI → generate-project (Auth) → transactional start/receipt → durable jobs/slots → worker → fenced transactional preview`. The entry requests a best-effort immediate wake; minute cron independently recovers accepted work. Only the worker calls OpenAI for AI slots. Readiness gates new/requeued work, not replay of accepted work. The browser polls narrow RLS projections and never owns queue writes, provider credentials or completion.

Source entry points: `supabase/functions/generate-project/index.ts`, `supabase/functions/process-publication-generation/index.ts`, shared modules in `supabase/functions/_shared/publication-generation*.ts`, `src/features/projects/services/publicationGeneration.ts`, the generation hook/status/details components, and the five migrations listed below. Generation tables do not use Realtime; unrelated project/preview Realtime behavior remains intact.

## Frontend API quick path

Use the existing authenticated Supabase client; do not add a function URL, model, actor or service-key environment variable to the frontend.

```ts
const { data, error } = await supabase.functions.invoke("generate-project", {
  body: { projectId, action: "start", requestId },
});
```

1. `projectId` is a positive decimal **string** representing a bigint. Generate a UUID `requestId` once per deliberate action, persist it **before** the request, and reuse it after timeout/response loss. Do not create a new UUID for a transport retry.
2. Render the returned summary without blocking the application. Restore jobs/slots from the RLS tables on navigation or refresh. Poll while active; Realtime is **not** enabled for these new tables by this migration.
3. Retry with `{projectId, action: "retry_failed", requestId: newUuid, jobId}` only when `canRetry` is true. Reuse that new UUID for transport retries of this retry action. Successful slots are never reset.
4. On non-2xx responses, read the JSON body from the Supabase function error's response context. Display its safe Spanish `message`; do not display raw SDK/network/provider messages. A network error with no body should offer replay with the same request ID.

### Request and response

Authenticated POST body, no additional properties:

```ts
import type { GenerationAttempt } from "@/features/projects/types/publicationGenerationDiagnostics";

type GenerationRequest = {
  projectId: string;
  action: "start" | "retry_failed";
  requestId: string; // UUID, required for BOTH actions
  jobId?: string;   // UUID: required for retry_failed, forbidden for start
};

type GenerationError = { code: string; message: string; retryable: boolean };
type SlotState = "queued" | "running" | "succeeded" | "failed";
type JobStatus = SlotState | "partial";
type JobSummary = {
  jobId: string;
  projectId: string;
  status: JobStatus;
  total: number;       // 1–4
  retryCount: number;  // 0–2 explicit retry rounds
  updatedAt: string;   // timestamptz serialized as ISO date/time
  requestedModel: string;
  promptVersion: string;
  succeeded: number;
  failed: number;
  pending: number;     // queued + running
  canRetry: boolean;
  slots: {
    slot: number;     // 1-based, stable within this job
    state: SlotState;
    attempts: number; // lifetime attempts, never reset
    previewId: string | null;
    errorCode: string | null;
    retryable: boolean;
    actualModel: string | null;
    error: GenerationError | null;
    attemptDiagnostics?: GenerationAttempt[]; // optional S14 history; see diagnostics below
  }[];
};
```

Successful start/retry/replay returns HTTP **200** with `JobSummary` directly (no `job` wrapper). Failure returns `GenerationError` directly. Never accept `user`, `actor`, `model`, content or publication count from this request: the server snapshots the canonical project.

| HTTP | Codes | Meaning |
|---|---|---|
| 400 / 405 | `invalid_request` | Invalid body or unsupported HTTP method |
| 401 | `unauthorized` | Missing/invalid session; worker also rejects user credentials |
| 403 | `forbidden` | Missing project or actor is neither its current owner, admin nor explicitly assigned UID |
| 409 | `conflict`, `project_changed`, `retry_exhausted` | Receipt mismatch, changed ownership, active competing job or retry limit |
| 422 | `invalid_project`, `provider_refusal`, `invalid_response` | Invalid canonical inputs or unusable generation |
| 503 | `not_ready`, `provider_unavailable`, `lease_expired` | Deployment/worker/provider unavailable or attempts timed out |
| 500 | `internal_error` | Sanitized unexpected failure |

Provider failure codes normally appear on persisted slots, not on the start response. The shared error module contains the authoritative Spanish messages. `retryable` on a slot means another explicit round is permitted for that failure; automatic retry of `provider_unavailable` may leave that code on a queued slot. Only offer the action when the **job** is terminal and `canRetry` is true.

### Persistent read contract

Authenticated users have SELECT only on the two public read tables. After forward migration003, owners and explicitly assigned UIDs can read jobs for an extant project whose current owner matches the job's owner snapshot; admins (`userData.uid = auth.uid()`, `role = 'admin'`) retain historical read access. Assignment is a UID match, not an editor-role string: an assigned photographer is valid. Neither a former nor a new owner gains access to the former owner's snapshot through ownership alone. The service-only receipts/readiness tables are not UI APIs. See [Project authority guard](#project-authority-guard) and [Assigned-editor drafts](#assigned-editor-drafts) for the prerequisite, revocation and narrow preview-listing contract.

| Table | Columns |
|---|---|
| `publication_generation_jobs` | `id uuid`, `project_id bigint`, `owner_id uuid`, `actor_id uuid`, `snapshot jsonb`, `requested_model text`, `prompt_version text`, `total smallint`, `status text`, `retry_count smallint`, `created_at timestamptz`, `updated_at timestamptz` |
| `publication_generation_slots` | `(job_id uuid, slot smallint)` PK, `state text`, `attempts smallint`, `cycle_attempts smallint`, `lease_token uuid?`, `lease_until timestamptz?`, `available_at timestamptz`, `preview_id bigint?` unique, `error_code text?`, `retryable boolean`, `actual_model text?`, `updated_at timestamptz`, `attempt_diagnostics jsonb` (0–9 entries) |

Use narrow SELECTs; do not needlessly fetch snapshot or lease fields. Preserve bigint precision by selecting IDs as text (PostgREST output casts):

```ts
const latest = await supabase.from("publication_generation_jobs")
  .select("id,project_id::text,status,total,retry_count,requested_model,prompt_version,created_at,updated_at")
  .eq("project_id", projectId)
  .order("created_at", { ascending: false })
  .limit(1).maybeSingle();

const slots = await supabase.from("publication_generation_slots")
  .select("job_id,slot,state,attempts,preview_id::text,error_code,retryable,actual_model,updated_at,attempt_diagnostics")
  .eq("job_id", jobId).order("slot");
```

Map snake_case read columns to the summary's camelCase fields. Compute counts from slots; `canRetry = ['partial','failed'].includes(status) && retry_count < 2 && slots.some(s => s.state === 'failed' && s.retryable)`. Two independent reads can straddle a commit: poll again rather than infer a permanent contradiction. No browser writes to queue tables or direct browser calls to service RPCs are permitted. `project_id` and `preview_id` must never be converted through JavaScript `Number`.

`queued`/`running` are active; `succeeded` means all slots succeeded, `partial` means settled with some successes, `failed` means settled with no successes. A valid slot commits its preview and sets the project to `preview` immediately. All-failed jobs leave the prior project state unchanged. Each preview keeps the snapshotted owner, title, link and full media array; `projects.image_data` is a SQL `jsonb[]`, converted through `to_jsonb(project)` to the JSON array required by `projectsPreview.image_data jsonb`. Preview IDs come from the existing bigint identity, never the browser. `versions` starts as `[{id: uuid, description: description_rich, main: true}]`; preview state is `preview`.

## Dashboard status and restoration

### Status and available attempt details

- Confirmation closes immediately; cards, filters, editing and navigation stay usable. Each job shows its title or project ID. “En cola” is distinct from generation: no simulated stages, ETA or three-minute generation-failure timer.
- Progress is **finished variants / total**, with separate successful/failed counts and safe localized errors. Partial results remain available at `/preview-projects`. HTTP acceptance and unrelated preview inserts never imply completion; AI and non-AI use the same lifecycle.
- Retry appears only for a consistent terminal job with `canRetry`, sends `retry_failed` for that exact job, and never replaces successful preview IDs.
- Status uses polite live regions; unchanged polls do not change announced text. Controls reuse dashboard styling/`PillButton`. Spanish, English and Catalan translation keys match.
- A keyboard-native, collapsed `details` section sits outside the live announcement and remains available after success/retry. It identifies job, variant, saved preview, requested/actual model and prompt version; available records show actual attempt number, time, outcome, localized closed-code reason, budget, token usage, duration, text counts and HTTP status.
- Reasoning tokens are included in output tokens; never add them again. Missing history/metrics are unavailable, not estimated or zero. Old, interrupted and fenced attempts may lack details. Successful retry does not hide earlier failures.
- The bounded diagnostics parser reconstructs closed fields only. Malformed history becomes unavailable without failing the job or changing retry eligibility; arbitrary messages, prompts and provider bodies are never rendered. Old summaries lacking optional `attemptDiagnostics` still work. Restore `attempt_diagnostics` only after migration005 below. Static rendering does not prove browser layout, keyboard or screen-reader behavior.

### Local request identity and actor isolation

`localStorage` stores only `{projectId, action, requestId, jobId?}` under an authenticated actor-specific key: no content, titles, model settings or tokens. UUIDs are written **and read back before** Auth verification/invocation. Storage failure blocks new requests rather than risking duplicates.

A synchronous per-project mounted-screen lock prevents double clicks; an outstanding identity takes precedence over a new action. Transport loss, timeouts, malformed success and ambiguous server errors retain it. “Comprobar la misma solicitud” replays its exact UUID, including for retry. Confirmed responses acknowledge only that actor's identity; definitive safe rejection permits a later deliberate action with a new UUID. This is not a cross-tab mutex: durable server receipts and active-job locks remain authoritative.

Unmounting does not cancel server work. Late responses cannot clear receipts or update an unmounted/other-actor screen. Guards check live Redux identity and lifecycle tokens, including before passive-effect cleanup. Restore server jobs independently of local receipts: an unacknowledged request remains replayable after completion. Never display or clear another actor's local records.

### Polling, pagination and revoked reads

Restore narrow jobs/slots columns **without an `actor_id` filter**: current RLS-authorized owner/admin/assigned users share the job, not its actor-owned receipt. Verify Auth before/after restoration. No snapshots, lease fields, service receipts or privileged RPCs are fetched. Project-list IDs, job project IDs and preview IDs use text casts, never JavaScript `Number`.

History pagination follows exact counts and actual returned page lengths, including server caps below the requested 200 rows. Most recent job wins per project unless an older active job is found (for example after explicit retry). Missing/unknown pages fail rather than silently truncating history.

Poll five seconds **after the preceding read finishes** while jobs are active or job/slot reads are inconsistent. Discard a response superseded by a new action and read again. Unmount/account change aborts reads and clears timers; unauthorized reads stop polling until a new authenticated lifecycle. Read failures differ from generation failures and offer manual refresh; failed initial reads do not poll forever.

Nonempty torn snapshots stay “Sincronizando”, without success announcements or retry eligibility. Slots are atomically created and never deleted by generation: a successful empty slot read omits the earlier job, removing revoked details instead of retaining stale syncing state. A successful empty jobs refresh replaces the list. Unknown/null responses are failures, not authoritative emptiness. Refresh project data only when consistent preview IDs or settled state change, not every poll. Creation no longer calls `useProjectPreviewRealtime`; its old implementation is untouched.

### Assigned-editor drafts

`/preview-projects` loads owned previews plus assigned-only previews whose current parent exists, matches the preview owner and is assigned to the authenticated UID. `fetchPreviewProjectsByUserId` checks its argument against Auth and live Redux identity before/after loading and between pages. Read-only `preview_projects_for_current_user()` is an authenticated SETOF RPC with **no actor parameter**; SQL filters before returning content, never by fetching unrelated rows for client filtering. Fresh parent/assignment checks, bigint casts (including `*,id::text`), exact counts and actual page lengths apply to every page; malformed identities, missing/unknown pages reject the result.

Owned legacy orphan/mismatched rows remain visible; the existing unrestricted administrator list is unchanged. Assigned-only rows retain existing editing, subscription, calendar/scheduling, publication and publish-again behavior, but gain **no delete controls**. Both card layouts and open/confirm handlers require existing owner/admin delete eligibility. This adds no publication permission or role restriction. UI gating and this narrow RPC do not harden broad base-table preview policies.

## Project authority guard

Migration002 protects `projects.user`, `projects.assigned` and identity before migration003 trusts them. Both are forward migrations; original001 stays immutable. Assignment is an exact UID relationship, not a `publisher`/editor role literal: an assigned photographer is valid. Existing protected `userData` roles and verified Auth identity remain prerequisites; the admin helper and userData role/UID guard are not replaced.

### Permission matrix

| Actor / operation | Result |
|---|---|
| Regular authenticated create | Own project, omitted `id`, null assignment allowed under existing RLS; another owner or any non-null assignment rejected (`42501`). Explicit null is valid. |
| Ordinary update with unchanged `id`, `user`, `assigned` | Existing RLS/behavior, no returned-row rewriting. |
| Owner/assigned changes owner or assignment | Rejected, including self-assignment. |
| Admin create/clone or authority change | Allowed under existing RLS, preserving nullable-column semantics. |
| Authenticated client, including admin, supplies INSERT ID or changes UPDATE ID | Rejected, including explicit INSERT `DEFAULT`. |
| Consistent service-role / trusted maintenance request | Existing privileged authority/identity writes preserved; must never recycle identities. |
| Ordinary DELETE / dedicated public export | Unchanged; authenticated INSERT cannot reclaim deleted IDs. Export role/projection/policy retained. |
| Start, retry, receipt replay, active-job reuse | Current owner/admin/exact assigned UID; authorization occurs before every receipt path. UUID possession is not access. |
| Job/slot read | Owner/assigned require extant parent matching job owner snapshot; admins retain historical access, even missing/reowned parent. |
| Claim/finish | Current parent owner matches snapshot **and original initiating actor** still has generation authority. Joining/retrying does not transfer initiating authority. |

`owner_id` is the immutable job owner; `actor_id` is its initiator. Previews inherit the owner, never the assigned editor. Revoked work fails outstanding slots with nonretryable `project_changed`; prior successes/receipts survive. A demoted admin remains authorized only if owner/assigned. An owner can start a new job after revoked work settles.

### Identity and caller-trust boundary

An UPDATE-only guard would allow broad DELETE plus explicit-ID INSERT to replace authority at the same identity. Migration002 therefore:

1. Replaces only anon/authenticated **table INSERT** grants with authenticated INSERT on **all current non-ID columns**; no anonymous INSERT. Existing SELECT/UPDATE/DELETE/TRUNCATE/export grants remain. Future columns require explicit column INSERT grants; never restore broad table INSERT as a shortcut.
2. Uses a BEFORE trigger to reject untrusted ID changes, including admin-client changes.
3. Removes sequence UPDATE from PUBLIC/anon/authenticated to block `setval`, retaining USAGE (`nextval`) and SELECT. Sequence ALTER and `TRUNCATE ... RESTART IDENTITY` require ownership; unchanged TRUNCATE permission does not authorize sequence reset.

No rows, IDs, sequences, defaults, FKs or policies are rewritten; no shadow ownership table exists. Rejected default-ID INSERTs can consume sequence values (nontransactional); gaps are normal, never grounds for reset/renumbering.

The SECURITY DEFINER trigger uses an empty search path. Its `current_user` is not proof of caller identity: actual `current_setting('role', true)` and `auth.role()` must agree for authenticated/admin/service requests. Admin additionally requires non-null `auth.uid()` and the existing private helper. A service JWT claim alone is insufficient; SET ROLE service_role without a service JWT is not trusted. Direct maintenance requires a real postgres/supabase_admin `session_user` with no SET ROLE or its own role. A postgres test session using SET ROLE authenticated gets no maintenance bypass. Direct supabase_admin login was not exercised in local proof.

Migration003 uses `private.publication_generation_authorized(uuid,bigint,uuid)` across start, read wrapper, claim and finish; API roles cannot execute the arbitrary-actor predicate. Full `CREATE OR REPLACE` bodies preserve lock order, readiness, conflicts, attempts and materialization, not runtime function-text surgery. Claim's bounded sweep/finish fencing clear leases, disable retry and refresh status on authority loss; no unbounded revocation sweep is added. Explicit empty search paths/qualified relations and ACLs preserve service-only mutation and authenticated-only read entry points.

### Authority migration preflight

Migration002 is **one-time, not an idempotent reconciliation script**. It uses a five-second lock timeout and locks projects while checking schema. Unexpected owner, identity/sequence shape, authority defaults, helper metadata, INSERT/column/sequence-UPDATE grants, privileged API memberships, triggers or rewrite rules fail closed. Effective privileges are checked again after revocation; a sequence behind live IDs aborts instead of being reset.

Before applying in another environment, independently confirm:

- Helper body derives admin solely from protected userData; metadata alone does not prove its implementation or every callable RPC.
- External integrations use consistent service-role requests or approved direct maintenance. Real PostgREST column permissions and external Odoo behavior need separate compatibility checks.
- Legitimate clients omit IDs (also explicit `DEFAULT`) and regular users do not transfer owner/create assignment. Known project actions omit IDs on create/authority fields on normal edits; actual `assign_project_with_translations` omits IDs and copies assignment.
- Sequence history and privileged writers are trustworthy. Checking live IDs cannot prove deleted IDs were never recycled before the guard. Transactional fake Odoo counters cannot prove real external side-effect safety.

### Residual exposure and forward-only recovery

**This is not complete tenant isolation.** Preexisting cross-tenant project/preview SELECT, ordinary UPDATE and DELETE exposure and broad project TRUNCATE privileges remain. The guard does not establish integrity of all content or legacy preview ownership. No quarantine, rewriting or deletion of orphan/mismatched previews; no general RLS redistribution, new editor role, assignment-management, translation or public-export changes.

Legitimate currently assigned users can directly SELECT canonical historical job snapshots under inherited001 table grants. Normal UI projections and the preview RPC omit snapshots; this is **not column-level isolation**. Service credentials/receipts remain inaccessible. Optional future column minimization is separate from current audience/revocation rules.

Failed preflight leaves existing grants/data intact: inspect the mismatch, do not weaken checks automatically. Preserve the applied guard and fix demonstrated legitimate-flow incompatibility via a reviewed forward migration. Restoring broad INSERT/sequence UPDATE or removing the guard reopens spoofing and would require separately controlled disabling of generation first; no kill switch is implemented here. The guard's recovery scope is its new function/trigger and narrow INSERT/sequence-UPDATE ACL changes, not general/export RLS or data. Never delete records, reset identities/receipts or restore a client-owned generation bypass as rollback.

## Queue and authorization invariants

- `getUser` verifies the bearer token against Supabase Auth `/auth/v1/user` (native REST equivalent of `auth.getUser`, not local JWT decoding). The start RPC rechecks current owner/admin/assigned-UID rights before receipts, active-job reuse, retry or writes. Migration003 uses the same private authorization predicate in start, read, claim and finish; owner snapshot and initiating actor remain distinct.
- Five security-definer mutation RPCs exist: `publication_generation_start`, `publication_generation_claim`, `publication_generation_finish`, `publication_generation_finish_with_diagnostics`, `publication_generation_heartbeat`. All use `search_path = ''`, qualified table references, explicit revocation from PUBLIC/anon/authenticated and explicit EXECUTE to `service_role`. Table DML is revoked even from service_role: mutations flow through RPCs. Internal summary/refresh helpers are not callable by service_role. Authenticated callers can execute the read-only RLS predicate and migration003's current-user preview-list RPC, never the arbitrary-actor private predicate or service mutation RPCs.
- Every mutation uses advisory transaction lock `(740219, 1)`, then locks project → job → slots. Claims visit at most 20 active jobs and claim one slot per RPC. Global queue serialization deliberately favors a small auditable concurrency model over high throughput; no provider calls run inside a DB transaction.
- A partial unique index enforces at most one active job per project. Different start request IDs during active work reuse that job and store their own receipts. `(actor_id, request_id)` is durable across terminal completion; replay returns the same job's **current** summary, never a fresh job. A reused request ID with another project/action/retry job is rejected. Do not prune receipts without a separately designed idempotency retention policy.
- Retry operates on the exact job/project under the current actor's owner/admin/assigned-UID rights. Active/succeeded jobs are no-ops with a receipt; a different active job blocks retry. Only failed, retryable slots are queued. Their successful siblings, previews and lifetime attempt counters are untouched. Snapshots/models never change on retry.
- Each claim has a new UUID fence and a 120-second lease. Time comparisons use `clock_timestamp()` after lock acquisition, not stale transaction-start time. Finish requires matching job/slot/token, running state and an unexpired lease. Duplicate/late finish returns `false` without inserting anything. Preview insertion, slot completion and job/project states are one transaction. A lost finish response is not followed by a compensating failure write.
- Expired leases are requeued up to three claims per cycle; the third expiry becomes `failed/lease_expired`. Provider unavailability gets the same three-claim bound with 30/60-second backoff. Invalid/refused content fails immediately without placeholder content. At most two explicit retry rounds are allowed: at most nine lifetime attempts per slot. Idle jobs rotate to the back of the bounded sweep to avoid starvation.
- Claim and finish recheck the project, its snapshotted owner and the original initiating actor's current authority under the project lock. Deletion, ownership change or loss of that actor's generation rights fails outstanding slots with `project_changed` (not retryable); previous successful previews are not modified. Demoted admins remain authorized only if still owner/assigned. Project IDs intentionally have no new queue FK so deletion does not destroy receipts or strand queue rows. General preview RLS remains unchanged: the narrow listing integration is not a tenant-isolation repair.
- Readiness requires a heartbeat less than three minutes old with matching model/prompt version before creating new work or requeuing failed slots. Replays/active-job reads work during an outage. This is a liveness signal, **not proof** that cron will continue or the provider accepts a model. Scheduler failure after acceptance still requires operator recovery.

## Generation and provenance

Server configuration:

| Variable | Requirement |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Both functions; provided by the Supabase runtime |
| `SUPABASE_ANON_KEY` | Entry function uses it for Auth getUser |
| `OPENAI_API_KEY` | Worker only; mandatory even when processing non-AI work so readiness represents a complete deployment |
| `PUBLICATION_GENERATION_WORKER_SECRET` | Entry uses it for the background wake; worker validates inbound requests. Exactly 64 hexadecimal characters encoding 32 random bytes, identical to Vault `publication_generation_worker_secret` |
| `OPENAI_GENERATION_MODEL` | Server only; default `gpt-4.1-mini`; configure the same value for entry and worker |

Use a model supporting Responses API strict structured text outputs. The model's syntactic validation is not a capability probe; verify capability/configuration separately before live rollout. No paid capability probe was run. The request uses `/v1/responses`, `store:false`, `text.format:{type:'json_schema',strict:true,...}`, and `max_output_tokens:4096` for v2 (`600` remains frozen for v1 jobs/retries); no SDK, temperature or obsolete response-format parameters are added. Generation has a 45-second fetch timeout. Database RPCs have 10-second timeouts. Each invocation claims at most two slots sequentially (up to 90 seconds of provider waits plus at most 50 seconds of RPC waits); timeout/crash still recovers through leases.

The strict v2 schema is `{publicacion:{texto:string}}`; v1 retains `{paragraph:string}`. Neither permits extra properties or an additional heading. Runtime validation rejects non-completed, refused, missing, malformed, multiple-text or invalid-field responses. The current v2 prompt guides the single paragraph toward approximately 75 words, not a strict maximum (S15). Shared response validation accepts longer text for both v1 and v2 without a word-count ceiling; `diagnostic.wordCount` still counts whitespace-delimited words, excluding deterministic credits and hashtags. Harmless CR/LF breaks and adjacent horizontal whitespace in v2 `texto` become one space; v1 keeps its original newline rejection. The raw 4,000-character bound is checked before normalization. No generated HTML or hashtags are accepted. No failed result is converted into publication text.

Canonical snapshot fields: `title`, `description`, `requiredAI`, `prompt`, `keywords`, `weblink`, `image_data`, `projectCollaborators`. Publications must be an integer 1–4 before insertion. Title/description must be nonblank; description ≤30,000 characters, prompt ≤10,000, title ≤1,000, keywords/link ≤4,000; at most 100 collaborator objects with string profession/name (≤100/1,000 characters). SQL validates these before writes. Worker validates the required snapshot shape again. Null optional text/arrays normalize to empty strings/arrays; null `requiredAI` normalizes to false.

Project prompt is preserved as `project_prompt` in JSON **source data**, not promoted into the privileged instruction. The instruction allows compatible editorial preferences only and explicitly rejects instructions embedded in project data. Only frozen v1 requests use the four general, spatial, material/detail and experience angles with fallback paraphrasing. Current v2 uses the original n8n template's variant interpolation without appending those angles; see [Original n8n editorial prompt](#original-n8n-editorial-prompt). Prompt boundaries reduce injection risk but cannot mathematically guarantee factual accuracy or distinct prose; human preview review remains necessary.

Non-AI text is exactly the original description: no trimming, Unicode normalization, heading, credits or hashtags, even when collaborators and keywords are populated. Its whitespace and line endings are preserved; there is no AI word limit or provider call. AI text is the generated paragraph followed by deterministic credits (when present) and the hashtag suffix, separated by blank lines. Links and all media processing/reference fields are copied by the transaction, not generated or fetched by the model.

Credits preserve names **exactly**, preserve source order and require no Markdown bold:

| Source profession | Label |
|---|---|
| `autor` | Autor |
| `arquitectotecnico` | Arquitecto técnico |
| `carpinteriamadera` | Carpintería en madera |
| `carpinteriametalica` | Carpintería metálica |
| `colaborador` | Colaborador |
| `bim` | Consultoría BIM |
| `constructora` | Constructora |
| `estructuras` | Estructuras |
| `fotografo` | Fotógrafo |
| `instalaciones` | Instalaciones |
| `interiorismo` | Interiorismo |
| `promotor` | Promotor |

Unknown professions use `Colaborador` without altering the name. AI hashtags always start with the original workflow's `#arquitectura`, followed by deterministic tags from `keywords`: split comma/semicolon/newline phrases, normalize Unicode NFC, keep letters/digits/underscore, prefix `#`, deduplicate in source order including the base tag. No keywords means only `#arquitectura`; no inferred location, award, brand or material is added. Names/credits and hashtags are excluded from the paragraph count. This suffix is never appended to non-AI descriptions.

New jobs store `requested_model` and `prompt_version = publication-es-v2`; already accepted v1 jobs and their retries keep `publication-es-v1`; each successful AI slot stores the **actual** model identifier returned by OpenAI. Non-AI slots have `actual_model = null`. Provider raw error bodies are neither read nor persisted/logged; only allowlisted failure codes, static Spanish messages and bounded content-free attempt metadata escape the boundary. The worker ignores all request-body content and accepts only `X-Publication-Worker-Secret` matching `PUBLICATION_GENERATION_WORKER_SECRET` via fixed-size digest comparison. Both values must be exactly 64 hexadecimal characters; comparison is case-sensitive, without trimming or normalization. Missing/malformed configuration or absent/wrong credentials returns the unchanged401 before any database/provider call. There is no `Authorization`/service-role/JWT fallback, and no raw diagnostic logging. `SUPABASE_SERVICE_ROLE_KEY` remains internal to database RPC authentication; user-facing `generate-project` still authenticates user Bearer tokens through Auth `/user`.

## Immediate wake and durable recovery

Historical S12 activation: source `f2d551b` was deployed as `generate-project` v3 (now superseded) after 43 independent differential cases passed. All five deployed files matched; the other 22 functions, including the then-current worker v5 and n8n, were unchanged. Public POST401/GET405 bodies passed. Evidence: historical Git record `immediate-worker-wake.json` (see retrieval in the verification section). The user subsequently reported immediate completion; independently measured latency/browser acceptance remains part of T7, not proven by deployment or mocks.

After Auth validation and a successful transactional `start`/`retry_failed`, the entry builds the unchanged job response. If the returned job is queued/running with pending slots, it registers one best-effort worker POST with `EdgeRuntime.waitUntil` without awaiting completion. Active-job replay may also wake it; a terminal response does not. The destination is the fixed worker path on the server's HTTPS `SUPABASE_URL`, never request input. Only the dedicated worker secret is sent: no user Bearer, database key, snapshot or project identifiers. Redirects are forbidden and the request is bounded to 145 seconds; response bodies are discarded, never logged.

The saved job/receipt remains authoritative. Missing background support/configuration, registration errors, HTTP failures, network timeouts or runtime shutdown cannot replace an accepted response with an error or erase work. Cron remains enabled as the independent recovery path; `waitUntil` is not durable. Worker two-claim limits, SQL leases/fences, partial retries and successful previews are unchanged. Immediate dispatch does not guarantee instant completion, queue priority or processing all four variants in one invocation. UI polling can add up to its five-second interval before displaying completion.

Pausing cron alone **does not disable immediate dispatch**. Incoming accepted work can keep renewing readiness while cron is paused; do not treat cron pause as an intake kill switch. A full pause requires separately authorized intake control and draining accepted work. No such new control is introduced here.

## Explicit deployment and scheduler activation (operator only)

The current backend is activated; use [Current status](#current-status--2026-11-10), not the older activation records, to identify deployed versions. The procedure below is for an **explicitly authorized new environment or forward rollout**, not an instruction to reapply migrations or reschedule an already-active cron job. Record target/configuration and recovery metadata privately before changes; compare deployed sources/configuration and unrelated-function inventory afterward. Never expose credentials in those records.

### Migration order and rollout prerequisites

| Order | Immutable migration | Contract / dependent rollout |
|---|---|---|
| 001 | [`20261109000100_publication_generation.sql`](../supabase/migrations/20261109000100_publication_generation.sql) | Durable queue, receipts, leases and initial heartbeat; original stays unchanged. |
| 002 | [`20261109000200_project_authority_guard.sql`](../supabase/migrations/20261109000200_project_authority_guard.sql) | Authority/identity trust prerequisite, fail-closed one-time preflight. |
| 003 | [`20261109000300_generation_assigned_editor.sql`](../supabase/migrations/20261109000300_generation_assigned_editor.sql) | Shared authority/fencing and current-user preview RPC; before its caller UI. |
| 004 | [`20261110000100_generation_prompt_v2_readiness.sql`](../supabase/migrations/20261110000100_generation_prompt_v2_readiness.sql) | Heartbeat admits v1/v2; before v2 worker/readiness, then v2 entry. |
| 005 | [`20261110000200_generation_attempt_diagnostics.sql`](../supabase/migrations/20261110000200_generation_attempt_diagnostics.sql) | Atomic diagnostic finish/history; before diagnostics worker and any client selecting its column. |

All five are applied in the observed environment; retain their files. S15 needs no migration. For a fresh setup, validate/apply **001 → 002 → 003 → 004 → 005** before current functions. For an upgrade, inspect applied state and apply only missing forward migrations in order. Never replace003's authority-aware start with001's definition or rewrite accepted snapshots/receipts.

### Functions, configuration and scheduler

1. Review the ordered migrations in an isolated DB with the confirmed `jsonb[]`/bigint schema first. Prove ACL/RLS, trustguard compatibility, race/fencing and receipt cases; local T8/T9/T10 evidence does not replace target-environment security preflight. Existing admin helper/role protection, sequence, integrations and grants must match the prerequisites above.
2. Deploy `generate-project` and `process-publication-generation` with this repository's `supabase/config.toml`. Both use `verify_jwt = false` because their handlers explicitly verify Auth identity or the dedicated worker secret. Do not expose a handler lacking those checks.
3. Configure the Edge secrets above. In Supabase Vault, create two secrets through a trusted secret-management UI (never commit/paste their values in source, shell history or logs):
   - `publication_generation_worker_url`: `https://<project-ref>.supabase.co/functions/v1/process-publication-generation` for this project.
   - `publication_generation_worker_secret`: exactly the value of `PUBLICATION_GENERATION_WORKER_SECRET`, **not** a Supabase API key. Generate locally with `openssl rand -hex 32` and copy privately into both secret managers; never paste the result in chat or a repository. Do not alter the reserved Supabase variables or global keys. The old `publication_generation_service_role_key` entry is no longer read by the new scheduler; leave it untouched unless separately authorized to remove it.
4. After separate approval, enable cron and schedule this authenticated invocation. This SQL checks required Vault configuration before scheduling and skips HTTP entirely if configuration later disappears. The URL restriction intentionally uses the standard Supabase project hostname; adapt only after reviewing an intentional custom-domain deployment.

```sql
-- Opt-in only. pg_net is already installed on the observed baseline.
create extension if not exists pg_cron with schema pg_catalog;
-- Supabase Vault must be available; enable it in the dashboard if absent.
-- Do not embed secret values in this statement or cron.job.command.
do $activation$
declare
  worker_url text;
  worker_secret text;
begin
  select decrypted_secret into worker_url from vault.decrypted_secrets
    where name = 'publication_generation_worker_url';
  select decrypted_secret into worker_secret from vault.decrypted_secrets
    where name = 'publication_generation_worker_secret';
  if worker_url is null or worker_url !~ '^https://[a-z0-9-]+\.supabase\.co/functions/v1/process-publication-generation$'
    or worker_secret is null or length(worker_secret) <> 64 or worker_secret !~ '^[0-9A-Fa-f]{64}$' then
    raise exception 'Publication generation Vault configuration is missing or invalid';
  end if;
  perform cron.schedule(
    'publication-generation-worker',
    '* * * * *',
    $scheduled$
      with config as (
        select
          (select decrypted_secret from vault.decrypted_secrets
            where name = 'publication_generation_worker_url') as url,
          (select decrypted_secret from vault.decrypted_secrets
            where name = 'publication_generation_worker_secret') as worker_secret
      )
      select net.http_post(
        url := config.url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'X-Publication-Worker-Secret', config.worker_secret
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 145000
      )
      from config
      where config.url ~ '^https://[a-z0-9-]+\.supabase\.co/functions/v1/process-publication-generation$'
        and config.worker_secret is not null and length(config.worker_secret) = 64
        and config.worker_secret ~ '^[0-9A-Fa-f]{64}$';
    $scheduled$
  );
end;
$activation$;
```

5. Wait for an authenticated scheduled tick before opening creation in the UI. An empty queue makes no model call. The worker returns `{claimed:0,settled:0,fenced:0}` and updates readiness only after mandatory config is present. A missing worker/key yields no heartbeat and new start/retry returns `not_ready`; there is no silent accept-and-stall fallback at initial deployment.
6. Verify cron and worker HTTP status without printing request headers or Vault values. A successful cron SQL run means HTTP was queued, **not** that work completed. Use `cron.job_run_details` status, `net._http_response` status/error summaries, and operator-only readiness timestamps. Never expose these administrative tables to the browser. Confirm a non-AI job completes while its browser is closed. Paid model verification requires separate consent.
7. Monitor heartbeat age, oldest active job, lease-expired failures, attempts, provider availability and throughput. Each worker invocation claims at most two slots; immediate wakes supplement the once-per-minute recovery schedule. Overlapping invocations remain fenced. Restore cron/config to recover after outages. Stopping cron does not cancel accepted work or guarantee bounded wall-clock completion while the scheduler is offline.

### Frontend rollout gate

After backend readiness, verify authenticated owner/admin/assigned RLS, current-user preview RPC resolution/counts/pagination and actual PostgREST text casts. Confirm non-AI completion with the browser closed, return/restoration, partial failure and exact-ID replay, then separately authorized paid AI acceptance. Check focus/live regions, narrow/zoomed layouts, navigation/reload, real Auth changes and assignment/role revocation. Only then roll out the UI; T22/T7 remain open as stated above. If UI arrives early, `not_ready`, missing-function/table responses must show safe unavailability, never fallback to n8n. No new-table Realtime subscription is required.

## Troubleshooting and recovery

| Symptom | Safe investigation / recovery boundary |
|---|---|
| Worker401 | Confirm dedicated-header format and private Edge/Vault configuration using trusted operator tooling, never print values. Do not replay legacy service-role Bearer or weaken auth. The removed temporary three-boolean diagnostic is historical, not a permanent logging mode. |
| `not_ready` / missing function or table | Check migration/function order, mandatory config, heartbeat age (<3 minutes) and model/prompt match. Configuration/readiness does not prove provider capability. Original v2 heartbeat503 is a retained failed check, corrected by004. |
| Queued/running for longer than expected | Inspect safe cron run status, HTTP status/error summaries and readiness; cron SQL success means queued HTTP, not worker completion. Check oldest active job, leases and throughput. Restore authorized cron/config; 120-second leases and bounded retries recover crashes. No promised wall-clock completion during outage. |
| Ambiguous request / lost response | Replay the same actor-scoped UUID, not a new start. Receipts return current summaries. Do not purge receipts or compensate an ambiguous finish with another write. |
| Partial/failed job | Inspect safe slot codes/details; use retry only when terminal and `canRetry`. It preserves successes/snapshot/model and has at most two explicit rounds. `project_changed` is nonretryable: verify present authority; a new job is possible after old work settles, not by rewriting its initiator. |
| Historical `word_limit` / current invalid output | Past word-limit failures remain valid history. Current v1/v2 parsing has no 75-word rejection; inspect available safe reasons for token exhaustion, 4,000-character limit, schema/refusal/markup/etc. Missing details cannot diagnose the original cause. No failed text is materialized as a placeholder. |
| Missing/stale UI details | Distinguish read failure from generation failure. Refresh/re-authenticate as indicated. Empty successful RLS reads remove revoked jobs; null/unknown responses do not. Missing/malformed diagnostics remain unavailable, not reconstructed. |
| Authority migration/preflight mismatch | Stop and inspect. Do not retry by relaxing preflight, restoring broad grants, resetting sequences or changing unrelated RLS. Use reviewed forward repair. |

### Incident pause and recovery boundaries

After separate authorization, the existing **scheduler-only** pause command is:

```sql
select cron.alter_job(job_id := jobid, active := false)
from cron.job where jobname = 'publication-generation-worker';
```

**Stopping cron alone does not stop intake, immediate wakes or in-flight work.** Accepted requests/replays can still wake workers and renew readiness beyond its three-minute window. Do not assume readiness will expire while traffic continues. A full incident pause needs a separately authorized intake-control and accepted/in-flight-work plan; there is no implemented intake kill switch or universal rollback command in this guide. For a planned pause, account for intake and drain accepted work before claiming it is stopped. For an outage, restore approved scheduler/configuration and verify fresh scheduled HTTP/readiness; a successful heartbeat alone does not settle all jobs.

Keep tables, receipts, attempts and successful previews intact. Never delete/reset them, reverse applied migrations, renumber projects, alter export/general RLS or re-enable a client-owned generation bypass as rollback. Preserve failed evidence and compare against the recorded deployment recovery baseline before an independently reviewed forward repair or compatible operator recovery. Do not automatically redeploy an old worker that cannot process saved prompt versions/history.

Rotate `PUBLICATION_GENERATION_WORKER_SECRET` and Vault `publication_generation_worker_secret` together through trusted tooling (the entry's wake must also use the matching value). There is no old-secret overlap/fallback; coordinate and verify before restoring traffic. Do not rotate the Supabase database service key for this purpose. Leave the obsolete Vault service-role entry untouched unless removal is separately authorized. Future prompt versions must support/drain old snapshots before replacement. Retaining n8n does not authorize automatic rerouting, retirement or duplicate creation.

## Historical verification record and remaining proof

Resolved test and superseded activation JSON records were removed from the working tree; their complete contents, including failed attempts, remain in Git. Retrieve a historical filename cited in this guide with:

```bash
git show f2fed06baae9b94da95faf979304f3fb61a2bf8d:odd/evidence/publication-generation/<filename>
```

The working tree retains only the current worker deployment/recovery record, unresolved UI verification evidence, and three unique database pre-change baselines. These baselines support comparison; they are not permission to reverse applied migrations. No replacement archive is maintained.


These records consolidate the superseded UI/authority/assigned-editor guides. Counts and failed checks belong to their original checkpoints, **not fresh verification of this documentation edit**. Scratch paths below are historical locators, not required durable CI artifacts or instructions to reopen/retry a denied harness. No new test files were committed; source review/commit disposition remains parent-owned.

### Dashboard implementation evidence (T2)

Probes used Node24 stdin with mocked transport/in-memory TypeScript; no deployment, migration, scheduler, paid request, install or n8n deactivation occurred during T2.

| Historical check | Observed result |
|---|---|
| Public creation thunk RED | Exit1: old thunk wrote `state: preview` before valid result. |
| Thunk/reducer GREEN | Exit0, 6 assertions: queued acceptance, no project mutation/n8n call, actor mismatch prevents invocation. |
| Service | Exit0, 21 checks: pre-send storage, replay, actor isolation, 7 rejected inputs with no invocation, safe non-2xx, bigint, partial/exhausted retry, torn reads and older active jobs beyond200 rows. |
| Hook | Exit0, 15 checks: double-click lock, loss/unmount, restore/retry, refresh suppression, read failure/unauthorized stop, actor changes, nonoverlap/cleanup. |
| SSR/translations | Exit0, 16 checks +2 disabled-control negatives across3 locales, safe escaping and preview link; not browser proof. |
| Integration differential | Exit0: 7 unchanged declarations, project-list changes only text casts, 24 unrelated reducer cases identical to HEAD. |
| Focused lint / in-memory root solution build | Both exit0; 7 changed/new TS files lint-clean, zero TS diagnostics, 25 outputs held in memory. |
| `git diff --check` / new-file whitespace | Both exit0, 5 new files checked separately. |

Parent later ran literal `pnpm build` successfully. Independent T3 passed42 mocked runtime +81 isolated PostgreSQL groups. Historical global lint remained35 errors/9 warnings across19 baseline-identical files; all12 then-changed/new TS files were clean. Later T9's focused baseline failures below are a separate slice, not a contradiction or a clean-lint claim.

Literal `pnpm exec tsc -b` was deferred to the parent because it writes `dist/api`, Vite JS/declarations and build-info outside writer scope; in-memory solution compilation intercepted writes. An earlier standalone `tsconfig.app.json` probe reported4 existing ES2021.String diagnostics, identical on HEAD; actual root solution includes that library and passed. Other retained harness corrections: combined service/thunk loader stopped at unrelated `import.meta` after service checks; isolated thunk passed. SSR expected unescaped Catalan apostrophe; corrected assertion normalized HTML. Typecheck differential initially included new files against old thunk signatures; excluding additions yielded the valid baseline comparison. None were product RED. Self-check strengthened live Redux actor guards before passive cleanup; the added race probe passed.

### Authority guard evidence (T8)

Synthetic PostgreSQL17.11 ran in networkless `galia-authority-01a1c184` with production-shaped grants/identity, broad RLS, protected admin helper, dedicated export role, fake transactional Odoo counter and the **actual** translation migration's admin clone RPC. Historical scripts/results: `/tmp/galia-t8-rSjrnh/`.

- RED: baseline accepted hijack, self-assignment, ID rewrite and delete/reinsert replacement. First ID-rewrite probe hit an existing translation FK (psql exit3); one fixture correction used an unreferenced row.
- GREEN:49 assertions, including normal owner/assigned edits, clone/translations/media, service/anon behavior, explicit-ID/OVERRIDING/upsert/reset rejection and unrelated ACL preservation. Rejections checked `42501`, unchanged rows/counter.
- Triangulation:3 checks for sequence-owner TRUNCATE RESTART rejection, unchanged cross-tenant DELETE with denied ID reuse, and anonymous UPDATE. Three deliberate schema/grant/trigger drifts rejected application (expected psql exit3);3 checks confirmed atomic rollback.
- Differential: legitimate create/update/delete/clone/service/export output byte-identical. Generated creation times excluded; IDs, other fields, translation/integration output compared. Export projection/column ACLs preserved without exposing authority. Self-check found overly strict ID-only export SELECT preflight; corrected to preserve every already-exported column and reran focused checks. Separate snapshot retained original timestamps/data/policies/columns/constraints/helper/RPC/export/Odoo-trigger definitions.
- Default-ID rejected INSERTs consumed one sequence number in tested cases; explicit-ID permission failures, rejected UPDATE/reset did not advance it. Fake transactional counters and synthetic role sessions do not prove real Auth/PostgREST/Odoo or every external client.

### Assigned-editor evidence (T9) and independent proof (T10)

T9 used foreground stdin, mocks/in-memory compilation and networkless PostgreSQL17.11 with no ports/mounts. Separate `generation_t9_base`/`generation_t9_green` preserved T8 evidence; base used production-shaped synthetic fixtures and001/002, green added003. Setup/migrations succeeded without preparation retries. No live SQL/provider/n8n changes occurred **during that local task**; its old not-deployed statement is not current runtime status.

| Historical command/probe entry point | Observed result |
|---|---|
| `node --input-type=module` preparing SQL through synchronous `docker exec -i galia-authority-01a1c184 psql -U postgres -v ON_ERROR_STOP=1` | Exit0; separate DBs,001/002 applied. |
| `docker exec -i galia-authority-01a1c184 psql -U postgres -v ON_ERROR_STOP=1 -qAt` baseline transaction | Exit0; outsider and legitimate assigned photographer denied (behavior gap). |
| `node --input-type=module` baseline restoration | Intended exit1: actor-only filter hid shared jobs. |
| `printf ...` migration003 into foreground psql | Exit0, applied once; this is a historical entry point, not a runnable migration command. |
| Foreground psql generation/receipt/revocation | 35 assertions passed before probe-only snapshot failure, exit3. |
| Foreground psql corrected admin/preview/ACL continuation | Exit0, 12 assertions, including corrected failed check. |
| `node --input-type=module` owner/admin differential | Both exit0, **36 checks per DB**, byte-identical. Final descriptive print incorrectly said40; counters were36. |
| `node --input-type=module` service/list/menu mocks | Exit0,33 assertions, no network. |
| `node --input-type=module` exact function/policy differential | Exit0;3 full RPCs differed only in authority/comments; original policy/table ACL output unchanged. |
| In-memory root solution build | Exit0, zero diagnostics,25 intercepted outputs. |
| Focused ESLint (exact command below) | **Exit1**,2 preexisting explicit-any errors +1 preexisting TanStack warning. |
| Baseline lint/action differential | Exit0; same2 errors/1 warning on HEAD;8 unrelated preview actions identical. |
| `git diff --check` / explicit new SQL/doc whitespace | Both exit0. |

The failed admin-demotion assertion combined a mutating claim and status subquery in one statement; the subquery saw an earlier snapshot. One bounded correction separated statements and passed; no product correction. Exact stdin/output remain in the task transcript. The historical focused command was:

```sh
pnpm exec eslint src/features/projects/services/publicationGeneration.ts src/redux/actions/PreviewProjectActions.ts src/features/postPreview/components/cardList/index.tsx src/features/postPreview/components/cardList/ProjectMenu.tsx src/features/postPreview/screens/PreviewProjects.tsx
```

Errors were unchanged version-array `@typescript-eslint/no-explicit-any` in `PreviewProjectActions.ts`; warning was unchanged `useReactTable`. Literal lint remained failing and that writer handoff was partial despite attribution. Do not rewrite it as PASS.

Coverage: owner/admin/assigned/outsider/no-session reads, receipt/revocation/retry isolation, reassignment before claim/finish, demotion fallbacks, owner/media/version parity, successful siblings, expiry/token/duplicate fences, readiness/backoff/attempt limits, transfer/missing parent, legacy owned/admin previews, capped pagination, unknown responses, bigint, actor/storage guards and assigned menu omission. T9 simulated missing parent with a nonexistent ID, not fixture deletion.

T10 then applied exact001–003 once in a fresh synthetic DB: legitimate-flow baseline differential, **4 deterministic blocked-project-lock reassignment/admin-demotion races**, real deletion/transfer/duplicate/late rollback/sibling cases, SQL permission/bigint/ACL matrix and19 mocked-client groups passed. Original001 hash unchanged. Parent `pnpm build` passed; focused lint's2 errors/1 warning independently attributed unchanged. Historical proof: `/tmp/galia-t10-independent-W2hDpC/EVIDENCE.md`, with failures in `PROBE-EXCEPTIONS.md`. No demonstrated product blocker, but not proof of deployed Auth/PostgREST/Odoo, every external writer, browser/calendar/menu or historical deleted-ID reuse. S7 shared authority, S8 unchanged broad access and S9 trustguard preservation remain separate from residual exposure.

Review units were (1) full authority/fencing migration and contract, then (2) shared restore/listing/menu/UI contract; do not split safeguards into partial migrations or deploy RPC callers before schema. Earlier T2 review split service/identity, hook/thunk and feedback/translation integration. Those boundaries confer no permission to remove guard, data or receipts during recovery.

### Historical backend activation checkpoints

- Production preflight verified actual helper/schema/sequence/role/trigger/ACL metadata before applying001–003. Initial legacy-Bearer worker401s are retained; a temporary three-boolean diagnostic confirmed inbound/runtime credential mismatch and was removed. Do not repeat the obsolete auth path or enable diagnostic logging by default.
- S11/T6: after43 distinct independent checks, source9341bfb deployed worker v5;4 exact files and22 unchanged other functions. Private310 returned200, `{claimed:0,settled:0,fenced:0}`, zero jobs and `gpt-6-luna`/v1 readiness. Cron runs1–3 at10:04/05/06UTC on2026-11-10 and HTTP311–313 succeeded empty; evidence historical Git record `dedicated-worker-activation.json` (see retrieval in the verification section). No paid call or new project/preview in that activation, not a claim that users have never generated since.
- S12/S13: immediate wake, original prompt and forward v2 heartbeat checks are recorded in their sections; failed452HTTP503 remains historical. Neither mocks nor negative public checks establish live content quality.
- S14/T20: diagnostic migration applied with preserved ACLs, worker v7 exact6-file readback,22 others unchanged, public401/405 and passive603/604HTTP200 with fresh v2 readiness. Independent28SQL/19worker groups/types and final-only1group/2mockfetches passed; retained failures remain evidence. T21 UI parser/SSR had2RED→2GREEN, lint/build passed, **no frontend production publishing**.
- S14/T22: blocked preparation after prior83PASS/23FAIL/typesPASS; no new groups. A legitimate resolution of the tooling denial is required, not bypass or silent retry.
- S15/T23:5RED→5GREEN;108 regression PASS with4 overlong-fixture failures (>4,000 characters) retained, corrected8PASS;192 mocked calls/0 real. Focused lint/types/diff passed; full build skipped under worker/environment constraints. T24 subsequently deployed worker v8 as recorded at the top; no new migration or frontend rollout. This does not diagnose a real failed job or close T7.

### Initial queue and generation evidence (T1/T3)

Initial writer checks used Node 24 in-memory TypeScript loading and mock fetch, with no committed test files or live service calls. Subsequently, the user authorized temporary Docker infrastructure: the migration applied once successfully to isolated PostgreSQL 17.11 with synthetic data. Independent verification passed **81 PostgreSQL groups and 42 mocked handler/service/hook groups**. Evidence: `/tmp/galia-t3-adYgBZ/EVIDENCE.md` (session-local, not a permanent CI artifact). At that T3 checkpoint, real Deno, Auth gateway, PostgREST, production base-role policies, live OpenAI quality, browser behavior and scheduler activation were unverified; scheduler SQL had not run. Subsequent production preflight and backend/scheduler activations are recorded separately below and in Current status; they do not close T7/T22.

The PostgreSQL checks cover ACL/RLS, rejected inputs without writes, concurrent start/claim/finish, durable replay, failed-only retry, fencing/attempt exhaustion, ownership/deletion and exact bigint/media/version mapping. Harness-only failures were preserved (NULL decoding, concurrent-winner expectation, mock routing/import.meta); they were corrected without repository edits or repeating migration setup. Probe invocations added output-only `-qAt` to the originally specified psql invocation, a disclosed command-form deviation. No product blocker was demonstrated.

Parent `pnpm build` passed. Global lint still fails with 35 errors/9 warnings: independent attribution confirmed all diagnostics and their 19 files identical to baseline. All 12 changed/new TypeScript files are lint-clean. The implementation-stage checklist/table below is historical; this independent evidence supersedes its local-DB proof gaps, not its live activation gaps.

Historical observations during initial implementation (not current acceptance rules; S15 supersedes word-count rejection without rewriting these results):

- RED: a 76-word response was accepted by the initial parser; the behavior assertion failed with exit 1. GREEN: the same assertion passed after validation, exit 0.
- Boundary RED: `action: ['start']` was coerced to a valid action; its rejection assertion failed (exit 1). Replaced coercion with exact literal checks; the same assertion and eight final boundary regressions passed (exit 0), including six invalid action types causing zero fetches/RPC writes.
- A first Node strip-types run rejected a TypeScript parameter property; replaced it with an explicit field. This was tooling evidence, not the behavior RED.
- Focused no-emit TypeScript compiler check: five modules, zero diagnostics with an in-memory minimal Deno declaration (not a real Deno runtime check).
- `git diff --check`: exit 0. An additional in-memory whitespace check covered all eight allowed files, including untracked additions; all passed.
- SQL static readback: 18 invariant/ACL/shape checks passed; no database executed. A separate structural assertion first failed on transaction-start lease time (exit 1); switching lease/readiness timestamps to wall-clock time made that assertion pass (exit 0). This is structural evidence, not a concurrency test.
- Initial mock fetch probe: 31 behavior checks passed with zero real network calls, but parent review identified incorrect source-content expectations in that initial probe. Its content-parity assertions are superseded by the correction probes below; prior Auth/queue transport evidence remains unchanged. Its first run also corrected a probe expectation of 13 professions to the supplied list's 12.
- Parent correction RED: all five focused assertions failed (exit 1): exact non-AI UTF-8 byte parity with populated collaborators/keywords, paragraph-only strict schema, paragraph-only response parsing, mandatory AI `#arquitectura`, and exact `Carpintería en madera` label. The bounded correction changes only the shared generation helper and this document; the frontend request/response and queue contracts are unchanged.
- Correction GREEN: the same five assertions passed (exit 0). Sixteen additional in-memory/mock-fetch checks passed (exit 0, zero external calls): 75/76-word boundaries, invalid/refused/incomplete/malformed output, exact labels/names, deterministic AI suffix, non-AI UTF-8 byte parity including decomposed Unicode/CRLF/tabs and over 75 words, source boundaries, worker materialization arguments/model metadata, unchanged public API response and worker authorization.

Original implementation-stage verification checklist (historical open markers, not the current task ledger). Subsequent independent DB/mock evidence above covers local cases; target Auth/PostgREST/browser and controlled live acceptance remain distinct:

- [ ] Apply migration with the confirmed `jsonb[]`/bigint schema; inspect actual function ACLs and table DML denial for anon/authenticated/service_role. Verify owner/admin RLS and protection against self-escalating `userData.role` in existing policies.
- [ ] Concurrent same/different request start, replay after terminal completion and lost response; assert one active job, stable receipt identity and no duplicate preview IDs.
- [ ] Concurrent retry/claim/finish and old-job retry versus new start; assert successes untouched, retry receipts replay-safe, no lock inversion/deadlock and correct attempt bounds.
- [ ] Expiry/late finish, worker crash before/after provider and before/after commit, idle-job fairness, timeout exhaustion and two explicit retry rounds; assert recovery without a browser and no permanently running slots while scheduler is healthy.
- [ ] Project deletion/reassignment before claim and between claim/finish, all-failed prior state, and successful partial state; assert no unauthorized materialization.
- [ ] Invalid publication counts (null, fractional, 0, 5), invalid source objects, missing readiness, and forbidden actors; assert no new job/receipt/preview writes.
- [ ] PostgREST bigint text casts, function errors, Supabase Auth/Edge gateway behavior, cron/Vault/pg_net authentication, missing/rotated secret failure, and heartbeat expiry.

### Historical initial requirement self-check

The following table records the original implementation checkpoint, including its then-strict 75-word rule and then-pending checks; it is not a current deployment or output-validation statement.

| Requirement | Source/evidence | Remaining proof at that checkpoint |
|---|---|---|
| S1: safe failure feedback | Static error allowlist, normalized slot errors; mock auth/provider/DB error probes pass | UI integration is T2 |
| S2: preserve successes, retry failures only | Locked retry filters; atomic fenced finish; receipt replay | Real DB races and no-duplicate assertions |
| S3: server-only OpenAI model | Entry rejects extra model/actor fields; worker Responses request and actual-model probes pass | Approved provider capability/live-quality check |
| S4: survive navigation and restore status | Durable jobs/slots, SELECT RLS, polling contract, scheduler instructions | Scheduler activation and browser-closed runtime proof |
| Ownership/admin and service privilege boundary | Auth getUser; project lock/role lookup; explicit ACLs and safe search paths | Actual role/RLS execution and existing role-mutation policy audit |
| Snapshot and preview parity | Canonical counts/shape validation; deterministic non-AI probe; transactional media/link/versions insertion | Real `jsonb[]` conversion and preview readback |
| Bounded recovery and fencing | Three attempts/cycle, two retry rounds, wall-clock 120s lease, 20-job sweep, two claims/invocation | Fault injection and lock-contention proof |
| Strict generation and source boundaries | Paragraph-only schema, 75-word limit, source prompt, 12 credit mappings, AI base tag plus deterministic keywords; corrected non-AI byte parity | Human factuality/quality review |
| Operational safety and scope | No cron activation in migration, readiness gate, eight allowed files only; no frontend/tracker/dependency edits | Parent review, isolated DB validation and separately authorized deployment |

### Historical review slices and recovery constraints

1. **Durable transactional queue**: migration plus queue/security/read-contract documentation. High-risk DB slice, 373 SQL lines plus relevant docs; keep the invariants together rather than split interdependent RPCs just to fit 400 lines.
2. **Deterministic generation boundary**: shared generation/error modules plus generation/provenance docs and in-memory probe evidence. No runtime activation on its own.
3. **Authenticated entry and recovery worker**: REST store, both handlers, config and activation/frontend contract documentation; closes backend integration. No live cron activation in any slice.

These were source-review slices, **not safe production reversal units**. Applied migrations and coupled authority/fencing contracts must remain intact. Receipt/data recovery preserves previews and durable identities and needs an operator plan, not destructive SQL. Backend line count exceeded the advisory review target; safeguards were not compressed to fit it.

## Original n8n editorial prompt

Historical S13 activation: worker v6 and entry v4 then contained exact source `a514491`; forward heartbeat migration `2d2ab3f` preserved owner/OID/ACL/search path. Independent prompt checks passed47 groups; independent SQL checks passed36 groups/74 calls. After the retained503 failure was corrected, private probe470 returned200 with no claimed work and fresh v2 readiness. All deployed files matched; other21 functions, including n8n, were unchanged. Public rejection checks passed. See historical Git records `original-prompt.json` and `prompt-v2-readiness.json` (see retrieval in the verification section). Worker v6 is superseded; real content/reliability acceptance remains T7.

`N8N_PUBLICATION_TEMPLATE` in `_shared/publication-generation-prompt.ts` preserves the exact OpenAI message template from `src/n8n/creacion_publicaciones.json`, removing only n8n's leading `=` expression marker. S15 narrowly supersedes S13's exact rendered parity: current `publication-es-v2` rendering replaces only `Usa un máximo de 75 palabras.` with `Usa aproximadamente 75 palabras como orientación, no como límite estricto.` **before** interpolating project data. Description, keywords and variant are then interpolated in one pass, preserving all other wording/whitespace and literal placeholder-like text or length instructions inside project data. No extra editorial angle or rewritten tone is appended. The optional project prompt remains a separate user message; technical trust instructions remain separate from the editorial template.

The original template requests `{ "publicacion": { "texto": "..." } }`. The strict provider schema now matches it; parsing maps `texto` to the existing internal `paragraph` without changing client/preview contracts. Apart from S15's removal of word-count rejection, existing validation (including the raw 4,000-character bound), deterministic credits/hashtags and exact non-AI descriptions remain unchanged. The model, token limit and timeout are not copied from the old n8n node; this change restores its prompt, not its model settings.

The worker supports both v1 and v2. Previously accepted jobs/retries retain their frozen v1 request/schema, including its original maximum-75 wording; new jobs use v2. S15 relaxes shared output acceptance for both versions, without changing version identifiers. Historical `word_limit` diagnostics remain decodable: enums, translations, SQL and saved attempt history are unchanged. S15 was deployed to worker v8 after 36 independent checks; all six deployed files match the verified payload and the other 22 functions are unchanged. Public POST401/GET405 checks passed; a fresh scheduled heartbeat at 2026-11-10 15:42:01 UTC confirms post-deployment readiness (gpt-6-luna, publication-es-v2). This is not a diagnosis of any real failed job. Historical verification results are retained unchanged; no new migration is required for S15.

For the original S13 rollout, apply `20261110000100_generation_prompt_v2_readiness.sql` first: the original heartbeat RPC only admitted v1. This forward migration adds v2 to its explicit allowlist while preserving v1, model validation, locking, owner and service-role-only ACL. Then deploy the compatible worker, confirm its v2 readiness heartbeat, and deploy the v2 entry. During this short handoff, readiness mismatch rejects new requests without creating work. Do not rewrite old snapshots, receipts or successful previews. Do not edit migration001 or replace migration003's authorization-aware start function. No cron, secret or frontend change is required. The initial worker-v6 probe452 returned503 `not_ready` because the heartbeat allowlist was missed by local mocked verification; that failed deployment check is retained in the evidence.


### Safe attempt diagnostics (S14)

The new v2 output ceiling is 4,096 tokens; v1 retains 600. Output tokens include reasoning; the output-token ceiling is separate from the approximately-75-word editorial guidance (advisory under S15). It permits more usage/cost but does not force the model to consume the whole budget. Reasoning usage is a subset of output usage: do not add it again to calculate totals. Missing usage is unknown, not zero. The 45-second timeout and existing retry limits remain unchanged.

Migration `20261110000200_generation_attempt_diagnostics.sql` adds a bounded slot history and a service-only atomic finish wrapper. Deploy it before the updated worker and before clients select the new column. The legacy finish RPC remains available. Summary responses expose optional `attemptDiagnostics`; direct slot reads use `attempt_diagnostics` under the existing owner/admin/assigned-editor RLS.

Each entry contains server-derived `attempt`, `recordedAt`, `outcome`, nullable `errorCode`, and `details`. Details permit only the enums in `publication-generation-diagnostics.ts`, integer metrics from 0 through 1,000,000,000 (`inputTokens`, `outputTokens`, `reasoningTokens`, `maxOutputTokens`, `durationMs`, `wordCount`, `characterCount`), HTTP status 100–599, and a boolean normalization flag. SQL rejects unknown keys, arbitrary messages, malformed values and outcome/reason mismatches before calling finish. No prompts, generated text, error bodies, headers or secrets enter this history.

The wrapper calls unchanged finish before touching slots, preserving its lock order, authority checks and lease fence. It appends only after an accepted finish in the same transaction; an append failure rolls back the finish. Duplicate/stale finishes cannot append or create another preview. Sequence gaps after transaction failures remain normal PostgreSQL behavior, not a reason to reset IDs. No ambiguous finish is followed by a compensating write.

Success does not erase prior failures, and retry does not erase history. Entries use actual attempt numbers: old workers, pre-migration attempts, crashes, expired leases and rejected/fenced finishes may have no details. Authority-loss finish may retain its existing `project_changed` updates without adding a diagnostic. Never fabricate missing records or infer that absent usage means a free attempt. Existing historical failures cannot be reconstructed from the new column.
