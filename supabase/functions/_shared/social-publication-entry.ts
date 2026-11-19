// Entry function support for publish-publication (S23): request parsing, closed error codes, the
// service-role store (Auth /user, RPCs, the owner's connections) and the worker wake.
//
// Identity comes from Supabase Auth /user, never from a decoded JWT. Rights and writes live in SQL
// (publication_targets_owner / _schedule / _retry / _reset, service_role only). Provider tokens are never
// read here: only the safe connection summary (status, account id, pages) is.
import { corsHeaders, jsonResponse } from "./publication-generation-errors.ts";
import type { Environment } from "./publication-generation-store.ts";
import { SocialError } from "./social-errors.ts";
import { asRecord, asString, type Fetcher, requiredEnv, socialFetch } from "./social-http.ts";
import type { PublishFormat } from "./social-publisher.ts";
import { createSocialStore } from "./social-store.ts";

export { corsHeaders, jsonResponse };
export type { Environment };

export const MAX_BODY_BYTES = 8192;

// ---------------------------------------------------------------------------------------------
// Closed error codes: only these messages cross the API boundary (never provider or database text).
// ---------------------------------------------------------------------------------------------

export const entryFailures = {
  invalid_request: [400, "La solicitud no es válida.", false],
  unauthorized: [401, "Inicia sesión para continuar.", false],
  forbidden: [403, "No tienes acceso a esta publicación.", false],
  conflict: [409, "La solicitud no corresponde a esta publicación.", false],
  invalid_project: [422, "La publicación no tiene un propietario válido. Revisa el proyecto.", false],
  run_at_out_of_range: [422, "La fecha de publicación debe estar entre ahora y un año como máximo.", false],
  in_progress: [409, "La publicación se está enviando ahora mismo. Inténtalo de nuevo en unos minutos.", true],
  already_published: [409, "Esta publicación ya se ha publicado. Vuelve a programarla para publicarla otra vez.", false],
  video_required: [422, "Elige un vídeo de la publicación antes de programarla en este formato.", false],
  video_limits: [422, "El vídeo no cumple los límites de este formato (las historias admiten hasta 60 s y 100 MB).", false],
  video_position_invalid: [422, "La posición elegida para el vídeo no es válida. Elige una posición dentro del carrusel.", false],
  story_image_invalid: [422, "La imagen elegida para la historia no es válida. Elige una de las fotos seleccionadas de la publicación.", false],
  not_retryable: [409, "Esta red social no se puede reintentar en su estado actual.", false],
  confirmation_required: [409, "Comprueba en la red social que no se publicó antes de reintentar y confirma.", false],
  account_not_connected: [409, "La cuenta de la red social no está conectada. Vuelve a conectarla en Ajustes.", false],
  account_not_allowed: [422, "La cuenta seleccionada no está disponible en tu conexión. Vuelve a elegirla.", false],
  internal_error: [500, "No se ha podido completar la operación.", true],
} as const;

export type EntryFailureCode = keyof typeof entryFailures;

export function isEntryFailureCode(value: unknown): value is EntryFailureCode {
  return typeof value === "string" && Object.hasOwn(entryFailures, value);
}

export class EntryError extends Error {
  readonly code: EntryFailureCode;

  constructor(code: EntryFailureCode) {
    super(code);
    this.code = code;
  }
}

export function entryFailure(error: unknown) {
  const code = error instanceof EntryError ? error.code : "internal_error";
  const [status, message, retryable] = entryFailures[code];
  return { status, body: { code, message, retryable } };
}

// Logs the code and the error class only: nothing from a provider, the database or a token.
export function logEntryError(error: unknown): void {
  const code = error instanceof EntryError ? error.code : "internal_error";
  const name = error instanceof Error ? error.name : typeof error;
  console.error(`[publish-publication] ${code} (${name})`);
}

// ---------------------------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------------------------

export type Network = "instagram" | "linkedin";
export type AccountKind = "instagram_business" | "linkedin_person" | "linkedin_organization";

