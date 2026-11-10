import { parseAttemptDiagnostics } from "./publicationGenerationDiagnostics";
import { supabase } from "@/helpers/supabase";
import type { GenerationIssue, GenerationJob, GenerationRequest, GenerationSlot, JobStatus } from "../types/publicationGeneration";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const decimal = /^[1-9]\d*$/;
const states = ["queued", "running", "succeeded", "failed"];
const errorCodes = new Set([
  "invalid_request", "unauthorized", "forbidden", "conflict", "project_changed",
  "retry_exhausted", "invalid_project", "provider_refusal", "invalid_response",
  "not_ready", "provider_unavailable", "lease_expired", "internal_error",
]);
const issue = (code: string, uncertain = false): GenerationIssue => ({ code, uncertain });
export const safeGenerationIssue = (error: unknown): GenerationIssue => {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    if (errorCodes.has(error.code) || ["storage", "uncertain", "read_failed"].includes(error.code)) {
      return issue(error.code, "uncertain" in error && error.uncertain === true);
    }
  }
  return issue("internal_error");
};
export const isActive = (job: GenerationJob) =>
  !job.consistent || job.status === "queued" || job.status === "running";

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw issue("invalid_response", true);
  return value as Record<string, unknown>;
}
function integer(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw issue("invalid_response", true);
  }
  return value;
}
function text(value: unknown): string {
  if (typeof value !== "string") throw issue("invalid_response", true);
  return value;
}
function id(value: unknown, pattern: RegExp): string {
  const result = text(value);
  if (!pattern.test(result)) throw issue("invalid_response", true);
  return result;
}
function nullableText(value: unknown): string | null {
  return value === null ? null : text(value);
}

export function parseGenerationJob(value: unknown): GenerationJob {
  const raw = object(value);
  if (![...states, "partial"].includes(text(raw.status)) || !Array.isArray(raw.slots)) {
    throw issue("invalid_response", true);
  }
  const total = integer(raw.total, 1, 4);
  const retryCount = integer(raw.retryCount, 0, 2);
  const slots: GenerationSlot[] = raw.slots.map((value) => {
    const slot = object(value);
    if (!states.includes(text(slot.state)) || typeof slot.retryable !== "boolean") {
      throw issue("invalid_response", true);
    }
    return {
      slot: integer(slot.slot, 1, total), state: slot.state as GenerationSlot["state"],
      attempts: integer(slot.attempts, 0, 9),
      previewId: slot.previewId === null ? null : id(slot.previewId, decimal),
      errorCode: nullableText(slot.errorCode), retryable: slot.retryable,
      actualModel: nullableText(slot.actualModel),
      ...(slot.attemptDiagnostics === undefined ? {} : {
        attemptDiagnostics: parseAttemptDiagnostics(slot.attemptDiagnostics, slot.attempts as number),
      }),
    };
  });
  const succeeded = slots.filter((s) => s.state === "succeeded").length;
  const failed = slots.filter((s) => s.state === "failed").length;
  const pending = slots.filter((s) => ["queued", "running"].includes(s.state)).length;
  const status = raw.status as JobStatus;
  const consistent = (raw.succeeded === undefined || raw.succeeded === succeeded)
    && (raw.failed === undefined || raw.failed === failed)
    && (raw.pending === undefined || raw.pending === pending)
    && slots.length === total && new Set(slots.map((s) => s.slot)).size === total
    && slots.every((s) => (s.state === "succeeded") === (s.previewId !== null))
    && (status === "succeeded" ? succeeded === total
      : status === "partial" ? succeeded > 0 && failed > 0 && pending === 0
      : status === "failed" ? failed === total : pending > 0);
  return {
    jobId: id(raw.jobId, uuid), projectId: id(raw.projectId, decimal), status, total,
    retryCount, updatedAt: text(raw.updatedAt), requestedModel: text(raw.requestedModel),
    promptVersion: text(raw.promptVersion), succeeded, failed, pending, slots, consistent,
    canRetry: raw.canRetry !== false && consistent && ["partial", "failed"].includes(status) && retryCount < 2
      && slots.some((s) => s.state === "failed" && s.retryable),
  };
}

export function validateGenerationRequest(request: GenerationRequest) {
  if (!request || !decimal.test(request.projectId) || typeof request.projectId !== "string"
    || typeof request.requestId !== "string" || !uuid.test(request.requestId)
    || !["start", "retry_failed"].includes(request.action)
    || (request.action === "start" ? request.jobId !== undefined
      : typeof request.jobId !== "string" || !uuid.test(request.jobId))
    || Object.keys(request).some((key) => !["projectId", "action", "requestId", "jobId"].includes(key))) {
    throw issue("invalid_request");
  }
}

