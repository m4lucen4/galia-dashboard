import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { LinkedInPage } from "../../../types";

interface LinkedInPagesProps {
  adminPages?: LinkedInPage[];
  fetchRequest: {
    inProgress: boolean;
    messages?: string;
    ok?: boolean;
  };
  showPagesSection: boolean;
  onToggleSection: () => void;
}

export const LinkedInPages: React.FC<LinkedInPagesProps> = ({
  adminPages,
  fetchRequest,
  showPagesSection,
  onToggleSection,
}) => {
  const { t } = useTranslation();

  return (
    <div className="mt-2 border-t pt-4">
      <button
        onClick={onToggleSection}
        className="w-full flex justify-between items-center text-sm text-gray-700 hover:text-gray-900 focus:outline-none mb-2"
      >
        <span className="font-medium">
          {t("settings.publishLinkedlnPages")}
        </span>
        <span className="flex items-center">
          {showPagesSection ? (
            <ChevronUpIcon className="h-6 w-6" />
          ) : (
            <ChevronDownIcon className="h-6 w-6" />
          )}
        </span>
      </button>

      {showPagesSection && (
        <div className="mt-2 space-y-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-500">
              {t("settings.whereCanPublishPages")}
            </span>
          </div>

          {fetchRequest.inProgress ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent mr-2"></div>
              <span className="text-sm text-gray-600">
                {t("settings.loadingPages")}
              </span>
            </div>
          ) : adminPages && adminPages.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {adminPages.map((page) => (
                <div
                  key={page.id}
                  className="flex items-center p-2 bg-gray-50 rounded-md border border-gray-100"
                >
                  {page.logoUrl ? (
                    <img
                      src={page.logoUrl}
                      alt={page.name}
                      className="h-8 w-8 rounded-full mr-3"
                    />
                  ) : (
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${
                        page.type === "PERSON"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {page.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {page.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {page.type === "PERSON"
                        ? t("settings.personalPage")
                        : t("settings.companyPage")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : fetchRequest.messages && !fetchRequest.ok ? (
            <div className="p-4 bg-red-50 rounded-md text-sm text-red-600">
              {fetchRequest.messages}
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-md text-sm text-gray-500 text-center">
              {t("settings.notFoundPages")}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
