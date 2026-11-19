// Facebook Page publisher (Graph API v27.0, graph.facebook.com): resumable state machine for the worker
// (odd/tasks/facebook-page-publishing.md, T2; specs S4, S5). Publishes to the Page feed with the Page access
// token of the facebook connection (accountExternalId = Facebook Page id). Formats:
//
//   image, 1 photo     POST /{page}/photos  url + message + published=true            (irreversible)
//   image, 2-20 photos POST /{page}/photos  url + published=false, once per photo      (reversible: the photo
//                      stays unpublished ~24 h; each id is checkpointed in step_state, so a retry never uploads
//                      the same photo twice), then
//                      POST /{page}/feed    message + attached_media[i]={"media_fbid":id}  (irreversible)
//   video              POST /{page}/videos  file_url + description                     (irreversible)
//
// Facebook has no idempotency key, so the irreversible call is guarded exactly like Instagram media_publish:
//   publishing  checkpoint(side_effect_pending = true) then the call; only an allow-listed definitive provider
//               rejection is notPublished (the database then resets the step to 'processing' and keeps
//               step_state, so the retry publishes again with the uploaded photo ids); anything else (timeout,
//               5xx, code 1/2, unlisted codes, an answer without id) is outcome_unknown. A claim that finds
//               step = 'publishing' is always an unknown outcome and never calls the network.
// We publish immediately from our own queue, never with Meta scheduled_publish_time (T0: reports of
// OAuthException code 1 on scheduled posts). A video is processed by Meta after the call returns; the target
// is published once Graph answers the video id (no polling).
//
// Validation before any Graph call: photo count 1-20, public https URLs, message length, and 10 MB per photo
// (media_too_large). The payload carries no byte size, so the size of every original photo is read with a
// HEAD request to its public Supabase Storage URL (Content-Length); per-network variants are JPEGs of at most
// 8 MB by table check and are skipped. When the size cannot be read (no header, request failed) the photo is
// not blocked: Meta decides and a rejection becomes media_rejected / provider_rejected.
//
// Pure TypeScript: only ctx.fetch / ctx.now / ctx.checkpoint, no Deno APIs.
// The token travels in the Authorization header (GET) or the POST body, never in a URL.

import { failed, LeaseLostError, type PublishContext, type PublishResult, type Publisher } from "./social-publisher.ts";
import { facebookMessage, validateFacebookMessage } from "./social-text.ts";
import {
  asciiHttpsUrl,
  classifyGraphFailure,
  fingerprint,
  isDefinitiveGraphRejection,
  outcomeUnknown,
  type ProviderCall,
  providerCall,
  textValidationFailure,
  validateImages,
  validationResult,
} from "./social-publish-errors.ts";
import { FACEBOOK_MEDIA } from "./social-media-rules.ts";
import { GRAPH_BASE } from "./social-instagram.ts";

const REQUEST_TIMEOUT_MS = 20_000;
// The irreversible calls need their whole timeout plus this margin left before the deadline. A video call
// pulls the file from our storage (file_url), so it gets a longer timeout; a timeout is an unknown outcome.
const PHOTO_PUBLISH_TIMEOUT_MS = 30_000;
const VIDEO_PUBLISH_TIMEOUT_MS = 60_000;
const PUBLISH_MARGIN_MS = 5000;
const SIZE_CHECK_TIMEOUT_MS = 8000;
// Unpublished photos are kept ~24 h by Facebook: older checkpointed ids are discarded and uploaded again.
const PHOTO_MAX_AGE_MS = 20 * 60 * 60 * 1000;
const MAX_PHOTOS = FACEBOOK_MEDIA.multiImageMax;

interface FacebookState {
  fp: string;
  /** Ids of the unpublished photos uploaded so far, in publication order (multi-photo only). */
  photos: string[];
  /** ctx.now() when the first photo was uploaded. */
  at: number;
}

type Flag = { sideEffectStarted: boolean };

const isId = (value: unknown): value is string => typeof value === "string" && /^\d{5,30}$/u.test(value);
// Post ids are "<page id>_<post id>"; a video id is a plain number.
const isPostId = (value: unknown): value is string => typeof value === "string" && /^\d{5,30}(_\d{5,30})?$/u.test(value);

function readState(raw: Record<string, unknown> | null | undefined, fp: string, now: number): FacebookState {
  const fresh: FacebookState = { fp, photos: [], at: now };
  if (!raw || raw.fp !== fp) return fresh;
  const photos = Array.isArray(raw.photos) ? raw.photos : [];
  const at = typeof raw.at === "number" && Number.isFinite(raw.at) ? raw.at : null;
  if (!photos.every(isId) || (photos.length > 0 && (at === null || now - at > PHOTO_MAX_AGE_MS))) return fresh;
  return { fp, photos: photos as string[], at: photos.length > 0 && at !== null ? at : now };
}

