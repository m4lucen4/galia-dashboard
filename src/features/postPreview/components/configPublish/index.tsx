import React, { useMemo, useEffect, ChangeEvent, useState } from "react";
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
  onValidationChange?: (hasError: boolean) => void;
  onPublishNowChange?: (publishNow: boolean) => void;
}

export const ConfigPublish: React.FC<ConfigPublishProps> = ({
  publishDate,
  socialNetworks,
  onDateChange,
  onSocialNetworkChange,
  onValidationChange,
  onPublishNowChange,
}) => {
  const { t } = useTranslation();
  const { linkedin, isFetchingLinkedinPages } = useLinkedInPages();
  const { instagram, isFetchingInstagramPages } = useInstagramPages();

  const [publishNow, setPublishNow] = useState(false);

  const currentDate = useMemo(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  }, []);

  // Extract date portion from timestampz format for validation
  const publishDateOnly = useMemo(() => {
    if (!publishDate) return "";
    // Extract date from "YYYY-MM-DD HH:mm:ss+00" format
    const match = publishDate.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : publishDate;
  }, [publishDate]);

  // Check if datetime is at least 1 hour in the future
  const isAtLeastOneHourInFuture = useMemo(() => {
    if (!publishDate || publishNow) return true; // Skip validation if publishNow is checked

    // Parse timestampz format: "YYYY-MM-DD HH:mm:ss+00"
    const match = publishDate.match(
      /^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2})/
    );
    if (!match) return true; // If format doesn't match, skip validation

    const [, year, month, day, hours, minutes] = match;
    const selectedDateTime = new Date(
      `${year}-${month}-${day}T${hours}:${minutes}:00Z`
    );
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000); // Add 1 hour in milliseconds

    return selectedDateTime >= oneHourFromNow;
  }, [publishDate, publishNow]);

  const isDateValid = !!publishDateOnly && publishDateOnly >= currentDate;
  const isCurrentDate = publishDateOnly === currentDate;

  const dateError = useMemo(() => {
    if (publishDateOnly && publishDateOnly < currentDate) {
      return t("previewProjects.messageFutureDate");
    }
    if (!publishNow && !isAtLeastOneHourInFuture) {
      return t("previewProjects.messageMinimumOneHour");
    }
    return "";
  }, [publishDateOnly, currentDate, publishNow, isAtLeastOneHourInFuture, t]);

  // Notify parent component about validation state
  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(!!dateError);
    }
  }, [dateError, onValidationChange]);

  const getHelperText = () => {
    if (!publishDate) {
      return t("previewProjects.messageSelectDate");
    }
    if (isCurrentDate && !publishNow) {
      return t("previewProjects.messageCurrentDate");
    }
    return "";
  };

  useEffect(() => {
    if (!publishDate) {
      // Set default date with timestampz format
      onDateChange(`${currentDate} 00:00:00+00`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      !publishDateOnly ||
      (publishDateOnly && publishDateOnly < currentDate)
    ) {
      if (socialNetworks.instagram) {
        onSocialNetworkChange("instagram");
      }
      if (socialNetworks.linkedln) {
        onSocialNetworkChange("linkedln");
      }
    }
  }, [
    publishDateOnly,
    socialNetworks.instagram,
    socialNetworks.linkedln,
    onSocialNetworkChange,
    currentDate,
  ]);

  const handleDateChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const newDate = e.target.value;
    onDateChange(newDate);
  };

  const handlePublishNowChange = (e: ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setPublishNow(checked);

    if (checked) {
      // Set current date with 00:00 time when "Publish Now" is checked
      onDateChange(`${currentDate} 00:00:00+00`);
    }

    // Notify parent component
    if (onPublishNowChange) {
      onPublishNowChange(checked);
    }
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
      {/* Instant Publish Checkbox */}
      <div className="flex items-center">
        <input
          id="publishNow"
          name="publishNow"
          type="checkbox"
          checked={publishNow}
          onChange={handlePublishNowChange}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
        />
        <label htmlFor="publishNow" className="ml-2 text-sm text-gray-900">
          {t("previewProjects.publishNow")}
        </label>
      </div>

      {publishNow && (
        <p className="text-xs text-blue-600 italic -mt-2">
          {t("previewProjects.instantPublicationMessage")}
        </p>
      )}

      <InputField
        id="publishDate"
        label={t("previewProjects.publishedAt")}
        type="dateTime"
        value={publishDate}
        onChange={handleDateChange}
        min={currentDate}
        error={dateError}
        helperText={getHelperText()}
        disabled={publishNow}
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
            loading={isFetchingInstagramPages}
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
            loading={isFetchingLinkedinPages}
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