export interface RequestedTarget {
  network: Network;
  accountKind: AccountKind;
  accountExternalId: string;
  accountName: string | null;
  /** Defaults to "image" when the request does not say (the client sends only image until T4). */
  format: PublishFormat;
  /**
   * The photo chosen for a story_image target: the image_data url (the original) of a published photo of the
   * publication; the database checks that. Absent = the first published photo. Only with format story_image.
   */
  storyImageUrl?: string;
  /**
   * carousel_video only: 0-based index of the video among the carousel items (0..number of published photos; the
   * database checks the upper bound). Absent = last. Any other format: 422 video_position_invalid.
   */
  videoPosition?: number;
}

export type EntryRequest =
  | { action: "schedule"; previewId: string; requestId: string; runAt: string; targets: RequestedTarget[]; acknowledge: boolean }
  | { action: "publishNow"; previewId: string; requestId: string; targets: RequestedTarget[]; acknowledge: boolean }
  | { action: "retry"; targetId: string; acknowledge: boolean }
  | { action: "reset"; previewId: string; acknowledge: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const PREVIEW_ID = /^[1-9]\d{0,18}$/u;
const EXTERNAL_ID = /^[A-Za-z0-9:_-]{1,100}$/u;
export const MAX_STORY_IMAGE_URL_LENGTH = 2000;
// Instagram carousels hold 20 items: at most 19 photos before the video.
export const MAX_VIDEO_POSITION = 19;
const KINDS_BY_NETWORK: Record<Network, readonly AccountKind[]> = {
  instagram: ["instagram_business"],
  linkedin: ["linkedin_person", "linkedin_organization"],
};

// Allowed formats per network (the database enforces the same pairs).
const FORMATS_BY_NETWORK: Record<Network, readonly PublishFormat[]> = {
  instagram: ["image", "reel", "story_image", "story_video", "carousel_video"],
  linkedin: ["image", "video"],
};

const invalid = () => new EntryError("invalid_request");

function exactKeys(value: Record<string, unknown>, allowed: readonly string[]): void {
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw invalid();
}

function parsePreviewId(value: unknown): string {
  const text = typeof value === "number" && Number.isSafeInteger(value) ? String(value) : value;
  if (typeof text !== "string" || !PREVIEW_ID.test(text) || BigInt(text) > 9223372036854775807n) throw invalid();
  return text;
}

function parseUuid(value: unknown): string {
  if (typeof value !== "string" || !UUID.test(value)) throw invalid();
  return value.toLowerCase();
}

function parseAcknowledge(value: unknown): boolean {
  if (value === undefined) return false;
  if (typeof value !== "boolean") throw invalid();
  return value;
}

// Strict ISO 8601 instant: date, "T", hh:mm[:ss[.ffffff]] and an explicit Z or +-hh:mm offset.
const RUN_AT_PARTS =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?(?:Z|([+-])(\d{2}):(\d{2}))$/u;

export function parseRunAt(value: unknown): string {
  if (typeof value !== "string" || value.length > 40) throw invalid();
  const match = RUN_AT_PARTS.exec(value);
  if (!match) throw invalid();
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw invalid();
  // Impossible calendar dates and times must not be "fixed" silently (2026-02-30 -> 2026-03-02, T24:00 ->
  // next day, offset +99:99): shift the instant back into the offset the caller used and require the very
  // same wall-clock digits.
  const [, year, month, day, hour, minute, second = "00", , sign, offsetHours = "00", offsetMinutes = "00"] = match;
  if (Number(offsetHours) > 23 || Number(offsetMinutes) > 59) throw invalid();
  const offsetMs = (sign === "-" ? -1 : 1) * (Number(offsetHours) * 60 + Number(offsetMinutes)) * 60_000;
  const wall = new Date(ms + offsetMs).toISOString();
  if (wall.slice(0, 19) !== `${year}-${month}-${day}T${hour}:${minute}:${second}`) throw invalid();
  // The database enforces the allowed range; this only normalises the instant.
  return new Date(ms).toISOString();
}

// An https url without whitespace or control characters, bounded. The value is not normalised: it must stay
// byte for byte equal to the url stored in image_data, which the database compares.
function parseStoryImageUrl(value: unknown): string {
  if (typeof value !== "string" || value.length > MAX_STORY_IMAGE_URL_LENGTH) throw new EntryError("story_image_invalid");
  if (!/^https:\/\/[^\s/\u0000-\u001f\u007f][^\s\u0000-\u001f\u007f]*$/u.test(value)) throw new EntryError("story_image_invalid");
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) throw new Error("url");
  } catch {
    throw new EntryError("story_image_invalid");
  }
  return value;
}

