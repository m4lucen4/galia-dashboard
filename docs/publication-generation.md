# Persistent publication generation — backend contract

T1 implements S1–S4 for **fresh creation only**, with or without AI. Jobs survive navigation; successful variants survive failed siblings. This is source code, **not an active deployment**. Browser-independent execution and lease recovery require the explicit scheduler activation below. No n8n fallback exists. Editing, iteration, social scheduling and publication are unchanged.

## Frontend quick path (T2)

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

Authenticated users have SELECT only on the two public read tables. After forward migration003, owners and explicitly assigned UIDs can read jobs for an extant project whose current owner matches the job's owner snapshot; admins (`userData.uid = auth.uid()`, `role = 'admin'`) retain historical read access. Assignment is a UID match, not an editor-role string: an assigned photographer is valid. Neither a former nor a new owner gains access to the former owner's snapshot through ownership alone. The service-only receipts/readiness tables are not UI APIs. See [generation-assigned-editor.md](generation-assigned-editor.md) for the T8 prerequisite, revocation and narrow preview-listing contract.

| Table | Columns |
|---|---|
| `publication_generation_jobs` | `id uuid`, `project_id bigint`, `owner_id uuid`, `actor_id uuid`, `snapshot jsonb`, `requested_model text`, `prompt_version text`, `total smallint`, `status text`, `retry_count smallint`, `created_at timestamptz`, `updated_at timestamptz` |
| `publication_generation_slots` | `(job_id uuid, slot smallint)` PK, `state text`, `attempts smallint`, `cycle_attempts smallint`, `lease_token uuid?`, `lease_until timestamptz?`, `available_at timestamptz`, `preview_id bigint?` unique, `error_code text?`, `retryable boolean`, `actual_model text?`, `updated_at timestamptz` |

Use narrow SELECTs; do not needlessly fetch snapshot or lease fields. Preserve bigint precision by selecting IDs as text (PostgREST output casts):

```ts
const latest = await supabase.from("publication_generation_jobs")
  .select("id,project_id::text,status,total,retry_count,requested_model,prompt_version,created_at,updated_at")
  .eq("project_id", projectId)
  .order("created_at", { ascending: false })
  .limit(1).maybeSingle();

const slots = await supabase.from("publication_generation_slots")
  .select("job_id,slot,state,attempts,preview_id::text,error_code,retryable,actual_model,updated_at")
  .eq("job_id", jobId).order("slot");
```

Map snake_case read columns to the summary's camelCase fields. Compute counts from slots; `canRetry = ['partial','failed'].includes(status) && retry_count < 2 && slots.some(s => s.state === 'failed' && s.retryable)`. Two independent reads can straddle a commit: poll again rather than infer a permanent contradiction. No browser writes to queue tables or direct browser calls to service RPCs are permitted. `project_id` and `preview_id` must never be converted through JavaScript `Number`.

`queued`/`running` are active; `succeeded` means all slots succeeded, `partial` means settled with some successes, `failed` means settled with no successes. A valid slot commits its preview and sets the project to `preview` immediately. All-failed jobs leave the prior project state unchanged. Each preview keeps the snapshotted owner, title, link and full media array; `projects.image_data` is a SQL `jsonb[]`, converted through `to_jsonb(project)` to the JSON array required by `projectsPreview.image_data jsonb`. Preview IDs come from the existing bigint identity, never the browser. `versions` starts as `[{id: uuid, description: description_rich, main: true}]`; preview state is `preview`.

## Queue and authorization invariants

- `getUser` verifies the bearer token against Supabase Auth `/auth/v1/user` (native REST equivalent of `auth.getUser`, not local JWT decoding). The start RPC rechecks current owner/admin/assigned-UID rights before receipts, active-job reuse, retry or writes. Migration003 uses the same private authorization predicate in start, read, claim and finish; owner snapshot and initiating actor remain distinct.
- Four security-definer mutation RPCs exist: `publication_generation_start`, `publication_generation_claim`, `publication_generation_finish`, `publication_generation_heartbeat`. All use `search_path = ''`, qualified table references, explicit revocation from PUBLIC/anon/authenticated and explicit EXECUTE to `service_role`. Table DML is revoked even from service_role: mutations flow through RPCs. Internal summary/refresh helpers are not callable by service_role. Authenticated callers can execute the read-only RLS predicate and migration003's current-user preview-list RPC, never the arbitrary-actor private predicate or service mutation RPCs.
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
| `OPENAI_GENERATION_MODEL` | Server only; default `gpt-4.1-mini`; configure the same value for entry and worker |

