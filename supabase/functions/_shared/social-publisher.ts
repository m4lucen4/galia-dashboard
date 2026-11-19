// Contract between the publication worker (process-publication-targets) and the
// per-network publishers (social-publish-instagram.ts, social-publish-linkedin.ts).
// Pure types plus small helpers: no Deno APIs, so it can be type-checked and run in Node.
import type { UploadStateStore } from "./social-upload-state.ts";

export type PublishNetwork = "instagram" | "linkedin";
export type PublishAccountKind = "instagram_business" | "linkedin_person" | "linkedin_organization";
export type PublishErrorKind = "transient" | "action_required" | "permanent";
/**
 * Instagram: image, reel, story_image, story_video, carousel_video. LinkedIn: image, video. `image` is the original
 * behaviour (one or many images). Video formats carry PublishPayload.video; carousel_video (Instagram only) carries
 * the photos AND the video in one carousel (PublishPayload.images + video + videoPosition).
 */
export type PublishFormat = "image" | "reel" | "story_image" | "story_video" | "video" | "carousel_video";

/** True for the formats that carry PublishPayload.video (reel, story_video, video, carousel_video). */
export function isVideoFormat(format: PublishFormat): boolean {
  return format === "reel" || format === "story_video" || format === "video" || format === "carousel_video";
}

/** One leased target, as returned by public.publication_targets_claim. */
export interface PublishTarget {
  targetId: string;
  leaseToken: string;
  previewId: number;
  ownerId: string;
  network: PublishNetwork;
  format: PublishFormat;
  accountKind: PublishAccountKind;
  accountExternalId: string;
  attempt: number;
  /** Last checkpointed step of a previous attempt, null on a fresh start. */
  step: string | null;
  /** Publisher progress saved by checkpoint (container ids, image URNs). Never secrets. */
  stepState: Record<string, unknown>;
}

/** One image to publish, in publication order. */
export interface PublishImage {
  /** URL the network must fetch: the per-network variant when one exists, else the original. */
  url: string;
  /** Original image_data URL (stable key, also used to match variants). */
  sourceUrl: string;
  /** True when url is a publication_media_variants copy for this network. */
  isVariant: boolean;
  width: number | null;
  height: number | null;
}

/**
 * The publication's video (public URLs of bucket project-videos, built by the store from SUPABASE_URL).
 * Only for the video formats; the poster is optional.
 */
export interface PublishVideo {
  url: string;
  posterUrl: string | null;
  bytes: number;
  durationMs: number;
  width: number;
  height: number;
  /** moov atom before mdat. */
  faststart: boolean;
}

/** Content at publish time, from public.publication_target_payload. */
export interface PublishPayload {
  /** Raw publication text (main version, else description_rich). Publishers prepare it per network. */
  text: string;
  title: string | null;
  weblink: string | null;
  images: PublishImage[];
  /**
   * For reel, story_video, video and carousel_video; null for the other formats, and for a video format whose video was
   * deleted after scheduling (the publisher then answers video_missing before any network call).
   * For story_image, images holds one ORIGINAL photo (never a feed-cropped variant): the chosen
   * story_image_url while it is still published, empty when it is not; legacy targets without a
   * choice get the first published photo.
   */
  video: PublishVideo | null;
  /**
   * carousel_video only: 0-based index of the video among the carousel items (the photos in `images` order,
   * the video inserted at this index), already resolved by the database (not set or beyond the photos = last =
   * images.length). null for every other format.
   */
  videoPosition: number | null;
}

/** Server-side credentials of the publication owner for this target's network. Never logged. */
export interface PublishCredentials {
  /** Instagram: page access token of accountExternalId. LinkedIn: member access token. */
  accessToken: string;
}

export interface PublishContext {
  target: PublishTarget;
  payload: PublishPayload;
  credentials: PublishCredentials;
  /**
   * Saves progress and extends the lease. Call with sideEffectPending = true immediately
   * before the irreversible call (Instagram media_publish, LinkedIn POST /rest/posts).
   * Throws when the lease was lost: the publisher must stop without calling the network again.
   */
  checkpoint(step: string, stepState: Record<string, unknown>, sideEffectPending: boolean): Promise<void>;
  /**
   * Resumable upload progress across runs (public.publication_target_uploads, service_role only), for
   * uploads that do not fit in step_state (LinkedIn video: upload token, instructions, ETags). Contains
   * signed URLs: never log it. Removed by the database when the target is published.
   */
  uploads: UploadStateStore;
  /** Network fetch with timeout and redirect: "error". */
  fetch(url: string, init?: RequestInit & { timeoutMs?: number }): Promise<Response>;
  /** Epoch milliseconds after which the publisher must stop and return a transient retry. */
  deadline: number;
  now(): number;
  sleep(ms: number): Promise<void>;
}

export type PublishResult =
  | { outcome: "published"; externalPostId: string; permalink: string | null }
  | {
      outcome: "failed";
      /** [a-z_]{1,60}, shown to the user through i18n (see docs/social-publishing.md). */
      errorCode: string;
      errorKind: PublishErrorKind;
      /**
       * Provider hint for transient errors (rate limit, still processing). For the non-image formats a
       * transient `processing` failure ("the network is still processing the media", retry 60) is not an
       * attempt and gives up after 60 minutes (media_processing_timeout); for `image` it counts as before.
       */
      retryAfterSeconds?: number;
      /** At most 2 KB, no tokens, no publication text. */
      diagnostics: Record<string, unknown>;
      /**
       * True only when the provider answered the irreversible call with one of an explicit
       * allow-list of definitive rejections (Graph codes 4, 17, 32, 613, 9, 190, 10, 200-299,
       * 100, 368 or HTTP 429; LinkedIn HTTP 400, 401, 403, 422, 429), so nothing was published
       * and an automatic retry is safe: the database then resets the step to 'processing'.
       * Never set it for Graph code 1/2, is_transient, 2207xxx subcodes, timeouts, network
       * errors, 5xx, a missing id/urn or a non-JSON answer: those are outcome_unknown.
       */
      notPublished?: boolean;
    };

export type Publisher = (ctx: PublishContext) => Promise<PublishResult>;

/** Thrown by checkpoint when the lease is no longer ours. */
export class LeaseLostError extends Error {
  constructor() {
    super("lease_lost");
    this.name = "LeaseLostError";
  }
}

export function failed(
  errorCode: string,
  errorKind: PublishErrorKind,
  diagnostics: Record<string, unknown> = {},
  retryAfterSeconds?: number,
): PublishResult {
  return { outcome: "failed", errorCode, errorKind, diagnostics, retryAfterSeconds };
}
