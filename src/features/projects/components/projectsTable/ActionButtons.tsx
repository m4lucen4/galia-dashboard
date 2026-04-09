import React from "react";
import { useTranslation } from "react-i18next";
import { EllipsisVerticalIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { ProjectDataProps, UserDataProps } from "../../../../types";
import { useHasValidSubscription } from "../../../../hooks/useHasValidSubscription";

interface ProjectMenuProps {
  currentUser: UserDataProps;
  project: ProjectDataProps;
  isOpen: boolean;
  onToggleMenu: (projectId: string) => void;
  onRecoveryProject: (project: ProjectDataProps) => void;
  onLaunchProject: (project: ProjectDataProps) => void;
  onEditProject: (project: ProjectDataProps) => void;
  onDeleteProject: (project: ProjectDataProps) => void;
  onAssignProject: (project: ProjectDataProps) => void;
}

export const ActionButtons: React.FC<ProjectMenuProps> = ({
  currentUser,
  project,
  isOpen,
  onToggleMenu,
  onRecoveryProject,
  onLaunchProject,
  onEditProject,
  onDeleteProject,
  onAssignProject,
}) => {
  const { t } = useTranslation();
  const hasValidSubscription = useHasValidSubscription();

  return (
    <div className="relative">
      <button
        className="p-1 rounded-full hover:bg-gray-100"
        onClick={() => onToggleMenu(project.id)}
      >
        <EllipsisVerticalIcon className="h-5 w-5 text-gray-500" />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-60 bg-white shadow-lg rounded-md border border-gray-100 z-50">
          <ul className="py-1">
            <li>
              {project.state === "draft" ? (
                <button
                  onClick={() => hasValidSubscription && onLaunchProject(project)}
                  disabled={!hasValidSubscription}
                  className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {!hasValidSubscription && <LockClosedIcon className="h-3.5 w-3.5 shrink-0" />}
                  {t("projects.launchProject")}
                </button>
              ) : (
                <button
                  onClick={() => hasValidSubscription && onRecoveryProject(project)}
                  disabled={!hasValidSubscription}
                  className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {!hasValidSubscription && <LockClosedIcon className="h-3.5 w-3.5 shrink-0" />}
                  {t("projects.recoveryProject")}
                </button>
              )}
            </li>
            <li>
              <button
                onClick={() => onEditProject(project)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                {t("projects.editProject")}
              </button>
            </li>
            {currentUser?.role === "admin" && (
              <li>
                <button
                  onClick={() => onAssignProject(project)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  {t("projects.assignProject")}
                </button>
              </li>
            )}
            <li>
              <button
                onClick={() => onDeleteProject(project)}
                className="w-full text-left px-4 py-2 text-sm text-red-800 hover:bg-gray-100"
              >
                {t("projects.deleteTitle")}
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};