Use a model supporting Responses API strict structured text outputs. The model's syntactic validation is not a capability probe; verify capability/configuration separately before live rollout. No paid capability probe was run. The request uses `/v1/responses`, `store:false`, `text.format:{type:'json_schema',strict:true,...}`, and `max_output_tokens:600`; no SDK, temperature or obsolete response-format parameters are added. Generation has a 45-second fetch timeout. Database RPCs have 10-second timeouts. Each invocation claims at most two slots sequentially (up to 90 seconds of provider waits plus at most 50 seconds of RPC waits); timeout/crash still recovers through leases.

The strict schema is `{paragraph:string}` with no extra properties or additional heading. Runtime validation rejects non-completed, refused, missing, malformed, multiple-text or invalid-field responses. The single paragraph is limited to 75 whitespace-delimited words; deterministic credits and hashtags are excluded from that count. No generated HTML or hashtags are accepted. No failed result is converted into publication text.

Canonical snapshot fields: `title`, `description`, `requiredAI`, `prompt`, `keywords`, `weblink`, `image_data`, `projectCollaborators`. Publications must be an integer 1–4 before insertion. Title/description must be nonblank; description ≤30,000 characters, prompt ≤10,000, title ≤1,000, keywords/link ≤4,000; at most 100 collaborator objects with string profession/name (≤100/1,000 characters). SQL validates these before writes. Worker validates the required snapshot shape again. Null optional text/arrays normalize to empty strings/arrays; null `requiredAI` normalizes to false.

Project prompt is preserved as `project_prompt` in JSON **source data**, not promoted into the privileged instruction. The instruction allows compatible editorial preferences only and explicitly rejects instructions embedded in project data. The four slots use general, spatial, material/detail and experience angles, with fallback paraphrasing when facts are absent. Prompt boundaries reduce injection risk but cannot mathematically guarantee factual accuracy or distinct prose; human preview review remains necessary.

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

Each job stores `requested_model` and `prompt_version = publication-es-v1`; each successful AI slot stores the **actual** model identifier returned by OpenAI. Non-AI slots have `actual_model = null`. Provider raw error bodies are neither read nor persisted/logged; only allowlisted failure codes and static Spanish messages escape the boundary. The worker ignores all request-body content and accepts only an exact service-role bearer secret comparison.

## Explicit deployment and scheduler activation (operator only)

**Controlled activation is partially applied under S6 authorization.** Exact migrations001–003 and both new Edge Functions were deployed after local verification and production preflight. Existing21 functions, including n8n, retain their versions/configuration. Unauthenticated requests return401 as expected; the first Vault-authenticated empty worker probe also returned401 unexpectedly, so readiness remains empty and cron has NOT been enabled. No jobs/previews or OpenAI calls were created. Vault format/role/project checks pass, but they do not establish equality with the worker runtime key. Human credential verification is required before another authenticated attempt. Evidence: `odd/evidence/publication-generation/deployment-first-attempt.json` and the adjacent preflight backup. Migration alone does not create/enable cron; initial baseline has `pg_net`, not `pg_cron`. Preserve all applied objects and existing workflows; no automatic rollback.

1. Review and apply generation001, `20261109000200_project_authority_guard.sql` and `20261109000300_generation_assigned_editor.sql` in order in an isolated DB first. Original generation001 remains immutable. Prove the race/security cases below and the T8/T9 contracts before production; T10 and production preflight remain gates.
2. Deploy `generate-project` and `process-publication-generation` with this repository's `supabase/config.toml`. Both use `verify_jwt = false` because their handlers explicitly verify Auth identity or the exact service secret. Do not expose a handler lacking those checks.
3. Configure the Edge secrets above. In Supabase Vault, create two secrets through a trusted secret-management UI (never commit/paste their values in source, shell history or logs):
   - `publication_generation_worker_url`: `https://<project-ref>.supabase.co/functions/v1/process-publication-generation` for this project.
   - `publication_generation_service_role_key`: the same project's runtime `SUPABASE_SERVICE_ROLE_KEY`, **not** an anon key or user token.
