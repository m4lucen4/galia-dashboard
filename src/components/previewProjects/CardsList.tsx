import React from "react";
import { PreviewProjectDataProps } from "../../types";
import {
  DocumentTextIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/outline";
import { Button } from "../shared/ui/Button";
import { InstagramIcon, LinkedInIcon } from "../icons";
import {
  formatDateToDDMMYYYY,
  isDateInPast,
  truncateText,
} from "../../helpers";

interface CardsListProps {
  projects: PreviewProjectDataProps[];
  openMenuId: string | null;
  handleToggleMenu: (projectId: string) => void;
  handleEditPreview: (project: PreviewProjectDataProps) => void;
  handleDeletePreview: (project: PreviewProjectDataProps) => void;
  handleOpenPublishConfig: (project: PreviewProjectDataProps) => void;
  handleOpenInstagram: (project: PreviewProjectDataProps) => void;
  handleOpenLinkedln: (project: PreviewProjectDataProps) => void;
}

export const CardsList: React.FC<CardsListProps> = ({
  projects,
  openMenuId,
  handleToggleMenu,
  handleEditPreview,
  handleDeletePreview,
  handleOpenPublishConfig,
  handleOpenInstagram,
  handleOpenLinkedln,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
      {Array.isArray(projects) &&
        projects.map((project: PreviewProjectDataProps) => (
          <div
            key={project.id}
            className="bg-white border border-black rounded-lg shadow-md overflow-hidden"
          >
            {project.image_data && project.image_data.length > 0 ? (
              <div className="w-full h-48 overflow-hidden">
                <img
                  src={project.image_data[0].url}
                  alt={project.title}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
            ) : (
              <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                <DocumentTextIcon className="w-12 h-12 text-gray-400" />
              </div>
            )}

            <div className="p-5">
              <div className="flex justify-between items-start">
                <h4 className="font-semibold text-lg text-gray-800 mb-2 line-clamp-2 flex-1">
                  {project.id} - {truncateText(project.title, 20)}
                </h4>
                <div className="relative">
                  <button
                    className="p-1 rounded-full hover:bg-gray-100"
                    onClick={() => handleToggleMenu(project.id)}
                  >
                    <EllipsisVerticalIcon className="h-5 w-5 text-gray-500" />
                  </button>
                  {openMenuId === project.id && (
                    <div className="absolute right-0 top-full mt-1 w-40 bg-white shadow-lg rounded-md border border-gray-100 z-10">
                      <ul className="py-1">
                        <li>
                          <button
                            onClick={() => handleEditPreview(project)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Edit project preview
                          </button>
                        </li>
                        <li>
                          <button
                            onClick={() => handleDeletePreview(project)}
                            className="w-full text-left px-4 py-2 text-sm text-red-800 hover:bg-gray-100"
                          >
                            Delete project preview
                          </button>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-sm text-gray-500">
                  Created at:{" "}
                  {project.created_at
                    ? formatDateToDDMMYYYY(project.created_at)
                    : "N/A"}
                </span>
                <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                <span className="px-2.5 py-0.5 text-xs rounded-full bg-gray-100 text-black">
                  {project.state}
                </span>
              </div>
            </div>

            <div className="p-5 pt-0 flex gap-3 items-center justify-end mt-2">
              <Button
                title="Publish"
                disabled={isDateInPast(project.publishDate)}
                onClick={() => handleOpenPublishConfig(project)}
              />
              <Button
                icon={<InstagramIcon />}
                secondary
                onClick={() => handleOpenInstagram(project)}
              />
              <Button
                icon={<LinkedInIcon />}
                secondary
                onClick={() => handleOpenLinkedln(project)}
              />
            </div>
            {project.publishDate && (
              <div className="px-5 pb-4 mt-1">
                <p className="text-xs text-gray-500 italic pt-2">
                  {isDateInPast(project.publishDate)
                    ? "This project has a past publication date"
                    : "You can modify the publication data until the day before the scheduled date"}
                </p>
              </div>
            )}
          </div>
        ))}
    </div>
  );
};
