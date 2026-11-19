import { supabase } from "@/helpers/supabase";
import type {
  InstagramPageInfo,
  LinkedInPageInfo,
  PublicationFormat,
  PublicationTarget,
  PublicationTargetAccountKind,
  PublicationTargetErrorKind,
  PublicationTargetStatus,
  SocialNetworksCheck,
} from "@/types";
import { SOCIAL_VIDEO_ENABLED, type NetworkFormats } from "../helpers/socialVideo";

// Client of the Edge Function publish-publication and of the publication_targets reads (S23).
// Only used with VITE_SOCIAL_PUBLISHING_EDGE on. Nothing here carries or reads tokens.

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const digits = /^\d{1,19}$/;
const externalId = /^[A-Za-z0-9:_-]{1,100}$/;
const CLIENT_TIMEOUT_MS = 30_000;
// PostgREST URLs stay small; one query covers a normal page of publications.
const QUERY_CHUNK = 150;
// Realtime `in` filters accept up to 100 values.
const REALTIME_FILTER_MAX = 100;

const errorCodes = new Set([
  "invalid_request",
  "forbidden",
  "conflict",
  "invalid_project",
  "run_at_out_of_range",
  "in_progress",
  "already_published",
  "not_retryable",
  "confirmation_required",
  "account_not_connected",
  "account_not_allowed",
  "internal_error",
  "unauthorized",
  // Video formats (422 from publish-publication); the server never answers them to a client that
  // sends no format, so they only appear with VITE_SOCIAL_VIDEO on.
  "video_required",
  "video_limits",
  // Historia (imagen): storyImageUrl is not among the selected photos (422, T7).
  "story_image_invalid",
  // Carrusel con vídeo: videoPosition is out of range or sent with another format (422, T6).
  "video_position_invalid",
]);

export type PublicationPublishingErrorCode =
  | "invalid_request"
  | "forbidden"
  | "conflict"
  | "invalid_project"
  | "run_at_out_of_range"
  | "in_progress"
  | "already_published"
  | "not_retryable"
  | "confirmation_required"
  | "account_not_connected"
  | "account_not_allowed"
  | "internal_error"
  | "unauthorized"
  | "video_required"
  | "video_limits"
  | "story_image_invalid"
  | "video_position_invalid"
  // Client-side only: the account selected in the form cannot be turned into a target.
  | "account_missing"
  // Client-side only: the outcome is unknown (network failure, timeout, gateway error).
  | "uncertain";

export type PublicationPublishingError = {
  code: PublicationPublishingErrorCode;
  retryable: boolean;
};

export type PublicationTargetRequest = {
  network: "instagram" | "linkedin";
  accountKind: PublicationTargetAccountKind;
  accountExternalId: string;
  accountName: string;
  /** Only with VITE_SOCIAL_VIDEO on; absent otherwise (the server then publishes `image`). */
  format?: PublicationFormat;
  /**
   * Only with VITE_SOCIAL_VIDEO on and only for the Instagram format `story_image`: the original
   * photo (image_data url) the story publishes. The server rejects it for any other format.
   */
  storyImageUrl?: string;
  /**
   * Only with VITE_SOCIAL_VIDEO on and only for the Instagram format `carousel_video`: 0-based
   * position of the video among the carousel items (0..number of selected photos). The server
   * rejects it for any other format.
   */
  videoPosition?: number;
};

const failure = (
  code: PublicationPublishingErrorCode,
  retryable: boolean,
): PublicationPublishingError => ({ code, retryable });

export const isPublicationPublishingError = (
  value: unknown,
): value is PublicationPublishingError =>
  !!value &&
  typeof value === "object" &&
  "code" in value &&
  "retryable" in value &&
  typeof value.code === "string" &&
  typeof value.retryable === "boolean" &&
  (errorCodes.has(value.code) ||
    value.code === "uncertain" ||
    value.code === "account_missing");

/** A fresh id per user action; the server uses it for idempotency. */
export const newPublishRequestId = () => crypto.randomUUID();

/**
 * Targets to publish, built from the pages the user selected. Never includes tokens.
 * Throws account_missing when a selected network has no usable account.
 */
