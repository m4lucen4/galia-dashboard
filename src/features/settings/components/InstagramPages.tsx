import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { InstagramBusinessPage } from "../../../types";

interface InstagramPagesProps {
  businessPages?: InstagramBusinessPage[];
  fetchRequest: {
    inProgress: boolean;
    messages?: string;
    ok?: boolean;
  };
  showPagesSection: boolean;
  onToggleSection: () => void;
}

export const InstagramPages: React.FC<InstagramPagesProps> = ({
  businessPages,
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
          {t("settings.publishInstagramPages")}
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
              {t("settings.whereCanPublishInstagramPages")}
            </span>
          </div>

          {fetchRequest.inProgress ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin h-5 w-5 border-2 border-[#010000] rounded-full border-t-transparent mr-2"></div>
              <span className="text-sm text-[#010000]/70">
                {t("settings.loadingInstagramPages")}
              </span>
            </div>
          ) : businessPages && businessPages.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {businessPages.map((page) => (
                <div
                  key={page.instagram_business_account_id}
                  className="flex flex-wrap items-center gap-y-3 p-3 bg-[#d8e4d6]/50 rounded-2xl border border-[#010000]/15"
                >
                  <img
                    src={page.instagram_profile_picture}
                    alt={page.instagram_name}
                    className="h-8 w-8 rounded-full mr-3"
                  />
                  <div className="min-w-0 flex-1 break-words">
                    <p className="text-sm font-medium text-[#010000]">
                      @{page.instagram_username}
                    </p>
                    <p className="text-xs text-[#010000]/65">
                      {page.instagram_name}
                    </p>
                    <div className="flex items-center space-x-3 text-xs text-[#010000]/60 mt-1">
                      <span>
                        {page.instagram_followers_count?.toLocaleString()}{" "}
                        {t("settings.followers")}
                      </span>
                      <span>
                        {page.instagram_media_count} {t("settings.posts")}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#010000]/65">
                      {t("settings.viaFacebookPage")}
                    </p>
                    <p className="text-xs font-medium text-[#010000]/80">
                      {page.facebook_page_name}
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
              {t("settings.notFoundInstagramPages")}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
