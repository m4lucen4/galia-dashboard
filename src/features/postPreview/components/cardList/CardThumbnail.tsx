import { DocumentTextIcon, VideoCameraIcon } from "@heroicons/react/24/outline";
import type { PreviewProjectDataProps } from "../../../../types";

interface CardThumbnailProps {
  project: PreviewProjectDataProps;
  /** Poster of the publication's video, when it has one and it is known. */
  posterUrl?: string;
  /** Classes of the wrapper when there is an image to show. */
  imageClassName: string;
  /** Classes of the wrapper when there is no image. */
  placeholderClassName: string;
}

/**
 * First selected image; without selected images, the video poster; then the
 * first image; then a placeholder. A small badge marks publications with a video.
 */
export const CardThumbnail = ({
  project,
  posterUrl,
  imageClassName,
  placeholderClassName,
}: CardThumbnailProps) => {
  const images = project.image_data ?? [];
  const hasVideo = !!project.video_id;
  const thumbnailUrl =
    images.find((image) => image.status !== "not_selected")?.url ??
    (hasVideo ? posterUrl : undefined) ??
    images[0]?.url;

  return (
    <div
      className={`relative ${thumbnailUrl ? imageClassName : placeholderClassName}`}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={project.title}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
        />
      ) : hasVideo ? (
        <VideoCameraIcon
          aria-hidden="true"
          className="w-12 h-12 text-gray-400"
        />
      ) : (
        <DocumentTextIcon className="w-12 h-12 text-gray-400" />
      )}
      {hasVideo && (
        <span
          role="img"
          aria-label="Incluye vídeo"
          title="Incluye vídeo"
          className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#d8e4d6] px-2.5 py-1 text-xs font-medium text-[#010000]"
        >
          <VideoCameraIcon aria-hidden="true" className="size-3.5" />
          Vídeo
        </span>
      )}
    </div>
  );
};
