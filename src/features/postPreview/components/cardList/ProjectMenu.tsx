import React from "react";
import { useTranslation } from "react-i18next";
import { EllipsisVerticalIcon } from "@heroicons/react/24/outline";
import { PreviewProjectDataProps } from "../../../../types";
import { isDateInPast } from "../../../../helpers";
import { useHasValidSubscription } from "../../../../hooks/useHasValidSubscription";

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
  const hasValidSubscription = useHasValidSubscription();

  return (
    <div className="relative shrink-0">
      <button
        className="p-2 rounded-full border border-[#010000]/20 text-[#010000] hover:bg-[#d8e4d6] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000]"
        onClick={() => onToggleMenu(project.id)}
      >
        <EllipsisVerticalIcon className="h-5 w-5 text-[#010000]" />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 max-w-[calc(100vw-3rem)] bg-[#f5f7f3] shadow-lg rounded-2xl border border-[#010000]/25 z-20">
          <ul className="p-1.5 [&_button]:rounded-xl [&_button]:text-[#010000] [&_button:hover]:bg-[#d8e4d6] [&_li:last-child_button]:text-red-800">
            {!isDateInPast(project.publishDate) && (
              <li>
                <button
                  onClick={() => hasValidSubscription && onEditPreview(project)}
                  disabled={!hasValidSubscription}
                  title={!hasValidSubscription ? t("subscription.restrictedAction") : undefined}
                  className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t("previewProjects.editPreviewProject")}
                </button>
              </li>
            )}
            {project.state === "published" && (
              <li>
                <button
                  onClick={() => hasValidSubscription && onPublishAgain(project)}
                  disabled={!hasValidSubscription}
                  title={!hasValidSubscription ? t("subscription.restrictedAction") : undefined}
                  className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
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
