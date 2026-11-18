// LinkedIn publisher (REST Posts + Images API, Linkedin-Version 202611): resumable state machine
// for the worker (S1, S3, S4, S11, S21).
//
//   uploads     per image: initializeUpload, download the bytes, PUT them; the image URN is
//               checkpointed when its upload completes (a retry skips finished images)
//   processing  poll GET /images/{urn} until AVAILABLE
//   publishing  checkpoint(side_effect_pending) then POST /posts; only an allow-listed definitive
//               provider rejection (HTTP 400/401/403/422/429 with a JSON body) is notPublished (the
//               database then resets the step to 'processing'); anything else => outcome_unknown
//
// Pure TypeScript: only ctx.fetch / ctx.sleep / ctx.now / ctx.checkpoint, no Deno APIs.

import { failed, LeaseLostError, type PublishContext, type PublishResult, type Publisher } from "./social-publisher.ts";
import { LINKEDIN_COMMENTARY_MAX, linkedinCommentary, normalizeText } from "./social-text.ts";
import {
  asciiHttpsUrl,
  boundedDiagnostics,
  classifyLinkedinFailure,
  fingerprint,
  idLike,
  isDefinitiveLinkedinRejection,
  outcomeUnknown,
  type ProviderCall,
  providerCall,
  textValidationFailure,
  validateImages,
  validationResult,
} from "./social-publish-errors.ts";

const API = "https://api.linkedin.com/rest";
const LINKEDIN_VERSION = "202611";
const POLL_INTERVAL_MS = 3000;
const REQUEST_TIMEOUT_MS = 20_000;
const DOWNLOAD_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 60_000;
const POST_TIMEOUT_MS = 30_000;
// The irreversible call needs its whole timeout plus this margin left before the deadline.
const PUBLISH_MARGIN_MS = 5000;
// Defensive cap on the image kept in memory while it is relayed (Edge Function memory).
const MAX_DOWNLOAD_BYTES = 30 * 1024 * 1024;
const MAX_TITLE_CHARS = 200;

// What LinkedIn's Images API accepts here: content-type and the file's magic bytes must agree.
const IMAGE_SIGNATURES: Record<string, (bytes: Uint8Array) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v),
  "image/gif": (b) => [0x47, 0x49, 0x46, 0x38].every((v, i) => b[i] === v) && (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61,
};

interface LinkedinState {
  fp: string;
  urns: string[];
}

type Flag = { sideEffectStarted: boolean };

const characterCount = (text: string): number => Array.from(text).length;

const IMAGE_URN = /^urn:li:image:[A-Za-z0-9_-]{1,100}$/u;
const POST_URN = /^urn:li:(?:share|ugcPost):\d{1,30}$/u;

function readState(raw: Record<string, unknown> | null | undefined, fp: string): LinkedinState {
  if (!raw || raw.fp !== fp || !Array.isArray(raw.urns)) return { fp, urns: [] };
  const urns = raw.urns as unknown[];
  return urns.every((urn) => typeof urn === "string" && IMAGE_URN.test(urn)) ? { fp, urns: urns as string[] } : { fp, urns: [] };
}

const toRecord = (state: LinkedinState): Record<string, unknown> => ({ fp: state.fp, urns: state.urns });

// urn:li:organization:<id> for organisation pages, urn:li:person:<id> for members.
function authorUrn(kind: string, externalId: string): string | null {
  if (/^urn:li:(?:organization|person):[A-Za-z0-9_-]{1,64}$/u.test(externalId)) return externalId;
  if (kind === "linkedin_organization") return /^\d{1,20}$/u.test(externalId) ? `urn:li:organization:${externalId}` : null;
  return /^[A-Za-z0-9_-]{1,64}$/u.test(externalId) ? `urn:li:person:${externalId}` : null;
}

