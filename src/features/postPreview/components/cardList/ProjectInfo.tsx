import React from "react";
import { useTranslation } from "react-i18next";
import {
  formatDateToDDMMYYYY,
  formatDateTimeToDisplay,
  getProjectStateInfo,
} from "../../../../helpers";
import { PreviewProjectDataProps } from "../../../../types";

interface ProjectInfoProps {
  project: PreviewProjectDataProps;
}

export const ProjectInfo: React.FC<ProjectInfoProps> = ({ project }) => {
  const { t } = useTranslation();

  const stateInfo = getProjectStateInfo(project);

  return (
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
              {formatDateTimeToDisplay(project.publishDate)}
            </span>
          )}
        </div>
        <span
          className={`px-2.5 py-0.5 text-xs rounded-full ${stateInfo.className}`}
        >
          {stateInfo.displayState}
        </span>
      </div>
    </div>
  );
};
