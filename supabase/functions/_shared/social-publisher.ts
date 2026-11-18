// Contract between the publication worker (process-publication-targets) and the
// per-network publishers (social-publish-instagram.ts, social-publish-linkedin.ts).
// Pure types plus small helpers: no Deno APIs, so it can be type-checked and run in Node.

export type PublishNetwork = "instagram" | "linkedin";
export type PublishAccountKind = "instagram_business" | "linkedin_person" | "linkedin_organization";
export type PublishErrorKind = "transient" | "action_required" | "permanent";

/** One leased target, as returned by public.publication_targets_claim. */
export interface PublishTarget {
  targetId: string;
  leaseToken: string;
  previewId: number;
  ownerId: string;
  network: PublishNetwork;
  format: "image";
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

/** Content at publish time, from public.publication_target_payload. */
export interface PublishPayload {
  /** Raw publication text (main version, else description_rich). Publishers prepare it per network. */
  text: string;
  title: string | null;
  weblink: string | null;
  images: PublishImage[];
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
      /** Provider hint for transient errors (rate limit, still processing). */
      retryAfterSeconds?: number;
      /** At most 2 KB, no tokens, no publication text. */
      diagnostics: Record<string, unknown>;
      /**
       * True only when the provider answered the irreversible call with a definitive
       * rejection (for example 429 or 4xx), so nothing was published and an automatic
       * retry is safe. Never set it for timeouts, network errors or 5xx.
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
