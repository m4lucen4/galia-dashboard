import React, { useState, useEffect } from "react";
import { ProjectDataProps } from "../../types";
import { Button } from "../shared/ui/Button";

interface ProjectsGalleryProps {
  projects: ProjectDataProps[];
  onSelectProject: (project: ProjectDataProps) => void;
}

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const ProjectsGallery: React.FC<ProjectsGalleryProps> = ({
  projects,
  onSelectProject,
}) => {
  const [allImages, setAllImages] = useState<
    Array<{
      projectId: string;
      project: ProjectDataProps;
      url: string;
      title: string;
    }>
  >([]);

  const [visibleCount, setVisibleCount] = useState(15);

  useEffect(() => {
    const images = projects.flatMap(
      (project) =>
        project.image_data?.map((image) => ({
          projectId: project.id,
          project: project,
          url: image.url,
          title: project.title,
        })) || []
    );

    setAllImages(shuffleArray(images));
  }, [projects]);

  const visibleImages = allImages.slice(0, visibleCount);

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 15);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">
        Projects Gallery
      </h3>

      <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-2">
        {visibleImages.map((image, index) => (
          <div
            key={`${image.projectId}-${index}`}
            className="break-inside-avoid mb-2"
            onClick={() => onSelectProject(image.project)}
          >
            <div className="group relative overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer">
              <img
                src={image.url}
                alt={`${image.title} - Imagen ${index + 1}`}
                className="w-full h-auto object-cover transform transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                <p className="text-white text-sm font-medium truncate">
                  {image.title}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {visibleCount < allImages.length && (
        <div className="flex justify-center mt-8">
          <Button title="Ver más" onClick={handleLoadMore} />
        </div>
      )}
    </div>
  );
};
