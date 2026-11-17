import { corsHeaders, jsonResponse } from "../_shared/publication-generation-errors.ts";
import { sanitizeDiagnostic, type ProviderDiagnostic } from "../_shared/publication-generation-diagnostics.ts";
import { createStore, type Environment, modelFromEnv } from "../_shared/publication-generation-store.ts";
import {
  composeIteration, isIterationFailureCode, iterateText, IterationError, iterationFailure,
  type IterationFailureCode, parseIterationRequest, splitTrailingBlock,
} from "../_shared/publication-iteration.ts";

type BeginResult =
  | { status: "started"; sourceText: string }
  | { status: "succeeded"; versionId: string; versions: unknown[] }
  | { status: "failed"; errorCode: string };

type FinishResult =
  | { status: "succeeded"; versionId: string; versions: unknown[] }
  | { status: "failed"; errorCode: string };

function required(env: Environment, key: string): string {
  const value = env(key);
  if (!value?.trim()) throw new IterationError("not_ready");
  return value;
}

function failureCode(value: unknown): IterationFailureCode {
  return isIterationFailureCode(value) ? value : "internal_error";
}

// Synchronous by design (S2): one provider call per request, no queue/worker.
// Identity comes from Supabase Auth /user; rights and writes live in SQL.
export function createHandler(env: Environment, fetcher: typeof fetch = fetch) {
  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    const legacy = request.method === "GET" && new URL(request.url).searchParams.has("id");
    if (request.method !== "POST" && !legacy) {
      return jsonResponse(iterationFailure(new IterationError("invalid_request")).body, 405);
    }
    try {
      const authorization = request.headers.get("Authorization");
      if (!authorization || !/^Bearer \S+$/u.test(authorization) || authorization.length > 8192) {
        throw new IterationError("unauthorized");
      }
      let body: unknown;
      if (legacy) {
        // Transitional: dashboards deployed before the POST client send
        // GET ?id=&instructions= with the user's bearer token. Same auth and SQL rules.
        const params = new URL(request.url).searchParams;
        body = {
          previewId: params.get("id"), requestId: crypto.randomUUID(),
          ...(params.has("instructions") ? { instructions: params.get("instructions") } : {}),
        };
      } else {
        if (Number(request.headers.get("Content-Length")) > 4096) throw new IterationError("invalid_request");
        const raw = await request.text();
        if (raw.length > 4096) throw new IterationError("invalid_request");
        try { body = JSON.parse(raw); } catch { throw new IterationError("invalid_request"); }
      }
      const input = parseIterationRequest(body);

      const url = required(env, "SUPABASE_URL").replace(/\/$/u, "");
      const serviceKey = required(env, "SUPABASE_SERVICE_ROLE_KEY");
      const apiKey = required(env, "OPENAI_API_KEY");
      let model: string;
      try { model = modelFromEnv(env); } catch { throw new IterationError("not_ready"); }

      let actor: string;
      try { actor = await createStore(env, fetcher).getUser(authorization); } catch (error) {
        const code = (error as { code?: unknown }).code;
        throw new IterationError(code === "unauthorized" ? "unauthorized" : "not_ready");
      }

      const rpc = async <T>(name: "begin" | "finish", payload: Record<string, unknown>): Promise<T> => {
        let response: Response;
        try {
          response = await fetcher(`${url}/rest/v1/rpc/publication_iteration_${name}`, {
            method: "POST",
            headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(10_000),
          });
        } catch { throw new IterationError("internal_error"); }
        let data: unknown;
        try { data = await response.json(); } catch { throw new IterationError("internal_error"); }
        if (!response.ok) throw new IterationError(failureCode((data as { message?: unknown } | null)?.message));
        return data as T;
      };

      const begun = await rpc<BeginResult>("begin", {
        p_actor: actor, p_preview: input.previewId, p_request: input.requestId,
      });
      // Replayed request: return the stored outcome, never call the provider again.
      if (begun.status === "succeeded") {
        return jsonResponse({ status: "succeeded", versionId: begun.versionId, versions: begun.versions });
      }
      if (begun.status === "failed") throw new IterationError(failureCode(begun.errorCode));
      if (begun.status !== "started" || typeof begun.sourceText !== "string") throw new IterationError("internal_error");

      const { body: sourceBody, trailing } = splitTrailingBlock(begun.sourceText);
      let outcome: { description: string; model: string; diagnostic: ProviderDiagnostic } | {
        error: IterationFailureCode; diagnostic: ProviderDiagnostic;
      };
      try {
        const generated = await iterateText(sourceBody, input.instructions, model, apiKey, fetcher);
        outcome = {
          description: composeIteration(generated.text, trailing),
          model: generated.model, diagnostic: generated.diagnostic,
        };
      } catch (error) {
        const code = iterationFailure(error).body.code;
        outcome = {
          error: code,
          diagnostic: error instanceof IterationError && error.diagnostic
            ? error.diagnostic : { reason: "internal_error" },
        };
      }

      const finished = await rpc<FinishResult>("finish", {
        p_actor: actor, p_request: input.requestId,
        p_description: "description" in outcome ? outcome.description : null,
        p_model: "model" in outcome ? outcome.model : null,
        p_error: "error" in outcome ? outcome.error : null,
        p_diagnostics: sanitizeDiagnostic(outcome.diagnostic),
      });
      if (finished.status !== "succeeded") throw new IterationError(failureCode(finished.errorCode));
      return jsonResponse({ status: "succeeded", versionId: finished.versionId, versions: finished.versions });
    } catch (error) {
      const failure = iterationFailure(error);
      return jsonResponse(failure.body, failure.status);
    }
  };
}

if (typeof Deno !== "undefined") Deno.serve(createHandler((name) => Deno.env.get(name)));
