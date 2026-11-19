import type { PreviewProjectDataProps, PublicationTarget } from "@/types";

// View model of publication_targets (S1, S23): what each network shows and which actions apply.

export type TargetPhase =
  | "scheduled"
  | "publishing"
  | "published"
  | "retrying"
  | "needsAction"
  | "failed";

/** Phase shown to the user, or null for targets that are not shown (cancelled). */
export function targetPhase(
  target: PublicationTarget,
  now: number = Date.now(),
): TargetPhase | null {
  switch (target.status) {
    case "cancelled":
      return null;
    case "running":
      return "publishing";
    case "published":
      return "published";
    case "needs_action":
      return "needsAction";
    case "failed":
      return "failed";
    case "pending": {
      // A pending target with a past failure is waiting for its next automatic attempt.
      if (target.attempts > 0 && target.errorCode) return "retrying";
      const runAt = Date.parse(target.runAt);
      return Number.isFinite(runAt) && runAt <= now ? "publishing" : "scheduled";
    }
  }
}

/** Every error code documented in docs/social-publishing.md; anything else uses the generic text. */
export const KNOWN_TARGET_ERROR_CODES = new Set([
  "no_images",
  "too_many_images",
  "media_needs_crop",
  "media_format",
  "media_rejected",
  "caption_too_long",
  "commentary_too_long",
  "too_many_hashtags",
  "too_many_mentions",
  "rate_limited",
  "processing",
  "container_expired",
  "token_invalid",
  "permission_missing",
  "account_restricted",
  "provider_unavailable",
  "invalid_request",
  "not_connected",
  "connection_expired",
  "page_not_authorized",
  "outcome_unknown",
  "lease_expired",
  "internal_error",
  "provider_rejected",
  "provider_response_invalid",
  "api_version_unsupported",
  "invalid_account",
  "media_url_invalid",
  "media_too_large",
  "media_unreadable",
  // Video formats (docs/social-publishing.md): texts in socialVideoTexts.ts.
  "video_missing",
  "media_processing_timeout",
  "format_unsupported",
  "video_required",
  "video_limits",
  // Historia (imagen) (T7): the chosen photo is no longer a selected photo.
  "story_image_invalid",
  "story_image_missing",
  // Carrusel con vídeo (T6): the chosen video position is out of range.
  "video_position_invalid",
]);

/** Errors solved by reconnecting the network in Settings (the fix text links there). */
export const RECONNECT_TARGET_ERROR_CODES = new Set([
  "token_invalid",
  "permission_missing",
  "not_connected",
  "connection_expired",
  "page_not_authorized",
]);

/** i18n key segment of an error code (unknown or missing codes fall back to "unknown"). */
export const targetErrorKey = (code: string | null): string =>
  code && KNOWN_TARGET_ERROR_CODES.has(code) ? code : "unknown";

export const needsReconnect = (target: PublicationTarget): boolean =>
  !!target.errorCode && RECONNECT_TARGET_ERROR_CODES.has(target.errorCode);

export const isUnknownOutcome = (target: PublicationTarget): boolean =>
  target.errorCode === "outcome_unknown";

/** Targets the user can retry now (failed or waiting for the user). */
export const isRetryable = (target: PublicationTarget): boolean =>
  target.status === "failed" || target.status === "needs_action";

export const isRunning = (target: PublicationTarget): boolean =>
  target.status === "running";

const NETWORK_ORDER = { instagram: 0, linkedin: 1 } as const;

/** Current targets worth showing (not cancelled), Instagram first. */
export const visibleTargets = (targets?: PublicationTarget[]): PublicationTarget[] =>
  (targets ?? [])
    .filter((target) => target.status !== "cancelled")
    .sort((a, b) => NETWORK_ORDER[a.network] - NETWORK_ORDER[b.network]);

export type TargetsByPreview = Record<string, PublicationTarget[]>;

/** What a table read or a realtime row may not carry until the browser can read the column. */
type KnownTargetFields = Pick<PublicationTarget, "format" | "storyImageUrl" | "videoPosition">;

const knownFieldsOf = (target: PublicationTarget): KnownTargetFields => ({
  format: target.format,
  storyImageUrl: target.storyImageUrl,
  videoPosition: target.videoPosition,
});

/**
 * A table read or a realtime row may not carry `format`, `story_image_url` or `video_position` (the
 * browser cannot read a column until it is granted); the function answer does. Keep what is already
 * known for the same target.
 */
function keepKnown(
  target: PublicationTarget,
  known: ReadonlyMap<string, KnownTargetFields>,
): PublicationTarget {
  const before = known.get(target.id);
  if (!before) return target;
  const keepFormat = target.format === undefined && before.format !== undefined;
  const keepStoryImage = target.storyImageUrl === undefined && before.storyImageUrl !== undefined;
  const keepVideoPosition = target.videoPosition === undefined && before.videoPosition !== undefined;
  if (!keepFormat && !keepStoryImage && !keepVideoPosition) return target;
  return {
    ...target,
    ...(keepFormat ? { format: before.format } : {}),
    ...(keepStoryImage ? { storyImageUrl: before.storyImageUrl } : {}),
    ...(keepVideoPosition ? { videoPosition: before.videoPosition } : {}),
  };
}

/** Replaces the targets of the given publications with a fresh read (other publications untouched). */
export function replaceTargets(
  current: TargetsByPreview,
  previewIds: string[],
  fresh: PublicationTarget[],
): TargetsByPreview {
  const next: TargetsByPreview = { ...current };
  const known = new Map<string, KnownTargetFields>();
  for (const id of previewIds) {
    for (const target of current[id] ?? []) {
      known.set(target.id, knownFieldsOf(target));
    }
    delete next[id];
  }
  for (const target of fresh) {
    (next[target.previewId] ??= []).push(keepKnown(target, known));
  }
  return next;
}

/** Applies one realtime event. Returns the same object when nothing changed. */
export function applyTargetEvent(
  current: TargetsByPreview,
  event:
    | { type: "upsert"; target: PublicationTarget }
    | { type: "remove"; id: string },
): TargetsByPreview {
  if (event.type === "remove") {
    let changed = false;
    const next: TargetsByPreview = {};
    for (const [previewId, list] of Object.entries(current)) {
      const kept = list.filter((target) => target.id !== event.id);
      if (kept.length !== list.length) changed = true;
      if (kept.length > 0) next[previewId] = kept;
    }
    return changed ? next : current;
  }
  const { target } = event;
  const previous = current[target.previewId] ?? [];
  const known = new Map(
    previous.map((existing) => [existing.id, knownFieldsOf(existing)] as const),
  );
  const list = previous.filter((existing) => existing.id !== target.id);
  return { ...current, [target.previewId]: [...list, keepKnown(target, known)] };
}

/** Sets the whole current list of one publication (a function answer is authoritative). */
export const setPreviewTargets = (
  current: TargetsByPreview,
  previewId: string,
  targets: PublicationTarget[],
): TargetsByPreview => {
  const next = { ...current };
  if (targets.length > 0) next[previewId] = targets;
  else delete next[previewId];
  return next;
};

/** Publications that can have targets: anything past the draft state. */
export const mayHaveTargets = (project: PreviewProjectDataProps): boolean =>
  project.state !== "preview";
