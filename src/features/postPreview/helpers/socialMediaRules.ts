// Client mirror of supabase/functions/_shared/social-media-rules.ts (S5, S19, S20).
// Same limits, same issue codes, same fix policy:
//   ratio does not fit                      -> needsCrop       (the user must crop)
//   format / weight / pixels / width        -> needsConversion (a JPEG / resized copy is generated)
// Unlike the server, the browser may not know the weight or the format of an image (HEAD request
// blocked, no extension); an unknown value is skipped instead of reported.

import { SOCIAL_PUBLISHING_EDGE_ENABLED } from "@/helpers/publishDate";

export type SocialNetwork = "instagram" | "linkedin";

/**
 * Switch for the cropper, the automatic conversion and the blocking rule (S18). Off by default.
 * The cutover switch VITE_SOCIAL_PUBLISHING_EDGE also turns it on (S23): variants are only
 * published by the Edge pipeline, so both go live together.
 */
export const SOCIAL_MEDIA_VARIANTS_ENABLED =
  import.meta.env.VITE_SOCIAL_MEDIA_VARIANTS === "true" ||
  SOCIAL_PUBLISHING_EDGE_ENABLED;

export const INSTAGRAM_MEDIA = {
  mimeTypes: ["image/jpeg"],
  maxBytes: 8 * 1024 * 1024, // 8 MB, inclusive
  minRatio: 0.8, // 4:5, inclusive
  maxRatio: 1.91, // 1.91:1, inclusive
  minWidth: 320,
  maxWidth: 1440,
  carouselMax: 20,
  carouselRatioTolerance: 0.01,
} as const;

export const LINKEDIN_MEDIA = {
  mimeTypes: ["image/jpeg", "image/png", "image/gif"],
  pixelsLimit: 36_152_320, // exclusive: width * height must be < this
  multiImageMin: 2,
  multiImageMax: 20,
} as const;

/** Every derivative is JPEG and the bucket publication-variants accepts at most 8 MB. */
export const VARIANT_MAX_BYTES = 8 * 1024 * 1024;

export type ImageIssueCode =
  | "unsupported_format"
  | "too_heavy"
  | "too_many_pixels"
  | "width_too_small"
  | "width_too_large"
  | "ratio_too_narrow"
  | "ratio_too_wide"
  | "ratio_mismatch"
  | "too_many_items"
  | "no_images";

export interface ImageIssue {
  code: ImageIssueCode;
  actual?: number;
  limit?: number;
  /** Position of the image in the carousel evaluation. */
  index?: number;
}

export interface ImageFacts {
  width: number;
  height: number;
  /** null when the weight could not be read. */
  bytes: number | null;
  /** Normalised mime type; null when it could not be determined. */
  mime: string | null;
}

export interface ImageEvaluation {
  ok: boolean;
  needsCrop: boolean;
  needsConversion: boolean;
  issues: ImageIssue[];
}

export interface CarouselEvaluation extends ImageEvaluation {
  items: ImageEvaluation[];
}

const CROP_CODES: ImageIssueCode[] = ["ratio_too_narrow", "ratio_too_wide", "ratio_mismatch"];
const CONVERSION_CODES: ImageIssueCode[] = [
  "unsupported_format",
  "too_heavy",
  "too_many_pixels",
  "width_too_small",
  "width_too_large",
];

/** Lowercase, no parameters, image/jpg treated as image/jpeg. */
export function normalizeMime(mime: string | null | undefined): string {
  const base = String(mime ?? "").split(";")[0].trim().toLowerCase();
  return base === "image/jpg" || base === "image/pjpeg" ? "image/jpeg" : base;
}

const EXTENSION_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jpe: "image/jpeg",
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

/** Mime type guessed from the URL extension; null when there is none or it is unknown. */
export function mimeFromUrl(url: string): string | null {
  try {
    const { pathname } = new URL(url);
    const match = /\.([a-z0-9]+)$/i.exec(pathname);
    return match ? (EXTENSION_MIME[match[1].toLowerCase()] ?? null) : null;
  } catch {
    return null;
  }
}

function finalize(issues: ImageIssue[]): ImageEvaluation {
  return {
    ok: issues.length === 0,
    needsCrop: issues.some((issue) => CROP_CODES.includes(issue.code)),
    needsConversion: issues.some((issue) => CONVERSION_CODES.includes(issue.code)),
    issues,
  };
}

const validSize = (image: ImageFacts) =>
  Number.isFinite(image.width) &&
  Number.isFinite(image.height) &&
  image.width > 0 &&
  image.height > 0;

