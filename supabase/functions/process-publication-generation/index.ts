import { GenerationError, jsonResponse, safeFailure, type FailureCode } from "../_shared/publication-generation-errors.ts";
import { composeDescription, generateText, supportedPromptVersion, validateSnapshot } from "../_shared/publication-generation.ts";
import { createStore, type Environment, workerAuthorized, workerConfig } from "../_shared/publication-generation-store.ts";

// At most two sequential claims: <=90s provider time, with separate 120s leases.
// No waitUntil dependency; cron invokes this endpoint even with no browser open.
export function createHandler(env: Environment, fetcher: typeof fetch = fetch) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return jsonResponse(safeFailure(new GenerationError("invalid_request")).body, 405);
    try {
      const workerSecret = env("PUBLICATION_GENERATION_WORKER_SECRET");
      if (!workerSecret || !await workerAuthorized(request.headers.get("X-Publication-Worker-Secret"), workerSecret)) {
        throw new GenerationError("unauthorized");
      }
      const config = workerConfig(env);
      const store = createStore(env, fetcher);
      await store.heartbeat(config.model);
      let claimed = 0;
      let settled = 0;
      let fenced = 0;
      for (let i = 0; i < 2; i++) {
        const claim = await store.claim();
        if (!claim) break;
        claimed++;
        let result: { description: string; model: string | null } | { error: FailureCode };
        try {
          validateSnapshot(claim.snapshot);
          if (!supportedPromptVersion(claim.promptVersion)) throw new GenerationError("internal_error");
          const generated = claim.snapshot.requiredAI
            ? await generateText(claim.snapshot, claim.slot, claim.model, config.apiKey, fetcher, claim.promptVersion)
            : undefined;
          result = { description: composeDescription(claim.snapshot, generated), model: generated?.model ?? null };
        } catch (error) {
          const code = safeFailure(error).body.code;
          result = { error: ["provider_unavailable", "provider_refusal", "invalid_response", "invalid_project"].includes(code)
            ? code : "internal_error" };
        }
        // A failed/ambiguous finish is NOT followed by a compensating write. The
        // transaction either committed, or the lease will recover on a later tick.
        if (await store.finish(claim, result)) settled++;
        else fenced++;
      }
      return jsonResponse({ claimed, settled, fenced });
    } catch (error) {
      const failure = safeFailure(error);
      return jsonResponse(failure.body, failure.status);
    }
  };
}

if (typeof Deno !== "undefined") Deno.serve(createHandler((name) => Deno.env.get(name)));
