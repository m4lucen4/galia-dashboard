import {
  MAX_VIDEO_BYTES,
  MAX_VIDEO_DURATION_MS,
  MIN_VIDEO_BYTES,
  MIN_VIDEO_DURATION_MS,
  MP4_ONLY_MESSAGE,
} from "./videoConstants";
import { ProjectVideoError } from "./videoErrors";
import { loadVideoElement, UNREADABLE_VIDEO_MESSAGE } from "./videoElement";

export interface VideoMetadata {
  durationMs: number;
  width: number;
  height: number;
}

/** Synchronous checks on the File itself (format and size). Throws ProjectVideoError. */
export const validateVideoFileBasics = (file: File): void => {
  const hasMp4Extension = file.name.toLowerCase().endsWith(".mp4");
  // Some systems report an empty MIME type for .mp4; any other type is rejected.
  const hasMp4Type = file.type === "video/mp4" || file.type === "";
  if (!hasMp4Extension || !hasMp4Type) {
    throw new ProjectVideoError(MP4_ONLY_MESSAGE);
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new ProjectVideoError(
      "El vídeo supera el límite de 100 MB. Reduce su tamaño o comprímelo y vuelve a intentarlo.",
    );
  }
  if (file.size < MIN_VIDEO_BYTES) {
    throw new ProjectVideoError(
      "El vídeo es demasiado pequeño o está dañado. Debe pesar al menos 75 KB.",
    );
  }
};

/** Reads duration and dimensions through a hidden <video>. Throws ProjectVideoError. */
export const readVideoMetadata = async (file: File): Promise<VideoMetadata> => {
  const { video, dispose } = await loadVideoElement(file, "metadata");
  try {
    const { duration, videoWidth, videoHeight } = video;
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new ProjectVideoError(UNREADABLE_VIDEO_MESSAGE);
    }
    if (!videoWidth || !videoHeight) {
      throw new ProjectVideoError(
        "No se pudieron leer las dimensiones del vídeo. Comprueba que el archivo tenga imagen y no esté dañado.",
      );
    }
    return {
      durationMs: Math.round(duration * 1000),
      width: videoWidth,
      height: videoHeight,
    };
  } finally {
    dispose();
  }
};

/** Full blocking validation before upload. Throws ProjectVideoError. */
export const validateVideoFile = async (file: File): Promise<VideoMetadata> => {
  validateVideoFileBasics(file);
  const metadata = await readVideoMetadata(file);
  if (metadata.durationMs < MIN_VIDEO_DURATION_MS) {
    throw new ProjectVideoError("El vídeo es demasiado corto: debe durar al menos 3 segundos.");
  }
  if (metadata.durationMs > MAX_VIDEO_DURATION_MS) {
    throw new ProjectVideoError("El vídeo es demasiado largo: la duración máxima es de 5 minutos.");
  }
  return metadata;
};
