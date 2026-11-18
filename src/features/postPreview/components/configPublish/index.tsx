import React, { useMemo, useEffect, ChangeEvent, useState } from "react";
import { InputField } from "../../../../components/shared/ui/InputField";
import {
  InstagramBusinessPage,
  InstagramPageInfo,
  LinkedInPageInfo,
  PreviewProjectDataProps,
  SocialNetworksCheck,
} from "../../../../types";
import { useLinkedInPages } from "../../../../hooks/useLinkedInPages";
import { useTranslation } from "react-i18next";
import { useInstagramPages } from "../../../../hooks/useInstagramPages";
import { CheckSocialNetwork } from "./CheckSocialNetwork";
import { LinkedlnSelectPage } from "./LinkedlnSelectPage";
import { InstagramSelectPage } from "./InstagramSelectPage";
import { NetworkMediaPanel } from "./NetworkMediaPanel";
import { ImageAdjustDialog } from "./ImageAdjustDialog";
import { MEDIA_NETWORKS, useMediaChecks, type MediaBlocker } from "./useMediaChecks";
import type { SocialNetwork } from "../../helpers/socialMediaRules";
import {
  SOCIAL_PUBLISHING_EDGE_ENABLED,
  madridToday,
  madridWallClockToInstant,
} from "../../../../helpers/publishDate";

interface ConfigPublishProps {
  /** The publication being configured: its images and text feed the per-network checks. */
  project?: PreviewProjectDataProps | null;
  publishDate: string;
  socialNetworks: SocialNetworksCheck;
  onDateChange: (newDate: string) => void;
  onSocialNetworkChange: (
    network: "instagram" | "linkedln",
    pageInfo?: LinkedInPageInfo | InstagramPageInfo
  ) => void;
  onValidationChange?: (hasError: boolean) => void;
  onPublishNowChange?: (publishNow: boolean) => void;
  /**
   * Only with VITE_SOCIAL_MEDIA_VARIANTS on: why the selected networks cannot be published yet
   * (images that need a crop, conversions pending...); null when nothing blocks.
   */
  onMediaBlockChange?: (reason: string | null) => void;
}

// The target never carries a token: a DB trigger fills it server-side for n8n.
const toInstagramTarget = (page: InstagramBusinessPage): InstagramPageInfo => ({
  id: page.instagram_business_account_id,
  name: page.instagram_username,
  type: "BUSINESS",
  facebookPageId: page.facebook_page_id,
  facebookPageName: page.facebook_page_name,
});

