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
    <div className="px-5 pb-5 mt-1">
      <p className="text-xs leading-relaxed text-[#010000]/65 border-t border-[#010000]/15 pt-3">
        {isDateInPast(publishDate)
          ? t("previewProjects.messagePublished")
          : t("previewProjects.messagePrepublish")}
      </p>
    </div>
  );
};