// Only identities, scoped to the verified auth actor. Never content, models or tokens.
function storageKey(actor: string) {
  if (!uuid.test(actor)) throw issue("unauthorized");
  return `publication-generation:v1:${actor}`;
}
export function outstandingRequests(actor: string): GenerationRequest[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(storageKey(actor)) ?? "[]");
    if (!Array.isArray(stored)) throw issue("storage");
    stored.forEach(validateGenerationRequest);
    return stored;
  } catch { throw issue("storage"); }
}
function storeRequests(actor: string, requests: GenerationRequest[]) {
  try {
    const key = storageKey(actor);
    const value = JSON.stringify(requests);
    localStorage.setItem(key, value);
    if (localStorage.getItem(key) !== value) throw issue("storage");
  } catch { throw issue("storage"); }
}
export function prepareGenerationRequest(actor: string, projectId: string, job?: GenerationJob) {
  const records = outstandingRequests(actor);
  const existing = records.find((r) => r.projectId === projectId);
  // An uncertain action always takes precedence over a new deliberate action.
  if (existing) return existing;
  if (job && (!job.canRetry || !job.consistent || job.projectId !== projectId)) throw issue("conflict");
  const request: GenerationRequest = {
    projectId, action: job ? "retry_failed" : "start", requestId: crypto.randomUUID(),
    ...(job ? { jobId: job.jobId } : {}),
  };
  validateGenerationRequest(request);
  storeRequests(actor, [...records, request]);
  return request;
}
export function acknowledgeGenerationRequest(actor: string, requestId: string) {
  storeRequests(actor, outstandingRequests(actor).filter((r) => r.requestId !== requestId));
}

export async function invokeGeneration(request: GenerationRequest): Promise<GenerationJob> {
  validateGenerationRequest(request);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const { data, error } = await supabase.functions.invoke("generate-project", {
      body: request, signal: controller.signal,
    });
    if (error) {
      const context: unknown = error.context;
      if (context instanceof Response) {
        let body: Record<string, unknown> = {};
        try { body = object(await context.clone().json()); } catch { /* Gateway may return HTML. */ }
        if (typeof body.code === "string" && errorCodes.has(body.code)
          && typeof body.message === "string" && typeof body.retryable === "boolean") {
          // Translate allowlisted codes; never trust arbitrary SDK/provider message text.
          throw issue(body.code, body.code === "internal_error");
        }
        if (context.status === 401) throw issue("unauthorized");
        if (context.status === 404) throw issue("not_ready");
      }
      throw issue("uncertain", true);
    }
    const job = parseGenerationJob(data);
    if (job.projectId !== request.projectId || (request.jobId && job.jobId !== request.jobId)) {
      throw issue("invalid_response", true);
    }
    return job;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) throw safeGenerationIssue(error);
    throw issue("uncertain", true);
  } finally { clearTimeout(timeout); }
}

const jobColumns = "id,project_id::text,status,total,retry_count,requested_model,prompt_version,created_at,updated_at";
const slotColumns = "job_id,slot,state,attempts,preview_id::text,error_code,retryable,actual_model,attempt_diagnostics";
function readFailure(error: { code?: string }, status: number) {
  return issue(status === 401 || error.code === "PGRST301" ? "unauthorized"
    : ["42P01", "PGRST205"].includes(error.code ?? "") ? "not_ready" : "read_failed");
}

export async function restoreGenerationJobs(actor: string, signal: AbortSignal): Promise<GenerationJob[]> {
  if (!uuid.test(actor)) throw issue("unauthorized");
  const verifyActor = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || data.user?.id !== actor) throw issue("unauthorized");
  };
  await verifyActor();
  const latest = new Map<string, Record<string, unknown>>();
  // Scan paginated identities, not an arbitrary last-N history window. An explicitly
  // retried older job must win over a newer settled job for the same project.
  const pageSize = 200;
  for (let offset = 0; ;) {
    // RLS, not the initiating actor, determines shared job visibility.
    const { data, error, status, count } = await supabase.from("publication_generation_jobs")
      .select(jobColumns, { count: "exact" })
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(offset, offset + pageSize - 1).abortSignal(signal);
    if (error) throw readFailure(error, status);
    if (!Array.isArray(data) || !Number.isSafeInteger(count) || count === null || count < 0
      || (data.length === 0 && offset < count)) throw issue("read_failed");
    for (const row of data) {
      const key = id(row.project_id, decimal);
      const previous = latest.get(key);
      if (!previous || (["queued", "running"].includes(row.status)
        && !["queued", "running"].includes(String(previous.status)))) latest.set(key, row);
    }
    offset += data.length;
    // A server row cap smaller than pageSize must not truncate restoration.
    if (offset >= count) break;
  }
  const jobs: GenerationJob[] = [];
  for (const row of latest.values()) {
    const { data, error, status } = await supabase.from("publication_generation_slots")
      .select(slotColumns).eq("job_id", id(row.id, uuid)).order("slot").abortSignal(signal);
    if (error) throw readFailure(error, status);
    if (!Array.isArray(data)) throw issue("read_failed");
    // Slots are created atomically with the job and are never deleted. An empty
    // successful RLS read means access disappeared between reads: do not retain
    // the earlier job details as a permanently "synchronizing" local snapshot.
    if (data.length === 0) continue;
    jobs.push(parseGenerationJob({
      jobId: row.id, projectId: row.project_id, status: row.status, total: row.total,
      retryCount: row.retry_count, updatedAt: row.updated_at,
      requestedModel: row.requested_model, promptVersion: row.prompt_version,
      slots: data.map((slot) => ({
        slot: slot.slot, state: slot.state, attempts: slot.attempts,
        previewId: slot.preview_id, errorCode: slot.error_code,
        retryable: slot.retryable, actualModel: slot.actual_model,
        attemptDiagnostics: slot.attempt_diagnostics,
      })),
    }));
  }
  await verifyActor();
  return jobs;
}
