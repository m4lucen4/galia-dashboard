import { supabase } from "@/helpers/supabase";
import type { PublishVersions } from "@/types";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const digits = /^\d{1,19}$/;
// The server provider timeout is 50s; leave room for the database round trips.
const CLIENT_TIMEOUT_MS = 75_000;
export const MAX_ITERATION_INSTRUCTIONS = 200;

// Server contract codes (see odd/tasks/publication-iteration.md, L6).
const errorCodes = new Set([
  "invalid_request", "unauthorized", "forbidden", "conflict", "in_progress",
  "version_limit", "invalid_project", "project_changed", "not_ready",
  "provider_unavailable", "provider_refusal", "invalid_response", "lease_expired",
  "internal_error",
]);

export type PublicationIterationErrorCode =
  | "invalid_request" | "unauthorized" | "forbidden" | "conflict" | "in_progress"
  | "version_limit" | "invalid_project" | "project_changed" | "not_ready"
  | "provider_unavailable" | "provider_refusal" | "invalid_response" | "lease_expired"
  | "internal_error"
  // Client-side only: the outcome is unknown (network failure, timeout, gateway error).
  | "uncertain";

export type PublicationIterationError = {
  code: PublicationIterationErrorCode;
  retryable: boolean;
};

export type PublicationIterationRequest = {
  previewId: string;
  instructions?: string;
  requestId: string;
};

export type PublicationIterationResult = {
  versionId: string;
  versions: PublishVersions[];
};

const failure = (
  code: PublicationIterationErrorCode, retryable: boolean,
): PublicationIterationError => ({ code, retryable });

export const isPublicationIterationError = (
  value: unknown,
): value is PublicationIterationError =>
  !!value && typeof value === "object" && "code" in value && "retryable" in value
  && typeof value.code === "string" && typeof value.retryable === "boolean"
  && (errorCodes.has(value.code) || value.code === "uncertain");

export const newIterationRequestId = () => crypto.randomUUID();

function parseSuccess(data: unknown): PublicationIterationResult {
  const invalid = () => failure("invalid_response", true);
  if (!data || typeof data !== "object" || Array.isArray(data)) throw invalid();
  const raw = data as Record<string, unknown>;
  if (raw.status !== "succeeded" || typeof raw.versionId !== "string" || !raw.versionId
    || !Array.isArray(raw.versions) || raw.versions.length === 0) throw invalid();
  const versions = raw.versions.map((value): PublishVersions => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid();
    const version = value as Record<string, unknown>;
    if (typeof version.id !== "string" || typeof version.description !== "string"
      || typeof version.main !== "boolean") throw invalid();
    return { id: version.id, description: version.description, main: version.main };
  });
  if (!versions.some((version) => version.id === raw.versionId)) throw invalid();
  return { versionId: raw.versionId, versions };
}

export async function iteratePublication(
  { previewId, instructions, requestId }: PublicationIterationRequest,
): Promise<PublicationIterationResult> {
  const trimmed = instructions?.trim() ?? "";
  if (!digits.test(previewId) || !uuid.test(requestId)
    || trimmed.length > MAX_ITERATION_INSTRUCTIONS) {
    throw failure("invalid_request", false);
  }
  const body = { previewId, requestId, ...(trimmed ? { instructions: trimmed } : {}) };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
  try {
    const { data, error } = await supabase.functions.invoke("iterate-publication", {
      body, signal: controller.signal,
    });
    if (error) {
      const context: unknown = error.context;
      if (context instanceof Response) {
        let payload: unknown = null;
        try { payload = await context.clone().json(); } catch { /* Gateway may return HTML. */ }
        if (payload && typeof payload === "object" && !Array.isArray(payload)) {
          const parsed = payload as Record<string, unknown>;
          if (typeof parsed.code === "string" && errorCodes.has(parsed.code)
            && typeof parsed.message === "string" && typeof parsed.retryable === "boolean") {
            // Translate allowlisted codes; never show arbitrary server/provider text.
            throw failure(parsed.code as PublicationIterationErrorCode, parsed.retryable);
          }
        }
        if (context.status === 401) throw failure("unauthorized", false);
      }
      throw failure("uncertain", true);
    }
    return parseSuccess(data);
  } catch (error) {
    if (isPublicationIterationError(error)) throw error;
    throw failure("uncertain", true);
  } finally { clearTimeout(timeout); }
}
