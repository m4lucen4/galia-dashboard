import { useState, useMemo } from "react";
import {
  HeartIcon,
  ChatBubbleLeftIcon,
  PaperAirplaneIcon,
  BookmarkIcon,
  EllipsisHorizontalIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import {
  PreviewProjectDataProps,
  PublicationFormat,
  UserDataProps,
} from "../../../types";
import { usePreviewImages } from "../helpers/usePreviewImages";
import { publishedText } from "../helpers/socialText";
import { SOCIAL_VIDEO_ENABLED } from "../helpers/socialVideo";
import { usePublicationVideo } from "../hooks/usePublicationVideo";
import { InstagramVerticalPreview } from "./InstagramVerticalPreview";
import { PreviewFormatTabs } from "./PreviewFormatTabs";

interface IProjectInstagramPostProps {
  project: PreviewProjectDataProps;
  user: UserDataProps;
  /** Only with VITE_SOCIAL_VIDEO on: the format the preview opens on. */
  initialFormat?: PublicationFormat;
  /** Only with VITE_SOCIAL_VIDEO on: photo stored in the scheduled "Historia (imagen)" target. */
  scheduledStoryImageUrl?: string | null;
}

export default function InstagramPost({
  project,
  user,
  initialFormat,
  scheduledStoryImageUrl = null,
}: IProjectInstagramPostProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  // Video formats (VITE_SOCIAL_VIDEO): Reel and Stories are previewed in a 9:16 frame.
  const [format, setFormat] = useState<PublicationFormat>(initialFormat ?? "image");
  const video = usePublicationVideo(project);
  // Same images and text as the publish payload: what you see is what gets published,
  // including the Instagram-adjusted copies when the adjuster is on.
  const pendingImages = usePreviewImages(project, "instagram");
  // Instagram shows every carousel item with the first image's ratio.
  const first = pendingImages[0];
  const frameRatio = first?.width && first?.height ? `${first.width} / ${first.height}` : "1 / 1";
  const text = useMemo(() => publishedText(project), [project]);

  const hasMultipleImages = pendingImages.length > 1;

  const goToNextImage = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === pendingImages.length - 1 ? 0 : prevIndex + 1
    );
  };

  const goToPreviousImage = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === 0 ? pendingImages.length - 1 : prevIndex - 1
    );
  };

  const tabs = SOCIAL_VIDEO_ENABLED ? (
    <PreviewFormatTabs
      network="instagram"
      project={project}
      video={video}
      value={format}
      onChange={setFormat}
    />
  ) : null;

  if (SOCIAL_VIDEO_ENABLED && format !== "image" && format !== "video") {
    return (
      <>
        {tabs}
        <InstagramVerticalPreview
          format={format}
          project={project}
          user={user}
          video={video}
          text={text}
          scheduledStoryImageUrl={scheduledStoryImageUrl}
        />
      </>
    );
  }

  return (
    <>
    {tabs}
    <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-sm">
      {/* Header with user information */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200">
            <img
              src={pendingImages[0]?.url || "https://via.placeholder.com/50"}
              alt="@usuario"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <a href="#" className="text-sm font-semibold">
              {user?.first_name}
            </a>
            <p className="text-xs text-gray-500">Sevilla, España</p>
          </div>
        </div>
        <button className="p-1 rounded-full hover:bg-gray-100">
          <EllipsisHorizontalIcon className="h-5 w-5 text-gray-700" />
        </button>
      </div>

      <div className="relative" style={{ aspectRatio: frameRatio }}>
        <div className="w-full h-full relative">
          <img
            src={
              pendingImages[currentImageIndex]?.url ||
              "https://via.placeholder.com/500"
            }
            alt={`Imagen ${currentImageIndex + 1} de ${project.title}`}
            className="w-full h-full object-cover"
          />

          {hasMultipleImages && (
            <>
              <button
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 rounded-full p-1 hover:bg-white/90 transition-colors shadow-md"
                onClick={goToPreviousImage}
              >
                <ChevronLeftIcon className="h-5 w-5 text-gray-800" />
              </button>
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 rounded-full p-1 hover:bg-white/90 transition-colors shadow-md"
                onClick={goToNextImage}
              >
                <ChevronRightIcon className="h-5 w-5 text-gray-800" />
              </button>

              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {pendingImages.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 rounded-full transition-all ${
                      index === currentImageIndex
                        ? "w-6 bg-gray-500"
                        : "w-1.5 bg-white/70"
                    }`}
                    onClick={() => setCurrentImageIndex(index)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="p-3">
        <div className="flex justify-between mb-2">
          <div className="flex gap-4">
            <button className="p-1 rounded-full hover:bg-gray-100">
              <HeartIcon className="h-6 w-6 text-gray-800" />
            </button>
            <button className="p-1 rounded-full hover:bg-gray-100">
              <ChatBubbleLeftIcon className="h-6 w-6 text-gray-800" />
            </button>
            <button className="p-1 rounded-full hover:bg-gray-100">
              <PaperAirplaneIcon className="h-6 w-6 text-gray-800 rotate-45" />
            </button>
          </div>
          <button className="p-1 rounded-full hover:bg-gray-100">
            <BookmarkIcon className="h-6 w-6 text-gray-800" />
          </button>
        </div>

        <p className="text-sm font-semibold mb-1">267 likes</p>

        <div className="text-sm mb-1">
          <a href="#" className="font-semibold mr-1">
            {user?.first_name}
          </a>
          <span className="whitespace-pre-wrap">
            {text}
          </span>
        </div>
        <a href="#" className="text-sm text-gray-500 block mb-1">
          See 87 comments
        </a>
      </div>
      <div className="flex items-center p-3 border-t border-gray-100">
        <button className="text-sm text-gray-500 font-normal hover:text-gray-700">
          Add comment...
        </button>
      </div>
    </div>
    </>
  );
}