// A non-negative integer (JSON number) within the largest possible carousel; the database checks the exact range.
function parseVideoPosition(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > MAX_VIDEO_POSITION) {
    throw new EntryError("video_position_invalid");
  }
  return value;
}

function parseTargets(value: unknown): RequestedTarget[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 2) throw invalid();
  const seen = new Set<string>();
  return value.map((item) => {
    const row = asRecord(item);
    if (!row) throw invalid();
    exactKeys(row, ["network", "accountKind", "accountExternalId", "accountName", "format", "storyImageUrl", "videoPosition"]);
    const network = row.network;
    if (network !== "instagram" && network !== "linkedin") throw invalid();
    const kind = row.accountKind as AccountKind;
    if (!KINDS_BY_NETWORK[network].includes(kind) || seen.has(network)) throw invalid();
    seen.add(network);
    if (typeof row.accountExternalId !== "string" || !EXTERNAL_ID.test(row.accountExternalId)) throw invalid();
    let accountName: string | null = null;
    if (row.accountName !== undefined && row.accountName !== null) {
      if (typeof row.accountName !== "string" || row.accountName.length > 200) throw invalid();
      accountName = row.accountName.trim() || null;
    }
    let format: PublishFormat = "image";
    if (row.format !== undefined && row.format !== null) {
      if (typeof row.format !== "string" || !FORMATS_BY_NETWORK[network].includes(row.format as PublishFormat)) throw invalid();
      format = row.format as PublishFormat;
    }
    const target: RequestedTarget = { network, accountKind: kind, accountExternalId: row.accountExternalId, accountName, format };
    // null counts as absent. A choice is only meaningful for a story image.
    if (row.storyImageUrl !== undefined && row.storyImageUrl !== null) {
      if (format !== "story_image") throw new EntryError("story_image_invalid");
      target.storyImageUrl = parseStoryImageUrl(row.storyImageUrl);
    }
    // Same for the video position: only a carousel_video can place its video; null counts as absent.
    if (row.videoPosition !== undefined && row.videoPosition !== null) {
      if (format !== "carousel_video") throw new EntryError("video_position_invalid");
      target.videoPosition = parseVideoPosition(row.videoPosition);
    }
    return target;
  });
}

export function parseEntryRequest(body: unknown): EntryRequest {
  const row = asRecord(body);
  if (!row) throw invalid();
  switch (row.action) {
    case "schedule":
      exactKeys(row, ["action", "previewId", "requestId", "runAt", "targets", "acknowledgeUnknownOutcome"]);
      return {
        action: "schedule", previewId: parsePreviewId(row.previewId), requestId: parseUuid(row.requestId),
        runAt: parseRunAt(row.runAt), targets: parseTargets(row.targets),
        acknowledge: parseAcknowledge(row.acknowledgeUnknownOutcome),
      };
    case "publishNow":
      exactKeys(row, ["action", "previewId", "requestId", "targets", "acknowledgeUnknownOutcome"]);
      return {
        action: "publishNow", previewId: parsePreviewId(row.previewId), requestId: parseUuid(row.requestId),
        targets: parseTargets(row.targets), acknowledge: parseAcknowledge(row.acknowledgeUnknownOutcome),
      };
    case "retry":
      exactKeys(row, ["action", "targetId", "acknowledgeUnknownOutcome"]);
      return {
        action: "retry", targetId: parseUuid(row.targetId), acknowledge: parseAcknowledge(row.acknowledgeUnknownOutcome),
      };
    case "reset":
      exactKeys(row, ["action", "previewId", "acknowledgeUnknownOutcome"]);
      return {
        action: "reset", previewId: parsePreviewId(row.previewId),
        acknowledge: parseAcknowledge(row.acknowledgeUnknownOutcome),
      };
    default:
      throw invalid();
  }
}

