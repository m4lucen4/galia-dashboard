// Instagram publisher (Graph API v27.0): resumable state machine for the worker (S1, S3, S4, S11, S21).
//
//   containers  one container per image (is_carousel_item for 2+), then the CAROUSEL container;
//               every created id is checkpointed, so a retry never creates the same one twice
//   processing  poll status_code every 3 s until FINISHED
//   publishing  checkpoint(side_effect_pending) then media_publish; only an allow-listed definitive
//               provider rejection is notPublished (the database then resets the step to
//               'processing', so the retry polls and publishes again); anything else => outcome_unknown
//
// Pure TypeScript: only ctx.fetch / ctx.sleep / ctx.now / ctx.checkpoint, no Deno APIs.
// The token travels in the Authorization header (GET) or the POST body, never in a URL.

import { failed, LeaseLostError, type PublishContext, type PublishResult, type Publisher } from "./social-publisher.ts";
import { instagramCaption, validateInstagramCaption } from "./social-text.ts";
import {
  asciiHttpsUrl,
  boundedDiagnostics,
  classifyGraphFailure,
  fingerprint,
  idLike,
  isDefinitiveGraphRejection,
  outcomeUnknown,
  type ProviderCall,
  providerCall,
  textValidationFailure,
  validateImages,
  validationResult,
} from "./social-publish-errors.ts";

const GRAPH = "https://graph.facebook.com/v27.0";
const POLL_INTERVAL_MS = 3000;
const REQUEST_TIMEOUT_MS = 20_000;
const PUBLISH_TIMEOUT_MS = 30_000;
// The irreversible call needs its whole timeout plus this margin left before the deadline.
const PUBLISH_MARGIN_MS = 5000;
const DEFAULT_QUOTA_RETRY = 3600;

interface InstagramState {
  fp: string;
  children: string[];
  container: string | null;
}

type Flag = { sideEffectStarted: boolean; quotaUnknown: boolean };

const isId = (value: unknown): value is string => typeof value === "string" && /^\d{5,30}$/u.test(value);

function readState(raw: Record<string, unknown> | null | undefined, fp: string): InstagramState {
  const fresh: InstagramState = { fp, children: [], container: null };
  if (!raw || raw.fp !== fp) return fresh;
  const children = Array.isArray(raw.children) ? raw.children : [];
  if (!children.every(isId)) return fresh;
  return { fp, children: children as string[], container: isId(raw.container) ? raw.container : null };
}

const toRecord = (state: InstagramState): Record<string, unknown> => ({
  fp: state.fp,
  children: state.children,
  container: state.container,
});

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
      `${GRAPH}${path}${query ? `?${query}` : ""}`,
      { method, headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, timeoutMs },
      step,
      classifyGraphFailure,
    );
  }
  return providerCall(
    ctx.fetch,
    `${GRAPH}${path}`,
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

function transientProcessing(step: string): PublishResult {
  return failed("processing", "transient", { step }, 60);
}

const unreadable = (step: string): PublishResult => failed("provider_response_invalid", "transient", { step });

async function createContainer(
  ctx: PublishContext,
  ig: string,
  params: Record<string, string>,
): Promise<{ id: string } | { result: PublishResult }> {
  const call = await graph(ctx, "containers", "POST", `/${ig}/media`, params);
  if (!call.ok) return { result: call.result };
  const id = call.reply.body?.id;
  const text = typeof id === "number" ? String(id) : id;
  return isId(text) ? { id: text } : { result: unreadable("containers") };
}

const positive = (value: unknown): number | null => {
  const number = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number) && number > 0 ? number : null;
};

