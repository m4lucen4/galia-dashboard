import type { PublicationTarget } from "@/types";

// Which photo "Historia (imagen)" publishes (S13, T7). The choice is an original photo of the
// publication (image_data url, not a network variant) and never changes the carousel order.

/**
 * Photo of the story: the user's choice, else the one of the already scheduled story target, else the
 * first selected photo. A candidate that is no longer among the selected photos is ignored. Null only
 * when there are no selected photos.
 */
export function resolveStoryImage(
  photoUrls: readonly string[],
  chosen: string | null | undefined,
  scheduled: string | null | undefined,
): string | null {
  if (chosen && photoUrls.includes(chosen)) return chosen;
  if (scheduled && photoUrls.includes(scheduled)) return scheduled;
  return photoUrls[0] ?? null;
}

/** Photo stored in the current Instagram story_image target of a publication, when known. */
export function scheduledStoryImageUrl(targets: readonly PublicationTarget[]): string | null {
  const target = targets.find(
    (item) =>
      item.network === "instagram" &&
      item.status !== "cancelled" &&
      item.format === "story_image" &&
      !!item.storyImageUrl,
  );
  return target?.storyImageUrl ?? null;
}
