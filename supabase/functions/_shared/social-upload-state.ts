// Resumable upload progress of a publication target (T3, S8): read / write / delete of
// public.publication_target_uploads (target_id uuid pk, state jsonb, updated_at timestamptz).
//
// The table is service_role only (RLS on, no policies, no grants to anon/authenticated), so this
// module talks to PostgREST with the service key, the same way social-publication-store.ts does.
// It holds what does not fit in publication_targets.step_state (4 KB): the LinkedIn upload token,
// the upload instructions and the ETag of every uploaded part. The state contains signed upload
// URLs: never log it.
//
// Pure TypeScript: only fetch, no Deno APIs (type-checks and runs in Node).

export type UploadState = Record<string, unknown>;

/** What a publisher needs from the store (also the shape the worker puts in PublishContext.uploads). */
export interface UploadStateStore {
  /** The saved state, or null when the target has none. Throws UploadStateError on failure. */
  load(targetId: string): Promise<UploadState | null>;
  /** Inserts or replaces the state. Throws UploadStateError on failure. */
  save(targetId: string, state: UploadState): Promise<void>;
  /** Deletes the state (no-op when absent). Throws UploadStateError on failure. */
  remove(targetId: string): Promise<void>;
}

export interface UploadStateOptions {
  /** SUPABASE_URL */
  supabaseUrl: string;
  /** SUPABASE_SERVICE_ROLE_KEY */
  serviceRoleKey: string;
}

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

/** Only the class is meaningful: messages never carry database text or the state. */
export class UploadStateError extends Error {
  readonly operation: "load" | "save" | "remove";

  constructor(operation: "load" | "save" | "remove") {
    super(`upload_state_${operation}_failed`);
    this.name = "UploadStateError";
    this.operation = operation;
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const TABLE = "publication_target_uploads";
const TIMEOUT_MS = 10_000;
// 130 parts (500 MB) of ~300 bytes of instructions plus ETags is well below this.
const MAX_STATE_CHARS = 256 * 1024;

export function createUploadStateStore(
  options: UploadStateOptions,
  fetcher: Fetcher = fetch,
): UploadStateStore {
  const base = options.supabaseUrl.replace(/\/$/u, "");
  if (!base || !options.serviceRoleKey.trim()) throw new UploadStateError("load");

  async function call(
    operation: "load" | "save" | "remove",
    path: string,
    init: { method: string; headers?: Record<string, string>; body?: string },
  ): Promise<Response> {
    let response: Response;
    try {
      response = await fetcher(`${base}/rest/v1/${path}`, {
        method: init.method,
        headers: {
          apikey: options.serviceRoleKey,
          Authorization: `Bearer ${options.serviceRoleKey}`,
          ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
          ...init.headers,
        },
        body: init.body,
        redirect: "error",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new UploadStateError(operation);
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined); // the body may carry database text: discarded
      throw new UploadStateError(operation);
    }
    return response;
  }

  function id(operation: "load" | "save" | "remove", targetId: string): string {
    if (!UUID.test(targetId)) throw new UploadStateError(operation);
    return targetId;
  }

  return {
    async load(targetId) {
      const response = await call(
        "load",
        `${TABLE}?target_id=eq.${id("load", targetId)}&select=state&limit=1`,
        { method: "GET", headers: { Accept: "application/json" } },
      );
      let rows: unknown;
      try {
        rows = await response.json();
      } catch {
        throw new UploadStateError("load");
      }
      if (!Array.isArray(rows)) throw new UploadStateError("load");
      if (rows.length === 0) return null;
      const state = (rows[0] as { state?: unknown } | null)?.state;
      return state && typeof state === "object" && !Array.isArray(state) ? state as UploadState : null;
    },

    async save(targetId, state) {
      const body = JSON.stringify({ target_id: id("save", targetId), state, updated_at: new Date().toISOString() });
      if (body.length > MAX_STATE_CHARS) throw new UploadStateError("save");
      const response = await call("save", `${TABLE}?on_conflict=target_id`, {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body,
      });
      await response.body?.cancel().catch(() => undefined);
    },

    async remove(targetId) {
      const response = await call("remove", `${TABLE}?target_id=eq.${id("remove", targetId)}`, {
        method: "DELETE",
        headers: { Prefer: "return=minimal" },
      });
      await response.body?.cancel().catch(() => undefined);
    },
  };
}
