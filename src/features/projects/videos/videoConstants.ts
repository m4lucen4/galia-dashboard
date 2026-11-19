export const PROJECT_VIDEOS_BUCKET = "project-videos";

export const MAX_VIDEO_BYTES = 100_000_000;
// The table check constraint rejects anything below this size.
export const MIN_VIDEO_BYTES = 75_000;
export const MIN_VIDEO_DURATION_MS = 3_000;
export const MAX_VIDEO_DURATION_MS = 300_000;

export const TUS_CHUNK_SIZE = 6 * 1024 * 1024;

export const MP4_ONLY_MESSAGE =
  "Exporta el vídeo en MP4 (en iPhone: Ajustes → Cámara → Formatos → Más compatible)";

export const FASTSTART_WARNING =
  "Instagram podría rechazar este vídeo: no está optimizado para streaming (faststart).";