// Daily publishing quota (content_publishing_limit). Returns a transient failure when exhausted.
// The limit is config.quota_total or config.quota_value; when it cannot be read the check fails
// open (Instagram enforces the limit itself) and flag.quotaUnknown is added to the diagnostics.
async function checkQuota(ctx: PublishContext, ig: string, flag: Flag): Promise<PublishResult | null> {
  const call = await graph(ctx, "containers", "GET", `/${ig}/content_publishing_limit`, { fields: "quota_usage,config" });
  if (!call.ok) return call.result;
  const first = Array.isArray(call.reply.body?.data) ? call.reply.body.data[0] : null;
  const entry = first && typeof first === "object" ? first as Record<string, unknown> : {};
  const config = entry.config && typeof entry.config === "object" ? entry.config as Record<string, unknown> : {};
  const usage = Number(entry.quota_usage);
  const total = positive(config.quota_total) ?? positive(config.quota_value);
  if (!Number.isFinite(usage) || entry.quota_usage === null || entry.quota_usage === undefined || total === null) {
    flag.quotaUnknown = true;
    return null;
  }
  if (usage < total) return null;
  const duration = positive(config.quota_duration);
  // quota_duration is the whole window (24 h); retry earlier, the oldest publication leaves it sooner.
  const retry = duration !== null ? Math.min(duration, DEFAULT_QUOTA_RETRY) : DEFAULT_QUOTA_RETRY;
  return failed("rate_limited", "transient", boundedDiagnostics({ step: "containers", quota_usage: usage, quota_total: total }), retry);
}

// Polls every container until FINISHED. null = all finished.
async function awaitFinished(ctx: PublishContext, step: string, ids: string[]): Promise<PublishResult | null> {
  for (let index = 0; index < ids.length; index += 1) {
    const id = ids[index];
    for (;;) {
      const call = await graph(ctx, step, "GET", `/${id}`, { fields: "status_code,status" });
      if (!call.ok) return call.result;
      const statusCode = typeof call.reply.body?.status_code === "string" ? call.reply.body.status_code : "";
      if (statusCode === "FINISHED") break;
      if (statusCode === "ERROR") {
        const status = typeof call.reply.body?.status === "string" ? call.reply.body.status : "";
        const subcode = status.match(/\b(2207\d{3})\b/u)?.[1];
        return failed("media_rejected", "action_required", boundedDiagnostics({
          step,
          status_code: statusCode,
          subcode: subcode ? Number(subcode) : undefined,
          status: status.replace(/[^\w :.\-]/gu, "").slice(0, 80) || undefined,
          index: ids.length > 1 ? index : undefined,
        }));
      }
      if (statusCode === "EXPIRED") {
        // Containers last 24 h: forget them so the retry creates new ones.
        await ctx.checkpoint("containers", {}, false);
        return failed("container_expired", "transient", { step, status_code: statusCode }, 30);
      }
      if (statusCode === "PUBLISHED") {
        // A container that is already published means a previous attempt got through.
        return outcomeUnknown(step, { status_code: statusCode });
      }
      if (ctx.now() + POLL_INTERVAL_MS > ctx.deadline) return transientProcessing(step);
      await ctx.sleep(POLL_INTERVAL_MS);
    }
  }
  return null;
}

// A previous attempt stopped after the side-effect checkpoint (the database normally turns that into
// needs_action before we are called again). We cannot know whether the media was published.
async function resumeAfterPublishing(ctx: PublishContext, state: InstagramState): Promise<PublishResult> {
  let containerStatus: string | undefined;
  if (isId(state.container)) {
    const call = await graph(ctx, "publishing", "GET", `/${state.container}`, { fields: "status_code" });
    if (call.ok && typeof call.reply.body?.status_code === "string") {
      containerStatus = idLike(call.reply.body.status_code);
    }
  }
  return outcomeUnknown("publishing", { reason: "resumed_after_publish_checkpoint", status_code: containerStatus });
}

