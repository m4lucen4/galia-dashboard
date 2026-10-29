import React, { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
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

const menuActionClassName = "flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#010000] disabled:cursor-not-allowed disabled:opacity-40";

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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const positionMenu = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;

      const bounds = trigger.getBoundingClientRect();
      const { width, height } = menu.getBoundingClientRect();
      const below = bounds.bottom + 4;
      const top = below + height <= window.innerHeight - 8
        ? below
        : bounds.top - height - 4;

      menu.style.top = `${Math.max(8, Math.min(top, window.innerHeight - height - 8))}px`;
      menu.style.left = `${Math.max(8, Math.min(bounds.right - width, window.innerWidth - width - 8))}px`;
    };

    positionMenu();
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    return () => {
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
    };
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        aria-label={t("projects.actions")}
        aria-expanded={isOpen}
        className="flex size-11 items-center justify-center rounded-full border border-[#010000]/25 text-[#010000] hover:bg-[#FBEA71] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000]"
        onClick={() => onToggleMenu(project.id)}
      >
        <EllipsisVerticalIcon className="size-5" aria-hidden="true" />
      </button>
      {isOpen && createPortal(
        <div ref={menuRef} className="fixed z-50 max-h-[calc(100dvh-1rem)] w-60 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-2xl border border-[#010000]/25 bg-[#d8e4d6] p-1 font-['Hanken_Grotesk',system-ui,sans-serif] text-[#010000] shadow-lg">
          <ul className="py-1">
            <li>
              {project.state === "draft" ? (
                <button
                  onClick={() => hasValidSubscription && onLaunchProject(project)}
                  disabled={!hasValidSubscription}
                  className={`${menuActionClassName} enabled:hover:bg-[#FBEA71]`}
                >
                  {!hasValidSubscription && <LockClosedIcon className="h-3.5 w-3.5 shrink-0" />}
                  {t("projects.launchProject")}
                </button>
              ) : (
                <button
                  onClick={() => hasValidSubscription && onRecoveryProject(project)}
                  disabled={!hasValidSubscription}
                  className={`${menuActionClassName} enabled:hover:bg-[#FBEA71]`}
                >
                  {!hasValidSubscription && <LockClosedIcon className="h-3.5 w-3.5 shrink-0" />}
                  {t("projects.recoveryProject")}
                </button>
              )}
            </li>
            <li>
              <button
                onClick={() => onEditProject(project)}
                className={`${menuActionClassName} enabled:hover:bg-[#FBEA71]`}
              >
                {t("projects.editProject")}
              </button>
            </li>
            {currentUser?.role === "admin" && (
              <li>
                <button
                  onClick={() => onAssignProject(project)}
                  className={`${menuActionClassName} enabled:hover:bg-[#FBEA71]`}
                >
                  {t("projects.assignProject")}
                </button>
              </li>
            )}
            <li>
              <button
                onClick={() => onDeleteProject(project)}
                className={`${menuActionClassName} text-red-900 enabled:hover:bg-red-900/5`}
              >
                {t("projects.deleteTitle")}
              </button>
            </li>
          </ul>
        </div>,
        document.body,
      )}
    </div>
  );
};
