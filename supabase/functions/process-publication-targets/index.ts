// Publication worker (worker secret, no user session). Claims due publication targets, publishes each
// one with its network publisher and records the result through publication_target_finish.
//
// Deployed but NOT scheduled until the cutover (S21, T8): nothing calls it yet and n8n still publishes.
//
// Safety (S11): a target whose irreversible call may have happened is never retried automatically.
// The publisher checkpoints side_effect_pending before that call; any failure afterwards becomes
// outcome_unknown / action_required (the SQL enforces it as well). A worker that loses its lease stops
// without finishing: the new owner (or lease recovery) decides.
import { workerAuthorized } from "../_shared/publication-generation-store.ts";
import { corsHeaders, jsonResponse, logSocialError, SocialError, socialFailure } from "../_shared/social-errors.ts";
import { type Fetcher, socialFetch } from "../_shared/social-http.ts";
import { publishInstagram } from "../_shared/social-publish-instagram.ts";
import { publishLinkedin } from "../_shared/social-publish-linkedin.ts";
import {
  type ClaimedTarget, createPublicationStore, type Environment, type PublicationStore,
} from "../_shared/social-publication-store.ts";
import {
  failed, LeaseLostError, type PublishContext, type PublishErrorKind, type PublishNetwork, type Publisher,
  type PublishResult,
} from "../_shared/social-publisher.ts";

const SCOPE = "process-publication-targets";
// Total time of one invocation (claiming stops after it; Edge Functions have a wall-clock limit).
export const BUDGET_MS = 120_000;
export const LEASE_SECONDS = 300;
export const CLAIM_LIMIT = 3;
// A publisher must stop this long before its lease ends, so it can still report.
export const LEASE_MARGIN_MS = 20_000;
// A target that cannot get at least this much time is handed back instead of started.
export const MIN_TARGET_MS = 15_000;
const MAX_BATCHES = 10;
const FETCH_TIMEOUT_MS = 10_000;
const FINISH_RETRY_MS = 500;
// publication_target_finish accepts 2048 bytes of jsonb text; stay below with margin.
const DIAGNOSTICS_MAX_BYTES = 1800;

export interface WorkerOptions {
  clock?: () => number;
  sleep?: (ms: number) => Promise<void>;
  publishers?: Record<PublishNetwork, Publisher>;
}

export interface WorkerSummary {
  claimed: number;
  published: number;
  retrying: number;
  needsAction: number;
  failed: number;
  leaseLost: number;
  /** Targets whose result could not be recorded (database unreachable); lease recovery handles them. */
  unfinished: number;
  budgetReached: boolean;
}

// ---------------------------------------------------------------------------------------------
// Diagnostics: bounded, JSON-safe for Postgres jsonb (no NUL, no lone surrogates), no tokens.
// ---------------------------------------------------------------------------------------------

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/gu;
const utf8Length = (text: string) => new TextEncoder().encode(text).length;

function cleanString(value: string, max: number, secret: string | null): string {
  let text = value.replaceAll("\u0000", "").replace(LONE_SURROGATE, "�");
  if (secret) text = text.replaceAll(secret, "[redacted]");
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function clean(value: unknown, depth: number, maxString: number, secret: string | null): unknown {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isSafeInteger(value) ? value : cleanString(String(value), 40, secret);
  if (typeof value === "string") return cleanString(value, maxString, secret);
  if (depth >= 4) return null;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => clean(item, depth + 1, maxString, secret));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 30)) {
      out[cleanString(key, 60, secret)] = clean(item, depth + 1, maxString, secret);
    }
    return out;
  }
  return null; // undefined, function, symbol, bigint
}

// Size of the value as Postgres renders jsonb text (", " and ": " separators).
function jsonbBytes(value: unknown): number {
  if (value === null) return 4;
  if (typeof value === "boolean") return value ? 4 : 5;
  if (typeof value === "number") return String(value).length;
  if (typeof value === "string") return utf8Length(JSON.stringify(value));
  if (Array.isArray(value)) {
    return 2 + value.reduce((sum: number, item) => sum + jsonbBytes(item), 0) + 2 * Math.max(value.length - 1, 0);
  }
  const entries = Object.entries(value as Record<string, unknown>);
  return 2 + entries.reduce((sum, [key, item]) => sum + jsonbBytes(key) + 2 + jsonbBytes(item), 0) +
    2 * Math.max(entries.length - 1, 0);
}

