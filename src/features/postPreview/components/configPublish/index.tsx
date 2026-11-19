import React, { useMemo, useEffect, ChangeEvent, useState } from "react";
import { InputField } from "../../../../components/shared/ui/InputField";
import {
  FacebookPage,
  FacebookPageInfo,
  InstagramBusinessPage,
  PublicationFormat,
  InstagramPageInfo,
  LinkedInPageInfo,
  PreviewProjectDataProps,
  SocialNetworksCheck,
} from "../../../../types";
import { useLinkedInPages } from "../../../../hooks/useLinkedInPages";
import { useTranslation } from "react-i18next";
import { useInstagramPages } from "../../../../hooks/useInstagramPages";
import { FACEBOOK_PUBLISH_SCOPE } from "../../../../redux/actions/SocialNetworksActions";
import { CheckSocialNetwork } from "./CheckSocialNetwork";
import { LinkedlnSelectPage } from "./LinkedlnSelectPage";
import { InstagramSelectPage } from "./InstagramSelectPage";
import { FacebookSelectPage } from "./FacebookSelectPage";
import { NetworkMediaPanel } from "./NetworkMediaPanel";
import { NetworkFormatSelector } from "./NetworkFormatSelector";
import { StoryMediaPicker } from "./StoryMediaPicker";
import { VideoPositionPicker } from "./VideoPositionPicker";
import { ImageAdjustDialog } from "./ImageAdjustDialog";
import { MEDIA_NETWORKS, useMediaChecks, type MediaBlocker } from "./useMediaChecks";
import type { SocialNetwork } from "../../helpers/socialMediaRules";
import {
  SOCIAL_VIDEO_ENABLED,
  formatContextOf,
  formatOptions,
  resolveFormat,
  type NetworkFormats,
} from "../../helpers/socialVideo";
import { BLOCKED_TEXTS, NETWORK_NAMES } from "../../helpers/socialVideoTexts";
import { resolveStoryImage } from "../../helpers/storyImage";
import { resolveVideoPosition } from "../../helpers/videoPosition";
import { publishedImages } from "../../helpers/publicationImages";
import { usePublicationVideo } from "../../hooks/usePublicationVideo";
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
    network: "instagram" | "linkedln" | "facebook",
    pageInfo?: LinkedInPageInfo | InstagramPageInfo | FacebookPageInfo
  ) => void;
  onValidationChange?: (hasError: boolean) => void;
  onPublishNowChange?: (publishNow: boolean) => void;
  /**
   * Only with VITE_SOCIAL_MEDIA_VARIANTS on: why the selected networks cannot be published yet
   * (images that need a crop, conversions pending...); null when nothing blocks.
   */
  onMediaBlockChange?: (reason: string | null) => void;
  /**
   * Only with VITE_SOCIAL_VIDEO on: the format that will be published in each network (the user's
   * choice, else the default), reported whenever it changes.
   */
  onFormatsChange?: (formats: NetworkFormats) => void;
  /**
   * Only with VITE_SOCIAL_VIDEO on: the original photo "Historia (imagen)" publishes (the user's
   * choice, else the one of the scheduled story, else the first selected photo); null without photos.
   */
  onStoryImageChange?: (url: string | null) => void;
  /** Only with VITE_SOCIAL_VIDEO on: photo stored in the publication's scheduled story target. */
  scheduledStoryImageUrl?: string | null;
  /**
   * Only with VITE_SOCIAL_VIDEO on: 0-based position of the video in "Carrusel con vídeo" (the
   * user's choice, else the one of the scheduled carousel target, else last).
   */
  onVideoPositionChange?: (position: number) => void;
  /** Only with VITE_SOCIAL_VIDEO on: video position stored in the publication's scheduled carousel_video target. */
  scheduledVideoPosition?: number | null;
}