/** Evaluates one image against one network (Instagram ratio compared at two decimals). */
export function evaluateImage(network: SocialNetwork, image: ImageFacts): ImageEvaluation {
  if (!validSize(image)) return finalize([]);
  const issues: ImageIssue[] = [];
  const mime = image.mime === null ? null : normalizeMime(image.mime);

  if (network === "instagram") {
    if (mime !== null && !(INSTAGRAM_MEDIA.mimeTypes as readonly string[]).includes(mime)) {
      issues.push({ code: "unsupported_format" });
    }
    if (image.bytes !== null && image.bytes > INSTAGRAM_MEDIA.maxBytes) {
      issues.push({ code: "too_heavy", actual: image.bytes, limit: INSTAGRAM_MEDIA.maxBytes });
    }
    if (image.width < INSTAGRAM_MEDIA.minWidth) {
      issues.push({ code: "width_too_small", actual: image.width, limit: INSTAGRAM_MEDIA.minWidth });
    }
    if (image.width > INSTAGRAM_MEDIA.maxWidth) {
      issues.push({ code: "width_too_large", actual: image.width, limit: INSTAGRAM_MEDIA.maxWidth });
    }
    const hundredths = Math.round((image.width * 100) / image.height);
    if (hundredths < Math.round(INSTAGRAM_MEDIA.minRatio * 100)) {
      issues.push({ code: "ratio_too_narrow", actual: hundredths / 100, limit: INSTAGRAM_MEDIA.minRatio });
    } else if (hundredths > Math.round(INSTAGRAM_MEDIA.maxRatio * 100)) {
      issues.push({ code: "ratio_too_wide", actual: hundredths / 100, limit: INSTAGRAM_MEDIA.maxRatio });
    }
    return finalize(issues);
  }

  if (mime !== null && !(LINKEDIN_MEDIA.mimeTypes as readonly string[]).includes(mime)) {
    issues.push({ code: "unsupported_format" });
  }
  const pixels = image.width * image.height;
  if (pixels >= LINKEDIN_MEDIA.pixelsLimit) {
    issues.push({ code: "too_many_pixels", actual: pixels, limit: LINKEDIN_MEDIA.pixelsLimit });
  }
  return finalize(issues);
}

/**
 * Evaluates the images of one publication for one network, in publication order. A null entry is
 * an image that could not be measured: it is skipped. Instagram: more than 20 items is an issue
 * and every item whose ratio differs from the first by more than 0.01 needs a crop. LinkedIn:
 * more than 20 is an issue.
 *
 * `options.referenceRatio` (Instagram, 2+ images) replaces the first image's ratio as the common
 * ratio of the carousel (the one the user chose in the adjuster): then every item is compared
 * against it, the first one included (unless it already reports a range issue).
 */
export function evaluateCarousel(
  network: SocialNetwork,
  images: Array<ImageFacts | null>,
  options: { referenceRatio?: number } = {},
): CarouselEvaluation {
  const items = images.map((image) => (image ? evaluateImage(network, image) : finalize([])));
  const issues: ImageIssue[] = [];
  items.forEach((item, index) => {
    for (const issue of item.issues) issues.push({ ...issue, index });
  });

  const max = network === "instagram" ? INSTAGRAM_MEDIA.carouselMax : LINKEDIN_MEDIA.multiImageMax;
  if (images.length > max) issues.push({ code: "too_many_items", actual: images.length, limit: max });
  if (network === "instagram" && images.length === 0) issues.push({ code: "no_images" });

  const first = images[0];
  const reference =
    options.referenceRatio ?? (first && validSize(first) ? first.width / first.height : null);
  if (network === "instagram" && images.length > 1 && reference !== null && reference > 0) {
    // Without an explicit reference the first image is the reference itself.
    const start = options.referenceRatio === undefined ? 1 : 0;
    for (let index = start; index < images.length; index += 1) {
      const image = images[index];
      if (!image || !validSize(image)) continue;
      if (index === 0 && items[0].needsCrop) continue;
      const ratio = image.width / image.height;
      if (Math.abs(ratio - reference) > INSTAGRAM_MEDIA.carouselRatioTolerance + 1e-9) {
        issues.push({
          code: "ratio_mismatch",
          index,
          actual: Number(ratio.toFixed(4)),
          limit: Number(reference.toFixed(4)),
        });
      }
    }
  }

  return { ...finalize(issues), items };
}

