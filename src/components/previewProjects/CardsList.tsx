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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const sortedProjects = [...projects].sort((a, b) => {
    if (a.state !== b.state) {
      if (a.state === "preview") return -1;
      if (b.state === "preview") return 1;
    }

    if (!a.created_at) return 1;
    if (!b.created_at) return -1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
      {Array.isArray(projects) &&
        sortedProjects.map((project: PreviewProjectDataProps) => (
          <div
            key={project.id}
            className="bg-white border border-black rounded-lg shadow-md overflow-hidden"
          >
            {project.image_data && project.image_data.length > 0 ? (
              <div className="w-full h-48 overflow-hidden">
                <img
                  src={
                    project.image_data.find(
                      (image) => image.status !== "not_selected"
                    )?.url || project.image_data[0].url
                  }
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
                        {!isDateInPast(project.publishDate) && (
                          <li>
                            <button
                              onClick={() => handleEditPreview(project)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              {t("previewProjects.editPreviewProject")}
                            </button>
                          </li>
                        )}
                        <li>
                          <button
                            onClick={() => handleDeletePreview(project)}
                            className="w-full text-left px-4 py-2 text-sm text-red-800 hover:bg-gray-100"
                          >
                            {t("previewProjects.deletePreviewProject")}
                          </button>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <div className="mb-3">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500">
                      {t("previewProjects.createdAt")}{" "}
                      {project.created_at
                        ? formatDateToDDMMYYYY(project.created_at)
                        : "N/A"}
                    </span>
                    {project.publishDate && (
                      <span className="text-sm text-gray-500">
                        {t("previewProjects.publishedAt")}{" "}
                        {formatDateToDDMMYYYY(project.publishDate)}
                      </span>
                    )}
                  </div>
                  <span
                    className={`px-2.5 py-0.5 text-xs rounded-full ${
                      project.state === "published"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-black"
                    }`}
                  >
                    {project.state}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-5 pt-0 flex justify-between items-center mt-2">
              <div className="flex gap-3">
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
              <Button
                title={t("previewProjects.publish")}
                disabled={isDateInPast(project.publishDate)}
                onClick={() => handleOpenPublishConfig(project)}
              />
            </div>
            {project.publishDate && (
              <div className="px-5 pb-4 mt-1">
                <p className="text-xs text-gray-500 italic pt-2">
                  {isDateInPast(project.publishDate)
                    ? t("previewProjects.messagePublished")
                    : t("previewProjects.messagePrepublish")}
                </p>
              </div>
            )}
          </div>
        ))}
    </div>
  );
};
