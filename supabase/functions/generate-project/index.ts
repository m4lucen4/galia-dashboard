import { corsHeaders, GenerationError, jsonResponse, safeFailure } from "../_shared/publication-generation-errors.ts";
import { parseRequest } from "../_shared/publication-generation.ts";
import { createStore, type Environment, modelFromEnv, normalizeSummary } from "../_shared/publication-generation-store.ts";
import { wakeWorker } from "../_shared/publication-generation-wake.ts";

export function createHandler(
  env: Environment,
  fetcher: typeof fetch = fetch,
  waitUntil?: (task: Promise<void>) => void,
) {
  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (request.method !== "POST") return jsonResponse(safeFailure(new GenerationError("invalid_request")).body, 405);
    try {
      const authorization = request.headers.get("Authorization");
      if (!authorization || !/^Bearer \S+$/u.test(authorization) || authorization.length > 8192) {
        throw new GenerationError("unauthorized");
      }
      if (Number(request.headers.get("Content-Length")) > 16384) throw new GenerationError("invalid_request");
      const text = await request.text();
      if (text.length > 16384) throw new GenerationError("invalid_request");
      let body: unknown;
      try { body = JSON.parse(text); } catch { throw new GenerationError("invalid_request"); }
      const input = parseRequest(body);
      const store = createStore(env, fetcher);
      const actor = await store.getUser(authorization);
      const job = await store.start(actor, input, modelFromEnv(env));
      const response = jsonResponse(normalizeSummary(job));
      if (waitUntil && job.pending > 0 && (job.status === "queued" || job.status === "running")) {
        try { waitUntil(wakeWorker(env, fetcher)); } catch {
          // Registration can fail after commit; never replace the durable receipt.
        }
      }
      return response;
    } catch (error) {
      const failure = safeFailure(error);
      return jsonResponse(failure.body, failure.status);
    }
  };
}

const runtime = (globalThis as typeof globalThis & {
  EdgeRuntime?: { waitUntil(task: Promise<void>): void };
}).EdgeRuntime;
if (typeof Deno !== "undefined") {
  Deno.serve(createHandler((name) => Deno.env.get(name), fetch,
    runtime ? (task) => runtime.waitUntil(task) : undefined));
}
