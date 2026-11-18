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
// Video (format "video", Videos API, S6/S8): initializeUpload, every 4 MiB part is read from the public
// video URL with an HTTP Range request and PUT to its upload URL (ETags kept in order), thumbnail,
// finalizeUpload, then GET /videos/{urn} until AVAILABLE across worker runs, then the same single
// irreversible POST /posts with content.media. Upload progress (token, instructions, ETags) lives in
// public.publication_target_uploads (social-upload-state.ts), so a run that runs out of time returns a
// transient 'processing' result and the next run continues with the next part. The whole video is never
// in memory: one part at a time.
//
// Pure TypeScript: only ctx.fetch / ctx.sleep / ctx.now / ctx.checkpoint, no Deno APIs.

import { failed, LeaseLostError, type PublishContext, type PublishResult, type Publisher } from "./social-publisher.ts";
import { LINKEDIN_COMMENTARY_MAX, linkedinCommentary, normalizeText } from "./social-text.ts";
import type { UploadState, UploadStateStore } from "./social-upload-state.ts";
import {
  asciiHttpsUrl,
  boundedDiagnostics,
  classifyLinkedinFailure,
  fingerprint,
  idLike,
  isDefinitiveLinkedinRejection,
  outcomeUnknown,
  type ProviderCall,
  type ProviderReply,
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

// Video (L6: Videos API, MP4 only, 75 KB-500 MB, 3 s-30 min; parts of 4194304 bytes).
const VIDEO_PART_BYTES = 4_194_304;
const VIDEO_MAX_PARTS = 130;
const VIDEO_MIN_BYTES = 75_000;
const VIDEO_MAX_BYTES = 500_000_000;
const VIDEO_MIN_MS = 3000;
const VIDEO_MAX_MS = 30 * 60 * 1000;
const THUMBNAIL_MAX_BYTES = 8 * 1024 * 1024;
// A part needs its range download (<= DOWNLOAD_TIMEOUT_MS) plus its PUT: do not start one without room.
const PART_MARGIN_MS = 20_000;
// In-run polling after finalize; the real wait happens across runs.
const VIDEO_POLL_BUDGET_MS = 15_000;
const VIDEO_UPLOAD_RETRY_SECONDS = 10;
const VIDEO_PROCESSING_RETRY_SECONDS = 60;
const UPLOAD_URL_SAFETY_MS = 60_000;

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
  limit = MAX_DOWNLOAD_BYTES,
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
  if (Number.isFinite(declared) && declared > limit) {
    await discard();
    return { result: failed("media_too_large", "action_required", { step: "uploads", index, limit }) };
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
      if (total > limit) {
        await reader.cancel().catch(() => undefined);
        return { result: failed("media_too_large", "action_required", { step: "uploads", index, limit }) };
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

// Text rules shared by both formats. The limit applies to the text actually posted: the escaped
// commentary (backslashes included).
function prepareCommentary(payload: PublishContext["payload"]): { commentary: string } | { result: PublishResult } {
  const commentary = linkedinCommentary(payload.text);
  const commentaryLength = characterCount(commentary);
  const textFailure = textValidationFailure(
    "linkedin",
    commentaryLength > LINKEDIN_COMMENTARY_MAX
      ? [{ code: "too_long", limit: LINKEDIN_COMMENTARY_MAX, actual: commentaryLength }]
      : [],
  );
  if (textFailure) return { result: validationResult(textFailure, "validate") };
  return { commentary };
}

// The irreversible call (images and video): POST /posts with the already available media.
async function publishPost(
  ctx: PublishContext,
  flag: Flag,
  author: string,
  commentary: string,
  content: Record<string, unknown>,
  stepState: Record<string, unknown>,
): Promise<PublishResult> {
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
  await ctx.checkpoint("publishing", stepState, true);
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

async function runImages(ctx: PublishContext, flag: Flag, author: string): Promise<PublishResult> {
  const { target, payload } = ctx;

  // 1. Validation, before any network call.
  const imageFailure = validateImages("linkedin", payload.images);
  if (imageFailure) return validationResult(imageFailure, "validate");
  const text = prepareCommentary(payload);
  if ("result" in text) return text.result;
  const { commentary } = text;
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
  return publishPost(ctx, flag, author, commentary, content, toRecord(state));
}

// ---------------------------------------------------------------------------------------------
// Video (Videos API)
// ---------------------------------------------------------------------------------------------

/** PublishPayload.video of the T3 contract (declared here so the file type-checks on its own). */
interface LinkedinVideo {
  url: string;
  posterUrl: string | null;
  bytes: number;
  durationMs: number;
}

/** PublishContext plus the upload-progress store the worker wires (social-upload-state.ts). */
type VideoContext = PublishContext & { uploads?: UploadStateStore };

interface VideoPart {
  f: number; // first byte (inclusive)
  l: number; // last byte (inclusive, clamped to the file)
  u: string; // upload URL (trusted LinkedIn host)
}

// What publication_target_uploads.state holds for a LinkedIn video.
interface VideoUpload {
  v: 1;
  fp: string;
  // uploading: parts/thumbnail in progress; finalizing: finalizeUpload may have been sent;
  // processing: finalizeUpload answered 2xx
  phase: "uploading" | "finalizing" | "processing";
  video: string;
  token: string;
  expiresAt: number | null;
  parts: VideoPart[];
  etags: string[];
  thumb: string | null;
  thumbDone: boolean;
}

const VIDEO_URN = /^urn:li:video:[A-Za-z0-9_-]{1,100}$/u;
const ETAG = /^[\x21-\x7e]{1,1000}$/u;
const PHASES: readonly string[] = ["uploading", "finalizing", "processing"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

// The saved upload, only when it belongs to this video and is still usable.
function readUpload(raw: UploadState | null, fp: string, nowMs: number): VideoUpload | null {
  if (!raw || raw.v !== 1 || raw.fp !== fp || typeof raw.phase !== "string" || !PHASES.includes(raw.phase)) return null;
  if (typeof raw.video !== "string" || !VIDEO_URN.test(raw.video) || typeof raw.token !== "string") return null;
  if (!Array.isArray(raw.parts) || raw.parts.length === 0 || raw.parts.length > VIDEO_MAX_PARTS) return null;
  if (!Array.isArray(raw.etags) || raw.etags.length > raw.parts.length) return null;
  const parts: VideoPart[] = [];
  for (const entry of raw.parts as unknown[]) {
    if (!isRecord(entry) || !Number.isSafeInteger(entry.f) || !Number.isSafeInteger(entry.l)) return null;
    const url = trustedUploadUrl(entry.u);
    if (!url) return null;
    parts.push({ f: entry.f as number, l: entry.l as number, u: url });
  }
  if (!(raw.etags as unknown[]).every((etag) => typeof etag === "string" && ETAG.test(etag))) return null;
  const thumb = raw.thumb === null || raw.thumb === undefined ? null : trustedUploadUrl(raw.thumb);
  if (raw.thumb !== null && raw.thumb !== undefined && !thumb) return null;
  const expiresAt = typeof raw.expiresAt === "number" && Number.isFinite(raw.expiresAt) ? raw.expiresAt : null;
  // Upload URLs expire (about 30 days): an old upload is started again from initializeUpload.
  if (raw.phase === "uploading" && expiresAt !== null && nowMs >= expiresAt - UPLOAD_URL_SAFETY_MS) return null;
  return {
    v: 1,
    fp,
    phase: raw.phase as VideoUpload["phase"],
    video: raw.video,
    token: raw.token,
    expiresAt,
    parts,
    etags: raw.etags as string[],
    thumb,
    thumbDone: raw.thumbDone === true,
  };
}

// uploadInstructions -> contiguous parts that cover exactly bytes 0..bytes-1 (the last part may
// extend past the end of the file: its range is clamped).
function parseParts(raw: unknown, bytes: number): VideoPart[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > VIDEO_MAX_PARTS) return null;
  const parts: VideoPart[] = [];
  let next = 0;
  for (let index = 0; index < raw.length; index += 1) {
    const entry: unknown = raw[index];
    if (!isRecord(entry)) return null;
    const first = entry.firstByte;
    const last = entry.lastByte;
    const url = trustedUploadUrl(entry.uploadUrl);
    if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last) || !url) return null;
    const f = first as number;
    const l = Math.min(last as number, bytes - 1);
    if (f !== next || l < f || l - f + 1 > VIDEO_PART_BYTES) return null;
    parts.push({ f, l, u: url });
    next = l + 1;
    if (next === bytes && index !== raw.length - 1) return null;
  }
  return next === bytes ? parts : null;
}

// A store failure throws UploadStateError: publishLinkedin turns it into a transient internal_error
// (the upload continues from the last saved part next run).
const withStore = (ctx: VideoContext): UploadStateStore | null => ctx.uploads ?? null;

async function discardUpload(ctx: VideoContext): Promise<void> {
  try {
    await ctx.uploads?.remove(ctx.target.targetId);
  } catch {
    // Best effort: the row is also removed with the target.
  }
}

// One part of the source file: GET with a Range header, expecting 206 and exactly last-first+1 bytes.
// Streamed into an exactly sized buffer: a server that ignores Range (200) or sends more is cancelled
// before anything is buffered, so the whole file is never read.
async function fetchRange(
  ctx: PublishContext,
  url: string,
  part: VideoPart,
  total: number,
  index: number,
): Promise<{ bytes: Uint8Array } | { result: PublishResult }> {
  const expected = part.l - part.f + 1;
  const base = { step: "uploads", index, reason: "video_range" };
  let response: Response;
  try {
    response = await ctx.fetch(url, {
      method: "GET",
      headers: { Range: `bytes=${part.f}-${part.l}` },
      timeoutMs: DOWNLOAD_TIMEOUT_MS,
    });
  } catch {
    return { result: failed("provider_unavailable", "transient", base) };
  }
  const discard = () => response.body?.cancel().catch(() => undefined);
  if (response.status !== 206) {
    await discard();
    if (response.status >= 500 || response.status === 408 || response.status === 429) {
      return { result: failed("provider_unavailable", "transient", { ...base, http: response.status }) };
    }
    return {
      result: failed("media_unreadable", "action_required", {
        ...base,
        http: response.status,
        ...(response.status === 200 ? { detail: "range_not_honored" } : {}),
      }),
    };
  }
  const contentRange = response.headers.get("content-range");
  if (contentRange !== null) {
    const match = /^bytes (\d+)-(\d+)\/(\d+|\*)$/u.exec(contentRange.trim());
    if (!match || Number(match[1]) !== part.f || Number(match[2]) !== part.l || (match[3] !== "*" && Number(match[3]) !== total)) {
      await discard();
      return { result: failed("media_unreadable", "action_required", { ...base, detail: "content_range_mismatch" }) };
    }
  }
  const declared = response.headers.get("content-length");
  if (declared !== null && Number(declared) !== expected) {
    await discard();
    return { result: failed("media_unreadable", "action_required", { ...base, detail: "content_length_mismatch" }) };
  }
  const reader = response.body?.getReader();
  if (!reader) return { result: failed("media_unreadable", "action_required", base) };
  const bytes = new Uint8Array(expected);
  let received = 0;
  try {
    for (;;) {
      if (ctx.now() >= ctx.deadline) {
        await reader.cancel().catch(() => undefined);
        return { result: failed("processing", "transient", { step: "uploads" }, VIDEO_UPLOAD_RETRY_SECONDS) };
      }
      const { done, value } = await reader.read();
      if (done) break;
      if (received + value.byteLength > expected) {
        await reader.cancel().catch(() => undefined);
        return { result: failed("media_unreadable", "action_required", { ...base, detail: "range_too_long" }) };
      }
      bytes.set(value, received);
      received += value.byteLength;
    }
  } catch {
    return { result: failed("provider_unavailable", "transient", base) };
  }
  if (received !== expected) {
    return { result: failed("provider_unavailable", "transient", { ...base, detail: "range_short", received, expected }) };
  }
  return { bytes };
}

// PUT to an upload URL (video part or thumbnail). The URL is signed: the token is not sent to it.
// A rejected URL (expired, 4xx) discards the saved upload so the next run initializes a new one.
async function putUpload(
  ctx: VideoContext,
  url: string,
  headers: Record<string, string>,
  body: Uint8Array,
  index: number,
): Promise<{ reply: ProviderReply } | { result: PublishResult }> {
  const put = await providerCall(
    ctx.fetch,
    url,
    { method: "PUT", headers, body: body.buffer as ArrayBuffer, timeoutMs: UPLOAD_TIMEOUT_MS },
    "uploads",
    classifyLinkedinFailure,
  );
  if (put.ok) return { reply: put.reply };
  if (put.reply && [400, 401, 403, 404, 410].includes(put.reply.status)) {
    await discardUpload(ctx);
    return { result: failed("provider_unavailable", "transient", { step: "uploads", index, http: put.reply.status, reason: "upload_url_rejected" }) };
  }
  return { result: put.result };
}

function etagOf(reply: ProviderReply): string | null {
  const raw = reply.headers.get("etag");
  if (raw === null) return null;
  let value = raw.trim();
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
  return ETAG.test(value) ? value : null;
}

const processingRetry = (step: string, extra: Record<string, unknown> = {}, seconds = VIDEO_UPLOAD_RETRY_SECONDS): PublishResult =>
  failed("processing", "transient", { step, ...extra }, seconds);

// Persists progress: the lease is checked/extended first (throws LeaseLostError), then the state.
async function saveUpload(ctx: VideoContext, store: UploadStateStore, up: VideoUpload, step: string): Promise<void> {
  await ctx.checkpoint(step, { fp: up.fp, video: up.video }, false);
  await store.save(ctx.target.targetId, up as unknown as UploadState);
}

// initializeUpload (when there is no usable saved upload), every pending part, the thumbnail.
async function uploadVideo(
  ctx: VideoContext,
  store: UploadStateStore,
  author: string,
  video: LinkedinVideo,
  videoUrl: string,
  posterUrl: string | null,
  fp: string,
  saved: VideoUpload | null,
): Promise<{ upload: VideoUpload } | { result: PublishResult }> {
  let up = saved;
  if (!up) {
    if (ctx.deadline - ctx.now() < PART_MARGIN_MS) return { result: processingRetry("uploads") };
    const init = await rest(ctx, "uploads", "POST", "/videos?action=initializeUpload", {
      initializeUploadRequest: {
        owner: author,
        fileSizeBytes: video.bytes,
        uploadCaptions: false,
        uploadThumbnail: posterUrl !== null,
      },
    });
    if (!init.ok) return { result: init.result };
    const value = isRecord(init.reply.body?.value) ? init.reply.body.value : {};
    const urn = value.video;
    const parts = parseParts(value.uploadInstructions, video.bytes);
    const token = value.uploadToken;
    const thumb = posterUrl !== null && value.thumbnailUploadUrl !== undefined ? trustedUploadUrl(value.thumbnailUploadUrl) : null;
    if (typeof urn !== "string" || !VIDEO_URN.test(urn) || !parts || typeof token !== "string" || token.length > 4000) {
      return { result: failed("provider_response_invalid", "transient", { step: "uploads" }) };
    }
    up = {
      v: 1,
      fp,
      phase: "uploading",
      video: urn,
      token,
      expiresAt: typeof value.uploadUrlsExpireAt === "number" ? value.uploadUrlsExpireAt : null,
      parts,
      etags: [],
      thumb,
      thumbDone: false,
    };
    await saveUpload(ctx, store, up, "uploads");
  }

  while (up.etags.length < up.parts.length) {
    if (ctx.deadline - ctx.now() < PART_MARGIN_MS) {
      return { result: processingRetry("uploads", { parts: up.etags.length, of: up.parts.length }) };
    }
    const index = up.etags.length;
    const part = up.parts[index];
    const range = await fetchRange(ctx, videoUrl, part, video.bytes, index);
    if ("result" in range) return range;
    const put = await putUpload(ctx, part.u, { "Content-Type": "application/octet-stream" }, range.bytes, index);
    if ("result" in put) return put;
    const etag = etagOf(put.reply);
    if (!etag) return { result: failed("provider_response_invalid", "transient", { step: "uploads", index, reason: "etag" }) };
    up.etags.push(etag);
    await saveUpload(ctx, store, up, "uploads");
  }

  if (up.thumb && posterUrl && !up.thumbDone) {
    if (ctx.deadline - ctx.now() < PART_MARGIN_MS) return { result: processingRetry("uploads", { thumbnail: true }) };
    const image = await download(ctx, posterUrl, 0, THUMBNAIL_MAX_BYTES);
    if ("result" in image) return image;
    const put = await putUpload(
      ctx,
      up.thumb,
      { "media-type-family": "STILLIMAGE", "Content-Type": "application/octet-stream" },
      image.bytes,
      0,
    );
    if ("result" in put) return put;
    up.thumbDone = true;
    await saveUpload(ctx, store, up, "uploads");
  }
  return { upload: up };
}

// GET /videos/{urn}. status "" = not visible yet (404 right after the upload).
async function videoStatus(
  ctx: PublishContext,
  urn: string,
): Promise<{ status: string; reason: string | undefined } | { result: PublishResult }> {
  const call = await rest(ctx, "processing", "GET", `/videos/${encodeURIComponent(urn)}`);
  if (call.ok) {
    return {
      status: typeof call.reply.body?.status === "string" ? call.reply.body.status : "",
      reason: idLike(call.reply.body?.processingFailureReason),
    };
  }
  if (call.result.outcome === "failed" && call.result.diagnostics.http !== 404) return { result: call.result };
  return { status: "", reason: undefined };
}

function videoRejected(status: string, reason: string | undefined): PublishResult {
  return failed("media_rejected", "action_required", boundedDiagnostics({ step: "processing", status, reason }));
}

// Polls until AVAILABLE. null = available. Anything else is the result to return: PROCESSING (and
// WAITING_UPLOAD, or a video not visible yet) is a transient 'processing' result so the pipeline polls
// again later without consuming attempts.
async function awaitVideo(ctx: VideoContext, urn: string): Promise<PublishResult | null> {
  const started = ctx.now();
  for (;;) {
    const current = await videoStatus(ctx, urn);
    if ("result" in current) return current.result;
    if (current.status === "AVAILABLE") return null;
    if (current.status === "PROCESSING_FAILED") {
      await discardUpload(ctx);
      return videoRejected(current.status, current.reason);
    }
    // In-run polling only while the post would still fit in the budget; the real wait is across runs.
    const limit = Math.min(started + VIDEO_POLL_BUDGET_MS, ctx.deadline - POST_TIMEOUT_MS - PUBLISH_MARGIN_MS);
    if (ctx.now() + POLL_INTERVAL_MS > limit) {
      return processingRetry("processing", { reason: "media_processing" }, VIDEO_PROCESSING_RETRY_SECONDS);
    }
    await ctx.sleep(POLL_INTERVAL_MS);
  }
}

async function runVideo(base: PublishContext, flag: Flag, author: string): Promise<PublishResult> {
  const ctx = base as VideoContext;
  const { target, payload } = ctx;

  // 1. Validation, before any network call (the video may have been deleted after scheduling).
  const video = (payload as { video?: LinkedinVideo | null }).video ?? null;
  if (!video) return failed("video_missing", "action_required", { step: "validate", format: target.format });
  if (!Number.isSafeInteger(video.bytes) || video.bytes < VIDEO_MIN_BYTES || video.bytes > VIDEO_MAX_BYTES) {
    return failed("media_too_large", "action_required", { step: "validate", limit: VIDEO_MAX_BYTES, actual: video.bytes });
  }
  if (!Number.isFinite(video.durationMs) || video.durationMs < VIDEO_MIN_MS || video.durationMs > VIDEO_MAX_MS) {
    return failed("media_format", "action_required", { step: "validate", reason: "duration", actual: video.durationMs });
  }
  const videoUrl = asciiHttpsUrl(video.url);
  const posterUrl = video.posterUrl ? asciiHttpsUrl(video.posterUrl) : null;
  if (!videoUrl || (video.posterUrl && !posterUrl)) return failed("media_url_invalid", "action_required", { step: "validate" });
  const text = prepareCommentary(payload);
  if ("result" in text) return text.result;
  const { commentary } = text;
  const store = withStore(ctx);
  if (!store) return failed("internal_error", "transient", { step: "validate", reason: "upload_store_missing" });

  const fp = fingerprint([author, videoUrl, String(video.bytes), posterUrl ?? ""]);

  // 2. Upload and finalize, unless a previous run already finalized (step 'processing' with this video).
  const priorUrn = target.stepState.fp === fp && typeof target.stepState.video === "string" ? target.stepState.video : "";
  let urn: string;
  if (target.step === "processing" && VIDEO_URN.test(priorUrn)) {
    urn = priorUrn;
  } else {
    const saved = readUpload(await store.load(target.targetId), fp, ctx.now());
    let up: VideoUpload | null = saved;
    let finalized = false;
    if (saved && saved.phase !== "uploading") {
      // finalizeUpload may already have been sent (answer lost): the video status tells.
      const current = saved.phase === "processing" ? { status: "PROCESSING", reason: undefined } : await videoStatus(ctx, saved.video);
      if ("result" in current) return current.result;
      if (current.status === "PROCESSING_FAILED") {
        await discardUpload(ctx);
        return videoRejected(current.status, current.reason);
      }
      finalized = current.status === "PROCESSING" || current.status === "AVAILABLE";
    }
    if (!up || !finalized) {
      const uploaded = await uploadVideo(ctx, store, author, video, videoUrl, posterUrl, fp, up);
      if ("result" in uploaded) return uploaded.result;
      up = uploaded.upload;
      up.phase = "finalizing";
      await store.save(target.targetId, up as unknown as UploadState);
      const done = await rest(ctx, "uploads", "POST", "/videos?action=finalizeUpload", {
        finalizeUploadRequest: { video: up.video, uploadToken: up.token, uploadedPartIds: up.etags },
      });
      if (!done.ok) return done.result;
    }
    up.phase = "processing";
    await saveUpload(ctx, store, up, "processing");
    urn = up.video;
  }

  // 3. Processing: across runs.
  const processed = await awaitVideo(ctx, urn);
  if (processed) {
    if (processed.outcome === "failed" && processed.errorCode === "processing") {
      await ctx.checkpoint("processing", { fp, video: urn }, false);
    }
    return processed;
  }

  // 4. Publishing: the irreversible call.
  const title = normalizeText(payload.title).slice(0, MAX_TITLE_CHARS);
  const content = { media: { id: urn, ...(title ? { title } : {}) } };
  const result = await publishPost(ctx, flag, author, commentary, content, { fp, video: urn });
  if (result.outcome === "published") await discardUpload(ctx);
  return result;
}

async function run(ctx: PublishContext, flag: Flag): Promise<PublishResult> {
  const { target } = ctx;

  // First of all: a previous attempt that stopped after the side-effect checkpoint may or may not
  // have posted, whatever the account or the payload look like now.
  if (target.step === "publishing") return outcomeUnknown("publishing", { reason: "resumed_after_publish_checkpoint" });

  const author = authorUrn(target.accountKind, target.accountExternalId);
  if (!author) return failed("invalid_account", "action_required", { step: "validate" });

  const format: string = target.format ?? "image";
  if (format === "image") return runImages(ctx, flag, author);
  if (format === "video") return runVideo(ctx, flag, author);
  return failed("format_unsupported", "action_required", { step: "validate", format });
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
