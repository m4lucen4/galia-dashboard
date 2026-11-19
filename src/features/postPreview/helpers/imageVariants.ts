import {
  aspectKeyFor,
  INSTAGRAM_MEDIA,
  LINKEDIN_MEDIA,
  VARIANT_MAX_BYTES,
  type CropAspectKey,
  type SocialNetwork,
} from "./socialMediaRules";
import {
  adjustmentValue,
  applyTone,
  correctedCanvas,
  normalizeAdjustments,
  rotatedCanvas,
  rotatedSize,
  type ImageAdjustments,
} from "./imageAdjustments";

export type { ImageAdjustments } from "./imageAdjustments";

/** Longest side of the working copy when the image is straightened or its perspective corrected. */
export const TRANSFORM_MAX_SIDE = 4096;
/** Area cap of the rotated working canvas (iOS Safari refuses canvases over ~16.7 M px). */
const TRANSFORM_MAX_PIXELS = 16_000_000;

/** Longest side of the working copy so that its rotated bounding box stays under the area cap. */
function workingMaxSide(width: number, height: number, rotation: number): number {
  const box = rotatedSize(width, height, rotation);
  const areaScale = Math.sqrt(TRANSFORM_MAX_PIXELS / (box.width * box.height));
  return Math.min(TRANSFORM_MAX_SIDE, Math.floor(Math.max(width, height) * Math.min(1, areaScale)));
}

/** Crop rectangle in pixels of the original image. */
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** What publication_media_variants.crop stores. */
export interface VariantCrop extends CropArea {
  aspect: CropAspectKey;
}

export interface RenderedVariant {
  blob: Blob;
  width: number;
  height: number;
  bytes: number;
  crop: VariantCrop;
  /** Normalized adjustments baked into the blob; null: none. */
  adjustments: ImageAdjustments | null;
}

const JPEG_QUALITIES = [0.9, 0.8, 0.7, 0.6, 0.5];
const MAX_SCALE_ROUNDS = 6;

export const clampRatio = (ratio: number, min: number, max: number) =>
  Math.min(max, Math.max(min, ratio));

/** Instagram ratio range clamp. */
export const clampInstagramRatio = (ratio: number) =>
  clampRatio(ratio, INSTAGRAM_MEDIA.minRatio, INSTAGRAM_MEDIA.maxRatio);

/** Largest centred rectangle of the given aspect inside an image. */
export function centeredCrop(width: number, height: number, aspect: number): CropArea {
  const imageRatio = width / height;
  if (imageRatio > aspect) {
    const cropWidth = Math.round(height * aspect);
    return { x: Math.round((width - cropWidth) / 2), y: 0, width: cropWidth, height };
  }
  const cropHeight = Math.round(width / aspect);
  return { x: 0, y: Math.round((height - cropHeight) / 2), width, height: cropHeight };
}

/**
 * Output size of a crop for a network. `scale` (<= 1) shrinks it further to reach the weight
 * limit; Instagram never goes under its minimum width.
 */
export function planOutputSize(
  network: SocialNetwork,
  cropWidth: number,
  cropHeight: number,
  scale = 1,
): { width: number; height: number } {
  if (network === "instagram") {
    const width = Math.min(
      INSTAGRAM_MEDIA.maxWidth,
      Math.max(INSTAGRAM_MEDIA.minWidth, Math.round(cropWidth * scale)),
    );
    let height = Math.round((width * cropHeight) / cropWidth);
    // Keep the rounded size inside the accepted ratio range.
    if (width / height < INSTAGRAM_MEDIA.minRatio) height = Math.floor(width / INSTAGRAM_MEDIA.minRatio);
    if (width / height > INSTAGRAM_MEDIA.maxRatio) height = Math.ceil(width / INSTAGRAM_MEDIA.maxRatio);
    return { width, height };
  }
  let width = cropWidth * scale;
  let height = cropHeight * scale;
  // Facebook has no pixel rule: only the weight is lowered (scale) when needed.
  if (network === "linkedin" && width * height >= LINKEDIN_MEDIA.pixelsLimit) {
    const reduce = Math.sqrt((LINKEDIN_MEDIA.pixelsLimit - 1) / (width * height)) * 0.99;
    width *= reduce;
    height *= reduce;
  }
  return { width: Math.max(1, Math.floor(width)), height: Math.max(1, Math.floor(height)) };
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("encode"))),
      "image/jpeg",
      quality,
    );
  });
}

