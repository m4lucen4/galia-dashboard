import React, { useMemo, useEffect, ChangeEvent } from "react";
import { InputField } from "../shared/ui/InputField";
import {
  InstagramPageInfo,
  LinkedInPageInfo,
  SocialNetworksCheck,
} from "../../types";
import { InstagramIcon, LinkedInIcon } from "../icons";
import { useLinkedInPages } from "../../hooks/useLinkedInPages";
import { useTranslation } from "react-i18next";
import { useInstagramPages } from "../../hooks/useInstagramPages";

interface ConfigPublishProps {
  publishDate: string;
  socialNetworks: SocialNetworksCheck;
  onDateChange: (newDate: string) => void;
  onSocialNetworkChange: (
    network: "instagram" | "linkedln",
    pageInfo?: LinkedInPageInfo | InstagramPageInfo
  ) => void;
}

export const ConfigPublish: React.FC<ConfigPublishProps> = ({
  publishDate,
  socialNetworks,
  onDateChange,
  onSocialNetworkChange,
}) => {
  const { t } = useTranslation();
  const { linkedin } = useLinkedInPages();
  const { instagram } = useInstagramPages();

  console.log("ConfigPublish instagram:", instagram);

  const currentDate = useMemo(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  }, []);

  const isDateValid = !!publishDate && publishDate >= currentDate;
  const isCurrentDate = publishDate === currentDate;

  const dateError =
    publishDate && publishDate < currentDate
      ? t("previewProjects.messageFutureDate")
      : "";

  const getHelperText = () => {
    if (!publishDate) {
      return t("previewProjects.messageSelectDate");
    }
    if (isCurrentDate) {
      return t("previewProjects.messageCurrentDate");
    }
    return "";
  };

  useEffect(() => {
    if (!publishDate) {
      if (socialNetworks.instagram) {
        onSocialNetworkChange("instagram");
      }
      if (socialNetworks.linkedln) {
        onSocialNetworkChange("linkedln");
      }
    }
  }, [
    publishDate,
    socialNetworks.instagram,
    socialNetworks.linkedln,
    onSocialNetworkChange,
  ]);

  const handleDateChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const newDate = e.target.value;
    onDateChange(newDate);
  };

  const handleInstagramChange = (checked: boolean) => {
    if (checked) {
      if (instagram.businessPages && instagram.businessPages.length > 0) {
        const defaultPage = instagram.businessPages[0];
        onSocialNetworkChange("instagram", {
          id: defaultPage.instagram_business_account_id,
          name: defaultPage.instagram_username,
          type: "BUSINESS",
          accessToken: defaultPage.page_access_token,
          facebookPageId: defaultPage.facebook_page_id,
          facebookPageName: defaultPage.facebook_page_name,
        } as InstagramPageInfo);
      } else {
        onSocialNetworkChange("instagram");
      }
    } else {
      onSocialNetworkChange("instagram");
    }
  };

  const handleInstagramPageChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedPage = instagram.businessPages?.find(
      (page) => page.instagram_business_account_id === selectedId
    );

    if (selectedPage) {
      onSocialNetworkChange("instagram", {
        id: selectedPage.instagram_business_account_id,
        name: selectedPage.instagram_username,
        type: "BUSINESS",
        accessToken: selectedPage.page_access_token,
        facebookPageId: selectedPage.facebook_page_id,
        facebookPageName: selectedPage.facebook_page_name,
      } as InstagramPageInfo);
    }
  };

  const handleLinkedInChange = (checked: boolean) => {
    if (checked) {
      if (linkedin.adminPages && linkedin.adminPages.length > 0) {
        const defaultPage = linkedin.adminPages[0];
        onSocialNetworkChange("linkedln", {
          id: defaultPage.id,
          name: defaultPage.name,
          type: defaultPage.type,
        });
      } else {
        onSocialNetworkChange("linkedln");
      }
    } else {
      onSocialNetworkChange("linkedln");
    }
  };

  const handleLinkedInPageChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedPage = linkedin.adminPages?.find(
      (page) => page.id === selectedId
    );

    if (selectedPage) {
      onSocialNetworkChange("linkedln", {
        id: selectedPage.id,
        name: selectedPage.name,
        type: selectedPage.type,
      });
    }
  };

  const isInstagramChecked = !!socialNetworks.instagram;
  const isLinkedInChecked = !!socialNetworks.linkedln;

  const selectedInstagramId =
    typeof socialNetworks.instagram === "object" &&
    socialNetworks.instagram !== null
      ? socialNetworks.instagram.id
      : "";

  const selectedLinkedInId =
    typeof socialNetworks.linkedln === "object"
      ? socialNetworks.linkedln.id
      : "";

  return (
    <div className="space-y-4 mt-4">
      <InputField
        id="publishDate"
        label={t("previewProjects.publishedAt")}
        type="date"
        value={publishDate}
        onChange={handleDateChange}
        min={currentDate}
        error={dateError}
        helperText={getHelperText()}
      />
      <div>
        <p className="block text-sm font-medium text-gray-700 mb-2">
          {t("previewProjects.selectSocialNetworks")}
        </p>
        <div className="space-y-2">
          {/* Instagram checkbox */}
          <div className="flex items-center">
            <input
              id="instagram"
              type="checkbox"
              className={`h-4 w-4 focus:ring-indigo-500 border-gray-300 rounded ${
                isDateValid && instagram.isConnected
                  ? "text-indigo-600"
                  : "text-gray-300 cursor-not-allowed"
              }`}
              checked={isInstagramChecked}
              onChange={(e) => handleInstagramChange(e.target.checked)}
              disabled={!isDateValid || !instagram.isConnected}
            />
            <label
              htmlFor="instagram"
              className={`ml-2 flex items-center text-sm ${
                isDateValid && instagram.isConnected
                  ? "text-gray-700"
                  : "text-gray-400"
              }`}
            >
              <InstagramIcon
                className={`w-5 h-5 mr-1 ${
                  !isDateValid || !instagram.isConnected ? "opacity-50" : ""
                }`}
              />
              Instagram
            </label>
            {!instagram.isConnected && !!publishDate && (
              <span className="ml-2 text-xs text-red-500">
                {t("previewProjects.noInstagramConnection")}
              </span>
            )}
          </div>

          {/* Instagram page selector */}
          {isInstagramChecked && instagram.isConnected && (
            <div className="ml-6 mt-2">
              <label
                htmlFor="instagram-page"
                className="block text-xs text-gray-600 mb-1"
              >
                {t("previewProjects.selectInstagramPage")}
              </label>

              {instagram.businessPages && instagram.businessPages.length > 0 ? (
                <select
                  id="instagram-page"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                  value={selectedInstagramId}
                  onChange={handleInstagramPageChange}
                >
                  {instagram.businessPages.map((page) => (
                    <option
                      key={page.instagram_business_account_id}
                      value={page.instagram_business_account_id}
                    >
                      @{page.instagram_username} ({page.facebook_page_name})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-xs text-gray-500">
                  {t("previewProjects.noInstagramPages")}
                </div>
              )}
            </div>
          )}

          {/* LinkedIn checkbox */}
          <div className="flex items-center">
            <input
              id="linkedln"
              type="checkbox"
              className={`h-4 w-4 focus:ring-indigo-500 border-gray-300 rounded ${
                isDateValid && linkedin.isConnected
                  ? "text-indigo-600"
                  : "text-gray-300 cursor-not-allowed"
              }`}
              checked={isLinkedInChecked}
              onChange={(e) => handleLinkedInChange(e.target.checked)}
              disabled={!isDateValid || !linkedin.isConnected}
            />
            <label
              htmlFor="linkedln"
              className={`ml-2 flex items-center text-sm ${
                isDateValid && linkedin.isConnected
                  ? "text-gray-700"
                  : "text-gray-400"
              }`}
            >
              <LinkedInIcon
                className={`w-5 h-5 mr-1 ${
                  !isDateValid || !linkedin.isConnected ? "opacity-50" : ""
                }`}
              />
              LinkedIn
            </label>
            {!linkedin.isConnected && !!publishDate && (
              <span className="ml-2 text-xs text-red-500">
                {t("previewProjects.noLinkedlnConnection")}
              </span>
            )}
          </div>

          {/* LinkedIn page selector */}
          {isLinkedInChecked && linkedin.isConnected && (
            <div className="ml-6 mt-2">
              <label
                htmlFor="linkedin-page"
                className="block text-xs text-gray-600 mb-1"
              >
                {t("previewProjects.selectLindkedlnPage")}
              </label>

              {linkedin.adminPages && linkedin.adminPages.length > 0 ? (
                <select
                  id="linkedin-page"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                  value={selectedLinkedInId}
                  onChange={handleLinkedInPageChange}
                >
                  {linkedin.adminPages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.name} (
                      {page.type === "PERSON"
                        ? t("previewProjects.personalProfile")
                        : t("previewProjects.companyPage")}
                      )
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-xs text-gray-500">
                  {t("previewProjects.noLinkedlnPages")}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
