// Entry function of the new publishing pipeline (S23). POST only, the user's Supabase session
// (Authorization: Bearer <JWT>) resolved through Supabase Auth /user, then service-role RPCs that decide
// access and write. Actions: schedule, publishNow, retry, reset. Answers {targets} or
// {code, message, retryable} (closed set, Spanish messages, never provider or database text).
//
// publishNow and retry wake process-publication-targets afterwards (fire and forget): the cron job is the
// recovery path, so a failed wake never fails the request. Deployed with verify_jwt = false because the
// handler validates identity itself; the new client calls it only behind VITE_SOCIAL_PUBLISHING_EDGE.
import {
  corsHeaders, createEntryStore, type EntryRequest, EntryError, entryFailure, type Environment, jsonResponse,
  logEntryError, parseEntryRequest, readBoundedBody, validateTargets, wakePublicationWorker,
} from "../_shared/social-publication-entry.ts";
import type { Fetcher } from "../_shared/social-http.ts";

type WaitUntil = (task: Promise<void>) => void;

export function createHandler(env: Environment, fetcher: Fetcher = fetch, waitUntil?: WaitUntil) {
  // The wake never rejects (it swallows everything); registering it can still fail.
  const wake = () => {
    const task = wakePublicationWorker(env, fetcher);
    if (!waitUntil) return;
    try { waitUntil(task); } catch {
      // The persisted target and cron stay in charge.
    }
  };

  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (request.method !== "POST") return jsonResponse(entryFailure(new EntryError("invalid_request")).body, 405);
    try {
      const authorization = request.headers.get("Authorization");
      if (!authorization || !/^Bearer \S+$/u.test(authorization) || authorization.length > 8192) {
        throw new EntryError("unauthorized");
      }
      let body: unknown;
      try { body = JSON.parse(await readBoundedBody(request)); } catch (error) {
        throw error instanceof EntryError ? error : new EntryError("invalid_request");
      }
      const input: EntryRequest = parseEntryRequest(body);

      const store = createEntryStore(env, fetcher);
      const actor = await store.getUser(authorization);

      if (input.action === "retry") {
        const answer = await store.retry(actor, input.targetId, input.acknowledge);
        wake();
        return jsonResponse({ targets: answer.targets });
      }
      if (input.action === "reset") {
        const answer = await store.reset(actor, input.previewId, input.acknowledge);
        return jsonResponse({ targets: answer.targets });
      }

      // schedule / publishNow: the accounts must be ones the publication OWNER connected. The owner is
      // resolved only after the actor proved access, so a stranger learns nothing about connections.
      const owner = await store.owner(actor, input.previewId);
      const networks = [...new Set(input.targets.map((target) => target.network))];
      const connections = { instagram: null, linkedin: null } as Parameters<typeof validateTargets>[0];
      for (const network of networks) connections[network] = await store.connection(owner, network);
      const targets = validateTargets(connections, input.targets);

      const runAt = input.action === "schedule" ? input.runAt : new Date().toISOString();
      const answer = await store.schedule(actor, {
        previewId: input.previewId, requestId: input.requestId, runAt, acknowledge: input.acknowledge,
      }, targets);
      if (input.action === "publishNow") wake();
      return jsonResponse({ targets: answer.targets });
    } catch (error) {
      logEntryError(error);
      const failure = entryFailure(error);
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