// The target never carries a token: a DB trigger fills it server-side for n8n.
const toFacebookTarget = (page: FacebookPage): FacebookPageInfo => ({
  id: page.id,
  name: page.name,
  type: "PAGE",
});

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
  onFormatsChange,
  onStoryImageChange,
  scheduledStoryImageUrl = null,
  onVideoPositionChange,
  scheduledVideoPosition = null,
}) => {
  const { t } = useTranslation();
  const { linkedin, isFetchingLinkedinPages, isCheckingConnection: isCheckingLinkedin } =
    useLinkedInPages();
  const {
    instagram,
    facebook,
    isFetchingInstagramPages,
    isCheckingConnection: isCheckingInstagram,
  } = useInstagramPages();

  // Facebook Pages publish through publication_targets only (Edge pipeline) and need the Meta
  // connection to be active with pages_manage_posts and at least one Page (S3).
  const facebookPages = facebook.pages ?? [];
  const facebookHasScope = (facebook.scopes ?? []).includes(FACEBOOK_PUBLISH_SCOPE);
  const facebookUsable =
    SOCIAL_PUBLISHING_EDGE_ENABLED &&
    facebook.isConnected &&
    facebookHasScope &&
    facebookPages.length > 0;
  let facebookHint: string | undefined;
  if (!facebookUsable) {
    if (facebook.isConnected && facebookHasScope) {
      facebookHint = t("previewProjects.noFacebookPages");
    } else if (instagram.isConnected) {
      // Meta connected before Facebook Pages existed (or the Page permission was not granted).
      facebookHint = t("previewProjects.facebookReconnect");
    }
  }

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
      if (socialNetworks.facebook) {
        onSocialNetworkChange("facebook");
      }
    }
  }, [
    publishDateOnly,
    socialNetworks.instagram,
    socialNetworks.linkedln,
    socialNetworks.facebook,
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

  const handleFacebookChange = (checked: boolean) => {
    if (checked && facebookPages.length > 0) {
      onSocialNetworkChange("facebook", toFacebookTarget(facebookPages[0]));
    } else {
      onSocialNetworkChange("facebook");
    }
  };

  const handleFacebookPageChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const selectedPage = facebookPages.find((page) => page.id === e.target.value);
    if (selectedPage) {
      onSocialNetworkChange("facebook", toFacebookTarget(selectedPage));
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

  const isFacebookChecked = !!socialNetworks.facebook;
  const selectedFacebookId =
    typeof socialNetworks.facebook === "object" ? socialNetworks.facebook.id : "";

  const mediaActive = useMemo(
    () => ({
      instagram: isInstagramChecked && instagram.isConnected,
      linkedin: isLinkedInChecked && linkedin.isConnected,
      facebook: isFacebookChecked && facebookUsable,
    }),
    [
      isInstagramChecked,
      instagram.isConnected,
      isLinkedInChecked,
      linkedin.isConnected,
      isFacebookChecked,
      facebookUsable,
    ],
  );

  // Video formats (VITE_SOCIAL_VIDEO): the publication's video, the format per network (the user's
  // choice when it can still work, else the default of L29) and the options to show.
  const video = usePublicationVideo(project);
  const [chosenFormats, setChosenFormats] = useState<NetworkFormats>({});
  const formatContext = useMemo(() => formatContextOf(project, video), [project, video]);
  const formatsKey = SOCIAL_VIDEO_ENABLED
    ? MEDIA_NETWORKS.map((network) =>
        resolveFormat(network, chosenFormats[network], formatContext),
      ).join(",")
    : "";
  const formats = useMemo<NetworkFormats | undefined>(() => {
    if (!formatsKey) return undefined;
    const [instagramFormat, linkedinFormat, facebookFormat] = formatsKey.split(
      ",",
    ) as PublicationFormat[];
    return { instagram: instagramFormat, linkedin: linkedinFormat, facebook: facebookFormat };
  }, [formatsKey]);
  useEffect(() => {
    if (formats) onFormatsChange?.(formats);
  }, [formats, onFormatsChange]);
  // Historia (imagen): the photo of the story (S13). The choice never touches the carousel order.
  const photoUrls = useMemo(
    () => (SOCIAL_VIDEO_ENABLED ? publishedImages(project).map((image) => image.url) : []),
    [project],
  );
  const [chosenStoryImage, setChosenStoryImage] = useState<string | null>(null);
  const storyImageUrl = SOCIAL_VIDEO_ENABLED
    ? resolveStoryImage(photoUrls, chosenStoryImage, scheduledStoryImageUrl)
    : null;
  useEffect(() => {
    if (SOCIAL_VIDEO_ENABLED) onStoryImageChange?.(storyImageUrl);
  }, [storyImageUrl, onStoryImageChange]);
  // Carrusel con vídeo: position of the video among the photos (S14), default last.
  const [chosenVideoPosition, setChosenVideoPosition] = useState<number | null>(null);
  const videoPosition = SOCIAL_VIDEO_ENABLED
    ? resolveVideoPosition(photoUrls.length, chosenVideoPosition, scheduledVideoPosition)
    : null;
  useEffect(() => {
    if (videoPosition !== null) onVideoPositionChange?.(videoPosition);
  }, [videoPosition, onVideoPositionChange]);
  const videoOptions = useMemo(
    () => (formats ? { formats, video, storyImageUrl, videoPosition } : undefined),
    [formats, video, storyImageUrl, videoPosition],
  );
  const media = useMediaChecks(project, mediaActive, videoOptions);
  const [adjusting, setAdjusting] = useState<SocialNetwork | null>(null);

  const blockReason = useMemo(() => {
    // The video information decides which formats can be offered: wait for it before confirming.
    if (
      SOCIAL_VIDEO_ENABLED &&
      video.status === "loading" &&
      (mediaActive.instagram || mediaActive.linkedin || mediaActive.facebook)
    ) {
      return BLOCKED_TEXTS.videoLoading;
    }
    for (const network of MEDIA_NETWORKS) {
      const blocker: MediaBlocker | null = media.networks[network].blocker;
      if (blocker) {
        switch (blocker.code) {
          case "videoLoading":
            return BLOCKED_TEXTS.videoLoading;
          case "videoError":
            return BLOCKED_TEXTS.videoError(NETWORK_NAMES[network]);
          case "videoMissing":
            return BLOCKED_TEXTS.videoMissing(NETWORK_NAMES[network]);
          case "storyVideoLimits":
            return BLOCKED_TEXTS.storyVideoLimits;
          case "carouselTooMany":
            return BLOCKED_TEXTS.carouselTooMany(blocker.count ?? 0);
        }
        return t(`previewProjects.mediaChecks.blocked.${blocker.code}`, {
          network: t(`previewProjects.mediaChecks.networks.${network}`),
          found: blocker.count ?? 0,
        });
      }
    }
    return null;
  }, [media.networks, t, video.status, mediaActive]);

  useEffect(() => {
    onMediaBlockChange?.(blockReason);
  }, [blockReason, onMediaBlockChange]);

  useEffect(() => () => onMediaBlockChange?.(null), [onMediaBlockChange]);

  const renderFormatSelector = (network: SocialNetwork) =>
    SOCIAL_VIDEO_ENABLED && project ? (
      <NetworkFormatSelector
        network={network}
        options={formatOptions(network, formatContext)}
        value={resolveFormat(network, chosenFormats[network], formatContext)}
        onChange={(format) => setChosenFormats((previous) => ({ ...previous, [network]: format }))}
      />
    ) : null;

  const renderStoryMedia = () => {
    const format = formats?.instagram;
    if (!SOCIAL_VIDEO_ENABLED || !project || (format !== "story_image" && format !== "story_video")) {
      return null;
    }
    return (
      <StoryMediaPicker
        format={format}
        photoUrls={photoUrls}
        selectedUrl={storyImageUrl}
        onSelect={setChosenStoryImage}
        video={video}
      />
    );
  };

  const renderVideoPosition = () => {
    if (!SOCIAL_VIDEO_ENABLED || !project || formats?.instagram !== "carousel_video") return null;
    if (videoPosition === null) return null;
    return (
      <VideoPositionPicker
        photoCount={photoUrls.length}
        value={videoPosition}
        onChange={setChosenVideoPosition}
      />
    );
  };

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
    <div className="-mr-2 max-h-[65vh] min-w-0 space-y-6 overflow-y-auto overscroll-contain pr-2 font-[Hanken_Grotesk] text-[#010000]">
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
          {mediaActive.instagram && renderFormatSelector("instagram")}
          {mediaActive.instagram && renderStoryMedia()}
          {mediaActive.instagram && renderVideoPosition()}
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
          {mediaActive.linkedin && renderFormatSelector("linkedin")}
          {project && mediaActive.linkedin && renderMediaPanel("linkedin")}
          {SOCIAL_PUBLISHING_EDGE_ENABLED && (
            <>
              <CheckSocialNetwork
                id="facebook"
                network="facebook"
                isConnected={facebookUsable}
                isChecked={isFacebookChecked}
                isDateValid={isDateValid}
                publishDate={publishDate}
                onChange={handleFacebookChange}
                loading={isFetchingInstagramPages || isCheckingInstagram}
                status={facebook.status}
                statusReason={facebook.statusReason}
                expiresAt={facebook.expiresAt}
                unavailableHint={facebookHint}
              />
              {isFacebookChecked && facebookUsable && (
                <FacebookSelectPage
                  pages={facebookPages}
                  selectedPageId={selectedFacebookId}
                  onChange={handleFacebookPageChange}
                />
              )}
              {mediaActive.facebook && renderFormatSelector("facebook")}
              {project && mediaActive.facebook && renderMediaPanel("facebook")}
            </>
          )}
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
