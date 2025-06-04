import React, { useMemo, useEffect, ChangeEvent } from "react";
import { InputField } from "../../../../components/shared/ui/InputField";
import {
  InstagramPageInfo,
  LinkedInPageInfo,
  SocialNetworksCheck,
} from "../../../../types";
import { useLinkedInPages } from "../../../../hooks/useLinkedInPages";
import { useTranslation } from "react-i18next";
import { useInstagramPages } from "../../../../hooks/useInstagramPages";
import { CheckSocialNetwork } from "./CheckSocialNetwork";
import { LinkedlnSelectPage } from "./LinkedlnSelectPage";
import { InstagramSelectPage } from "./InstagramSelectPage";

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
          <CheckSocialNetwork
            id="instagram"
            network="instagram"
            isConnected={instagram.isConnected}
            isChecked={isInstagramChecked}
            isDateValid={isDateValid}
            publishDate={publishDate}
            onChange={handleInstagramChange}
          />
          {isInstagramChecked && instagram.isConnected && (
            <InstagramSelectPage
              businessPages={instagram.businessPages}
              selectedPageId={selectedInstagramId}
              onChange={handleInstagramPageChange}
            />
          )}
          <CheckSocialNetwork
            id="linkedln"
            network="linkedin"
            isConnected={linkedin.isConnected}
            isChecked={isLinkedInChecked}
            isDateValid={isDateValid}
            publishDate={publishDate}
            onChange={handleLinkedInChange}
          />
          {isLinkedInChecked && linkedin.isConnected && (
            <LinkedlnSelectPage
              adminPages={linkedin.adminPages}
              selectedPageId={selectedLinkedInId}
              onChange={handleLinkedInPageChange}
            />
          )}
        </div>
      </div>
    </div>
  );
};
