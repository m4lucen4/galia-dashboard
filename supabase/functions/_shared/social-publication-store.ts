// Service-role wrappers for the publication worker (process-publication-targets): the claim /
// payload / checkpoint / finish RPCs of 20261118000100 and the resolution of the owner's
// credentials. Tokens never leave this module except inside PublishCredentials, and nothing here
// logs them.
import { SocialError } from "./social-errors.ts";
import { asNumber, asRecord, asString, type Fetcher, requiredEnv, socialFetch } from "./social-http.ts";
import { createSocialStore, type Environment, type StoredCredential } from "./social-store.ts";
import {
  failed, LeaseLostError, type PublishAccountKind, type PublishCredentials, type PublishFormat, type PublishImage,
  type PublishNetwork, type PublishPayload, type PublishResult, type PublishTarget, type PublishVideo,
} from "./social-publisher.ts";

export type { Environment };

/** A claimed target plus the lease end the database reported (epoch ms). */
export interface ClaimedTarget extends PublishTarget {
  leaseExpiresAt: number;
}

/** What publication_target_finish answers: the status the target ended in. */
export interface FinishOutcome {
  status: "published" | "pending" | "needs_action" | "failed";
  nextRunAt: string | null;
}

/** What publication_target_claim_notice returns: the owner to email about a terminal problem. */
export interface TargetNotice {
  email: string;
  firstName: string | null;
  language: string | null;
  network: PublishNetwork;
  status: "needs_action" | "failed";
  errorCode: string | null;
  previewId: number;
  title: string | null;
}

export type CredentialsResolution =
  | { ok: true; credentials: PublishCredentials }
  | { ok: false; result: PublishResult };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const NETWORKS: readonly PublishNetwork[] = ["instagram", "linkedin", "facebook"];
const FORMATS_BY_NETWORK: Record<PublishNetwork, readonly PublishFormat[]> = {
  instagram: ["image", "reel", "story_image", "story_video", "carousel_video"],
  linkedin: ["image", "video"],
  facebook: ["image", "video"],
};
const ACCOUNT_KINDS: readonly PublishAccountKind[] = [
  "instagram_business", "linkedin_person", "linkedin_organization", "facebook_page",
];
const FINISH_STATUSES = ["published", "pending", "needs_action", "failed"] as const;

function parseTarget(value: unknown): ClaimedTarget {
  const row = asRecord(value);
  const targetId = asString(row?.targetId);
  const leaseToken = asString(row?.leaseToken);
  const ownerId = asString(row?.ownerId);
  const network = asString(row?.network) as PublishNetwork | null;
  const format = asString(row?.format) as PublishFormat | null;
  const accountKind = asString(row?.accountKind) as PublishAccountKind | null;
  const accountExternalId = asString(row?.accountExternalId);
  const previewId = asNumber(row?.previewId);
  const attempt = asNumber(row?.attempt);
  const leaseExpiresAt = Date.parse(asString(row?.leaseExpiresAt) ?? "");
  if (
    !row || !targetId || !UUID.test(targetId) || !leaseToken || !UUID.test(leaseToken) ||
    !ownerId || !UUID.test(ownerId) || !network || !NETWORKS.includes(network) || !format || !FORMATS_BY_NETWORK[network].includes(format) ||
    !accountKind || !ACCOUNT_KINDS.includes(accountKind) || !accountExternalId ||
    previewId === null || attempt === null || Number.isNaN(leaseExpiresAt)
  ) throw new SocialError("internal_error");
  return {
    targetId, leaseToken, previewId, ownerId, network, format, accountKind, accountExternalId, attempt,
    step: asString(row.step), stepState: asRecord(row.stepState) ?? {}, leaseExpiresAt,
  };
}

function parseImage(value: unknown): PublishImage {
  const image = asRecord(value);
  const url = asString(image?.url);
  const sourceUrl = asString(image?.sourceUrl);
  if (!image || !url || !sourceUrl || typeof image.isVariant !== "boolean") throw new SocialError("internal_error");
  return { url, sourceUrl, isVariant: image.isVariant, width: asNumber(image.width), height: asNumber(image.height) };
}

// Public URL of an object of the public bucket project-videos, built from SUPABASE_URL (the database does not
// know the public host). Each path segment is encoded; the worker still validates the final URL.
function projectVideoUrl(base: string, path: string): string {
  return `${base}/storage/v1/object/public/project-videos/${path.split("/").map(encodeURIComponent).join("/")}`;
}

