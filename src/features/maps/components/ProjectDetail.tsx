import React, { useState, useEffect } from "react";
import { ProjectDataProps } from "../../../types";
import { Button } from "../../../components/shared/ui/Button";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";
import { getCategoryLabel } from "../../../helpers";
import { useTranslation } from "react-i18next";

interface ProjectDetailProps {
  project: ProjectDataProps;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ project }) => {
  const { t } = useTranslation();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const hasImages = project.image_data && project.image_data.length > 0;
  const totalImages = project.image_data?.length || 0;

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [project.id]);

  const handlePrevImage = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === 0 ? totalImages - 1 : prevIndex - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === totalImages - 1 ? 0 : prevIndex + 1
    );
  };

  const handleCopyLink = () => {
    const url = window.location.href;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Error al copiar la URL:", err);
      }

      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="project-detail">
      {hasImages && (
        <div className="mb-6 relative">
          <div className="relative w-full h-96 rounded-lg overflow-hidden">
            <img
              src={project.image_data?.[currentImageIndex].url}
              alt={`${project.title} - Imagen ${currentImageIndex + 1}`}
              className="w-full h-full object-cover object-center"
            />

            <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs">
              {currentImageIndex + 1} / {totalImages}
            </div>
          </div>

          {totalImages > 1 && (
            <div className="absolute inset-0 flex items-center justify-between">
              <button
                onClick={handlePrevImage}
                className="bg-black bg-opacity-30 hover:bg-opacity-50 text-white rounded-full p-1 ml-2 focus:outline-none"
                aria-label="Imagen anterior"
              >
                <ChevronLeftIcon className="h-6 w-6" />
              </button>

              <button
                onClick={handleNextImage}
                className="bg-black bg-opacity-30 hover:bg-opacity-50 text-white rounded-full p-1 mr-2 focus:outline-none"
                aria-label="Imagen siguiente"
              >
                <ChevronRightIcon className="h-6 w-6" />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-800">
                {t("maps.details")}
              </h3>
              <button
                onClick={handleCopyLink}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
                title={t("maps.copyLink")}
              >
                <LinkIcon className="h-4 w-4" />
              </button>
              {copied && (
                <span className="text-xs text-green-600 ml-1">
                  {t("maps.linkCopied")}
                </span>
              )}
            </div>
            {project.weblink && (
              <a
                href={project.weblink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
              >
                {t("maps.visitWebsite")}
              </a>
            )}
          </div>
          <dl className="mt-2 space-y-2">
            <div className="flex flex-row gap-6">
              {project.category && (
                <div className="flex-1">
                  <dt className="text-sm font-medium text-gray-500">
                    {t("maps.category")}
                  </dt>
                  <dd className="text-base text-gray-900">
                    {getCategoryLabel(project.category)}
                  </dd>
                </div>
              )}
              {project.year && (
                <div className="flex-1">
                  <dt className="text-sm font-medium text-gray-500">
                    {t("maps.year")}
                  </dt>
                  <dd className="text-base text-gray-900">{project.year}</dd>
                </div>
              )}
            </div>
            {project.authors && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  {t("maps.authors")}
                </dt>
                <dd className="text-base text-gray-900">{project.authors}</dd>
              </div>
            )}
            {project.promoter && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  {t("maps.promoter")}
                </dt>
                <dd className="text-base text-gray-900">{project.promoter}</dd>
              </div>
            )}
            {project.collaborators && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  {t("maps.collaborators")}
                </dt>
                <dd className="text-base text-gray-900">
                  {project.collaborators}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            {t("maps.description")}
          </h3>
          <p className="text-gray-700">{project.description}</p>
        </div>

        {project.googleMaps && (
          <div>
            <Button
              title={t("maps.seeGoogleMaps")}
              onClick={() => window.open(project.googleMaps, "_blank")}
            />
          </div>
        )}
      </div>
    </div>
  );
};