4. After separate approval, enable cron and schedule this authenticated invocation. This SQL checks required Vault configuration before scheduling and skips HTTP entirely if configuration later disappears. The URL restriction intentionally uses the standard Supabase project hostname; adapt only after reviewing an intentional custom-domain deployment.

```sql
-- Opt-in only. pg_net is already installed on the observed baseline.
create extension if not exists pg_cron with schema pg_catalog;
-- Supabase Vault must be available; enable it in the dashboard if absent.
-- Do not embed secret values in this statement or cron.job.command.
do $activation$
declare
  worker_url text;
  service_key text;
begin
  select decrypted_secret into worker_url from vault.decrypted_secrets
    where name = 'publication_generation_worker_url';
  select decrypted_secret into service_key from vault.decrypted_secrets
    where name = 'publication_generation_service_role_key';
  if worker_url is null or worker_url !~ '^https://[a-z0-9-]+\.supabase\.co/functions/v1/process-publication-generation$'
    or service_key is null or btrim(service_key) = '' then
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
            where name = 'publication_generation_service_role_key') as service_key
      )
      select net.http_post(
        url := config.url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || config.service_key
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 145000
      )
      from config
      where config.url ~ '^https://[a-z0-9-]+\.supabase\.co/functions/v1/process-publication-generation$'
        and config.service_key is not null and btrim(config.service_key) <> '';
    $scheduled$
  );
end;
$activation$;
```

5. Wait for an authenticated scheduled tick before opening creation in the UI. An empty queue makes no model call. The worker returns `{claimed:0,settled:0,fenced:0}` and updates readiness only after mandatory config is present. A missing worker/key yields no heartbeat and new start/retry returns `not_ready`; there is no silent accept-and-stall fallback at initial deployment.
6. Verify cron and worker HTTP status without printing request headers or Vault values. A successful cron SQL run means HTTP was queued, **not** that work completed. Use `cron.job_run_details` status, `net._http_response` status/error summaries, and operator-only readiness timestamps. Never expose these administrative tables to the browser. Confirm a non-AI job completes while its browser is closed. Paid model verification requires separate consent.
7. Monitor heartbeat age, oldest active job, lease-expired failures, attempts, provider availability and throughput. Two slots per minute is the normal single-schedule capacity; overlapping ticks remain fenced. Restore cron/config to recover after outages. Stopping cron does not cancel accepted work or guarantee bounded wall-clock completion while the scheduler is offline.

To pause after separate authorization, use `select cron.alter_job(job_id := jobid, active := false) from cron.job where jobname = 'publication-generation-worker';`. New work may still be accepted during the remaining three-minute heartbeat window; drain work before a planned pause. Keep tables/receipts and successful previews intact. Do not delete or reset them as rollback. Rotate the worker's runtime service key and corresponding Vault secret together. Future prompt versions must support/drain old snapshotted versions before replacement.

## Verification record and remaining proof

Initial writer checks used Node 24 in-memory TypeScript loading and mock fetch, with no committed test files or live service calls. Subsequently, the user authorized temporary Docker infrastructure: the migration applied once successfully to isolated PostgreSQL 17.11 with synthetic data. Independent verification passed **81 PostgreSQL groups and 42 mocked handler/service/hook groups**. Evidence: `/tmp/galia-t3-adYgBZ/EVIDENCE.md` (session-local, not a permanent CI artifact). Real Deno, Auth gateway, PostgREST, production base-role policies, live OpenAI quality, browser behavior and scheduler activation remain unverified; scheduler SQL has not run.

The PostgreSQL checks cover ACL/RLS, rejected inputs without writes, concurrent start/claim/finish, durable replay, failed-only retry, fencing/attempt exhaustion, ownership/deletion and exact bigint/media/version mapping. Harness-only failures were preserved (NULL decoding, concurrent-winner expectation, mock routing/import.meta); they were corrected without repository edits or repeating migration setup. Probe invocations added output-only `-qAt` to the originally specified psql invocation, a disclosed command-form deviation. No product blocker was demonstrated.

Parent `pnpm build` passed. Global lint still fails with 35 errors/9 warnings: independent attribution confirmed all diagnostics and their 19 files identical to baseline. All 12 changed/new TypeScript files are lint-clean. The implementation-stage checklist/table below is historical; this independent evidence supersedes its local-DB proof gaps, not its live activation gaps.

Observed during implementation:

