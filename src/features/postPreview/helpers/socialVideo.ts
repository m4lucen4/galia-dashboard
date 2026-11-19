import type {
  PreviewProjectDataProps,
  ProjectVideo,
  PublicationFormat,
  PublicationTarget,
} from "@/types";
import { SOCIAL_PUBLISHING_EDGE_ENABLED } from "@/helpers/publishDate";
import { publishedImages } from "./publicationImages";
import {
  INSTAGRAM_STORY_VIDEO,
  type SocialNetwork,
} from "./socialMediaRules";
import { SELECTOR_TEXTS, formatLabel } from "./socialVideoTexts";

/**
 * Switch for the video formats (Instagram Reel and Stories, LinkedIn video): format selector in the
 * publish configuration, video checks, video previews and the `format` sent per target. Off by
 * default: with it off the client behaves exactly as before and never sends a format.
 *
 * It needs the Edge pipeline (VITE_SOCIAL_PUBLISHING_EDGE): formats only exist in publish-publication,
 * so without it the switch stays off.
 */
export const SOCIAL_VIDEO_ENABLED =
  import.meta.env.VITE_SOCIAL_VIDEO === "true" && SOCIAL_PUBLISHING_EDGE_ENABLED;

/** Chosen format per network; a missing entry means "use the default" (see resolveFormat). */
export type NetworkFormats = Partial<Record<SocialNetwork, PublicationFormat>>;

/** Where the publication's video stands (the publication holds at most one, S5, S10). */
export type PublicationVideoState =
  | { status: "none" }
  | { status: "loading" }
  | { status: "error" }
  /** The publication points to a video that cannot be found (deleted, or not readable). */
  | { status: "missing" }
  | { status: "ready"; video: ProjectVideo; videoUrl: string; posterUrl: string | null };

export interface FormatContext {
  /** Selected photos of the publication (image_data entries that are not "not_selected"). */
  photos: number;
  /** The publication references a video (projectsPreview.video_id). */
  hasVideo: boolean;
  video: PublicationVideoState;
}

export interface FormatOption {
  format: PublicationFormat;
  label: string;
  /** Why this option cannot be chosen; null when it can. */
  disabledReason: string | null;
}

const FORMATS: Record<SocialNetwork, { photo: PublicationFormat[]; video: PublicationFormat[] }> = {
  instagram: { photo: ["image", "story_image"], video: ["reel", "story_video"] },
  linkedin: { photo: ["image"], video: ["video"] },
};

export const formatContextOf = (
  project: Pick<PreviewProjectDataProps, "image_data" | "video_id"> | null | undefined,
  video: PublicationVideoState,
): FormatContext => ({
  photos: publishedImages(project).length,
  hasVideo: !!project?.video_id,
  video,
});

const videoDisabledReason = (
  format: PublicationFormat,
  context: FormatContext,
): string | null => {
  const { video } = context;
  switch (video.status) {
    case "loading":
      return SELECTOR_TEXTS.videoLoading;
    case "error":
      return SELECTOR_TEXTS.videoError;
    case "none":
    case "missing":
      return SELECTOR_TEXTS.videoMissing;
    case "ready":
      if (format === "story_video") {
        if (video.video.duration_ms > INSTAGRAM_STORY_VIDEO.maxDurationMs) {
          return SELECTOR_TEXTS.storyTooLong;
        }
        if (video.video.bytes > INSTAGRAM_STORY_VIDEO.maxBytes) return SELECTOR_TEXTS.storyTooHeavy;
      }
      return null;
  }
};

/**
 * Formats the network offers for this publication. Photo formats are always listed (disabled
 * without photos); video formats only when the publication has a video, disabled while it cannot
 * work (loading, unreadable, over the story limits).
 */
export function formatOptions(network: SocialNetwork, context: FormatContext): FormatOption[] {
  const options: FormatOption[] = FORMATS[network].photo.map((format) => ({
    format,
    label: formatLabel(network, format),
    disabledReason: context.photos > 0 ? null : SELECTOR_TEXTS.noPhotos,
  }));
  if (context.hasVideo) {
    for (const format of FORMATS[network].video) {
      options.push({
        format,
        label: formatLabel(network, format),
        disabledReason: videoDisabledReason(format, context),
      });
    }
  }
  return options;
}

/**
 * Default rule (L29): a publication with selected photos starts on the photo format in every
 * network; with no photos but a video it starts on the video format (Reel, LinkedIn video).
 */
export function defaultFormat(network: SocialNetwork, context: FormatContext): PublicationFormat {
  if (context.photos > 0 || !context.hasVideo) return "image";
  return FORMATS[network].video[0];
}

/** The user's choice when it can still work, else the default. */
export function resolveFormat(
  network: SocialNetwork,
  chosen: PublicationFormat | undefined,
  context: FormatContext,
): PublicationFormat {
  if (chosen) {
    const option = formatOptions(network, context).find((item) => item.format === chosen);
    if (option && !option.disabledReason) return chosen;
  }
  return defaultFormat(network, context);
}

export const isStoryFormat = (format: PublicationFormat): boolean =>
  format === "story_image" || format === "story_video";

/**
 * Format a network preview opens on: the format of the publication's current target in that
 * network when it is known, else the default rule.
 */
export function initialPreviewFormat(
  network: SocialNetwork,
  project: Pick<PreviewProjectDataProps, "image_data" | "video_id">,
  targets: PublicationTarget[],
): PublicationFormat {
  const target = targets.find(
    (item) => item.network === network && item.status !== "cancelled" && item.format,
  );
  if (target?.format) return target.format;
  return defaultFormat(network, formatContextOf(project, { status: "none" }));
}
