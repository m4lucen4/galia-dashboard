import React from "react";
import { useTranslation } from "react-i18next";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

interface SocialMediaResultsProps {
  instagramResult?: string;
  linkedlnResult?: string;
}

export const SocialMediaResults: React.FC<SocialMediaResultsProps> = ({
  instagramResult,
  linkedlnResult,
}) => {
  const { t } = useTranslation();

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
      <div className="flex gap-2 text-xs">
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