function restHeaders(ctx: PublishContext, json: boolean): Record<string, string> {
  return {
    Authorization: `Bearer ${ctx.credentials.accessToken}`,
    "Linkedin-Version": LINKEDIN_VERSION,
    "X-Restli-Protocol-Version": "2.0.0",
    Accept: "application/json",
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

function rest(
  ctx: PublishContext,
  step: string,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<ProviderCall> {
  return providerCall(
    ctx.fetch,
    `${API}${path}`,
    { method, headers: restHeaders(ctx, body !== undefined), body: body === undefined ? undefined : JSON.stringify(body), timeoutMs },
    step,
    classifyLinkedinFailure,
  );
}

function transientProcessing(step: string): PublishResult {
  return failed("processing", "transient", { step }, 60);
}

// The upload URL receives the bearer token: only LinkedIn hosts are accepted.
function trustedUploadUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = asciiHttpsUrl(value);
  if (!url) return null;
  const host = new URL(url).hostname.toLowerCase();
  return host === "linkedin.com" || host.endsWith(".linkedin.com") || host === "licdn.com" || host.endsWith(".licdn.com")
    ? url
    : null;
}

async function download(
  ctx: PublishContext,
  url: string,
  index: number,
): Promise<{ bytes: Uint8Array; contentType: string } | { result: PublishResult }> {
  let response: Response;
  try {
    response = await ctx.fetch(url, { method: "GET", timeoutMs: DOWNLOAD_TIMEOUT_MS });
  } catch {
    return { result: failed("provider_unavailable", "transient", { step: "uploads", index, reason: "image_download" }) };
  }
  const discard = () => response.body?.cancel().catch(() => undefined);
  if (!response.ok) {
    await discard();
    const transient = response.status >= 500 || response.status === 408 || response.status === 429;
    return {
      result: failed(
        transient ? "provider_unavailable" : "media_unreadable",
        transient ? "transient" : "action_required",
        { step: "uploads", index, http: response.status, reason: "image_download" },
      ),
    };
  }
  const type = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!Object.hasOwn(IMAGE_SIGNATURES, type)) {
    await discard();
    return { result: failed("media_format", "action_required", { step: "uploads", index, reason: "content_type" }) };
  }
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_DOWNLOAD_BYTES) {
    await discard();
    return { result: failed("media_too_large", "action_required", { step: "uploads", index, limit: MAX_DOWNLOAD_BYTES }) };
  }

  // Streamed with a hard cap: the read stops (and the body is cancelled) as soon as it is exceeded,
  // so an oversized or endless body never sits in memory.
  const reader = response.body?.getReader();
  if (!reader) return { result: failed("media_unreadable", "action_required", { step: "uploads", index }) };
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      if (ctx.now() >= ctx.deadline) {
        await reader.cancel().catch(() => undefined);
        return { result: transientProcessing("uploads") };
      }
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_DOWNLOAD_BYTES) {
        await reader.cancel().catch(() => undefined);
        return { result: failed("media_too_large", "action_required", { step: "uploads", index, limit: MAX_DOWNLOAD_BYTES }) };
      }
      chunks.push(value);
    }
  } catch {
    return { result: failed("provider_unavailable", "transient", { step: "uploads", index, reason: "image_download" }) };
  }
  if (total === 0) return { result: failed("media_unreadable", "action_required", { step: "uploads", index }) };
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  if (!IMAGE_SIGNATURES[type](bytes)) {
    return { result: failed("media_unreadable", "action_required", { step: "uploads", index, reason: "signature_mismatch" }) };
  }
  return { bytes, contentType: type };
}

