import type { PreviewProjectDataProps, PublicationFormat, UserDataProps } from "@/types";
import { publishedImages } from "../helpers/publicationImages";
import type { PublicationVideoState } from "../helpers/socialVideo";
import { PREVIEW_TEXTS } from "../helpers/socialVideoTexts";
import { VideoPreviewFrame } from "./VideoPreviewFrame";

interface InstagramVerticalPreviewProps {
  format: Exclude<PublicationFormat, "image" | "video">;
  project: PreviewProjectDataProps;
  user: UserDataProps;
  video: PublicationVideoState;
  text: string;
}

/**
 * Instagram Reel and Stories in a 9:16 frame. Reels show the caption; Stories show none. A video
 * format plays on demand; "Historia (imagen)" shows the original first image, uncropped by the feed
 * ratio rules.
 */
export function InstagramVerticalPreview({
  format,
  project,
  user,
  video,
  text,
}: InstagramVerticalPreviewProps) {
  const isStory = format !== "reel";
  const firstImage = publishedImages(project)[0]?.url ?? null;

  const frame = () => {
    if (format === "story_image") {
      return firstImage ? (
        <div className="relative w-full overflow-hidden bg-[#010000]" style={{ aspectRatio: "9 / 16" }}>
          <img
            src={firstImage}
            alt={`Imagen 1 de ${project.title}`}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <p className="p-6 text-center text-sm text-gray-500">{PREVIEW_TEXTS.noImage}</p>
      );
    }
    if (video.status === "ready") {
      return (
        <VideoPreviewFrame
          videoUrl={video.videoUrl}
          posterUrl={video.posterUrl}
          aspectRatio="9 / 16"
        />
      );
    }
    return (
      <p className="p-6 text-center text-sm text-gray-500">
        {video.status === "loading" ? "Cargando vídeo…" : PREVIEW_TEXTS.videoUnavailable}
      </p>
    );
  };

  return (
    <div className="mx-auto max-w-xs rounded-sm border border-gray-200 bg-white">
      <div className="flex items-center gap-2 p-3">
        <div className="h-8 w-8 overflow-hidden rounded-full border border-gray-200 bg-gray-100" />
        <span className="text-sm font-semibold">{user?.first_name}</span>
      </div>
      {frame()}
      {isStory ? (
        <p className="p-3 text-xs text-gray-500">{PREVIEW_TEXTS.storyHint}</p>
      ) : (
        <div className="p-3 text-sm">
          <span className="mr-1 font-semibold">{user?.first_name}</span>
          <span className="whitespace-pre-wrap">{text}</span>
        </div>
      )}
    </div>
  );
}
