/**
 * Image adjustments of a publication variant (odd/tasks/image-adjustments.md, S2): tone (brightness,
 * contrast, saturation, warmth), straighten (rotation) and vertical perspective correction. Pure
 * math plus the canvas passes used by renderVariant; the dialog previews the same values.
 */

/** What publication_media_variants.adjustments stores. Every key optional; absent means 0. */
export interface ImageAdjustments {
  /** -100..100: -1..+1 stop. */
  brightness?: number;
  /** -100..100. */
  contrast?: number;
  /** -100..100: -100 is black and white. */
  saturation?: number;
  /** -100..100: negative is cooler (blue), positive warmer (amber). */
  warmth?: number;
  /** -45..45 degrees, clockwise. */
  rotation?: number;
  /** -100..100: positive widens the top (verticals converging upwards), negative the bottom. */
  vertical?: number;
}

export type AdjustmentKey = keyof ImageAdjustments;

export const ADJUSTMENT_RANGES: Record<AdjustmentKey, { min: number; max: number; step: number }> = {
  brightness: { min: -100, max: 100, step: 1 },
  contrast: { min: -100, max: 100, step: 1 },
  saturation: { min: -100, max: 100, step: 1 },
  warmth: { min: -100, max: 100, step: 1 },
  rotation: { min: -45, max: 45, step: 0.1 },
  vertical: { min: -100, max: 100, step: 1 },
};

export const ADJUSTMENT_KEYS = Object.keys(ADJUSTMENT_RANGES) as AdjustmentKey[];
export const TONE_KEYS: AdjustmentKey[] = ["brightness", "contrast", "saturation", "warmth"];

export const adjustmentValue = (adjustments: ImageAdjustments | null | undefined, key: AdjustmentKey) =>
  adjustments?.[key] ?? 0;

/** Drops neutral (0) and invalid values and clamps the rest; null when nothing remains. */
export function normalizeAdjustments(
  adjustments: ImageAdjustments | null | undefined,
): ImageAdjustments | null {
  if (!adjustments) return null;
  const result: ImageAdjustments = {};
  for (const key of ADJUSTMENT_KEYS) {
    const value = adjustments[key];
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    const { min, max } = ADJUSTMENT_RANGES[key];
    const clamped = Math.min(max, Math.max(min, key === "rotation" ? Math.round(value * 10) / 10 : Math.round(value)));
    if (clamped !== 0) result[key] = clamped;
  }
  return Object.keys(result).length > 0 ? result : null;
}

export const sameAdjustments = (a: ImageAdjustments | null | undefined, b: ImageAdjustments | null | undefined) =>
  ADJUSTMENT_KEYS.every((key) => Math.abs(adjustmentValue(a, key) - adjustmentValue(b, key)) < 0.05);

export const hasTone = (adjustments: ImageAdjustments | null | undefined) =>
  TONE_KEYS.some((key) => adjustmentValue(adjustments, key) !== 0);

// ---------------------------------------------------------------------------------------------
// Tone: one affine colour matrix (sRGB, channels 0..1), the same one the SVG feColorMatrix of the
// preview uses, so the preview and the rendered JPEG match.

/** 4x5 row-major matrix: [r g b a offset] per output channel. */
export type ColorMatrix = number[];

const IDENTITY: ColorMatrix = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];

/** `outer ∘ inner`: applies inner first. */
function compose(outer: ColorMatrix, inner: ColorMatrix): ColorMatrix {
  const result: number[] = [];
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      let sum = col === 4 ? outer[row * 5 + 4] : 0;
      for (let k = 0; k < 4; k += 1) sum += outer[row * 5 + k] * inner[k * 5 + col];
      result.push(sum);
    }
  }
  return result;
}

const LUMA = [0.2126, 0.7152, 0.0722];

export function colorMatrix(adjustments: ImageAdjustments | null | undefined): ColorMatrix {
  const brightness = 2 ** (adjustmentValue(adjustments, "brightness") / 100);
  const contrast = 1 + adjustmentValue(adjustments, "contrast") / 100;
  const saturation = 1 + adjustmentValue(adjustments, "saturation") / 100;
  const warmth = adjustmentValue(adjustments, "warmth") / 100;

  const brightnessMatrix: ColorMatrix = [
    brightness, 0, 0, 0, 0,
    0, brightness, 0, 0, 0,
    0, 0, brightness, 0, 0,
    0, 0, 0, 1, 0,
  ];
  const offset = 0.5 * (1 - contrast);
  const contrastMatrix: ColorMatrix = [
    contrast, 0, 0, 0, offset,
    0, contrast, 0, 0, offset,
    0, 0, contrast, 0, offset,
    0, 0, 0, 1, 0,
  ];
  const s = saturation;
  const [lr, lg, lb] = LUMA.map((weight) => weight * (1 - s));
  const saturationMatrix: ColorMatrix = [
    lr + s, lg, lb, 0, 0,
    lr, lg + s, lb, 0, 0,
    lr, lg, lb + s, 0, 0,
    0, 0, 0, 1, 0,
  ];
  const warmthMatrix: ColorMatrix = [
    1 + 0.12 * warmth, 0, 0, 0, 0,
    0, 1 + 0.02 * warmth, 0, 0, 0,
    0, 0, 1 - 0.12 * warmth, 0, 0,
    0, 0, 0, 1, 0,
  ];
  return [brightnessMatrix, contrastMatrix, saturationMatrix, warmthMatrix].reduce(
    (result, step) => compose(step, result),
    IDENTITY,
  );
}