// Reads at most MAX_BODY_BYTES: a declared or actual excess is refused without buffering the rest.
export async function readBoundedBody(request: Request): Promise<string> {
  const declared = request.headers.get("Content-Length");
  if (declared !== null && Number(declared) > MAX_BODY_BYTES) throw invalid();
  const reader = request.body?.getReader();
  if (!reader) throw invalid();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw invalid();
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw invalid();
  }
}

// ---------------------------------------------------------------------------------------------
// Accounts: the targets must belong to the publication OWNER's connections (their tokens publish).
// ---------------------------------------------------------------------------------------------

export interface OwnerConnection {
  status: string;
  accountId: string | null;
  accountName: string | null;
  pages: Array<{ id: string; name: string | null; type: string | null }>;
}

export function parseConnection(value: unknown): OwnerConnection | null {
  const row = asRecord(value);
  if (!row) return null;
  const status = asString(row.status);
  if (!status) throw new EntryError("internal_error");
  const pages = Array.isArray(row.pages) ? row.pages : [];
  return {
    status,
    accountId: asString(row.accountId),
    accountName: asString(row.accountName),
    pages: pages.flatMap((page) => {
      const item = asRecord(page);
      const id = asString(item?.id);
      return id ? [{ id, name: asString(item?.name), type: asString(item?.type) }] : [];
    }),
  };
}

export interface ValidatedTarget {
  network: Network;
  accountKind: AccountKind;
  accountExternalId: string;
  accountName: string | null;
  format: PublishFormat;
  /** Only present for a story_image target that chose its photo (kept out of the body otherwise). */
  storyImageUrl?: string;
  /** Only present for a carousel_video target that chose the position of its video. */
  videoPosition?: number;
}

const cleanName = (value: string | null) => value ? value.slice(0, 200) : null;

// connections: the owner's connection per network, null when there is none. Throws account_not_connected
// (no connection, or not connected/expiring) or account_not_allowed (the account is not one the connection
// can publish to). The stored account name replaces the one the browser sent.
export function validateTargets(
  connections: Record<Network, OwnerConnection | null>, targets: readonly RequestedTarget[],
): ValidatedTarget[] {
  return targets.map((target) => {
    const connection = connections[target.network];
    if (!connection || (connection.status !== "connected" && connection.status !== "expiring")) {
      throw new EntryError("account_not_connected");
    }
    const id = target.accountExternalId;
    let name: string | null;
    if (target.accountKind === "instagram_business") {
      const page = connection.pages.find((p) => p.id === id);
      if (!page) throw new EntryError("account_not_allowed");
      name = page.name;
    } else if (target.accountKind === "linkedin_organization") {
      const page = connection.pages.find((p) => p.id === id && p.type === "ORGANIZATION");
      if (!page) throw new EntryError("account_not_allowed");
      name = page.name;
    } else {
      // The member: the connection's own account id (or the member entry of its pages).
      const page = connection.pages.find((p) => p.id === id && p.type === "PERSON");
      if (connection.accountId !== id && !page) throw new EntryError("account_not_allowed");
      name = page?.name ?? connection.accountName;
    }
    return {
      network: target.network, accountKind: target.accountKind, accountExternalId: id,
      accountName: cleanName(name) ?? target.accountName, format: target.format,
      ...(target.storyImageUrl !== undefined ? { storyImageUrl: target.storyImageUrl } : {}),
      ...(target.videoPosition !== undefined ? { videoPosition: target.videoPosition } : {}),
    };
  });
}

// ---------------------------------------------------------------------------------------------
// Store (service role)
// ---------------------------------------------------------------------------------------------

export interface TargetsAnswer {
  targets: unknown[];
}