async function run(ctx: PublishContext, flag: Flag): Promise<PublishResult> {
  const { target, payload } = ctx;
  const ig = target.accountExternalId;

  // First of all: a previous attempt that reached the irreversible call is always an unknown
  // outcome, whatever the account or the payload look like now.
  if (target.step === "publishing") {
    const raw = target.stepState;
    const children = Array.isArray(raw?.children) ? raw.children : [];
    return resumeAfterPublishing(ctx, {
      fp: "",
      children: children.filter(isId),
      container: isId(raw?.container) ? raw.container : null,
    });
  }

  if (!/^\d{1,30}$/u.test(ig)) return failed("invalid_account", "action_required", { step: "validate" });

  // 1. Validation, before any network call.
  const caption = instagramCaption(payload.text);
  const imageFailure = validateImages("instagram", payload.images);
  if (imageFailure) return validationResult(imageFailure, "validate");
  const textFailure = textValidationFailure("instagram", validateInstagramCaption(payload.text));
  if (textFailure) return validationResult(textFailure, "validate");
  const urls: string[] = [];
  for (const image of payload.images) {
    const url = asciiHttpsUrl(image.url);
    if (!url) return failed("media_url_invalid", "action_required", { step: "validate" });
    urls.push(url);
  }

  const fp = fingerprint([caption, ...urls]);
  const state = readState(target.stepState, fp);
  const resumeProcessing = target.step === "processing" && state.container !== null;

  if (!resumeProcessing) {
    // 2. Containers.
    if (state.children.length === 0 && state.container === null) {
      const limited = await checkQuota(ctx, ig, flag);
      if (limited) return limited;
    }

    if (urls.length === 1) {
      if (state.container === null) {
        if (ctx.now() >= ctx.deadline) return transientProcessing("containers");
        const created = await createContainer(ctx, ig, {
          image_url: urls[0],
          ...(caption ? { caption } : {}),
        });
        if ("result" in created) return created.result;
        state.container = created.id;
        await ctx.checkpoint("processing", toRecord(state), false);
      }
    } else {
      while (state.children.length < urls.length) {
        if (ctx.now() >= ctx.deadline) return transientProcessing("containers");
        const created = await createContainer(ctx, ig, {
          image_url: urls[state.children.length],
          is_carousel_item: "true",
        });
        if ("result" in created) return created.result;
        state.children.push(created.id);
        await ctx.checkpoint("containers", toRecord(state), false);
      }
      // The CAROUSEL container needs every child to be ready.
      const childrenReady = await awaitFinished(ctx, "containers", state.children);
      if (childrenReady) return childrenReady;
      if (state.container === null) {
        if (ctx.now() >= ctx.deadline) return transientProcessing("containers");
        const created = await createContainer(ctx, ig, {
          media_type: "CAROUSEL",
          children: state.children.join(","),
          ...(caption ? { caption } : {}),
        });
        if ("result" in created) return created.result;
        state.container = created.id;
        await ctx.checkpoint("processing", toRecord(state), false);
      }
    }
  }

  // 3. Processing.
  const container = state.container as string;
  const processed = await awaitFinished(ctx, "processing", [container]);
  if (processed) return processed;

  // 4. Publishing: the irreversible call. It needs its whole timeout: otherwise hand the target back
  // before the guard is set (state stays as checkpointed, no network call).
  if (ctx.deadline - ctx.now() < PUBLISH_TIMEOUT_MS + PUBLISH_MARGIN_MS) {
    return failed("processing", "transient", { step: "publishing", reason: "deadline" }, 30);
  }
  await ctx.checkpoint("publishing", toRecord(state), true);
  flag.sideEffectStarted = true;
  const published = await graph(ctx, "publishing", "POST", `/${ig}/media_publish`, { creation_id: container }, PUBLISH_TIMEOUT_MS);
  if (!published.ok) {
    // Only an allow-listed definitive rejection proves nothing was published; the database then
    // retries from step 'processing'. Everything else (network error, timeout, 5xx, code 1/2,
    // is_transient, 2207xxx, unlisted codes) may have published: never retry automatically.
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
  const rawId = published.reply.body?.id;
  const mediaId = typeof rawId === "number" ? String(rawId) : rawId;
  if (!isId(mediaId)) return outcomeUnknown("publishing", { reason: "missing_media_id", http: published.reply.status });

  // 5. Permalink, best effort: the post already exists.
  let permalink: string | null = null;
  try {
    const link = await graph(ctx, "permalink", "GET", `/${mediaId}`, { fields: "permalink" });
    const value = link.ok ? link.reply.body?.permalink : null;
    if (typeof value === "string" && value.startsWith("https://")) permalink = value;
  } catch {
    permalink = null;
  }
  return { outcome: "published", externalPostId: mediaId, permalink };
}

export const publishInstagram: Publisher = async (ctx) => {
  const flag: Flag = { sideEffectStarted: false, quotaUnknown: false };
  try {
    const result = await run(ctx, flag);
    return flag.quotaUnknown && result.outcome === "failed"
      ? { ...result, diagnostics: boundedDiagnostics({ ...result.diagnostics, quota_unknown: true }) }
      : result;
  } catch (error) {
    if (error instanceof LeaseLostError) throw error;
    // Unexpected failure: its message may embed anything, so only the class is reported.
    return flag.sideEffectStarted
      ? outcomeUnknown("publishing", { reason: "unexpected_error" })
      : failed("internal_error", "transient", { step: ctx.target.step ?? "start" });
  }
};
