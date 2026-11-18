/** Error whose message is already user-facing Spanish text. */
export class ProjectVideoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectVideoError";
  }
}

export class VideoUploadCancelledError extends Error {
  constructor() {
    super("Subida cancelada");
    this.name = "VideoUploadCancelledError";
  }
}

export const isCancelledError = (error: unknown): boolean =>
  error instanceof VideoUploadCancelledError;

export const getVideoErrorMessage = (
  error: unknown,
  fallback = "No se pudo completar la operación con el vídeo. Inténtalo de nuevo.",
): string => (error instanceof ProjectVideoError ? error.message : fallback);