export const ConfigPublish: React.FC<ConfigPublishProps> = ({
  project = null,
  publishDate,
  socialNetworks,
  onDateChange,
  onSocialNetworkChange,
  onValidationChange,
  onPublishNowChange,
  onMediaBlockChange,
}) => {
  const { t } = useTranslation();
  const { linkedin, isFetchingLinkedinPages, isCheckingConnection: isCheckingLinkedin } =
    useLinkedInPages();
  const {
    instagram,
    isFetchingInstagramPages,
    isCheckingConnection: isCheckingInstagram,
  } = useInstagramPages();

  const [publishNow, setPublishNow] = useState(false);

  const currentDate = useMemo(() => {
    // With the Edge pipeline the user works in Europe/Madrid, whatever the browser's time zone is.
    if (SOCIAL_PUBLISHING_EDGE_ENABLED) return madridToday();
    const today = new Date();
    return today.toISOString().split("T")[0];
  }, []);

  // Extract date portion from timestampz format for validation
  const publishDateOnly = useMemo(() => {
    if (!publishDate) return "";
    // Extract date from "YYYY-MM-DD HH:mm:ss+00" format
    const match = new RegExp(/^(\d{4}-\d{2}-\d{2})/).exec(publishDate);
    return match ? match[1] : publishDate;
  }, [publishDate]);

  // Check if datetime is at least 1 hour in the future
  const isAtLeastOneHourInFuture = useMemo(() => {
    if (!publishDate || publishNow) return true; // Skip validation if publishNow is checked

    // The picked date and time are Madrid wall-clock: compare the real instant they stand for.
    if (SOCIAL_PUBLISHING_EDGE_ENABLED) {
      const selectedInstant = madridWallClockToInstant(publishDate);
      if (!selectedInstant) return true;
      return selectedInstant.getTime() >= Date.now() + 60 * 60 * 1000;
    }

    // Parse timestampz format: "YYYY-MM-DD HH:mm:ss+00"
    const match = new RegExp(/^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2})/).exec(publishDate);
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
        onSocialNetworkChange("instagram", toInstagramTarget(defaultPage));
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
      onSocialNetworkChange("instagram", toInstagramTarget(selectedPage));
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

  const mediaActive = useMemo(
    () => ({
      instagram: isInstagramChecked && instagram.isConnected,
      linkedin: isLinkedInChecked && linkedin.isConnected,
    }),
    [isInstagramChecked, instagram.isConnected, isLinkedInChecked, linkedin.isConnected],
  );
  const media = useMediaChecks(project, mediaActive);
  const [adjusting, setAdjusting] = useState<SocialNetwork | null>(null);

  const blockReason = useMemo(() => {
    for (const network of MEDIA_NETWORKS) {
      const blocker: MediaBlocker | null = media.networks[network].blocker;
      if (blocker) {
        return t(`previewProjects.mediaChecks.blocked.${blocker.code}`, {
          network: t(`previewProjects.mediaChecks.networks.${network}`),
          found: blocker.count ?? 0,
        });
      }
    }
    return null;
  }, [media.networks, t]);

  useEffect(() => {
    onMediaBlockChange?.(blockReason);
  }, [blockReason, onMediaBlockChange]);

  useEffect(() => () => onMediaBlockChange?.(null), [onMediaBlockChange]);

  const renderMediaPanel = (network: SocialNetwork) => (
    <NetworkMediaPanel
      media={media.networks[network]}
      stats={media.stats}
      variantsEnabled={media.enabled}
      onAdjust={() => setAdjusting(network)}
      onRetry={(url) => media.retryRow(network, url)}
    />
  );

  return (
    <div className="min-w-0 space-y-6 font-[Hanken_Grotesk] text-[#010000]">
      {/* Instant Publish Checkbox */}
      <div className="flex items-center gap-3 rounded-full border border-[#010000]/15 bg-[#010000]/5 px-4 py-3">
        <input
          id="publishNow"
          name="publishNow"
          type="checkbox"
          checked={publishNow}
          onChange={handlePublishNowChange}
          className="h-4 w-4 shrink-0 cursor-pointer rounded border-[#010000]/30 accent-[#010000] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#010000]"
        />
        <label htmlFor="publishNow" className="cursor-pointer text-sm font-medium">
          {t("previewProjects.publishNow")}
        </label>
      </div>

      {publishNow && (
        <p className="-mt-3 px-2 text-xs leading-relaxed text-[#010000]/65">
          {t("previewProjects.instantPublicationMessage")}
        </p>
      )}

      <div className="[&_label]:mb-2 [&_label]:block [&_label]:font-medium">
        <InputField
          id="publishDate"
          className="block w-full min-w-0 rounded-2xl border border-[#010000]/20 bg-[#e8eee5] px-3 py-3 font-[Geist_Mono] text-sm text-[#010000] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000] disabled:cursor-not-allowed disabled:opacity-50"
          label={t("previewProjects.publishedAt")}
          type="dateTime"
          value={publishDate}
          onChange={handleDateChange}
          min={currentDate}
          error={dateError}
          helperText={getHelperText()}
          disabled={publishNow}
        />
      </div>
      <div className="min-w-0 border-t border-[#010000]/10 pt-5">
        <p className="mb-3 block text-sm font-medium">
          {t("previewProjects.selectSocialNetworks")}
        </p>
        <div className="space-y-3">
          <CheckSocialNetwork
            id="instagram"
            network="instagram"
            isConnected={instagram.isConnected}
            isChecked={isInstagramChecked}
            isDateValid={isDateValid}
            publishDate={publishDate}
            onChange={handleInstagramChange}
            loading={isFetchingInstagramPages || isCheckingInstagram}
            status={instagram.status}
            statusReason={instagram.statusReason}
            expiresAt={instagram.expiresAt}
          />
          {isInstagramChecked && instagram.isConnected && (
            <InstagramSelectPage
              businessPages={instagram.businessPages}
              selectedPageId={selectedInstagramId}
              onChange={handleInstagramPageChange}
            />
          )}
          {project && mediaActive.instagram && renderMediaPanel("instagram")}
          <CheckSocialNetwork
            id="linkedln"
            network="linkedin"
            isConnected={linkedin.isConnected}
            isChecked={isLinkedInChecked}
            isDateValid={isDateValid}
            publishDate={publishDate}
            onChange={handleLinkedInChange}
            loading={isFetchingLinkedinPages || isCheckingLinkedin}
            status={linkedin.status}
            statusReason={linkedin.statusReason}
            expiresAt={linkedin.expiresAt}
          />
          {isLinkedInChecked && linkedin.isConnected && (
            <LinkedlnSelectPage
              adminPages={linkedin.adminPages}
              selectedPageId={selectedLinkedInId}
              onChange={handleLinkedInPageChange}
            />
          )}
          {project && mediaActive.linkedin && renderMediaPanel("linkedin")}
        </div>
        {blockReason && (
          <p role="alert" className="mt-3 px-2 text-xs leading-relaxed text-amber-800">
            {blockReason}
          </p>
        )}
      </div>
      {media.enabled && project && media.previewId && adjusting && (
        <ImageAdjustDialog
          network={adjusting}
          previewId={media.previewId}
          rows={media.networks[adjusting].rows}
          commonRatio={media.networks[adjusting].commonRatio}
          onCommonRatioChange={media.setCarouselRatio}
          onSaved={media.applyVariant}
          onRemoveVariant={media.removeVariant}
          onClose={() => setAdjusting(null)}
        />
      )}
    </div>
  );
};