/** Same simple-fraction label as the warnings use: "2:3", "16:9"; "1.37:1" when no simple fraction. */
export function ratioLabel(ratio: number, locale?: string): string {
  if (!Number.isFinite(ratio) || ratio <= 0) return "";
  for (let denominator = 1; denominator <= 20; denominator += 1) {
    const numerator = Math.round(ratio * denominator);
    if (numerator >= 1 && numerator <= 20 && Math.abs(numerator / denominator - ratio) < 0.004) {
      const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
      const divisor = gcd(numerator, denominator);
      return `${numerator / divisor}:${denominator / divisor}`;
    }
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(ratio)}:1`;
}

/** Preset ratios of the crop dialog, in the keys the database stores in crop.aspect. */
export type CropAspectKey = "1:1" | "4:5" | "1.91:1" | "original";

export const ASPECT_VALUES: Record<Exclude<CropAspectKey, "original">, number> = {
  "1:1": 1,
  "4:5": 0.8,
  "1.91:1": 1.91,
};

/** crop.aspect for a ratio: the matching preset, else "original". */
export function aspectKeyFor(ratio: number): CropAspectKey {
  for (const [key, value] of Object.entries(ASPECT_VALUES)) {
    if (Math.abs(ratio - value) < 0.005) return key as CropAspectKey;
  }
  return "original";
}

// --- Video formats (VITE_SOCIAL_VIDEO, task odd/tasks/social-video-publishing.md T4) ---------------
// Client-only checks of the publication's video for the format chosen in a network. Limits mirror
// the schedule-time limits of publication_targets_schedule (docs/social-publishing.md): the
// project limits (3 s - 5 min, 100 MB) are already enforced when the video is uploaded.

/** Instagram video Stories (`story_video`): at most 60 s and 100 MB. */
export const INSTAGRAM_STORY_VIDEO = { maxDurationMs: 60_000, maxBytes: 100_000_000 } as const;

/** Reels and Stories are 9:16; a ratio within this distance of 9/16 counts as vertical. */
export const VERTICAL_RATIO = 9 / 16;
export const VERTICAL_RATIO_TOLERANCE = 0.02;

export type VideoIssueCode =
  | "story_too_long"
  | "story_too_heavy"
  | "not_faststart"
  | "not_vertical"
  // carousel_video: the video is the first item and its ratio differs from the first photo's.
  | "carousel_first_crop";

export interface VideoIssue {
  code: VideoIssueCode;
  actual?: number;
  limit?: number;
}

/** What the browser knows about the publication's video (columns of public.project_videos). */
export interface VideoFacts {
  durationMs: number;
  bytes: number;
  width: number;
  height: number;
  faststart: boolean;
}

/** The video-only formats of the publication targets (`carousel_video` also has photos). */
export const isVideoFormat = (format: string | null | undefined): boolean =>
  format === "reel" || format === "story_video" || format === "video";

/** What the carousel check needs to know about the photos and the chosen video position. */
export interface CarouselVideoContext {
  /** The video is the first item of the carousel. */
  videoFirst: boolean;
  /** Ratio (width / height) of the first photo as the network would receive it; null if unknown. */
  firstPhotoRatio: number | null;
}

/**
 * Issues of the video for one network and format. All of them are warnings except the story limits,
 * which the server refuses (`video_limits`) and the format selector therefore disables.
 * `carousel` is only used by `carousel_video`.
 */
export function evaluateVideo(
  network: SocialNetwork,
  format: "reel" | "story_video" | "video" | "carousel_video",
  facts: VideoFacts,
  carousel?: CarouselVideoContext,
): VideoIssue[] {
  const issues: VideoIssue[] = [];
  if (format === "story_video") {
    if (facts.durationMs > INSTAGRAM_STORY_VIDEO.maxDurationMs) {
      issues.push({
        code: "story_too_long",
        actual: facts.durationMs,
        limit: INSTAGRAM_STORY_VIDEO.maxDurationMs,
      });
    }
    if (facts.bytes > INSTAGRAM_STORY_VIDEO.maxBytes) {
      issues.push({
        code: "story_too_heavy",
        actual: facts.bytes,
        limit: INSTAGRAM_STORY_VIDEO.maxBytes,
      });
    }
  }
  // Instagram downloads the file itself and needs the moov atom first; LinkedIn uploads it in parts.
  if (network === "instagram" && !facts.faststart) issues.push({ code: "not_faststart" });
  if (
    (format === "reel" || format === "story_video") &&
    facts.width > 0 &&
    facts.height > 0 &&
    Math.abs(facts.width / facts.height - VERTICAL_RATIO) > VERTICAL_RATIO_TOLERANCE
  ) {
    issues.push({ code: "not_vertical", actual: Number((facts.width / facts.height).toFixed(4)) });
  }
  // Instagram crops every item of a carousel to the ratio of the first one (L37): only a video in
  // first place that does not match the first photo changes how the photos look.
  if (
    format === "carousel_video" &&
    carousel?.videoFirst &&
    carousel.firstPhotoRatio !== null &&
    facts.width > 0 &&
    facts.height > 0
  ) {
    const videoRatio = facts.width / facts.height;
    if (
      Math.abs(videoRatio - carousel.firstPhotoRatio) >
      INSTAGRAM_MEDIA.carouselRatioTolerance + 1e-9
    ) {
      issues.push({
        code: "carousel_first_crop",
        actual: Number(videoRatio.toFixed(4)),
        limit: Number(carousel.firstPhotoRatio.toFixed(4)),
      });
    }
  }
  return issues;
}
