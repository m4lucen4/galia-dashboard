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
    <div className="mt-2 border-t pt-4">
      <button
        onClick={onToggleSection}
        className="w-full flex justify-between items-center text-sm text-gray-700 hover:text-gray-900 focus:outline-none mb-2"
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
            <span className="text-xs text-gray-500">
              {t("settings.whereCanPublishInstagramPages")}
            </span>
          </div>

          {fetchRequest.inProgress ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin h-5 w-5 border-2 border-pink-500 rounded-full border-t-transparent mr-2"></div>
              <span className="text-sm text-gray-600">
                {t("settings.loadingInstagramPages")}
              </span>
            </div>
          ) : businessPages && businessPages.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {businessPages.map((page) => (
                <div
                  key={page.instagram_business_account_id}
                  className="flex items-center p-2 bg-pink-50 rounded-md border border-pink-100"
                >
                  <img
                    src={page.instagram_profile_picture}
                    alt={page.instagram_name}
                    className="h-8 w-8 rounded-full mr-3"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      @{page.instagram_username}
                    </p>
                    <p className="text-xs text-gray-500">
                      {page.instagram_name}
                    </p>
                    <div className="flex items-center space-x-3 text-xs text-gray-400 mt-1">
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
                    <p className="text-xs text-gray-500">
                      {t("settings.viaFacebookPage")}
                    </p>
                    <p className="text-xs font-medium text-gray-700">
                      {page.facebook_page_name}
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
              {t("settings.notFoundInstagramPages")}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
