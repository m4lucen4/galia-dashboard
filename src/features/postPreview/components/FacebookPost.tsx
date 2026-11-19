import {
  ChatBubbleOvalLeftIcon,
  EllipsisHorizontalIcon,
  GlobeEuropeAfricaIcon,
  HandThumbUpIcon,
  ShareIcon,
} from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";
import {
  PreviewProjectDataProps,
  PublicationFormat,
  UserDataProps,
} from "../../../types";
import { usePreviewImages } from "../helpers/usePreviewImages";
import { publishedText } from "../helpers/socialText";
import { SOCIAL_VIDEO_ENABLED } from "../helpers/socialVideo";
import { PREVIEW_TEXTS } from "../helpers/socialVideoTexts";
import { usePublicationVideo } from "../hooks/usePublicationVideo";
import { PreviewFormatTabs } from "./PreviewFormatTabs";
import { VideoPreviewFrame } from "./VideoPreviewFrame";

interface IProjectFacebookPostProps {
  project: PreviewProjectDataProps;
  user: UserDataProps;
  /** Only with VITE_SOCIAL_VIDEO on: the format the preview opens on. */
  initialFormat?: PublicationFormat;
}

// A Facebook post shows at most four photos; the rest is a "+N" over the last one.
const GRID_MAX = 4;

export default function FacebookPost({
  project,
  user,
  initialFormat,
}: IProjectFacebookPostProps) {
  const [format, setFormat] = useState<PublicationFormat>(initialFormat ?? "image");
  const video = usePublicationVideo(project);
  const showVideo = SOCIAL_VIDEO_ENABLED && format === "video";
  // Same images and text as the publish payload: what you see is what gets published,
  // including the Facebook-adjusted copies when the adjuster is on.
  const images = usePreviewImages(project, "facebook");
  const text = useMemo(() => publishedText(project), [project]);

  const shown = images.slice(0, GRID_MAX);
  const extra = images.length - shown.length;
  const gridClass =
    shown.length === 1
      ? "grid-cols-1"
      : shown.length === 2
        ? "grid-cols-2 aspect-[2/1]"
        : "grid-cols-2 aspect-square";

  return (
    <>
      {SOCIAL_VIDEO_ENABLED && (
        <PreviewFormatTabs
          network="facebook"
          project={project}
          video={video}
          value={format}
          onChange={setFormat}
        />
      )}
      <div className="mx-auto max-w-md rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-start justify-between p-3">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-gray-200">
              {images[0] && (
                <img src={images[0].url} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="flex items-center gap-1 text-xs text-gray-500">
                <span>Ahora</span>
                <span>·</span>
                <GlobeEuropeAfricaIcon className="h-3 w-3" />
              </p>
            </div>
          </div>
          <EllipsisHorizontalIcon className="h-5 w-5 text-gray-600" />
        </div>

        <div className="px-3 pb-3">
          <p className="whitespace-pre-wrap text-sm text-gray-900">{text}</p>
        </div>

        {showVideo &&
          (video.status === "ready" ? (
            <VideoPreviewFrame
              videoUrl={video.videoUrl}
              posterUrl={video.posterUrl}
              aspectRatio={`${video.video.width} / ${video.video.height}`}
              className="max-h-[70vh]"
            />
          ) : (
            <p className="px-3 py-6 text-center text-sm text-gray-500">
              {video.status === "loading" ? "Cargando vídeo…" : PREVIEW_TEXTS.videoUnavailable}
            </p>
          ))}
        {!showVideo && shown.length > 0 && (
          <div className={`grid gap-0.5 ${gridClass}`}>
            {shown.map((image, index) => (
              <div
                key={image.url}
                className={`relative overflow-hidden ${
                  shown.length === 3 && index === 0 ? "row-span-2" : ""
                }`}
              >
                <img
                  src={image.url}
                  alt={`Imagen ${index + 1} de la publicación`}
                  className="h-full w-full object-cover"
                />
                {extra > 0 && index === shown.length - 1 && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-2xl font-medium text-white">
                    +{extra}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        {!showVideo && shown.length === 0 && (
          <p className="px-3 pb-3 text-center text-xs text-gray-500">{PREVIEW_TEXTS.noImage}</p>
        )}

        <div className="mx-3 mt-2 flex justify-between border-t border-gray-200 py-1">
          <button type="button" className="flex flex-1 items-center justify-center gap-1 rounded py-2 hover:bg-gray-100">
            <HandThumbUpIcon className="h-5 w-5 text-gray-600" />
            <span className="text-xs font-medium text-gray-600">Me gusta</span>
          </button>
          <button type="button" className="flex flex-1 items-center justify-center gap-1 rounded py-2 hover:bg-gray-100">
            <ChatBubbleOvalLeftIcon className="h-5 w-5 text-gray-600" />
            <span className="text-xs font-medium text-gray-600">Comentar</span>
          </button>
          <button type="button" className="flex flex-1 items-center justify-center gap-1 rounded py-2 hover:bg-gray-100">
            <ShareIcon className="h-5 w-5 text-gray-600" />
            <span className="text-xs font-medium text-gray-600">Compartir</span>
          </button>
        </div>
      </div>
    </>
  );
}
