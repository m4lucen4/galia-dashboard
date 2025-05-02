import React, { useState, useEffect, useMemo } from "react";
import { ProjectDataProps } from "../../types";
import { Button } from "../shared/ui/Button";
import {
  ChevronDownIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { getCategoryLabel } from "../../helpers";

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
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  const [allImages, setAllImages] = useState<
    Array<{
      projectId: string;
      project: ProjectDataProps;
      url: string;
      title: string;
    }>
  >([]);
  const [visibleCount, setVisibleCount] = useState(15);

  const uniqueYears = useMemo(() => {
    const years = projects
      .map((project) => project.year)
      .filter((year): year is string => !!year);

    return Array.from(new Set(years)).sort((a, b) => parseInt(b) - parseInt(a));
  }, [projects]);

  const uniqueCategories = useMemo(() => {
    const categories = projects
      .map((project) => project.category)
      .filter((category): category is string => !!category);

    return Array.from(new Set(categories)).sort((a, b) =>
      getCategoryLabel(a).localeCompare(getCategoryLabel(b))
    );
  }, [projects]);

  const filteredCategories = useMemo(() => {
    if (!categorySearchTerm) return uniqueCategories;

    return uniqueCategories.filter((category) =>
      getCategoryLabel(category)
        .toLowerCase()
        .includes(categorySearchTerm.toLowerCase())
    );
  }, [uniqueCategories, categorySearchTerm]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      if (selectedYear && project.year !== selectedYear) {
        return false;
      }

      if (selectedCategory && project.category !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [projects, selectedYear, selectedCategory]);

  useEffect(() => {
    const images = filteredProjects.flatMap(
      (project) =>
        project.image_data?.map((image) => ({
          projectId: project.id,
          project: project,
          url: image.url,
          title: project.title,
        })) || []
    );

    setAllImages(shuffleArray(images));
    setVisibleCount(15);
  }, [filteredProjects]);

  const visibleImages = allImages.slice(0, visibleCount);

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 15);
  };

  const clearFilters = () => {
    setSelectedYear(null);
    setSelectedCategory(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 sm:mb-0">
          Projects Gallery
        </h3>

        <div className="flex flex-wrap gap-3">
          {/* Filtro de año */}
          <div className="relative">
            <button
              onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
              className="flex items-center justify-between w-40 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
            >
              <span className="truncate">
                {selectedYear || "Filter by Year"}
              </span>
              <ChevronDownIcon className="h-4 w-4 ml-2" />
            </button>

            {isYearDropdownOpen && (
              <div className="absolute z-10 mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                <div
                  className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                  onClick={() => {
                    setSelectedYear(null);
                    setIsYearDropdownOpen(false);
                  }}
                >
                  All Years
                </div>
                {uniqueYears.map((year) => (
                  <div
                    key={year}
                    className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                    onClick={() => {
                      setSelectedYear(year);
                      setIsYearDropdownOpen(false);
                    }}
                  >
                    {year}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              className="flex items-center justify-between w-40 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
            >
              <span className="truncate">
                {selectedCategory
                  ? getCategoryLabel(selectedCategory)
                  : "Filter by Category"}
              </span>
              <ChevronDownIcon className="h-4 w-4 ml-2" />
            </button>

            {isCategoryDropdownOpen && (
              <div className="absolute z-10 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                <div className="p-2 border-b">
                  <div className="flex items-center px-2 py-1 border border-gray-300 rounded-md">
                    <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <input
                      type="text"
                      placeholder="Search categories"
                      className="w-full outline-none text-sm"
                      value={categorySearchTerm}
                      onChange={(e) => setCategorySearchTerm(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>

                <div
                  className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                  onClick={() => {
                    setSelectedCategory(null);
                    setIsCategoryDropdownOpen(false);
                    setCategorySearchTerm("");
                  }}
                >
                  All Categories
                </div>

                {filteredCategories.map((category) => (
                  <div
                    key={category}
                    className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                    onClick={() => {
                      setSelectedCategory(category);
                      setIsCategoryDropdownOpen(false);
                      setCategorySearchTerm("");
                    }}
                  >
                    {getCategoryLabel(category)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {(selectedYear || selectedCategory) && (
            <Button title="X Clear Filters" onClick={clearFilters} secondary />
          )}
        </div>
      </div>

      <div className="mb-4 text-sm text-gray-500">
        Showing {allImages.length}{" "}
        {allImages.length === 1 ? "result" : "results"}
      </div>

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
