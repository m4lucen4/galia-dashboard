// Shared pieces of the Instagram and LinkedIn publishers (S1, S4, S11, S21):
//  - provider replies classified into PublishResult failures (Graph API and LinkedIn REST)
//  - the validation that runs before any network call (images and text rules)
//  - small helpers (fingerprint, safe provider call, outcome_unknown)
//
// Pure TypeScript: no Deno or Node APIs, and no import of the OAuth modules (they pull Deno-only code).
//
// Diagnostics rule: only HTTP status, numeric provider codes, step names and trace ids (sanitised)
// are ever copied. Provider message text, URLs, tokens and publication text are never stored.

import { failed, type PublishImage, type PublishNetwork, type PublishResult } from "./social-publisher.ts";
import { evaluateCarousel, type ImageIssue, INSTAGRAM_MEDIA, LINKEDIN_MEDIA } from "./social-media-rules.ts";
import type { TextIssue } from "./social-text.ts";

export interface ProviderReply {
  status: number;
  ok: boolean;
  headers: { get(name: string): string | null };
  body: Record<string, unknown> | null;
}

export type ProviderCall =
  | { ok: true; reply: ProviderReply }
  | { ok: false; result: PublishResult; uncertain: boolean };

const MAX_BODY_CHARS = 1_000_000;
const MAX_DIAGNOSTICS_CHARS = 1800;
const DEFAULT_RETRY_AFTER = 900;
const MAX_RETRY_AFTER = 86_400;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d{1,12}$/u.test(value)) return Number(value);
  return null;
}

// Identifier-like strings only (trace ids, URNs, error names). Anything else is dropped.
export function idLike(value: unknown): string | undefined {
  return typeof value === "string" && /^[A-Za-z0-9_.:-]{1,80}$/u.test(value) ? value : undefined;
}

/** Reads the JSON object of a provider response; null for empty, oversized or non-object bodies. */
export async function readReply(response: Response): Promise<ProviderReply> {
  let body: Record<string, unknown> | null = null;
  try {
    const text = await response.text();
    if (text.length > 0 && text.length <= MAX_BODY_CHARS) body = asRecord(JSON.parse(text));
  } catch {
    body = null;
  }
  return { status: response.status, ok: response.status >= 200 && response.status < 300, headers: response.headers, body };
}

/** Network failure, timeout or 5xx/408: the provider may or may not have processed the request. */
export function isUncertainStatus(status: number): boolean {
  return status >= 500 || status === 408;
}

/**
 * Runs one provider request. A thrown fetch (network, timeout, redirect) becomes a transient
 * provider_unavailable failure flagged `uncertain`. The thrown error is never inspected or logged.
 */
export async function providerCall(
  fetcher: (url: string, init?: RequestInit & { timeoutMs?: number }) => Promise<Response>,
  url: string,
  init: RequestInit & { timeoutMs?: number },
  step: string,
  classify: (reply: ProviderReply, step: string) => PublishResult,
): Promise<ProviderCall> {
  let response: Response;
  try {
    response = await fetcher(url, init);
  } catch {
    return {
      ok: false,
      uncertain: true,
      result: failed("provider_unavailable", "transient", boundedDiagnostics({ step, reason: "network_or_timeout" })),
    };
  }
  const reply = await readReply(response);
  if (reply.ok) return { ok: true, reply };
  return { ok: false, uncertain: isUncertainStatus(reply.status), result: classify(reply, step) };
}

export function boundedDiagnostics(diagnostics: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(diagnostics)) if (value !== undefined && value !== null) clean[key] = value;
  if (JSON.stringify(clean).length <= MAX_DIAGNOSTICS_CHARS) return clean;
  const { http, code, subcode, step } = clean;
  return { http, code, subcode, step, truncated: true };
}

/** Uncertain outcome after the irreversible call: never retried automatically (S11). */
export function outcomeUnknown(step: string, diagnostics: Record<string, unknown> = {}): PublishResult {
  return failed("outcome_unknown", "action_required", boundedDiagnostics({ ...diagnostics, step }));
}

function clampSeconds(seconds: number): number {
  return Math.min(MAX_RETRY_AFTER, Math.max(1, Math.ceil(seconds)));
}

// Retry-After: delta seconds or an HTTP date.
function retryAfterHeader(headers: ProviderReply["headers"], nowMs: number): number | null {
  const raw = headers.get("retry-after");
  if (!raw) return null;
  if (/^\d{1,9}$/u.test(raw.trim())) return clampSeconds(Number(raw));
  const date = Date.parse(raw);
  return Number.isFinite(date) ? clampSeconds((date - nowMs) / 1000) : null;
}

