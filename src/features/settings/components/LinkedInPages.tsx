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
    <div className="mt-6 border-t border-[#010000]/15 pt-5">
      <button
        type="button"
        aria-expanded={showPagesSection}
        onClick={onToggleSection}
        className="w-full flex justify-between items-center text-sm text-[#010000]/80 hover:text-[#010000] rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#010000] mb-2"
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
            <span className="text-xs text-[#010000]/65">
              {t("settings.whereCanPublishPages")}
            </span>
          </div>

          {fetchRequest.inProgress ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin h-5 w-5 border-2 border-[#010000] rounded-full border-t-transparent mr-2"></div>
              <span className="text-sm text-[#010000]/70">
                {t("settings.loadingPages")}
              </span>
            </div>
          ) : adminPages && adminPages.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {adminPages.map((page) => (
                <div
                  key={page.id}
                  className="flex flex-wrap items-center gap-y-3 p-3 bg-[#d8e4d6]/50 rounded-2xl border border-[#010000]/15"
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
                          ? "bg-[#d8e4d6] text-[#010000]"
                          : "bg-[#010000]/10 text-[#010000]/80"
                      }`}
                    >
                      {page.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-[#010000]">
                      {page.name}
                    </p>
                    <p className="text-xs text-[#010000]/65">
                      {page.type === "PERSON"
                        ? t("settings.personalPage")
                        : t("settings.companyPage")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : fetchRequest.messages && !fetchRequest.ok ? (
            <div className="p-4 bg-[#ff522a]/10 rounded-2xl text-sm text-[#9f231b]">
              {fetchRequest.messages}
            </div>
          ) : (
            <div className="p-4 bg-[#d8e4d6]/50 rounded-2xl text-sm text-[#010000]/65 text-center">
              {t("settings.notFoundPages")}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