export function buildPublicationTargets(
  networks: SocialNetworksCheck,
  formats?: NetworkFormats,
  storyImageUrl?: string | null,
  videoPosition?: number | null,
): PublicationTargetRequest[] {
  const targets: PublicationTargetRequest[] = [];
  const { instagram, linkedln } = networks;
  if (instagram) {
    const page = instagram as InstagramPageInfo | true;
    if (page === true || !externalId.test(String(page.id ?? ""))) {
      throw failure("account_missing", false);
    }
    targets.push({
      network: "instagram",
      accountKind: "instagram_business",
      accountExternalId: String(page.id),
      accountName: String(page.name ?? "").slice(0, 200),
      ...(formats?.instagram ? { format: formats.instagram } : {}),
      ...(formats?.instagram === "story_image" && storyImageUrl ? { storyImageUrl } : {}),
      ...(formats?.instagram === "carousel_video" && typeof videoPosition === "number"
        ? { videoPosition }
        : {}),
    });
  }
  if (linkedln) {
    const page = linkedln as LinkedInPageInfo | true;
    if (page === true || !externalId.test(String(page.id ?? ""))) {
      throw failure("account_missing", false);
    }
    targets.push({
      network: "linkedin",
      accountKind:
        String(page.type).toUpperCase() === "ORGANIZATION"
          ? "linkedin_organization"
          : "linkedin_person",
      accountExternalId: String(page.id),
      accountName: String(page.name ?? "").slice(0, 200),
      ...(formats?.linkedin ? { format: formats.linkedin } : {}),
    });
  }
  return targets;
}

const statuses = new Set<PublicationTargetStatus>([
  "pending",
  "running",
  "published",
  "failed",
  "needs_action",
  "cancelled",
]);
const kinds = new Set<PublicationTargetErrorKind>([
  "transient",
  "action_required",
  "permanent",
]);
const accountKinds = new Set<PublicationTargetAccountKind>([
  "instagram_business",
  "linkedin_person",
  "linkedin_organization",
]);

const targetFormats = new Set<PublicationFormat>([
  "image",
  "reel",
  "story_image",
  "story_video",
  "video",
  "carousel_video",
]);

const text = (value: unknown): string | null =>
  typeof value === "string" && value ? value : null;
const count = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/** Validates one target (function answer in camelCase, table row in snake_case). */
function parseTarget(
  raw: unknown,
  previewId: string | null,
): PublicationTarget | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const pick = (camel: string, snake: string) => row[camel] ?? row[snake];
  const id = text(row.id);
  const network = row.network;
  const status = pick("status", "status");
  const runAt = text(pick("runAt", "run_at"));
  const kind = pick("accountKind", "account_kind");
  const preview = previewId ?? (row.preview_id != null ? String(row.preview_id) : null);
  if (
    !id ||
    !preview ||
    (network !== "instagram" && network !== "linkedin") ||
    typeof status !== "string" ||
    !statuses.has(status as PublicationTargetStatus) ||
    !runAt ||
    typeof kind !== "string" ||
    !accountKinds.has(kind as PublicationTargetAccountKind)
  ) {
    return null;
  }
  const errorKind = pick("errorKind", "error_kind");
  const format = row.format;
  // Absent when the column is not read; null/string when it is (function answer: camelCase).
  const storyImage = "storyImageUrl" in row ? row.storyImageUrl : row.story_image_url;
  // Same for the video position of a carousel_video target (T6; 0-based, null means last).
  const videoPosition = "videoPosition" in row ? row.videoPosition : row.video_position;
  return {
    id,
    previewId: preview,
    network,
    status: status as PublicationTargetStatus,
    runAt,
    attempts: count(pick("attempts", "attempts"), 0),
    maxAttempts: count(pick("maxAttempts", "max_attempts"), 5),
    errorCode: text(pick("errorCode", "error_code")),
    errorKind:
      typeof errorKind === "string" && kinds.has(errorKind as PublicationTargetErrorKind)
        ? (errorKind as PublicationTargetErrorKind)
        : null,
    accountKind: kind as PublicationTargetAccountKind,
    accountName: text(pick("accountName", "account_name")),
    externalPostId: text(pick("externalPostId", "external_post_id")),
    permalink: text(pick("permalink", "permalink")),
    publishedAt: text(pick("publishedAt", "published_at")),
    ...(typeof format === "string" && targetFormats.has(format as PublicationFormat)
      ? { format: format as PublicationFormat }
      : {}),
    ...(typeof storyImage === "string" || storyImage === null
      ? { storyImageUrl: storyImage }
      : {}),
    ...(videoPosition === null ||
    (typeof videoPosition === "number" && Number.isInteger(videoPosition) && videoPosition >= 0)
      ? { videoPosition }
      : {}),
  };
}