const toRecord = (state: FacebookState): Record<string, unknown> => ({ fp: state.fp, photos: state.photos, at: state.at });

function graph(
  ctx: PublishContext,
  step: string,
  method: "GET" | "POST",
  path: string,
  params: Record<string, string>,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<ProviderCall> {
  const token = ctx.credentials.accessToken;
  if (method === "GET") {
    const query = new URLSearchParams(params).toString();
    return providerCall(
      ctx.fetch,
      `${GRAPH_BASE}${path}${query ? `?${query}` : ""}`,
      { method, headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, timeoutMs },
      step,
      classifyGraphFailure,
    );
  }
  return providerCall(
    ctx.fetch,
    `${GRAPH_BASE}${path}`,
    {
      method,
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ ...params, access_token: token }).toString(),
      timeoutMs,
    },
    step,
    classifyGraphFailure,
  );
}

const unreadable = (step: string): PublishResult => failed("provider_response_invalid", "transient", { step });

// Photos above the Facebook limit, by the Content-Length of their public URL. null = every size is known to fit
// or unknown (see the header comment).
async function oversizedPhoto(
  ctx: PublishContext, images: PublishContext["payload"]["images"], urls: string[],
): Promise<PublishResult | null> {
  const sizes = await Promise.all(urls.map(async (url, index) => {
    if (images[index]?.isVariant) return null; // a variant is a JPEG of at most 8 MB (table check)
    try {
      const response = await ctx.fetch(url, { method: "HEAD", timeoutMs: SIZE_CHECK_TIMEOUT_MS });
      const raw = response.headers.get("content-length");
      return response.ok && raw !== null && /^\d{1,12}$/u.test(raw.trim()) ? Number(raw) : null;
    } catch {
      return null;
    }
  }));
  const index = sizes.findIndex((size) => size !== null && size > FACEBOOK_MEDIA.maxBytes);
  if (index < 0) return null;
  return validationResult({
    code: "media_too_large",
    diagnostics: { network: "facebook", index, actual: sizes[index], limit: FACEBOOK_MEDIA.maxBytes },
  }, "validate");
}

// The result of an irreversible call, shared by the three flavours. null = published (the id is read by the caller).
function unpublished(published: Extract<ProviderCall, { ok: false }>): PublishResult {
  // Only an allow-listed definitive rejection proves nothing was published; the database then retries from
  // step 'processing'. Everything else (network error, timeout, 5xx, code 1/2, is_transient, unlisted codes)
  // may have published: never retry automatically.
  if (published.result.outcome === "failed" && published.reply && isDefinitiveGraphRejection(published.reply)) {
    return { ...published.result, notPublished: true };
  }
  const { http, code, subcode } = published.result.outcome === "failed" ? published.result.diagnostics : {} as Record<string, unknown>;
  return outcomeUnknown("publishing", {
    reason: published.reply ? "provider_answer_not_definitive" : "no_reliable_response",
    http,
    code,
    subcode,
  });
}

// Permalink, best effort: the post already exists. Graph answers a full URL for posts and a path
// ("/<page>/videos/<id>/") for videos.
async function permalinkOf(ctx: PublishContext, id: string): Promise<string | null> {
  try {
    const link = await graph(ctx, "permalink", "GET", `/${id}`, { fields: "permalink_url" });
    const value = link.ok ? link.reply.body?.permalink_url : null;
    if (typeof value !== "string" || value.length > 500) return null;
    if (value.startsWith("https://")) return value;
    if (/^\/[A-Za-z0-9_.\-/]+$/u.test(value)) return `https://www.facebook.com${value}`;
    return null;
  } catch {
    return null;
  }
}

// The irreversible step. The caller has validated everything; nothing is sent before the guard is set.
async function publish(
  ctx: PublishContext,
  flag: Flag,
  state: FacebookState,
  path: string,
  params: Record<string, string>,
  timeoutMs: number,
  idOf: (body: Record<string, unknown> | null) => string | null,
): Promise<PublishResult> {
  // The call needs its whole timeout: otherwise hand the target back before the guard is set (state stays as
  // checkpointed, no network call).
  if (ctx.deadline - ctx.now() < timeoutMs + PUBLISH_MARGIN_MS) {
    return failed("processing", "transient", { step: "publishing", reason: "deadline" }, 30);
  }
  await ctx.checkpoint("publishing", toRecord(state), true);
  flag.sideEffectStarted = true;
  const published = await graph(ctx, "publishing", "POST", path, params, timeoutMs);
  if (!published.ok) return unpublished(published);
  const id = idOf(published.reply.body);
  if (!id) return outcomeUnknown("publishing", { reason: "missing_post_id", http: published.reply.status });
  return { outcome: "published", externalPostId: id, permalink: await permalinkOf(ctx, id) };
}

