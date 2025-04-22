import { useState } from "react";
import {
  HeartIcon,
  ChatBubbleLeftIcon,
  PaperAirplaneIcon,
  BookmarkIcon,
  EllipsisHorizontalIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { PreviewProjectDataProps, UserDataProps } from "../../types";

interface IProjectInstagramPostProps {
  project: PreviewProjectDataProps;
  user: UserDataProps;
}

export default function InstagramPost({
  project,
  user,
}: IProjectInstagramPostProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const hasMultipleImages =
    project?.image_data && project.image_data.length > 1;

  const goToNextImage = () => {
    if (project?.image_data) {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === (project.image_data?.length ?? 0) - 1 ? 0 : prevIndex + 1
      );
    }
  };

  const goToPreviousImage = () => {
    if (project?.image_data) {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === 0 ? (project.image_data?.length ?? 0) - 1 : prevIndex - 1
      );
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-sm">
      {/* Header with user information */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200">
            <img
              src={project?.image_data?.[0]?.url}
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

      <div className="aspect-square relative">
        {project?.image_data && project.image_data.length > 0 ? (
          <div className="w-full h-full relative">
            <img
              src={
                project.image_data[currentImageIndex]?.url ||
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
                  {project.image_data.map((_, index) => (
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
        ) : (
          <img
            src="https://via.placeholder.com/500"
            alt="Publicación de Instagram"
            className="w-full h-full object-cover"
          />
        )}
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
            {project?.description_rich}
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
  );
}
