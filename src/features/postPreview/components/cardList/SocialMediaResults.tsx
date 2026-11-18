import React from "react";
import { useTranslation } from "react-i18next";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import type { PublicationTarget } from "../../../../types";
import { SOCIAL_PUBLISHING_EDGE_ENABLED } from "../../../../helpers/publishDate";
import { visibleTargets } from "../../helpers/publicationTargets";
import { PublicationTargetsStatus } from "../publicationStatus/PublicationTargetsStatus";

interface SocialMediaResultsProps {
  instagramResult?: string;
  linkedlnResult?: string;
  /** Edge pipeline only: current publication_targets; they win over the legacy columns. */
  targets?: PublicationTarget[];
  busy?: boolean;
  onRetry?: (target: PublicationTarget) => void;
  onReschedule?: () => void;
}

export const SocialMediaResults: React.FC<SocialMediaResultsProps> = ({
  instagramResult,
  linkedlnResult,
  targets,
  busy,
  onRetry,
  onReschedule,
}) => {
  const { t } = useTranslation();

  // Publications without targets (history, or the switch off) keep the legacy columns.
  if (SOCIAL_PUBLISHING_EDGE_ENABLED && visibleTargets(targets).length > 0) {
    return (
      <div className="px-5 pb-2">
        <PublicationTargetsStatus
          targets={targets}
          busy={busy}
          onRetry={onRetry}
          onReschedule={onReschedule}
        />
      </div>
    );
  }

  if (
    instagramResult !== "true" &&
    instagramResult !== "false" &&
    linkedlnResult !== "true" &&
    linkedlnResult !== "false"
  ) {
    return null;
  }

  return (
    <div className="px-5 pb-2">
      <div className="flex flex-wrap gap-2 text-xs leading-relaxed [&>span]:rounded-full [&>span]:border [&>span]:border-current/20 [&>span]:px-2.5 [&>span]:py-1 [&_svg]:shrink-0">
        {instagramResult === "true" && (
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircleIcon className="h-3 w-3" />
            {t("previewProjects.instagramPosted")}
          </span>
        )}
        {instagramResult === "false" && (
          <span className="flex items-center gap-1 text-red-600">
            <XCircleIcon className="h-3 w-3" />
            {t("previewProjects.instagramFailed")}
          </span>
        )}
        {instagramResult === "notSelected" && (
          <span className="flex items-center gap-1 text-blue-600">
            <XCircleIcon className="h-3 w-3" />
            {t("previewProjects.instagramNotSelected")}
          </span>
        )}
        {linkedlnResult === "true" && (
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircleIcon className="h-3 w-3" />
            {t("previewProjects.linkedlnPosted")}
          </span>
        )}
        {linkedlnResult === "false" && (
          <span className="flex items-center gap-1 text-red-600">
            <XCircleIcon className="h-3 w-3" />
            {t("previewProjects.linkedlnFailed")}
          </span>
        )}
        {linkedlnResult === "notSelected" && (
          <span className="flex items-center gap-1 text-blue-600">
            <XCircleIcon className="h-3 w-3" />
            {t("previewProjects.linkedlnNotSelected")}
          </span>
        )}
      </div>
    </div>
  );
};