const idField = (field: string) => (body: Record<string, unknown> | null): string | null => {
  const raw = body?.[field];
  const text = typeof raw === "number" ? String(raw) : raw;
  return isPostId(text) ? text : null;
};

async function run(ctx: PublishContext, flag: Flag): Promise<PublishResult> {
  const { target, payload } = ctx;
  const page = target.accountExternalId;

  // First of all: a previous attempt that reached the irreversible call is always an unknown outcome, whatever
  // the account or the payload look like now.
  if (target.step === "publishing") {
    return outcomeUnknown("publishing", { reason: "resumed_after_publish_checkpoint" });
  }

  if (!/^\d{1,30}$/u.test(page)) return failed("invalid_account", "action_required", { step: "validate" });

  // 1. Validation, before any network call.
  const format = target.format;
  if (format !== "image" && format !== "video") {
    return failed("format_unsupported", "action_required", { step: "validate", format });
  }
  const textFailure = textValidationFailure("facebook", validateFacebookMessage(payload.text));
  if (textFailure) return validationResult(textFailure, "validate");
  const message = facebookMessage(payload.text);

  if (format === "video") {
    if (!payload.video) return failed("video_missing", "action_required", { step: "validate", format });
    const videoUrl = asciiHttpsUrl(payload.video.url);
    if (!videoUrl) return failed("media_url_invalid", "action_required", { step: "validate" });
    // One call, no uploaded state: the only checkpoint is the irreversible one.
    const state: FacebookState = { fp: fingerprint([format, page, message, videoUrl]), photos: [], at: ctx.now() };
    return publish(ctx, flag, state, `/${page}/videos`, {
      file_url: videoUrl,
      ...(message ? { description: message } : {}),
    }, VIDEO_PUBLISH_TIMEOUT_MS, idField("id"));
  }

  const imageFailure = validateImages("facebook", payload.images);
  if (imageFailure) return validationResult(imageFailure, "validate");
  const urls: string[] = [];
  for (const image of payload.images) {
    const url = asciiHttpsUrl(image.url);
    if (!url) return failed("media_url_invalid", "action_required", { step: "validate" });
    urls.push(url);
  }
  if (urls.length > MAX_PHOTOS) {
    return validationResult({ code: "too_many_images", diagnostics: { network: "facebook", actual: urls.length, limit: MAX_PHOTOS } }, "validate");
  }

  const state = readState(target.stepState, fingerprint([format, page, message, ...urls]), ctx.now());

  // Sizes are only checked while photos still have to be sent.
  if (state.photos.length < urls.length) {
    const tooLarge = await oversizedPhoto(ctx, payload.images, urls);
    if (tooLarge) return tooLarge;
  }

  // 2a. One photo: a single published call.
  if (urls.length === 1) {
    return publish(ctx, flag, state, `/${page}/photos`, {
      url: urls[0],
      published: "true",
      ...(message ? { message } : {}),
    }, PHOTO_PUBLISH_TIMEOUT_MS, (body) => idField("post_id")(body) ?? idField("id")(body));
  }

  // 2b. Several photos: unpublished uploads first, every id checkpointed (a retry never uploads one twice).
  while (state.photos.length < urls.length) {
    if (ctx.now() >= ctx.deadline) return failed("processing", "transient", { step: "uploading" }, 30);
    const call = await graph(ctx, "uploading", "POST", `/${page}/photos`, { url: urls[state.photos.length], published: "false" });
    if (!call.ok) return call.result;
    const raw = call.reply.body?.id;
    const id = typeof raw === "number" ? String(raw) : raw;
    if (!isId(id)) return unreadable("uploading");
    if (state.photos.length === 0) state.at = ctx.now();
    state.photos.push(id);
    await ctx.checkpoint("uploading", toRecord(state), false);
  }

  // 3. The post that attaches them: the irreversible call.
  const attached: Record<string, string> = {};
  state.photos.forEach((id, index) => {
    attached[`attached_media[${index}]`] = JSON.stringify({ media_fbid: id });
  });
  return publish(ctx, flag, state, `/${page}/feed`, {
    ...(message ? { message } : {}),
    ...attached,
  }, PHOTO_PUBLISH_TIMEOUT_MS, idField("id"));
}

export const publishFacebook: Publisher = async (ctx) => {
  const flag: Flag = { sideEffectStarted: false };
  try {
    return await run(ctx, flag);
  } catch (error) {
    if (error instanceof LeaseLostError) throw error;
    // Unexpected failure: its message may embed anything, so only the class is reported.
    return flag.sideEffectStarted
      ? outcomeUnknown("publishing", { reason: "unexpected_error" })
      : failed("internal_error", "transient", { step: ctx.target.step ?? "start" });
  }
};