export function trimDiagnostics(raw: unknown, secret: string | null = null): Record<string, unknown> {
  const redactAt = secret && secret.length >= 8 ? secret : null;
  for (const maxString of [500, 120, 40]) {
    const cleaned = clean(raw, 0, maxString, redactAt);
    if (!cleaned || typeof cleaned !== "object" || Array.isArray(cleaned)) return {};
    if (jsonbBytes(cleaned) <= DIAGNOSTICS_MAX_BYTES) return cleaned as Record<string, unknown>;
  }
  const entries = Object.entries(clean(raw, 0, 40, redactAt) as Record<string, unknown>);
  const kept: Record<string, unknown> = { truncated: true };
  for (const [key, item] of entries) {
    const next = { ...kept, [key]: item };
    if (jsonbBytes(next) > DIAGNOSTICS_MAX_BYTES) break;
    kept[key] = item;
  }
  return kept;
}

// ---------------------------------------------------------------------------------------------
// Result sanity: the database validates too, but a bad value must never turn a real post into an
// unfinished target.
// ---------------------------------------------------------------------------------------------

const ERROR_CODE = /^[a-z_]{1,60}$/u;
const EXTERNAL_ID = /^[A-Za-z0-9:_.-]{1,200}$/u;
const KINDS: readonly PublishErrorKind[] = ["transient", "action_required", "permanent"];

function normalize(result: PublishResult, secret: string | null): PublishResult {
  if (result.outcome === "published") {
    const permalink = typeof result.permalink === "string" && /^https:\/\//u.test(result.permalink) &&
        result.permalink.length <= 500
      ? result.permalink
      : null;
    // A post exists (or may exist) but its id cannot be stored: the user has to check the network.
    if (typeof result.externalPostId !== "string" || !EXTERNAL_ID.test(result.externalPostId)) {
      return failed("outcome_unknown", "action_required", { reason: "invalid_publisher_result" });
    }
    return { outcome: "published", externalPostId: result.externalPostId, permalink };
  }
  const retry = Number.isInteger(result.retryAfterSeconds) && result.retryAfterSeconds! >= 1 &&
      result.retryAfterSeconds! <= 86400
    ? result.retryAfterSeconds
    : undefined;
  return {
    outcome: "failed",
    errorCode: ERROR_CODE.test(result.errorCode) ? result.errorCode : "internal_error",
    errorKind: KINDS.includes(result.errorKind) ? result.errorKind : "transient",
    retryAfterSeconds: retry,
    diagnostics: trimDiagnostics(result.diagnostics, secret),
    notPublished: result.notPublished === true,
  };
}

// ---------------------------------------------------------------------------------------------
// One target
// ---------------------------------------------------------------------------------------------

interface Run {
  store: PublicationStore;
  fetcher: Fetcher;
  clock: () => number;
  sleep: (ms: number) => Promise<void>;
  publishers: Record<PublishNetwork, Publisher>;
  budgetEnd: number;
}

type Settled = "published" | "retrying" | "needsAction" | "failed" | "leaseLost" | "unfinished";

const FINISH_COUNTS = {
  published: "published", pending: "retrying", needs_action: "needsAction", failed: "failed",
} as const;

async function finishWithRetry(run: Run, target: ClaimedTarget, result: PublishResult) {
  const diagnostics = result.outcome === "failed" ? result.diagnostics : {};
  try {
    return await run.store.finish(target, result, diagnostics);
  } catch (error) {
    if (error instanceof LeaseLostError) throw error;
    // The result (maybe a real post) must be recorded: one more try with the very same value.
    await run.sleep(FINISH_RETRY_MS);
    return await run.store.finish(target, result, diagnostics);
  }
}