// The video of a video-format target: {storagePath, posterPath, bytes, durationMs, width, height, faststart}
// from publication_target_payload, or null (other formats, or the video was deleted after scheduling).
function parseVideo(value: unknown, base: string): PublishVideo | null {
  if (value === null || value === undefined) return null;
  const row = asRecord(value);
  const storagePath = asString(row?.storagePath);
  const bytes = asNumber(row?.bytes);
  const durationMs = asNumber(row?.durationMs);
  const width = asNumber(row?.width);
  const height = asNumber(row?.height);
  const posterPath = row?.posterPath === null || row?.posterPath === undefined ? null : asString(row.posterPath);
  if (
    !row || !storagePath || bytes === null || durationMs === null || width === null || height === null ||
    typeof row.faststart !== "boolean" || (row.posterPath != null && posterPath === null)
  ) throw new SocialError("internal_error");
  return {
    url: projectVideoUrl(base, storagePath),
    posterUrl: posterPath ? projectVideoUrl(base, posterPath) : null,
    bytes, durationMs, width, height, faststart: row.faststart,
  };
}

// carousel_video: the resolved 0-based position of the video among the items; null for the other formats.
function parseVideoPosition(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 19) throw new SocialError("internal_error");
  return value;
}

function parsePayload(value: unknown, base: string): PublishPayload {
  const row = asRecord(value);
  if (!row || !Array.isArray(row.images)) throw new SocialError("internal_error");
  return {
    text: typeof row.text === "string" ? row.text : "",
    title: asString(row.title),
    weblink: asString(row.weblink),
    images: row.images.map(parseImage),
    video: parseVideo(row.video, base),
    videoPosition: parseVideoPosition(row.videoPosition),
  };
}

function parseNotice(value: unknown): TargetNotice | null {
  if (value === null) return null;
  const row = asRecord(value);
  const email = asString(row?.email);
  const network = asString(row?.network) as PublishNetwork | null;
  const status = row?.status;
  const previewId = asNumber(row?.previewId);
  if (!row || !email || !network || !NETWORKS.includes(network) || (status !== "needs_action" && status !== "failed") ||
    previewId === null) throw new SocialError("internal_error");
  return {
    email, firstName: asString(row.firstName), language: asString(row.language), network, status,
    errorCode: asString(row.errorCode), previewId, title: asString(row.title),
  };
}