// x-business-use-case-usage: {"<id>":[{"estimated_time_to_regain_access": <minutes>, ...}]}
function graphRegainSeconds(headers: ProviderReply["headers"]): number | null {
  const raw = headers.get("x-business-use-case-usage");
  if (!raw || raw.length > 20_000) return null;
  try {
    const parsed = asRecord(JSON.parse(raw));
    if (!parsed) return null;
    let minutes = 0;
    for (const entries of Object.values(parsed)) {
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        const value = asNumber(asRecord(entry)?.estimated_time_to_regain_access);
        if (value !== null && value > minutes) minutes = value;
      }
    }
    return minutes > 0 ? clampSeconds(minutes * 60) : null;
  } catch {
    return null;
  }
}

// Messages (never stored) that mean the account itself is blocked: PPA, two-factor, restrictions.
const ACCOUNT_RESTRICTED_MESSAGE =
  /\bPPA\b|publishing authorization|two[- ]factor|\b2FA\b|temporarily blocked|account.{0,24}(restricted|blocked|suspended|disabled)|restricted from/iu;

/**
 * Graph API (Instagram) error -> PublishResult.
 *  190 (any subcode)               token_invalid        action_required
 *  4, 17, 32, 613, 9 or HTTP 429   rate_limited         transient (header hint, else 900 s)
 *  2207042 (daily publish limit)   rate_limited         transient
 *  2207027 (media not ready)       processing           transient
 *  subcode 2207xxx                 media_rejected       action_required (subcode kept)
 *  368 or PPA/2FA/restriction text account_restricted   action_required
 *  10, 200-299, HTTP 403           permission_missing   action_required
 *  HTTP 401                        token_invalid        action_required
 *  5xx, 408, codes 1/2, is_transient provider_unavailable transient
 *  anything else                   provider_rejected    permanent
 */
export function classifyGraphFailure(reply: ProviderReply, step: string, nowMs = Date.now()): PublishResult {
  const error = asRecord(reply.body?.error);
  const code = asNumber(error?.code);
  const subcode = asNumber(error?.error_subcode);
  const message = typeof error?.message === "string" ? error.message : "";
  const diagnostics = boundedDiagnostics({
    http: reply.status,
    code: code ?? undefined,
    subcode: subcode ?? undefined,
    step,
    fbtrace_id: idLike(error?.fbtrace_id),
  });

  if (code === 190) return failed("token_invalid", "action_required", diagnostics);
  if (code === 4 || code === 17 || code === 32 || code === 613 || code === 9 || reply.status === 429) {
    const retry = graphRegainSeconds(reply.headers) ?? retryAfterHeader(reply.headers, nowMs) ?? DEFAULT_RETRY_AFTER;
    return failed("rate_limited", "transient", diagnostics, retry);
  }
  if (subcode === 2207042) return failed("rate_limited", "transient", diagnostics, 3600);
  if (subcode === 2207027) return failed("processing", "transient", diagnostics, 60);
  if (subcode !== null && subcode >= 2_207_000 && subcode <= 2_207_999) {
    return failed("media_rejected", "action_required", diagnostics);
  }
  if (code === 368 || ACCOUNT_RESTRICTED_MESSAGE.test(message)) {
    return failed("account_restricted", "action_required", diagnostics);
  }
  if (code === 10 || (code !== null && code >= 200 && code <= 299) || reply.status === 403) {
    return failed("permission_missing", "action_required", diagnostics);
  }
  if (reply.status === 401) return failed("token_invalid", "action_required", diagnostics);
  if (isUncertainStatus(reply.status) || code === 1 || code === 2 || error?.is_transient === true) {
    return failed("provider_unavailable", "transient", diagnostics);
  }
  return failed("provider_rejected", "permanent", diagnostics);
}

/**
 * LinkedIn REST error -> PublishResult.
 *  401 token_invalid, 403 permission_missing (action_required); 400/422 invalid_request (permanent,
 *  only the numeric serviceErrorCode / error code is kept, never the message); 426 version sunset;
 *  429 rate_limited with Retry-After; 5xx/408 provider_unavailable; anything else provider_rejected.
 */
export function classifyLinkedinFailure(reply: ProviderReply, step: string, nowMs = Date.now()): PublishResult {
  const serviceErrorCode = asNumber(reply.body?.serviceErrorCode);
  const bodyCode = typeof reply.body?.code === "string" ? idLike(reply.body.code) : asNumber(reply.body?.code) ?? undefined;
  const diagnostics = boundedDiagnostics({
    http: reply.status,
    code: bodyCode,
    subcode: serviceErrorCode ?? undefined,
    step,
    li_uuid: idLike(reply.headers.get("x-li-uuid")),
  });

  if (reply.status === 401) return failed("token_invalid", "action_required", diagnostics);
  if (reply.status === 403) return failed("permission_missing", "action_required", diagnostics);
  if (reply.status === 400 || reply.status === 422) return failed("invalid_request", "permanent", diagnostics);
  if (reply.status === 426) return failed("api_version_unsupported", "permanent", diagnostics);
  if (reply.status === 429) {
    return failed("rate_limited", "transient", diagnostics, retryAfterHeader(reply.headers, nowMs) ?? DEFAULT_RETRY_AFTER);
  }
  if (isUncertainStatus(reply.status)) return failed("provider_unavailable", "transient", diagnostics);
  return failed("provider_rejected", "permanent", diagnostics);
}