export function createEntryStore(env: Environment, fetcher: Fetcher = fetch) {
  const url = requiredEnv(env, "SUPABASE_URL").replace(/\/$/u, "");
  const serviceKey = requiredEnv(env, "SUPABASE_SERVICE_ROLE_KEY");
  const social = createSocialStore(env, fetcher);

  // Only the closed set of SQL messages is mapped; anything else is internal_error and the body
  // (which may carry database text) is dropped.
  async function rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
    let response: Response;
    try {
      response = await socialFetch(fetcher, `${url}/rest/v1/rpc/${name}`, {
        method: "POST",
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      throw new EntryError("internal_error");
    }
    let data: unknown;
    try { data = await response.json(); } catch { data = null; }
    if (!response.ok) {
      const message = asRecord(data)?.message;
      throw new EntryError(isEntryFailureCode(message) && message !== "internal_error" ? message : "internal_error");
    }
    return data as T;
  }

  function targetsOf(answer: unknown): TargetsAnswer {
    const targets = asRecord(answer)?.targets;
    if (!Array.isArray(targets)) throw new EntryError("internal_error");
    return { targets };
  }

  return {
    /** Supabase Auth /user is the only identity source. */
    async getUser(authorization: string): Promise<string> {
      try {
        return await social.getUser(authorization);
      } catch (error) {
        throw new EntryError(error instanceof SocialError && error.code === "unauthorized" ? "unauthorized" : "internal_error");
      }
    },

    /** Authorizes the actor and returns the publication owner (forbidden / invalid_project otherwise). */
    async owner(actor: string, previewId: string): Promise<string> {
      const owner = await rpc<unknown>("publication_targets_owner", { p_actor: actor, p_preview: previewId });
      if (typeof owner !== "string" || !UUID.test(owner)) throw new EntryError("internal_error");
      return owner;
    },

    async connection(owner: string, network: Network): Promise<OwnerConnection | null> {
      return parseConnection(await rpc<unknown>("social_connection_for_user", { p_user: owner, p_network: network }));
    },

    async schedule(
      actor: string, request: { previewId: string; requestId: string; runAt: string; acknowledge: boolean },
      targets: ValidatedTarget[],
    ): Promise<TargetsAnswer> {
      return targetsOf(await rpc("publication_targets_schedule", {
        p_actor: actor, p_preview: request.previewId, p_request: request.requestId, p_run_at: request.runAt,
        p_targets: targets, p_acknowledge_unknown_outcome: request.acknowledge,
      }));
    },

    async retry(actor: string, targetId: string, acknowledge: boolean): Promise<TargetsAnswer> {
      return targetsOf(await rpc("publication_target_retry", {
        p_actor: actor, p_target: targetId, p_acknowledge_unknown_outcome: acknowledge,
      }));
    },

    async reset(actor: string, previewId: string, acknowledge: boolean): Promise<TargetsAnswer> {
      return targetsOf(await rpc("publication_targets_reset", {
        p_actor: actor, p_preview: previewId, p_acknowledge_unknown_outcome: acknowledge,
      }));
    },
  };
}

export type EntryStore = ReturnType<typeof createEntryStore>;

// ---------------------------------------------------------------------------------------------
// Worker wake
// ---------------------------------------------------------------------------------------------

// Latency optimization only: the persisted target and the cron job remain the recovery path, so a
// missing configuration, a transport failure or a slow worker never touches the user's answer.
// Same shape as the generation wake: https only, bounded by the worker's own run time.
export async function wakePublicationWorker(env: Environment, fetcher: Fetcher): Promise<void> {
  try {
    const secret = env("SOCIAL_WORKER_SECRET");
    const base = env("SUPABASE_URL");
    if (!base || !secret || !/^[0-9a-f]{64}$/iu.test(secret)) return;
    const target = new URL("/functions/v1/process-publication-targets", base);
    if (target.protocol !== "https:" || target.username || target.password) return;
    const response = await fetcher(target.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Social-Worker-Secret": secret },
      body: "{}",
      redirect: "error",
      signal: AbortSignal.timeout(145000),
    });
    // Do not read or expose the worker's answer.
    await response.body?.cancel();
  } catch {
    // The cron worker picks the target up.
  }
}