async function processTarget(run: Run, target: ClaimedTarget): Promise<Settled> {
  let leaseEnd = target.leaseExpiresAt;
  const deadline = () => Math.min(run.budgetEnd, leaseEnd - LEASE_MARGIN_MS);
  let sideEffectPending = false;
  let secret: string | null = null;
  let result: PublishResult;

  try {
    if (deadline() - run.clock() < MIN_TARGET_MS) {
      // Out of time before starting: hand the target back with a short delay (costs one attempt).
      result = failed("lease_expired", "transient", { reason: "worker_budget" }, 30);
    } else {
      const payload = await run.store.payload(target);
      const resolution = await run.store.credentials(target);
      if (!resolution.ok) {
        result = resolution.result;
      } else {
        secret = resolution.credentials.accessToken;
        const context: PublishContext = {
          target,
          payload,
          credentials: resolution.credentials,
          async checkpoint(step, stepState, pending) {
            // Marked before the call: a request without answer may still have been applied.
            if (pending) sideEffectPending = true;
            leaseEnd = await run.store.checkpoint(target, step, stepState, pending, LEASE_SECONDS);
          },
          fetch(url, init = {}) {
            const { timeoutMs, ...rest } = init;
            const left = deadline() - run.clock();
            return socialFetch(run.fetcher, url, rest, Math.max(1, Math.min(timeoutMs ?? FETCH_TIMEOUT_MS, left)));
          },
          get deadline() {
            return deadline();
          },
          now: run.clock,
          sleep: run.sleep,
        };
        result = await run.publishers[target.network](context);
      }
    }
  } catch (error) {
    if (error instanceof LeaseLostError) return "leaseLost";
    logSocialError(SCOPE, error);
    const name = error instanceof Error ? error.name : typeof error;
    result = sideEffectPending
      ? failed("outcome_unknown", "action_required", { reason: "worker_exception", errorName: name })
      : failed("internal_error", "transient", { errorName: name });
  }

  try {
    const outcome = await finishWithRetry(run, target, normalize(result, secret));
    return FINISH_COUNTS[outcome.status];
  } catch (error) {
    if (error instanceof LeaseLostError) return "leaseLost";
    logSocialError(SCOPE, error);
    return "unfinished";
  }
}

// ---------------------------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------------------------

export function createHandler(env: Environment, fetcher: Fetcher = fetch, options: WorkerOptions = {}) {
  const clock = options.clock ?? Date.now;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const publishers = options.publishers ?? { instagram: publishInstagram, linkedin: publishLinkedin };

  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (request.method !== "POST") return jsonResponse(socialFailure(new SocialError("invalid_request")).body, 405);
    try {
      const workerSecret = env("SOCIAL_WORKER_SECRET");
      if (!workerSecret || !await workerAuthorized(request.headers.get("X-Social-Worker-Secret"), workerSecret)) {
        throw new SocialError("unauthorized");
      }
      const started = clock();
      const run: Run = {
        store: createPublicationStore(env, fetcher), fetcher, clock, sleep, publishers, budgetEnd: started + BUDGET_MS,
      };
      const summary: WorkerSummary = {
        claimed: 0, published: 0, retrying: 0, needsAction: 0, failed: 0, leaseLost: 0, unfinished: 0,
        budgetReached: false,
      };

      for (let batch = 0; batch < MAX_BATCHES; batch++) {
        if (run.budgetEnd - clock() < MIN_TARGET_MS) {
          summary.budgetReached = true;
          break;
        }
        let targets: ClaimedTarget[];
        try {
          targets = await run.store.claim(CLAIM_LIMIT, LEASE_SECONDS);
        } catch (error) {
          // Targets already processed keep their result; only a failure before any work is an error.
          if (summary.claimed === 0) throw error;
          logSocialError(SCOPE, error);
          break;
        }
        if (targets.length === 0) break;
        summary.claimed += targets.length;
        // One at a time: the budget and the lease of each target are tracked separately.
        for (const target of targets) summary[await processTarget(run, target)]++;
        if (targets.length < CLAIM_LIMIT) break;
      }
      return jsonResponse(summary);
    } catch (error) {
      logSocialError(SCOPE, error);
      const failure = socialFailure(error);
      return jsonResponse(failure.body, failure.status);
    }
  };
}

if (typeof Deno !== "undefined") Deno.serve(createHandler((name) => Deno.env.get(name)));
