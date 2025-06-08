import React from "react";
import { useTranslation } from "react-i18next";
import { EllipsisVerticalIcon } from "@heroicons/react/24/outline";
import { PreviewProjectDataProps } from "../../../../types";
import { isDateInPast } from "../../../../helpers";

interface ProjectMenuProps {
  project: PreviewProjectDataProps;
  isOpen: boolean;
  onToggleMenu: (projectId: string) => void;
  onEditPreview: (project: PreviewProjectDataProps) => void;
  onDeletePreview: (project: PreviewProjectDataProps) => void;
  onPublishAgain: (project: PreviewProjectDataProps) => void;
}

export const ProjectMenu: React.FC<ProjectMenuProps> = ({
  project,
  isOpen,
  onToggleMenu,
  onEditPreview,
  onDeletePreview,
  onPublishAgain,
}) => {
  const { t } = useTranslation();

  return (
    <div className="relative">
      <button
        className="p-1 rounded-full hover:bg-gray-100"
        onClick={() => onToggleMenu(project.id)}
      >
        <EllipsisVerticalIcon className="h-5 w-5 text-gray-500" />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white shadow-lg rounded-md border border-gray-100 z-10">
          <ul className="py-1">
            {!isDateInPast(project.publishDate) && (
              <li>
                <button
                  onClick={() => onEditPreview(project)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  {t("previewProjects.editPreviewProject")}
                </button>
              </li>
            )}
            {project.state === "published" && (
              <li>
                <button
                  onClick={() => onPublishAgain(project)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  {t("previewProjects.publishAgain")}
                </button>
              </li>
            )}
            <li>
              <button
                onClick={() => onDeletePreview(project)}
                className="w-full text-left px-4 py-2 text-sm text-red-800 hover:bg-gray-100"
              >
                {t("previewProjects.deletePreviewProject")}
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};
