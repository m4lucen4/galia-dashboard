// LinkedIn publisher (REST Posts + Images API, Linkedin-Version 202611): resumable state machine
// for the worker (S1, S3, S4, S11, S21).
//
//   uploads     per image: initializeUpload, download the bytes, PUT them; the image URN is
//               checkpointed when its upload completes (a retry skips finished images)
//   processing  poll GET /images/{urn} until AVAILABLE
//   publishing  checkpoint(side_effect_pending) then POST /posts; uncertain result => outcome_unknown
//
// Pure TypeScript: only ctx.fetch / ctx.sleep / ctx.now / ctx.checkpoint, no Deno APIs.

import { failed, LeaseLostError, type PublishContext, type PublishResult, type Publisher } from "./social-publisher.ts";
import { linkedinCommentary, normalizeText, validateLinkedinCommentary } from "./social-text.ts";
import {
  asciiHttpsUrl,
  boundedDiagnostics,
  classifyLinkedinFailure,
  fingerprint,
  idLike,
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
// Defensive cap on the image kept in memory while it is relayed (Edge Function memory).
const MAX_DOWNLOAD_BYTES = 30 * 1024 * 1024;
const MAX_TITLE_CHARS = 200;

interface LinkedinState {
  fp: string;
  urns: string[];
}

type Flag = { sideEffectStarted: boolean };

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
): Promise<{ bytes: ArrayBuffer; contentType: string } | { result: PublishResult }> {
  let response: Response;
  try {
    response = await ctx.fetch(url, { method: "GET", timeoutMs: DOWNLOAD_TIMEOUT_MS });
  } catch {
    return { result: failed("provider_unavailable", "transient", { step: "uploads", index, reason: "image_download" }) };
  }
  if (!response.ok) {
    const transient = response.status >= 500 || response.status === 408 || response.status === 429;
    return {
      result: failed(
        transient ? "provider_unavailable" : "media_unreadable",
        transient ? "transient" : "action_required",
        { step: "uploads", index, http: response.status, reason: "image_download" },
      ),
    };
  }
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_DOWNLOAD_BYTES) {
    return { result: failed("media_too_large", "action_required", { step: "uploads", index, limit: MAX_DOWNLOAD_BYTES }) };
  }
  let bytes: ArrayBuffer;
  try {
    bytes = await response.arrayBuffer();
  } catch {
    return { result: failed("provider_unavailable", "transient", { step: "uploads", index, reason: "image_download" }) };
  }
  if (bytes.byteLength === 0) return { result: failed("media_unreadable", "action_required", { step: "uploads", index }) };
  if (bytes.byteLength > MAX_DOWNLOAD_BYTES) {
    return { result: failed("media_too_large", "action_required", { step: "uploads", index, limit: MAX_DOWNLOAD_BYTES }) };
  }
  const type = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  return { bytes, contentType: /^image\/[a-z0-9.+-]+$/u.test(type) ? type : "application/octet-stream" };
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
      body: image.bytes,
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
  const author = authorUrn(target.accountKind, target.accountExternalId);
  if (!author) return failed("invalid_account", "action_required", { step: "validate" });

  // A previous attempt stopped after the side-effect checkpoint: the post may or may not exist.
  if (target.step === "publishing") return outcomeUnknown("publishing", { reason: "resumed_after_publish_checkpoint" });

  // 1. Validation, before any network call.
  const imageFailure = validateImages("linkedin", payload.images);
  if (imageFailure) return validationResult(imageFailure, "validate");
  const textFailure = textValidationFailure("linkedin", validateLinkedinCommentary(payload.text));
  if (textFailure) return validationResult(textFailure, "validate");
  const urls: string[] = [];
  for (const image of payload.images) {
    const url = asciiHttpsUrl(image.url);
    if (!url) return failed("media_url_invalid", "action_required", { step: "validate" });
    urls.push(url);
  }

  const commentary = linkedinCommentary(payload.text);
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

  await ctx.checkpoint("publishing", toRecord(state), true);
  flag.sideEffectStarted = true;
  const created = await rest(ctx, "publishing", "POST", "/posts", post, POST_TIMEOUT_MS);
  if (!created.ok) {
    // Network error, timeout or 5xx: the post may exist. Never retry automatically.
    if (created.uncertain) return outcomeUnknown("publishing", { reason: "no_reliable_response" });
    // A definitive provider answer: nothing was published, so a retry is safe.
    return created.result.outcome === "failed" ? { ...created.result, notPublished: true } : created.result;
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
