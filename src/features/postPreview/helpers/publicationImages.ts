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

const HEAD_TIMEOUT_MS = 10_000;
const cache = new Map<string, Promise<ImageMeasurement>>();

function loadImage(url: string, anonymous: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (anonymous) image.crossOrigin = "anonymous";
    image.onload = () => {
      if (image.naturalWidth > 0 && image.naturalHeight > 0) resolve(image);
      else reject(new Error("load"));
    };
    image.onerror = () => reject(new Error("load"));
    image.src = url;
  });
}

/** Loads an image so that it can be drawn on a canvas (CORS enabled). Rejects when it cannot. */
export const loadCorsImage = (url: string) => loadImage(url, true);

async function readHeaders(url: string): Promise<{ bytes: number | null; mime: string | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEAD_TIMEOUT_MS);
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
    // CORS-blocked or offline: the extension fallback applies.
    return { bytes: null, mime: null };
  } finally {
    clearTimeout(timeout);
  }
}

async function measure(url: string): Promise<ImageMeasurement> {
  const loaded = loadImage(url, true)
    .then((image) => ({ image, corsOk: true }))
    // Dimensions can still be read without CORS; only the canvas export is lost.
    .catch(() => loadImage(url, false).then((image) => ({ image, corsOk: false })));
  const [{ image, corsOk }, head] = await Promise.all([loaded, readHeaders(url)]);
  return {
    url,
    width: image.naturalWidth,
    height: image.naturalHeight,
    bytes: head.bytes,
    mime: head.mime ?? mimeFromUrl(url),
    corsOk,
  };
}

/** Measures an image once per URL; failures are not cached so the next call retries. */
export function measureImage(url: string): Promise<ImageMeasurement> {
  const cached = cache.get(url);
  if (cached) return cached;
  const pending = measure(url);
  cache.set(url, pending);
  pending.catch(() => cache.delete(url));
  return pending;
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