async function uploadImage(
  ctx: PublishContext,
  author: string,
  url: string,
  index: number,
): Promise<{ urn: string } | { result: PublishResult }> {
  const image = await download(ctx, url, index);
  if ("result" in image) return image;

  const init = await rest(ctx, "uploads", "POST", "/images?action=initializeUpload", {
    initializeUploadRequest: { owner: author },
  });
  if (!init.ok) return { result: init.result };
  const value = init.reply.body?.value && typeof init.reply.body.value === "object"
    ? init.reply.body.value as Record<string, unknown>
    : {};
  const urn = value.image;
  const uploadUrl = trustedUploadUrl(value.uploadUrl);
  if (typeof urn !== "string" || !IMAGE_URN.test(urn) || !uploadUrl) {
    return { result: failed("provider_response_invalid", "transient", { step: "uploads", index }) };
  }

  const put = await providerCall(
    ctx.fetch,
    uploadUrl,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${ctx.credentials.accessToken}`, "Content-Type": image.contentType },
      body: image.bytes.buffer as ArrayBuffer, // exactly sized: allocated with new Uint8Array(total)
      timeoutMs: UPLOAD_TIMEOUT_MS,
    },
    "uploads",
    classifyLinkedinFailure,
  );
  if (!put.ok) return { result: put.result };
  return { urn };
}

// Polls every image until AVAILABLE. null = all available.
async function awaitAvailable(ctx: PublishContext, urns: string[]): Promise<PublishResult | null> {
  for (let index = 0; index < urns.length; index += 1) {
    for (;;) {
      const call = await rest(ctx, "processing", "GET", `/images/${encodeURIComponent(urns[index])}`);
      let status = "";
      if (call.ok) {
        status = typeof call.reply.body?.status === "string" ? call.reply.body.status : "";
      } else if (call.result.outcome === "failed" && call.result.diagnostics.http !== 404) {
        return call.result;
      }
      // A 404 right after the upload is treated as "not visible yet" until the deadline.
      if (status === "AVAILABLE") break;
      if (status === "PROCESSING_FAILED") {
        return failed("media_rejected", "action_required", boundedDiagnostics({
          step: "processing",
          status,
          index: urns.length > 1 ? index : undefined,
        }));
      }
      if (ctx.now() + POLL_INTERVAL_MS > ctx.deadline) return transientProcessing("processing");
      await ctx.sleep(POLL_INTERVAL_MS);
    }
  }
  return null;
}

async function run(ctx: PublishContext, flag: Flag): Promise<PublishResult> {
  const { target, payload } = ctx;

  // First of all: a previous attempt that stopped after the side-effect checkpoint may or may not
  // have posted, whatever the account or the payload look like now.
  if (target.step === "publishing") return outcomeUnknown("publishing", { reason: "resumed_after_publish_checkpoint" });

  const author = authorUrn(target.accountKind, target.accountExternalId);
  if (!author) return failed("invalid_account", "action_required", { step: "validate" });

  // 1. Validation, before any network call.
  const imageFailure = validateImages("linkedin", payload.images);
  if (imageFailure) return validationResult(imageFailure, "validate");
  // The limit applies to the text actually posted: the escaped commentary (backslashes included).
  const commentary = linkedinCommentary(payload.text);
  const commentaryLength = characterCount(commentary);
  const textFailure = textValidationFailure(
    "linkedin",
    commentaryLength > LINKEDIN_COMMENTARY_MAX
      ? [{ code: "too_long", limit: LINKEDIN_COMMENTARY_MAX, actual: commentaryLength }]
      : [],
  );
  if (textFailure) return validationResult(textFailure, "validate");
  const urls: string[] = [];
  for (const image of payload.images) {
    const url = asciiHttpsUrl(image.url);
    if (!url) return failed("media_url_invalid", "action_required", { step: "validate" });
    urls.push(url);
  }

  const fp = fingerprint(urls);
  const state = readState(target.stepState, fp);
  const resumeProcessing = target.step === "processing" && state.urns.length === urls.length;

  // 2. Uploads.
  if (!resumeProcessing) {
    while (state.urns.length < urls.length) {
      if (ctx.now() >= ctx.deadline) return transientProcessing("uploads");
      const index = state.urns.length;
      const uploaded = await uploadImage(ctx, author, urls[index], index);
      if ("result" in uploaded) return uploaded.result;
      state.urns.push(uploaded.urn);
      await ctx.checkpoint(state.urns.length === urls.length ? "processing" : "uploads", toRecord(state), false);
    }
  }

  // 3. Processing.
  const processed = await awaitAvailable(ctx, state.urns);
  if (processed) return processed;

  // 4. Publishing: the irreversible call.
  const title = normalizeText(payload.title).slice(0, MAX_TITLE_CHARS);
  const content = state.urns.length === 1
    ? { media: { id: state.urns[0], ...(title ? { title } : {}) } }
    : { multiImage: { images: state.urns.map((id) => ({ id })) } };
  const post = {
    author,
    ...(commentary ? { commentary } : {}),
    visibility: "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
    content,
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };

  // It needs its whole timeout: otherwise hand the target back before the guard is set (state stays
  // as checkpointed, no network call).
  if (ctx.deadline - ctx.now() < POST_TIMEOUT_MS + PUBLISH_MARGIN_MS) {
    return failed("processing", "transient", { step: "publishing", reason: "deadline" }, 30);
  }
  await ctx.checkpoint("publishing", toRecord(state), true);
  flag.sideEffectStarted = true;
  const created = await rest(ctx, "publishing", "POST", "/posts", post, POST_TIMEOUT_MS);
  if (!created.ok) {
    // Only an allow-listed definitive rejection proves nothing was published; the database then
    // retries from step 'processing'. Everything else (network error, timeout, 5xx, 404, 409,
    // 426, empty body) may have posted: never retry automatically.
    if (created.result.outcome === "failed" && created.reply && isDefinitiveLinkedinRejection(created.reply)) {
      return { ...created.result, notPublished: true };
    }
    const { http, subcode } = created.result.outcome === "failed" ? created.result.diagnostics : {} as Record<string, unknown>;
    return outcomeUnknown("publishing", {
      reason: created.reply ? "provider_answer_not_definitive" : "no_reliable_response",
      http,
      subcode,
    });
  }
  const urn = created.reply.headers.get("x-restli-id");
  if (!urn || !POST_URN.test(urn)) {
    return outcomeUnknown("publishing", {
      reason: "missing_post_urn",
      http: created.reply.status,
      li_uuid: idLike(created.reply.headers.get("x-li-uuid")),
    });
  }
  return { outcome: "published", externalPostId: urn, permalink: `https://www.linkedin.com/feed/update/${urn}` };
}

export const publishLinkedin: Publisher = async (ctx) => {
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
