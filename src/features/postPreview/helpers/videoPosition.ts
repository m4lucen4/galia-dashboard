import type { PublicationTarget } from "@/types";

// Where the video goes in the Instagram "Carrusel con vídeo" (S14, T6). Positions are 0-based inside
// the code and in the request (`videoPosition`); the UI shows them 1-based. The carousel holds the
// selected photos in their order plus the video, so the valid range is 0..photos (photos = last).

/** Last valid 0-based position: the video after every photo. */
export const lastVideoPosition = (photoCount: number): number => Math.max(0, photoCount);

/** True for an integer position the carousel can hold (0..photoCount). */
export const isValidVideoPosition = (photoCount: number, position: unknown): position is number =>
  typeof position === "number" &&
  Number.isInteger(position) &&
  position >= 0 &&
  position <= lastVideoPosition(photoCount);

/**
 * Position of the video: the user's choice, else the one of the already scheduled carousel target,
 * else last ("Elegible, por defecto al final"). A candidate that no longer fits (the photo selection
 * shrank) is ignored. A scheduled target with a null position means last.
 */
export function resolveVideoPosition(
  photoCount: number,
  chosen: number | null | undefined,
  scheduled: number | null | undefined,
): number {
  if (isValidVideoPosition(photoCount, chosen)) return chosen;
  if (isValidVideoPosition(photoCount, scheduled)) return scheduled;
  return lastVideoPosition(photoCount);
}

/** Position stored in the current Instagram carousel_video target of a publication, when known. */
export function scheduledVideoPosition(targets: readonly PublicationTarget[]): number | null {
  const target = targets.find(
    (item) =>
      item.network === "instagram" &&
      item.status !== "cancelled" &&
      item.format === "carousel_video" &&
      typeof item.videoPosition === "number",
  );
  return target?.videoPosition ?? null;
}
