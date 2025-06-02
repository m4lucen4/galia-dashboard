import {
  HandThumbUpIcon,
  ChatBubbleLeftEllipsisIcon,
  ArrowPathRoundedSquareIcon,
  PaperAirplaneIcon,
  EllipsisHorizontalIcon,
  GlobeAmericasIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import {
  PreviewProjectDataProps,
  UserDataProps,
  ProjectImageData,
} from "../../../types";
import { useState, useEffect } from "react";

interface IProjectLinkedlnPostProps {
  project: PreviewProjectDataProps;
  user: UserDataProps;
}

export default function LinkedInPost({
  project,
  user,
}: IProjectLinkedlnPostProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [pendingImages, setPendingImages] = useState<ProjectImageData[]>([]);

  useEffect(() => {
    if (project?.image_data) {
      const filteredImages = project.image_data.filter(
        (image) => image.status === "pending"
      );
      setPendingImages(filteredImages);
    }
  }, [project]);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % pendingImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex(
      (prev) => (prev - 1 + pendingImages.length) % pendingImages.length
    );
  };

  return (
    <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex items-start p-3">
        <div className="mr-2">
          <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-200">
            <img
              src={pendingImages[0]?.url || "https://via.placeholder.com/48"}
              alt="@usuario"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <a
                href="#"
                className="text-sm font-semibold text-gray-900 hover:text-blue-600 hover:underline"
              >
                {user?.first_name} {user?.last_name}
              </a>
              <p className="text-xs text-gray-500">Gerente de Marketing</p>
              <div className="flex items-center text-xs text-gray-500 mt-1">
                <span>2d</span>
                <span className="mx-1">•</span>
                <GlobeAmericasIcon className="h-3 w-3 mr-1" />
                <span>Público</span>
              </div>
            </div>
            <div className="flex">
              <button className="text-blue-600 text-sm font-medium px-3 py-1 rounded-full hover:bg-blue-50">
                + Seguir
              </button>
              <button className="p-1 rounded-full hover:bg-gray-100">
                <EllipsisHorizontalIcon className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 pb-2">
        <p className="text-sm text-gray-800 mb-3 whitespace-pre-wrap">
          {project?.description_rich}
        </p>
      </div>

      <div className="relative mb-2">
        {pendingImages.length > 0 && (
          <div className="relative">
            <img
              src={pendingImages[currentImageIndex]?.url}
              alt={`Imagen ${currentImageIndex + 1} de la publicación`}
              className="w-full object-cover"
            />

            {pendingImages.length > 1 && (
              <>
                <button
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/60 rounded-full p-1 hover:bg-white/80"
                  onClick={prevImage}
                >
                  <ChevronLeftIcon className="h-5 w-5 text-gray-700" />
                </button>
                <button
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/60 rounded-full p-1 hover:bg-white/80"
                  onClick={nextImage}
                >
                  <ChevronRightIcon className="h-5 w-5 text-gray-700" />
                </button>
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                  {pendingImages.map((_, index) => (
                    <span
                      key={index}
                      className={`w-2 h-2 rounded-full ${
                        index === currentImageIndex
                          ? "bg-blue-600"
                          : "bg-gray-300"
                      }`}
                      onClick={() => setCurrentImageIndex(index)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="px-3 py-1 flex justify-between text-xs text-gray-500 border-t border-gray-100">
        <div className="flex items-center">
          <div className="flex -space-x-1 mr-1">
            <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center border border-white">
              <HandThumbUpIcon className="h-2 w-2 text-white" />
            </div>
            <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center border border-white">
              <span className="text-white text-[8px]">👏</span>
            </div>
          </div>
          <span>148</span>
        </div>
        <div className="flex gap-2">
          <span>32 comentarios</span>
          <span>•</span>
          <span>8 compartidos</span>
        </div>
      </div>

      <div className="px-1 py-1 flex justify-between border-t border-gray-200">
        <button className="flex items-center justify-center gap-1 py-2 px-1 rounded hover:bg-gray-100 flex-1">
          <HandThumbUpIcon className="h-5 w-5 text-gray-600" />
          <span className="text-xs font-medium text-gray-600">Me gusta</span>
        </button>
        <button className="flex items-center justify-center gap-1 py-2 px-1 rounded hover:bg-gray-100 flex-1">
          <ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-gray-600" />
          <span className="text-xs font-medium text-gray-600">Comentar</span>
        </button>
        <button className="flex items-center justify-center gap-1 py-2 px-1 rounded hover:bg-gray-100 flex-1">
          <ArrowPathRoundedSquareIcon className="h-5 w-5 text-gray-600" />
          <span className="text-xs font-medium text-gray-600">Compartir</span>
        </button>
        <button className="flex items-center justify-center gap-1 py-2 px-1 rounded hover:bg-gray-100 flex-1">
          <PaperAirplaneIcon className="h-5 w-5 text-gray-600" />
          <span className="text-xs font-medium text-gray-600">Enviar</span>
        </button>
      </div>

      <div className="px-3 py-2 border-t border-gray-200">
        <div className="flex items-start gap-2 mb-3">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
            <img
              src="https://via.placeholder.com/32"
              alt="Foto de perfil"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 bg-gray-100 rounded-2xl px-3 py-2">
            <a
              href="#"
              className="text-xs font-semibold text-gray-900 hover:underline"
            >
              Carlos Rodríguez
            </a>
            <p className="text-xs text-gray-800">
              ¡Felicidades por el éxito del proyecto! Los resultados hablan por
              sí solos. 👏
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
            <img
              src="https://via.placeholder.com/32"
              alt="Tu foto de perfil"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 border border-gray-300 rounded-full px-3 py-1 flex items-center">
            <input
              type="text"
              placeholder="Añade un comentario..."
              className="w-full text-xs bg-transparent outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
