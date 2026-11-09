import { failures, GenerationError, type FailureCode } from "./publication-generation-errors.ts";
import { DEFAULT_MODEL, PROMPT_VERSION, type Snapshot, type StartRequest } from "./publication-generation.ts";

export type Environment = (name: string) => string | undefined;

export interface SlotSummary {
  slot: number;
  state: "queued" | "running" | "succeeded" | "failed";
  attempts: number;
  previewId: string | null;
  errorCode: FailureCode | null;
  retryable: boolean;
  actualModel: string | null;
}

export interface JobSummary {
  jobId: string;
  projectId: string;
  status: "queued" | "running" | "succeeded" | "partial" | "failed";
  total: number;
  retryCount: number;
  updatedAt: string;
  requestedModel: string;
  promptVersion: string;
  succeeded: number;
  failed: number;
  pending: number;
  canRetry: boolean;
  slots: SlotSummary[];
}

export interface Claim {
  jobId: string;
  slot: number;
  leaseToken: string;
  snapshot: Snapshot;
  model: string;
  promptVersion: string;
}

export function modelFromEnv(env: Environment): string {
  const model = env("OPENAI_GENERATION_MODEL") ?? DEFAULT_MODEL;
  if (!/^[a-zA-Z0-9._:-]{1,120}$/.test(model)) throw new GenerationError("not_ready");
  return model;
}

function required(env: Environment, key: string): string {
  const value = env(key);
  if (!value?.trim()) throw new GenerationError("not_ready");
  return value;
}

export function workerConfig(env: Environment) {
  return {
    serviceKey: required(env, "SUPABASE_SERVICE_ROLE_KEY"),
    apiKey: required(env, "OPENAI_API_KEY"),
    model: modelFromEnv(env),
  };
}

// Native REST keeps the Edge runtime dependency-free. getUser calls Supabase
// Auth's /user endpoint; a decoded browser JWT is NEVER treated as identity.
export function createStore(env: Environment, fetcher: typeof fetch = fetch) {
  const url = required(env, "SUPABASE_URL").replace(/\/$/u, "");
  const serviceKey = required(env, "SUPABASE_SERVICE_ROLE_KEY");

  async function rpc<T>(name: string, body: Record<string, unknown> = {}): Promise<T> {
    let response: Response;
    try {
      response = await fetcher(`${url}/rest/v1/rpc/publication_generation_${name}`, {
        method: "POST",
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });
    } catch { throw new GenerationError("internal_error"); }
    let data: unknown;
    try { data = await response.json(); } catch {
      // PostgREST void functions can return an empty successful body.
      if (response.ok && name === "heartbeat") return undefined as T;
      throw new GenerationError("internal_error");
    }
    if (!response.ok) {
      const message = (data as { message?: unknown } | null)?.message;
      if (typeof message === "string" && Object.hasOwn(failures, message)) {
        throw new GenerationError(message as FailureCode);
      }
      throw new GenerationError("internal_error");
    }
    return data as T;
  }

  return {
    async getUser(authorization: string): Promise<string> {
      const anonKey = required(env, "SUPABASE_ANON_KEY");
      let response: Response;
      try {
        response = await fetcher(`${url}/auth/v1/user`, {
          headers: { apikey: anonKey, Authorization: authorization },
          signal: AbortSignal.timeout(10000),
        });
      } catch { throw new GenerationError("not_ready"); }
      if (!response.ok) throw new GenerationError("unauthorized");
      let user: { id?: unknown };
      try { user = await response.json(); } catch { throw new GenerationError("unauthorized"); }
      if (!user || typeof user.id !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(user.id)
      ) throw new GenerationError("unauthorized");
      return user.id;
    },
    start(actor: string, input: StartRequest, model: string) {
      // Rights, snapshot validation, idempotency and writes share one locked RPC.
      return rpc<JobSummary>("start", {
        p_actor: actor, p_project: input.projectId, p_action: input.action,
        p_request: input.requestId, p_job: input.jobId ?? null,
        p_model: model, p_prompt_version: PROMPT_VERSION,
      });
    },
    heartbeat(model: string) {
      return rpc<void>("heartbeat", { p_model: model, p_prompt_version: PROMPT_VERSION });
    },
    claim() { return rpc<Claim | null>("claim"); },
    finish(claim: Claim, result: { description: string; model: string | null } | { error: FailureCode }) {
      return rpc<boolean>("finish", {
        p_job: claim.jobId, p_slot: claim.slot, p_token: claim.leaseToken,
        p_description: "description" in result ? result.description : null,
        p_actual_model: "model" in result ? result.model : null,
        p_error: "error" in result ? result.error : null,
      });
    },
  };
}

export function normalizeSummary(summary: JobSummary) {
  return {
    ...summary,
    slots: summary.slots.map((slot) => ({
      ...slot,
      error: slot.errorCode ? {
        code: slot.errorCode,
        message: failures[slot.errorCode]?.[1] ?? failures.internal_error[1],
        retryable: slot.retryable,
      } : null,
    })),
  };
}

// Compare fixed-size digests instead of short-circuiting on token characters.
export async function serviceAuthorized(header: string | null, serviceKey: string): Promise<boolean> {
  if (!header?.startsWith("Bearer ") || header.length > 8192) return false;
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([header.slice(7), serviceKey].map(async (value) =>
    new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)))
  ));
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}
