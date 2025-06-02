import React from "react";
import { useTranslation } from "react-i18next";
import { isDateInPast } from "../../../../helpers";

interface PublishStatusMessageProps {
  publishDate: string;
}

export const PublishStatusMessage: React.FC<PublishStatusMessageProps> = ({
  publishDate,
}) => {
  const { t } = useTranslation();

  return (
    <div className="px-5 pb-4 mt-1">
      <p className="text-xs text-gray-500 italic pt-2">
        {isDateInPast(publishDate)
          ? t("previewProjects.messagePublished")
          : t("previewProjects.messagePrepublish")}
      </p>
    </div>
  );
};