export function createPublicationStore(env: Environment, fetcher: Fetcher = fetch) {
  const url = requiredEnv(env, "SUPABASE_URL").replace(/\/$/u, "");
  const serviceKey = requiredEnv(env, "SUPABASE_SERVICE_ROLE_KEY");
  const social = createSocialStore(env, fetcher);

  // 'lease_lost' is the only database message the worker acts on; everything else is internal_error
  // and the body (which may carry database text) is discarded.
  async function rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
    let response: Response;
    try {
      response = await socialFetch(fetcher, `${url}/rest/v1/rpc/${name}`, {
        method: "POST",
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      throw new SocialError("internal_error");
    }
    let data: unknown;
    try { data = await response.json(); } catch { data = null; }
    if (!response.ok) {
      if (asRecord(data)?.message === "lease_lost") throw new LeaseLostError();
      throw new SocialError("internal_error");
    }
    return data as T;
  }

  return {
    /** Recovers expired leases, then leases up to `limit` due targets. */
    async claim(limit: number, leaseSeconds: number): Promise<ClaimedTarget[]> {
      const rows = await rpc<unknown>("publication_targets_claim", { p_limit: limit, p_lease_seconds: leaseSeconds });
      if (!Array.isArray(rows)) throw new SocialError("internal_error");
      return rows.map(parseTarget);
    },

    /** Throws LeaseLostError when the lease is no longer ours. */
    async payload(target: PublishTarget): Promise<PublishPayload> {
      return parsePayload(await rpc("publication_target_payload", {
        p_target: target.targetId, p_lease: target.leaseToken,
      }), url);
    },

    /** Saves progress, extends the lease and returns its new end (epoch ms). Throws LeaseLostError. */
    async checkpoint(
      target: PublishTarget, step: string, stepState: Record<string, unknown>, sideEffectPending: boolean,
      leaseSeconds: number,
    ): Promise<number> {
      const result = asRecord(await rpc("publication_target_checkpoint", {
        p_target: target.targetId, p_lease: target.leaseToken, p_step: step, p_step_state: stepState,
        p_side_effect_pending: sideEffectPending, p_lease_seconds: leaseSeconds,
      }));
      const expires = Date.parse(asString(result?.leaseExpiresAt) ?? "");
      if (Number.isNaN(expires)) throw new SocialError("internal_error");
      return expires;
    },

    /** Records the attempt result. Throws LeaseLostError. */
    async finish(
      target: PublishTarget,
      result: PublishResult,
      diagnostics: Record<string, unknown>,
    ): Promise<FinishOutcome> {
      const published = result.outcome === "published";
      const answer = asRecord(await rpc("publication_target_finish", {
        p_target: target.targetId, p_lease: target.leaseToken, p_outcome: result.outcome,
        p_external_post_id: published ? result.externalPostId : null,
        p_permalink: published ? result.permalink : null,
        p_error_code: published ? null : result.errorCode,
        p_error_kind: published ? null : result.errorKind,
        p_retry_after_seconds: published ? null : result.retryAfterSeconds ?? null,
        p_diagnostics: diagnostics,
        p_not_published: !published && result.notPublished === true,
      }));
      const status = answer?.status;
      if (!FINISH_STATUSES.includes(status as typeof FINISH_STATUSES[number])) throw new SocialError("internal_error");
      return { status: status as FinishOutcome["status"], nextRunAt: asString(answer?.nextRunAt) };
    },

    /** Claims the failure email of a target once per terminal status; null when nothing is due. */
    async claimNotice(targetId: string): Promise<TargetNotice | null> {
      return parseNotice(await rpc<unknown>("publication_target_claim_notice", { p_target: targetId }));
    },

    /** Gives the notice back after a failed send so a later run retries it. */
    async releaseNotice(targetId: string, status: string): Promise<boolean> {
      return (await rpc<unknown>("publication_target_release_notice", { p_target: targetId, p_status: status })) === true;
    },

    /** Targets whose notice is still owed (released after a failed send, or recovered by lease expiry). */
    async noticesDue(limit: number): Promise<string[]> {
      const ids = await rpc<unknown>("publication_targets_notice_due", { p_limit: limit });
      if (!Array.isArray(ids)) throw new SocialError("internal_error");
      return ids.filter((id): id is string => typeof id === "string" && UUID.test(id));
    },

    /**
     * The owner's credentials for the target's network, or a failed PublishResult the worker records
     * as is (the user reconnects, then retries):
     *   not_connected        no connection, disconnected, or no usable credential stored
     *   connection_expired   expired, revoked or errored connection
     *   page_not_authorized  Instagram: no page token for the selected business account; Facebook: no page token
     *                        for the selected Page
     */
    async credentials(target: PublishTarget): Promise<CredentialsResolution> {
      const connection = await social.forUser(target.ownerId, target.network);
      if (!connection || connection.status === "disconnected") {
        return { ok: false, result: failed("not_connected", "action_required", { network: target.network }) };
      }
      if (connection.status !== "connected" && connection.status !== "expiring") {
        return {
          ok: false,
          result: failed("connection_expired", "action_required", {
            network: target.network, status: connection.status, reason: connection.statusReason,
          }),
        };
      }
      const stored: StoredCredential[] = await social.credentials(connection.id);
      if (!Array.isArray(stored)) throw new SocialError("internal_error");
      if (target.network === "instagram") {
        const page = stored.find((c) => c.kind === "page_access" && c.externalId === target.accountExternalId);
        return page?.token
          ? { ok: true, credentials: { accessToken: page.token } }
          : { ok: false, result: failed("page_not_authorized", "action_required", { network: "instagram" }) };
      }
      if (target.network === "facebook") {
        // The Page token of the facebook connection (externalId = Facebook Page id).
        const page = stored.find((c) => c.kind === "page_access" && c.externalId === target.accountExternalId);
        return page?.token
          ? { ok: true, credentials: { accessToken: page.token } }
          : { ok: false, result: failed("page_not_authorized", "action_required", { network: "facebook" }) };
      }
      const member = stored.find((c) => c.kind === "user_access");
      return member?.token
        ? { ok: true, credentials: { accessToken: member.token } }
        : { ok: false, result: failed("not_connected", "action_required", { network: "linkedin", reason: "no_token" }) };
    },
  };
}

export type PublicationStore = ReturnType<typeof createPublicationStore>;