/** `values` attribute of an SVG feColorMatrix (use color-interpolation-filters="sRGB"). */
export const svgMatrixValues = (matrix: ColorMatrix) => matrix.map((value) => value.toFixed(4)).join(" ");

/** Applies the matrix in place to RGBA bytes (alpha left as is). */
export function applyColorMatrix(data: Uint8ClampedArray, matrix: ColorMatrix): void {
  const m = matrix;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    data[i] = m[0] * r + m[1] * g + m[2] * b + m[4] * 255;
    data[i + 1] = m[5] * r + m[6] * g + m[7] * b + m[9] * 255;
    data[i + 2] = m[10] * r + m[11] * g + m[12] * b + m[14] * 255;
  }
}

// ---------------------------------------------------------------------------------------------
// Straighten: the cropper (react-easy-crop) reports the crop in the bounding box of the rotated
// image, so the render rotates the whole image into that box first.

export function rotatedSize(width: number, height: number, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  return { width: width * cos + height * sin, height: width * sin + height * cos };
}

// ---------------------------------------------------------------------------------------------
// Vertical perspective: a homography maps the output rectangle onto a trapezoid of the source
// whose top (vertical > 0) or bottom (vertical < 0) edge is inset, so converging verticals become
// parallel. The output keeps the source size and every output pixel samples inside the source.

/** Inset of the narrow edge, per side, as a fraction of the width, at |vertical| = 100. */
const MAX_INSET = 0.2;

export type Homography = [number, number, number, number, number, number, number, number, number];

/** Projective map of the unit square onto the quad (0,0)->p0, (1,0)->p1, (1,1)->p2, (0,1)->p3. */
export function squareToQuad(quad: Array<[number, number]>): Homography {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = quad;
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3;
  const sy = y0 - y1 + y2 - y3;
  if (Math.abs(sx) < 1e-12 && Math.abs(sy) < 1e-12) {
    return [x1 - x0, x3 - x0, x0, y1 - y0, y3 - y0, y0, 0, 0, 1];
  }
  const det = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / det;
  const h = (dx1 * sy - sx * dy1) / det;
  return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1];
}

export function mapPoint(matrix: Homography, u: number, v: number): [number, number] {
  const [a, b, c, d, e, f, g, h, i] = matrix;
  const w = g * u + h * v + i;
  return [(a * u + b * v + c) / w, (d * u + e * v + f) / w];
}

/** Source trapezoid (pixels) sampled by the corrected image of size width x height. */
export function perspectiveQuad(width: number, height: number, vertical: number): Array<[number, number]> {
  const inset = (Math.abs(vertical) / 100) * MAX_INSET * width;
  const top = vertical > 0 ? inset : 0;
  const bottom = vertical < 0 ? inset : 0;
  return [
    [top, 0],
    [width - top, 0],
    [width - bottom, height],
    [bottom, height],
  ];
}

const createCanvas = (width: number, height: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("canvas");
  return { canvas, context };
};

/**
 * Draws the image (scaled so its longest side is at most maxSide) with the vertical correction
 * applied. Returns the canvas and the scale from the original natural size.
 */
export function correctedCanvas(
  image: HTMLImageElement,
  vertical: number,
  maxSide: number,
): { canvas: HTMLCanvasElement; scale: number } {
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const source = createCanvas(width, height);
  source.context.drawImage(image, 0, 0, width, height);
  if (vertical === 0) return { canvas: source.canvas, scale };

  const input = source.context.getImageData(0, 0, width, height).data;
  const output = source.context.createImageData(width, height);
  const out = output.data;
  const matrix = squareToQuad(perspectiveQuad(width, height, vertical));
  for (let y = 0; y < height; y += 1) {
    const v = (y + 0.5) / height;
    for (let x = 0; x < width; x += 1) {
      const [sx, sy] = mapPoint(matrix, (x + 0.5) / width, v);
      // Bilinear sample, edges clamped.
      const fx = Math.min(width - 1, Math.max(0, sx - 0.5));
      const fy = Math.min(height - 1, Math.max(0, sy - 0.5));
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const x1 = Math.min(width - 1, x0 + 1);
      const y1 = Math.min(height - 1, y0 + 1);
      const tx = fx - x0;
      const ty = fy - y0;
      const i00 = (y0 * width + x0) * 4;
      const i10 = (y0 * width + x1) * 4;
      const i01 = (y1 * width + x0) * 4;
      const i11 = (y1 * width + x1) * 4;
      const o = (y * width + x) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        const top = input[i00 + channel] + (input[i10 + channel] - input[i00 + channel]) * tx;
        const bottom = input[i01 + channel] + (input[i11 + channel] - input[i01 + channel]) * tx;
        out[o + channel] = top + (bottom - top) * ty;
      }
    }
  }
  source.context.putImageData(output, 0, 0);
  return { canvas: source.canvas, scale };
}

/** Draws `source` rotated (degrees, clockwise, about its centre) into its rotated bounding box. */
export function rotatedCanvas(source: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
  if (degrees === 0) return source;
  const size = rotatedSize(source.width, source.height, degrees);
  const { canvas, context } = createCanvas(size.width, size.height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingQuality = "high";
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((degrees * Math.PI) / 180);
  context.drawImage(source, -source.width / 2, -source.height / 2);
  return canvas;
}

/** Applies the tone matrix to the whole canvas (no-op when there is no tone adjustment). */
export function applyTone(canvas: HTMLCanvasElement, adjustments: ImageAdjustments | null | undefined) {
  if (!hasTone(adjustments)) return;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("canvas");
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  applyColorMatrix(pixels.data, colorMatrix(adjustments));
  context.putImageData(pixels, 0, 0);
}