function parseTargets(data: unknown, previewId: string): PublicationTarget[] {
  const invalid = () => failure("internal_error", true);
  if (!data || typeof data !== "object" || Array.isArray(data)) throw invalid();
  const targets = (data as Record<string, unknown>).targets;
  if (!Array.isArray(targets)) throw invalid();
  return targets.map((value) => {
    const target = parseTarget(value, previewId);
    if (!target) throw invalid();
    return target;
  });
}

type PublishBody =
  | {
      action: "schedule";
      previewId: string;
      requestId: string;
      runAt: string;
      targets: PublicationTargetRequest[];
      acknowledgeUnknownOutcome?: boolean;
    }
  | {
      action: "publishNow";
      previewId: string;
      requestId: string;
      targets: PublicationTargetRequest[];
      acknowledgeUnknownOutcome?: boolean;
    }
  | { action: "retry"; targetId: string; acknowledgeUnknownOutcome?: boolean }
  | { action: "reset"; previewId: string; acknowledgeUnknownOutcome?: boolean };

async function invokePublish(body: Record<string, unknown>): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
  try {
    const { data, error } = await supabase.functions.invoke("publish-publication", {
      body,
      signal: controller.signal,
    });
    if (error) {
      const context: unknown = error.context;
      if (context instanceof Response) {
        let payload: unknown = null;
        try {
          payload = await context.clone().json();
        } catch {
          /* The gateway may answer HTML. */
        }
        if (payload && typeof payload === "object" && !Array.isArray(payload)) {
          const parsed = payload as Record<string, unknown>;
          if (typeof parsed.code === "string" && errorCodes.has(parsed.code)) {
            // Only allow-listed codes are translated; never show arbitrary server text.
            throw failure(
              parsed.code as PublicationPublishingErrorCode,
              parsed.retryable === true,
            );
          }
        }
        if (context.status === 401) throw failure("unauthorized", false);
      }
      throw failure("uncertain", true);
    }
    return data;
  } catch (error) {
    if (isPublicationPublishingError(error)) throw error;
    throw failure("uncertain", true);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Sends one action. `previewId` is only used to tag the returned targets (the retry action addresses
 * the target itself and carries no publication id).
 */
async function run(body: PublishBody, previewIdOf: string | number): Promise<PublicationTarget[]> {
  // Supabase returns bigint ids as JS numbers at runtime despite the string type.
  const previewId = String(previewIdOf);
  if (!digits.test(previewId)) throw failure("invalid_request", false);
  if ("requestId" in body && !uuid.test(body.requestId)) {
    throw failure("invalid_request", false);
  }
  if (body.action === "retry" && !uuid.test(body.targetId)) {
    throw failure("invalid_request", false);
  }
  const payload: Record<string, unknown> = { ...body };
  if ("previewId" in body) payload.previewId = previewId;
  // Only a true acknowledgement is sent.
  if (body.acknowledgeUnknownOutcome) payload.acknowledgeUnknownOutcome = true;
  else delete payload.acknowledgeUnknownOutcome;
  return parseTargets(await invokePublish(payload), previewId);
}

export type ScheduleParams = {
  previewId: string | number;
  requestId: string;
  /** Real instant (ISO), from madridWallClockToIso. */
  runAt: string;
  targets: PublicationTargetRequest[];
  acknowledgeUnknownOutcome?: boolean;
};

export type PublishNowParams = Omit<ScheduleParams, "runAt">;

export const schedulePublication = (params: ScheduleParams) =>
  run(
    { ...params, action: "schedule", previewId: String(params.previewId) },
    params.previewId,
  );

export const publishPublicationNow = (params: PublishNowParams) =>
  run(
    { ...params, action: "publishNow", previewId: String(params.previewId) },
    params.previewId,
  );

export const retryPublicationTarget = (params: {
  previewId: string | number;
  targetId: string;
  acknowledgeUnknownOutcome?: boolean;
}) =>
  run(
    {
      action: "retry",
      targetId: params.targetId,
      acknowledgeUnknownOutcome: params.acknowledgeUnknownOutcome,
    },
    params.previewId,
  );

export const resetPublicationTargets = (params: {
  previewId: string | number;
  acknowledgeUnknownOutcome?: boolean;
}) =>
  run(
    {
      action: "reset",
      previewId: String(params.previewId),
      acknowledgeUnknownOutcome: params.acknowledgeUnknownOutcome,
    },
    params.previewId,
  );

// --- Reads and realtime over publication_targets (RLS: owner, editors and admins) ---

const TARGET_COLUMNS =
  "id, preview_id, network, status, run_at, attempts, max_attempts, error_code, error_kind, account_kind, account_name, external_post_id, permalink, published_at";

// `format` is not in the browser column grants of publication_targets (docs/social-publishing.md,
// "Browser read access"). With VITE_SOCIAL_VIDEO on it is requested too; when the database refuses
// the column the read falls back to TARGET_COLUMNS for the rest of the session. With the switch off
// the query is exactly TARGET_COLUMNS.
let formatReadable = SOCIAL_VIDEO_ENABLED;
// Same for `story_image_url` (T7, only read with the switch on). It is dropped first, so a database
// that grants `format` but not yet `story_image_url` keeps the format.
let storyImageReadable = SOCIAL_VIDEO_ENABLED;
// And for `video_position` (T6, only read with the switch on). It is dropped before story_image_url
// and format: the older columns stay when a database does not grant the newest one yet.
let videoPositionReadable = SOCIAL_VIDEO_ENABLED;

const targetColumns = () =>
  TARGET_COLUMNS +
  (formatReadable ? ", format" : "") +
  (storyImageReadable ? ", story_image_url" : "") +
  (videoPositionReadable ? ", video_position" : "");

/** Current targets (archived_at is null) of the given publications. One query for a normal page. */
export async function listPublicationTargets(
  previewIds: string[],
): Promise<PublicationTarget[]> {
  const ids = [...new Set(previewIds.map(String).filter((id) => digits.test(id)))];
  const result: PublicationTarget[] = [];
  for (let start = 0; start < ids.length; start += QUERY_CHUNK) {
    const chunk = ids.slice(start, start + QUERY_CHUNK);
    const read = (columns: string) =>
      supabase
        .from("publication_targets")
        .select(columns)
        .in("preview_id", chunk)
        .is("archived_at", null);
    let { data, error } = await read(targetColumns());
    while (error && (videoPositionReadable || storyImageReadable || formatReadable)) {
      if (videoPositionReadable) videoPositionReadable = false;
      else if (storyImageReadable) storyImageReadable = false;
      else formatReadable = false;
      ({ data, error } = await read(targetColumns()));
    }
    if (error) throw new Error("publication_targets_read_failed");
    for (const row of (data ?? []) as unknown[]) {
      const target = parseTarget(row, null);
      if (target) result.push(target);
    }
  }
  return result;
}

export type PublicationTargetEvent =
  | { type: "upsert"; target: PublicationTarget }
  | { type: "remove"; id: string };

/**
 * Subscribes to changes of the targets of the given publications (filtered on the server when the
 * list is short, else filtered here). Returns the cleanup function.
 */
export function subscribeToPublicationTargets(
  previewIds: string[],
  onEvent: (event: PublicationTargetEvent) => void,
): () => void {
  const ids = [...new Set(previewIds.map(String).filter((id) => digits.test(id)))];
  if (ids.length === 0) return () => undefined;
  const wanted = new Set(ids);
  const filter =
    ids.length <= REALTIME_FILTER_MAX ? `preview_id=in.(${ids.join(",")})` : undefined;
  const channel = supabase
    .channel(`publication-targets-${crypto.randomUUID()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "publication_targets", ...(filter ? { filter } : {}) },
      (payload) => {
        if (payload.eventType === "DELETE") {
          const id = (payload.old as { id?: unknown } | null)?.id;
          if (typeof id === "string") onEvent({ type: "remove", id });
          return;
        }
        const row = payload.new as Record<string, unknown>;
        const id = typeof row.id === "string" ? row.id : null;
        // Archived rows (history) leave the current view.
        if (row.archived_at) {
          if (id) onEvent({ type: "remove", id });
          return;
        }
        const target = parseTarget(row, null);
        if (target && wanted.has(target.previewId)) onEvent({ type: "upsert", target });
      },
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
