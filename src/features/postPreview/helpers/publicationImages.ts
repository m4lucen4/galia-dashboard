import type { PreviewProjectDataProps, ProjectImageData } from "@/types";
import { mimeFromUrl, normalizeMime } from "./socialMediaRules";

/**
 * The images that get published, in order: same rule as the publish payload
 * (image_data entries whose status is not "not_selected").
 */
export function publishedImages(
  project: Pick<PreviewProjectDataProps, "image_data"> | null | undefined,
): ProjectImageData[] {
  return (project?.image_data ?? []).filter((image) => image.status !== "not_selected");
}

export interface ImageMeasurement {
  url: string;
  width: number;
  height: number;
  /** Weight from the Content-Length header; null when the server did not tell. */
  bytes: number | null;
  /** Normalised mime type from Content-Type, else the URL extension; null when unknown. */
  mime: string | null;
  /** False when the browser may display the image but not draw it on a canvas (no CORS). */
  corsOk: boolean;
}

/** Per-image budget for the image load and for the HEAD request (D2). */
export const MEASURE_TIMEOUT_MS = 15_000;
/** At most this many images are measured at the same time, across the whole session. */
export const MEASURE_CONCURRENCY = 3;

export type MeasureFailureKind = "load" | "timeout";

export class MeasureError extends Error {
  readonly kind: MeasureFailureKind;
  constructor(kind: MeasureFailureKind) {
    super(kind);
    this.name = "MeasureError";
    this.kind = kind;
  }
}

/** "timeout" when the image did not load in time, else "load". */
export const failureKind = (error: unknown): MeasureFailureKind =>
  error instanceof MeasureError ? error.kind : "load";

// Successful measurements (and those in flight) are cached per URL for the session. Failures are
// cached too, so reopening the configuration does not hit a broken URL again; the user clears
// them one image at a time with forgetMeasurement ("Reintentar").
const cache = new Map<string, Promise<ImageMeasurement>>();
const failures = new Map<string, MeasureError>();

function loadImage(
  url: string,
  anonymous: boolean,
  timeoutMs: number = MEASURE_TIMEOUT_MS,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (timeoutMs <= 0) {
      reject(new MeasureError("timeout"));
      return;
    }
    const image = new Image();
    const release = () => {
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
    };
    const timer = setTimeout(() => {
      release();
      image.src = ""; // stop the download
      reject(new MeasureError("timeout"));
    }, timeoutMs);
    if (anonymous) image.crossOrigin = "anonymous";
    image.onload = () => {
      release();
      if (image.naturalWidth > 0 && image.naturalHeight > 0) resolve(image);
      else reject(new MeasureError("load"));
    };
    image.onerror = () => {
      release();
      reject(new MeasureError("load"));
    };
    image.src = url;
  });
}

/** Loads an image so that it can be drawn on a canvas (CORS enabled). Rejects when it cannot. */
export const loadCorsImage = (url: string) => loadImage(url, true);

async function readHeaders(url: string): Promise<{ bytes: number | null; mime: string | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MEASURE_TIMEOUT_MS);
  try {
    const response = await fetch(url, { method: "HEAD", signal: controller.signal });
    if (!response.ok) return { bytes: null, mime: null };
    const length = Number(response.headers.get("content-length"));
    const mime = normalizeMime(response.headers.get("content-type"));
    return {
      bytes: Number.isFinite(length) && length > 0 ? length : null,
      mime: mime.startsWith("image/") ? mime : null,
    };
  } catch {
    // CORS-blocked, offline or timed out: the extension fallback applies.
    return { bytes: null, mime: null };
  } finally {
    clearTimeout(timeout);
  }
}

async function measure(url: string): Promise<ImageMeasurement> {
  const deadline = Date.now() + MEASURE_TIMEOUT_MS;
  const loaded = loadImage(url, true, MEASURE_TIMEOUT_MS)
    .then((image) => ({ image, corsOk: true }))
    .catch((error) => {
      // A timeout is final. Any other failure: dimensions can still be read without CORS, only
      // the canvas export is lost (within what is left of the same 15 s budget).
      if (failureKind(error) === "timeout") throw error;
      return loadImage(url, false, deadline - Date.now()).then((image) => ({
        image,
        corsOk: false,
      }));
    });
  // readHeaders never rejects; waiting for it keeps the HEAD inside this measurement's slot even
  // when the image load fails first.
  const [outcome, head] = await Promise.all([
    loaded.then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    ),
    readHeaders(url),
  ]);
  if ("error" in outcome) throw outcome.error;
  const { image, corsOk } = outcome.value;
  return {
    url,
    width: image.naturalWidth,
    height: image.naturalHeight,
    bytes: head.bytes,
    mime: head.mime ?? mimeFromUrl(url),
    corsOk,
  };
}

// Concurrency limiter shared by every caller.
let running = 0;
const waiting: Array<() => void> = [];

function runLimited<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const start = () => {
      running += 1;
      task()
        .then(resolve, reject)
        .finally(() => {
          running -= 1;
          waiting.shift()?.();
        });
    };
    if (running < MEASURE_CONCURRENCY) start();
    else waiting.push(start);
  });
}

/**
 * Measures an image once per URL (3 at a time, 15 s each). Both successes and failures are cached
 * for the session; forgetMeasurement(url) clears them so the next call measures again.
 */
export function measureImage(url: string): Promise<ImageMeasurement> {
  const failed = failures.get(url);
  if (failed) return Promise.reject(failed);
  const cached = cache.get(url);
  if (cached) return cached;
  const pending = runLimited(() => measure(url));
  cache.set(url, pending);
  pending.catch((error) => {
    // Only if it is still the same attempt (forgetMeasurement may have replaced it).
    if (cache.get(url) !== pending) return;
    cache.delete(url);
    failures.set(url, error instanceof MeasureError ? error : new MeasureError("load"));
  });
  return pending;
}

/** Drops the cached result (success or failure) of one image: the manual "Reintentar" (D2/D3). */
export function forgetMeasurement(url: string): void {
  cache.delete(url);
  failures.delete(url);
}

/** "5.3 MB" / "820 KB" in the given locale. */
export function formatBytes(bytes: number, locale?: string): string {
  const format = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
  if (bytes >= 1024 * 1024) return `${format(bytes / (1024 * 1024))} MB`;
  return `${format(Math.max(1, bytes / 1024))} KB`;
}

/** "PNG", "WEBP", "JPEG" from a mime type. */
export function formatLabel(mime: string): string {
  const subtype = mime.split("/")[1] ?? mime;
  return subtype.replace(/\+.*$/, "").toUpperCase();
}