- RED: a 76-word response was accepted by the initial parser; the behavior assertion failed with exit 1. GREEN: the same assertion passed after validation, exit 0.
- Boundary RED: `action: ['start']` was coerced to a valid action; its rejection assertion failed (exit 1). Replaced coercion with exact literal checks; the same assertion and eight final boundary regressions passed (exit 0), including six invalid action types causing zero fetches/RPC writes.
- A first Node strip-types run rejected a TypeScript parameter property; replaced it with an explicit field. This was tooling evidence, not the behavior RED.
- Focused no-emit TypeScript compiler check: five modules, zero diagnostics with an in-memory minimal Deno declaration (not a real Deno runtime check).
- `git diff --check`: exit 0. An additional in-memory whitespace check covered all eight allowed files, including untracked additions; all passed.
- SQL static readback: 18 invariant/ACL/shape checks passed; no database executed. A separate structural assertion first failed on transaction-start lease time (exit 1); switching lease/readiness timestamps to wall-clock time made that assertion pass (exit 0). This is structural evidence, not a concurrency test.
- Initial mock fetch probe: 31 behavior checks passed with zero real network calls, but parent review identified incorrect source-content expectations in that initial probe. Its content-parity assertions are superseded by the correction probes below; prior Auth/queue transport evidence remains unchanged. Its first run also corrected a probe expectation of 13 professions to the supplied list's 12.
- Parent correction RED: all five focused assertions failed (exit 1): exact non-AI UTF-8 byte parity with populated collaborators/keywords, paragraph-only strict schema, paragraph-only response parsing, mandatory AI `#arquitectura`, and exact `Carpintería en madera` label. The bounded correction changes only the shared generation helper and this document; the frontend request/response and queue contracts are unchanged.
- Correction GREEN: the same five assertions passed (exit 0). Sixteen additional in-memory/mock-fetch checks passed (exit 0, zero external calls): 75/76-word boundaries, invalid/refused/incomplete/malformed output, exact labels/names, deterministic AI suffix, non-AI UTF-8 byte parity including decomposed Unicode/CRLF/tabs and over 75 words, source boundaries, worker materialization arguments/model metadata, unchanged public API response and worker authorization.

Independent verifier must exercise, against an isolated real database/runtime:

- [ ] Apply migration with the confirmed `jsonb[]`/bigint schema; inspect actual function ACLs and table DML denial for anon/authenticated/service_role. Verify owner/admin RLS and protection against self-escalating `userData.role` in existing policies.
- [ ] Concurrent same/different request start, replay after terminal completion and lost response; assert one active job, stable receipt identity and no duplicate preview IDs.
- [ ] Concurrent retry/claim/finish and old-job retry versus new start; assert successes untouched, retry receipts replay-safe, no lock inversion/deadlock and correct attempt bounds.
- [ ] Expiry/late finish, worker crash before/after provider and before/after commit, idle-job fairness, timeout exhaustion and two explicit retry rounds; assert recovery without a browser and no permanently running slots while scheduler is healthy.
- [ ] Project deletion/reassignment before claim and between claim/finish, all-failed prior state, and successful partial state; assert no unauthorized materialization.
- [ ] Invalid publication counts (null, fractional, 0, 5), invalid source objects, missing readiness, and forbidden actors; assert no new job/receipt/preview writes.
- [ ] PostgREST bigint text casts, function errors, Supabase Auth/Edge gateway behavior, cron/Vault/pg_net authentication, missing/rotated secret failure, and heartbeat expiry.

## Requirement-by-requirement self-check

| Requirement | Source/evidence | Remaining proof |
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

## Suggested cohesive review slices (parent owns commits)

1. **Durable transactional queue**: migration plus queue/security/read-contract documentation. High-risk DB slice, 373 SQL lines plus relevant docs; keep the invariants together rather than split interdependent RPCs just to fit 400 lines.
2. **Deterministic generation boundary**: shared generation/error modules plus generation/provenance docs and in-memory probe evidence. No runtime activation on its own.
3. **Authenticated entry and recovery worker**: REST store, both handlers, config and activation/frontend contract documentation; closes backend integration. No live cron activation in any slice.

Each slice is removable without changing unrelated features. Receipt/data rollback must preserve generated previews and durable identities; production rollback needs an operator plan, not destructive SQL. Backend line count exceeds the advisory review target; do not compress safeguards to fit it.
