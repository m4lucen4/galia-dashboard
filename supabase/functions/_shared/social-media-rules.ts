// Image requirements per network and the evaluation used by the client and the phase 4 publishers
// (S5, S19, S20; official requirements recorded in L6 of the migration document).
// Pure TypeScript: no Deno or Node APIs.
//
// Fix policy (S19):
//   ratio does not fit            -> needsCrop       (the user must crop)
//   format / weight / pixels / width -> needsConversion (a JPEG / resized copy is generated automatically)

export type SocialNetwork = "instagram" | "linkedin";

export const INSTAGRAM_MEDIA = {
  mimeTypes: ["image/jpeg"],
  maxBytes: 8 * 1024 * 1024, // 8 MB, inclusive
  minRatio: 0.8, // 4:5, inclusive
  maxRatio: 1.91, // 1.91:1, inclusive
  minWidth: 320,
  maxWidth: 1440,
  carouselMax: 20,
  // Carousel items are all cropped to the ratio of the first item; ratios may differ by this much.
  carouselRatioTolerance: 0.01,
} as const;

export const LINKEDIN_MEDIA = {
  mimeTypes: ["image/jpeg", "image/png", "image/gif"],
  pixelsLimit: 36_152_320, // exclusive: width * height must be < this
  multiImageMin: 2,
  multiImageMax: 20,
} as const;

// Video limits (task odd/tasks/social-video-publishing.md, contract T3). The project limits are also the
// table checks of project_videos and the bucket limit; the database enforces the story limits at schedule time.
export const VIDEO_MEDIA = {
  projectMinBytes: 75_000,
  projectMaxBytes: 100_000_000,
  projectMinDurationMs: 3_000,
  projectMaxDurationMs: 300_000,
  // Instagram video Stories (story_video).
  storyMaxBytes: 100_000_000,
  storyMaxDurationMs: 60_000,
  // LinkedIn upload part size (initializeUpload returns instructions in parts of this size).
  linkedinPartBytes: 4_194_304,
  // Time the network may keep processing the media before the target gives up.
  processingMaxMs: 60 * 60_000,
} as const;

export interface ImageFacts {
  mime: string;
  width: number;
  height: number;
  bytes: number;
}

export type ImageIssueCode =
  | "invalid_dimensions"
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
  // The measured value and the limit that was crossed, when they apply.
  actual?: number;
  limit?: number;
  // Position of the image in a carousel evaluation.
  index?: number;
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

/** Lowercase, no parameters, image/jpg treated as image/jpeg. */
export function normalizeMime(mime: string | null | undefined): string {
  const base = String(mime ?? "").split(";")[0].trim().toLowerCase();
  return base === "image/jpg" || base === "image/pjpeg" ? "image/jpeg" : base;
}

function finalize(issues: ImageIssue[]): ImageEvaluation {
  const needsCrop = issues.some((i) => i.code === "ratio_too_narrow" || i.code === "ratio_too_wide" || i.code === "ratio_mismatch");
  const needsConversion = issues.some((i) =>
    i.code === "unsupported_format" || i.code === "too_heavy" || i.code === "too_many_pixels" ||
    i.code === "width_too_small" || i.code === "width_too_large"
  );
  return { ok: issues.length === 0, needsCrop, needsConversion, issues };
}

function validFacts(image: ImageFacts): boolean {
  return Number.isFinite(image.width) && Number.isFinite(image.height) && Number.isFinite(image.bytes) &&
    image.width > 0 && image.height > 0 && image.bytes > 0;
}

/**
 * Evaluates one image against one network.
 * Instagram ratio is compared at two decimals (same as the database CHECK): 0.80 and 1.91 pass,
 * 0.79 and 1.92 do not.
 */
export function evaluateImage(network: SocialNetwork, image: ImageFacts): ImageEvaluation {
  if (!validFacts(image)) return finalize([{ code: "invalid_dimensions" }]);
  const issues: ImageIssue[] = [];
  const mime = normalizeMime(image.mime);

  if (network === "instagram") {
    if (!(INSTAGRAM_MEDIA.mimeTypes as readonly string[]).includes(mime)) issues.push({ code: "unsupported_format" });
    if (image.bytes > INSTAGRAM_MEDIA.maxBytes) {
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

  if (!(LINKEDIN_MEDIA.mimeTypes as readonly string[]).includes(mime)) issues.push({ code: "unsupported_format" });
  const pixels = image.width * image.height;
  if (pixels >= LINKEDIN_MEDIA.pixelsLimit) {
    issues.push({ code: "too_many_pixels", actual: pixels, limit: LINKEDIN_MEDIA.pixelsLimit });
  }
  return finalize(issues);
}

/**
 * Evaluates the images of one publication for one network, in publication order.
 * `items` holds each image's own evaluation; the top-level issues carry the item `index`.
 * Instagram: more than 20 items is an issue, and every item whose ratio differs from the first
 * one by more than 0.01 needs a crop to the first item's ratio. A single image is a plain post,
 * not a carousel. LinkedIn: 1 image uses the Images API, 2..20 MultiImage, more than 20 is an issue.
 */
export function evaluateCarousel(network: SocialNetwork, images: ImageFacts[]): CarouselEvaluation {
  const items = images.map((image) => evaluateImage(network, image));
  const issues: ImageIssue[] = [];
  items.forEach((item, index) => {
    for (const issue of item.issues) issues.push({ ...issue, index });
  });

  const max = network === "instagram" ? INSTAGRAM_MEDIA.carouselMax : LINKEDIN_MEDIA.multiImageMax;
  if (images.length > max) issues.push({ code: "too_many_items", actual: images.length, limit: max });
  if (network === "instagram" && images.length === 0) issues.push({ code: "no_images" });

  if (network === "instagram" && images.length > 1 && validFacts(images[0])) {
    const first = images[0].width / images[0].height;
    for (let index = 1; index < images.length; index += 1) {
      if (!validFacts(images[index])) continue;
      const ratio = images[index].width / images[index].height;
      if (Math.abs(ratio - first) > INSTAGRAM_MEDIA.carouselRatioTolerance + 1e-9) {
        issues.push({ code: "ratio_mismatch", index, actual: Number(ratio.toFixed(4)), limit: Number(first.toFixed(4)) });
      }
    }
  }

  return { ...finalize(issues), items };
}
