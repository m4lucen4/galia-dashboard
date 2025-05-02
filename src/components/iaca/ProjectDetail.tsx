import React, { useState, useEffect } from "react";
import { ProjectDataProps } from "../../types";
import { Button } from "../shared/ui/Button";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { getCategoryLabel } from "../../helpers";

interface ProjectDetailProps {
  project: ProjectDataProps;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ project }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
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

  return (
    <div className="project-detail">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">{project.title}</h2>

      {hasImages && (
        <div className="mb-6 relative">
          <div className="relative w-full h-72 rounded-lg overflow-hidden">
            <img
              src={project.image_data?.[currentImageIndex].url}
              alt={`${project.title} - Imagen ${currentImageIndex + 1}`}
              className="w-full h-full object-contain"
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
          <h3 className="text-lg font-semibold text-gray-800">Description</h3>
          <p className="text-gray-700">{project.description}</p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-800">Details</h3>
          <dl className="mt-2 space-y-2">
            {project.category && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Category</dt>
                <dd className="text-base text-gray-900">
                  {getCategoryLabel(project.category)}
                </dd>
              </div>
            )}
            {project.year && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Year</dt>
                <dd className="text-base text-gray-900">{project.year}</dd>
              </div>
            )}
            {project.authors && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Authors</dt>
                <dd className="text-base text-gray-900">{project.authors}</dd>
              </div>
            )}
            {project.promoter && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Promoter</dt>
                <dd className="text-base text-gray-900">{project.promoter}</dd>
              </div>
            )}
            {project.collaborators && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Collaborators
                </dt>
                <dd className="text-base text-gray-900">
                  {project.collaborators}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {project.googleMaps && (
          <div>
            <Button
              title="See in Google Maps"
              onClick={() => window.open(project.googleMaps, "_blank")}
            />
          </div>
        )}
      </div>
    </div>
  );
};