/**
 * Renders the cropped area of an original as a JPEG derivative: quality 0.9, transparency
 * flattened on white, scaled into the network limits (Instagram width 320-1440, LinkedIn pixels
 * under the limit, Facebook as is) and re-encoded at lower quality (then smaller) while it weighs more than 8 MB.
 *
 * Adjustments (image-adjustments S2): the vertical correction and the rotation transform the whole
 * image first (working copy of at most TRANSFORM_MAX_SIDE px); `area` is in pixels of the rotated
 * bounding box of the original natural size, as the cropper reports it. Tone is applied last, on
 * the output pixels.
 */
export async function renderVariant(
  image: HTMLImageElement,
  network: SocialNetwork,
  area: CropArea,
  aspect: number,
  adjustments: ImageAdjustments | null = null,
): Promise<RenderedVariant> {
  const normalized = normalizeAdjustments(adjustments);
  const vertical = adjustmentValue(normalized, "vertical");
  const rotation = adjustmentValue(normalized, "rotation");
  // Stage: what the crop area refers to, and its scale from the original natural size.
  let stage: CanvasImageSource = image;
  let stageWidth = image.naturalWidth;
  let stageHeight = image.naturalHeight;
  let stageScale = 1;
  if (vertical !== 0 || rotation !== 0) {
    const corrected = correctedCanvas(
      image,
      vertical,
      workingMaxSide(image.naturalWidth, image.naturalHeight, rotation),
    );
    const rotated = rotatedCanvas(corrected.canvas, rotation);
    stage = rotated;
    stageWidth = rotated.width;
    stageHeight = rotated.height;
    stageScale = corrected.scale;
  }

  const scaled: CropArea = {
    x: area.x * stageScale,
    y: area.y * stageScale,
    width: area.width * stageScale,
    height: area.height * stageScale,
  };
  const source: CropArea = {
    x: Math.max(0, Math.min(scaled.x, stageWidth - 1)),
    y: Math.max(0, Math.min(scaled.y, stageHeight - 1)),
    width: 0,
    height: 0,
  };
  source.width = Math.max(1, Math.min(scaled.width, stageWidth - source.x));
  source.height = Math.max(1, Math.min(scaled.height, stageHeight - source.y));
  // The stored crop stays in pixels of the original natural size (rotated box), as the cropper reports it.
  const storedCrop: CropArea =
    stageScale === 1
      ? source
      : {
          x: source.x / stageScale,
          y: source.y / stageScale,
          width: source.width / stageScale,
          height: source.height / stageScale,
        };
  // Output size from the crop in the stage: a reduced working copy is never upsampled.
  const planWidth = source.width;
  const planHeight = source.height;

  let scale = 1;
  for (let round = 0; round < MAX_SCALE_ROUNDS; round += 1) {
    const { width, height } = planOutputSize(network, planWidth, planHeight, scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.imageSmoothingQuality = "high";
    context.drawImage(stage, source.x, source.y, source.width, source.height, 0, 0, width, height);
    applyTone(canvas, normalized);

    for (const quality of JPEG_QUALITIES) {
      const blob = await canvasToJpeg(canvas, quality);
      if (blob.size <= VARIANT_MAX_BYTES) {
        return {
          blob,
          width,
          height,
          bytes: blob.size,
          crop: { ...storedCrop, aspect: aspectKeyFor(aspect) },
          adjustments: normalized,
        };
      }
    }
    scale *= 0.8;
  }
  throw new Error("too_heavy");
}