// ---------------------------------------------------------------------------------------------
// Validation before any network call

const EXTENSION_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
  svg: "image/svg+xml",
};

// The payload carries no mime type. A variant is always a JPEG; an original is judged by its URL
// extension. An unknown extension is assumed to be a JPEG (the provider rejects it otherwise and
// that becomes media_rejected).
function mimeOf(image: PublishImage): string {
  if (image.isVariant) return "image/jpeg";
  try {
    const ext = new URL(image.url).pathname.toLowerCase().match(/\.([a-z0-9]+)$/u)?.[1];
    return (ext && EXTENSION_MIME[ext]) || "image/jpeg";
  } catch {
    return "image/jpeg";
  }
}

/**
 * https URL as an ASCII string (hostnames punycoded, other characters percent-encoded), or null
 * when it is not a valid https URL. Instagram only fetches public ASCII URLs.
 */
export function asciiHttpsUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname ? url.href : null;
  } catch {
    return null;
  }
}

export interface ValidationFailure {
  code: string;
  diagnostics: Record<string, unknown>;
}

function compactIssues(issues: Array<ImageIssue | TextIssue>): Array<Record<string, unknown>> {
  return issues.slice(0, 20).map((issue) => {
    const entry = issue as unknown as Record<string, unknown>;
    return { code: entry.code, index: entry.index, actual: entry.actual, limit: entry.limit };
  }).map((entry) => Object.fromEntries(Object.entries(entry).filter(([, value]) => value !== undefined)));
}

/**
 * Image rules for one network (S4, L6). Images with known width and height are evaluated with
 * evaluateCarousel; unknown dimensions are skipped (the provider decides). Images that need a
 * crop or a conversion and are not a variant block the target with an action_required code:
 *   no_images, too_many_images, media_needs_crop (ratio), media_format (format/weight/pixels/width).
 * Variants are skipped: the database CHECKs already guarantee they comply.
 */
export function validateImages(network: PublishNetwork, images: PublishImage[]): ValidationFailure | null {
  if (images.length === 0) return { code: "no_images", diagnostics: { network } };
  const max = network === "instagram" ? INSTAGRAM_MEDIA.carouselMax : LINKEDIN_MEDIA.multiImageMax;
  if (images.length > max) {
    return { code: "too_many_images", diagnostics: { network, actual: images.length, limit: max } };
  }

  const known = images
    .map((image, index) => ({ image, index }))
    .filter(({ image }) => (image.width ?? 0) > 0 && (image.height ?? 0) > 0);
  const evaluation = evaluateCarousel(
    network,
    known.map(({ image }) => ({ mime: mimeOf(image), width: image.width as number, height: image.height as number, bytes: 1 })),
  );

  const blocking: ImageIssue[] = [];
  for (const issue of evaluation.issues) {
    if (issue.index === undefined) continue;
    const source = known[issue.index];
    if (!source || source.image.isVariant) continue;
    blocking.push({ ...issue, index: source.index });
  }
  if (blocking.length === 0) return null;

  const needsCrop = blocking.some((i) => i.code === "ratio_too_narrow" || i.code === "ratio_too_wide" || i.code === "ratio_mismatch");
  return {
    code: needsCrop ? "media_needs_crop" : "media_format",
    diagnostics: { network, issues: compactIssues(blocking) },
  };
}

/** Text issues -> specific code: caption_too_long / commentary_too_long, too_many_hashtags, too_many_mentions. */
export function textValidationFailure(network: PublishNetwork, issues: TextIssue[]): ValidationFailure | null {
  const first = issues[0];
  if (!first) return null;
  const long = network === "instagram" ? "caption_too_long" : "commentary_too_long";
  const code = first.code === "too_long" ? long : first.code;
  return { code, diagnostics: { network, issues: compactIssues(issues) } };
}

export function validationResult(failure: ValidationFailure, step: string): PublishResult {
  return failed(failure.code, "action_required", boundedDiagnostics({ ...failure.diagnostics, step }));
}

/**
 * Short stable fingerprint of what a stepState belongs to (image URLs, caption/commentary).
 * Two FNV-1a 32-bit passes, hex. Not cryptographic: it only detects that the publication changed
 * between attempts, so stale container/image ids are not reused.
 */
export function fingerprint(parts: string[]): string {
  const input = parts.join("\u0000");
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ input.length;
  for (let i = 0; i < input.length; i += 1) {
    const c = input.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ c, 0x85ebca6b) >>> 0;
  }
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}
