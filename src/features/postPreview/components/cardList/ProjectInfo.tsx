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
    <div className="mb-3 min-w-0">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div className="min-w-0 flex flex-col gap-1 font-['Geist_Mono',monospace] [&>span]:text-xs [&>span]:leading-relaxed [&>span]:text-[#010000]/65">
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
          className={`shrink-0 border border-current/15 px-3 py-1 text-xs font-medium rounded-full ${stateInfo.className}`}
        >
          {stateInfo.displayState}
        </span>
      </div>
    </div>
  );
};
