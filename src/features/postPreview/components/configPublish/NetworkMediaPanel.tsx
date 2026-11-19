import React from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { PillButton } from "@/components/shared/ui/PillButton";
import { formatBytes, formatLabel } from "../../helpers/publicationImages";
import {
  formatVideoDuration,
  formatVideoSize,
} from "@/features/projects/videos/videoFormat";
import { BLOCKED_TEXTS, PANEL_TEXTS } from "../../helpers/socialVideoTexts";
import {
  INSTAGRAM_MEDIA,
  LINKEDIN_MEDIA,
  ratioLabel,
  type ImageIssue,
  type SocialNetwork,
  type VideoIssue,
} from "../../helpers/socialMediaRules";
import {
  INSTAGRAM_CAPTION_MAX,
  INSTAGRAM_MAX_HASHTAGS,
  INSTAGRAM_MAX_MENTIONS,
  LINKEDIN_COMMENTARY_MAX,
  type TextStats,
} from "../../helpers/socialText";
import type { MediaRow, NetworkMedia } from "./useMediaChecks";

const PREFIX = "previewProjects.mediaChecks";

interface NetworkMediaPanelProps {
  media: NetworkMedia;
  stats: TextStats;
  /** VITE_SOCIAL_MEDIA_VARIANTS: shows the "Ajustar imágenes" step. */
  variantsEnabled: boolean;
  onAdjust: () => void;
  /** "Reintentar" for one image: measure again and/or convert again. */
  onRetry: (url: string) => void;
}

function issueMessage(
  t: TFunction,
  locale: string,
  network: SocialNetwork,
  issue: ImageIssue,
  row: MediaRow,
  variantsEnabled: boolean,
): string {
  // Switch on: the copy is generated, so the message says what will happen. Switch off: n8n
  // publishes the original untouched, so the message only says what the network would reject.
  const issues = variantsEnabled ? `${PREFIX}.issues` : `${PREFIX}.issuesReport`;
  const facts = row.facts;
  const ratio = facts ? ratioLabel(facts.width / facts.height, locale) : "";
  const number = (value: number | undefined) =>
    new Intl.NumberFormat(locale).format(value ?? 0);
  switch (issue.code) {
    case "unsupported_format":
      return t(`${issues}.unsupportedFormat.${network}`, {
        format: facts?.mime ? formatLabel(facts.mime) : "",
      });
    case "too_heavy":
      return t(`${issues}.tooHeavy`, {
        size: formatBytes(issue.actual ?? 0, locale),
        limit: formatBytes(INSTAGRAM_MEDIA.maxBytes, locale),
      });
    case "width_too_small":
      return t(`${issues}.widthTooSmall`, {
        width: number(issue.actual),
        min: number(INSTAGRAM_MEDIA.minWidth),
      });
    case "width_too_large":
      return t(`${issues}.widthTooLarge`, {
        width: number(issue.actual),
        max: number(INSTAGRAM_MEDIA.maxWidth),
      });
    case "too_many_pixels":
      return t(`${issues}.tooManyPixels`, {
        pixels: number(issue.actual),
        limit: number(LINKEDIN_MEDIA.pixelsLimit),
      });
    case "ratio_too_narrow":
    case "ratio_too_wide":
      return t(`${PREFIX}.issues.ratioOutOfRange`, { ratio });
    case "ratio_mismatch":
      return t(`${PREFIX}.issues.ratioMismatch`, {
        ratio,
        expected: ratioLabel(issue.limit ?? 1, locale),
      });
    default:
      return "";
  }
}

function videoIssueMessage(locale: string, issue: VideoIssue): string {
  switch (issue.code) {
    case "story_too_long":
      return PANEL_TEXTS.storyTooLong(formatVideoDuration(issue.actual ?? 0));
    case "story_too_heavy":
      return PANEL_TEXTS.storyTooHeavy(formatVideoSize(issue.actual ?? 0));
    case "not_faststart":
      return PANEL_TEXTS.faststart;
    case "not_vertical":
      return PANEL_TEXTS.notVertical(ratioLabel(issue.actual ?? 0, locale));
    case "carousel_first_crop":
      return PANEL_TEXTS.carouselFirstCrop(
        ratioLabel(issue.actual ?? 0, locale),
        ratioLabel(issue.limit ?? 0, locale),
      );
  }
}

function collectionMessage(t: TFunction, network: SocialNetwork, issue: ImageIssue): string {
  const name = t(`${PREFIX}.networks.${network}`);
  if (issue.code === "too_many_items") {
    return t(`${PREFIX}.issues.tooManyImages`, { network: name, max: issue.limit, found: issue.actual });
  }
  if (issue.code === "no_images") return t(`${PREFIX}.issues.noImages`, { network: name });
  return "";
}

export const NetworkMediaPanel: React.FC<NetworkMediaPanelProps> = ({
  media,
  stats,
  variantsEnabled,
  onAdjust,
  onRetry,
}) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const { network, rows, collectionIssues } = media;
  const isInstagram = network === "instagram";
  // Video formats (VITE_SOCIAL_VIDEO): the checks are about the video, not about images.
  const videoCheck = media.video;
  const story = media.format === "story_image" || media.format === "story_video";
  // Carrusel con vídeo: the photos are checked as in a Post and the video information is added.
  const mixed = media.format === "carousel_video";
  const videoOnly = !!videoCheck && !mixed;

  const lines: { key: string; tone: "warn" | "info" | "ok"; text: string; retryUrl?: string }[] =
    [];
  for (const row of rows) {
    const label = t(`${PREFIX}.imageLabel`, { index: row.index + 1 });
    if (row.state === "loading") {
      lines.push({ key: `${row.index}-loading`, tone: "info", text: `${label}: ${t(`${PREFIX}.measuring`)}` });
      continue;
    }
    if (row.state === "error") {
      lines.push({
        key: `${row.index}-error`,
        tone: "warn",
        text: `${label}: ${t(row.errorKind === "timeout" ? `${PREFIX}.measureTimeout` : `${PREFIX}.measureError`)}`,
        retryUrl: row.url,
      });
      continue;
    }
    if (row.variant) {
      lines.push({
        key: `${row.index}-variant`,
        tone: "ok",
        text: `${label}: ${t(`${PREFIX}.variantReady`, {
          width: row.variant.width,
          height: row.variant.height,
        })}`,
      });
    }
    if (row.converting) {
      lines.push({ key: `${row.index}-converting`, tone: "info", text: `${label}: ${t(`${PREFIX}.converting`)}` });
    }
    if (row.conversionFailed || (variantsEnabled && !row.variant && row.source && !row.source.corsOk)) {
      // Retry also for a browser-blocked image: it measures the image again (CORS may be fixed).
      lines.push({
        key: `${row.index}-failed`,
        tone: "warn",
        text: `${label}: ${t(row.source?.corsOk === false ? `${PREFIX}.corsBlocked` : `${PREFIX}.conversionFailed`)}`,
        retryUrl: row.url,
      });
    }
    if (row.unknownFacts) {
      lines.push({
        key: `${row.index}-unknown`,
        tone: "info",
        text: `${label}: ${t(`${PREFIX}.unknownFacts`)}`,
      });
    }
    row.issues.forEach((issue, position) => {
      lines.push({
        key: `${row.index}-${issue.code}-${position}`,
        tone: "warn",
        text: `${label}: ${issueMessage(t, locale, network, issue, row, variantsEnabled)}`,
      });
    });
  }
  collectionIssues.forEach((issue) => {
    lines.push({
      key: issue.code,
      tone: "warn",
      // The video counts as one more item of the carousel: say so instead of "N imágenes".
      text:
        mixed && issue.code === "too_many_items"
          ? BLOCKED_TEXTS.carouselTooMany(rows.length)
          : collectionMessage(t, network, issue),
    });
  });

  if (videoCheck) {
    switch (videoCheck.state) {
      case "loading":
        lines.push({ key: "video-loading", tone: "info", text: PANEL_TEXTS.videoLoading });
        break;
      case "error":
        lines.push({ key: "video-error", tone: "warn", text: PANEL_TEXTS.videoError });
        break;
      case "none":
      case "missing":
        lines.push({ key: "video-missing", tone: "warn", text: PANEL_TEXTS.videoMissing });
        break;
      case "ready":
        if (mixed) {
          lines.push({
            key: "carousel-info",
            tone: "info",
            text: PANEL_TEXTS.carouselInfo(rows.length, rows.length + 1),
          });
        }
        if (videoCheck.facts) {
          lines.push({
            key: "video-info",
            tone: "info",
            text: PANEL_TEXTS.videoInfo(
              formatVideoDuration(videoCheck.facts.durationMs),
              formatVideoSize(videoCheck.facts.bytes),
              `${videoCheck.facts.width}×${videoCheck.facts.height}`,
            ),
          });
        }
        videoCheck.issues.forEach((issue) => {
          lines.push({
            key: `video-${issue.code}`,
            tone: "warn",
            text: videoIssueMessage(locale, issue),
          });
        });
        break;
    }
  } else if (media.format === "story_image") {
    // The server publishes the first original image as is; the feed rules do not apply.
    lines.push({ key: "story-image", tone: "info", text: PANEL_TEXTS.storyImageInfo });
    const mime = rows[0]?.facts?.mime;
    if (mime && mime !== "image/jpeg") {
      lines.push({
        key: "story-image-format",
        tone: "warn",
        text: PANEL_TEXTS.storyImageNotJpeg(formatLabel(mime)),
      });
    }
  }

  const measured = rows.every((row) => row.state === "ok");
  const clean =
    !videoOnly && measured && rows.length > 0 && lines.every((line) => line.tone === "ok");
  const limit = isInstagram ? INSTAGRAM_CAPTION_MAX : LINKEDIN_COMMENTARY_MAX;
  const format = (value: number) => new Intl.NumberFormat(locale).format(value);

  const counter = (label: string, used: number, max: number) => (
    <li
      className={used > max ? "text-amber-800" : "text-[#010000]/65"}
      key={label}
    >
      {label}
    </li>
  );

  return (
    <section
      aria-label={t(`${PREFIX}.title`, { network: t(`${PREFIX}.networks.${network}`) })}
      className="space-y-3 rounded-2xl border border-[#010000]/10 bg-white/40 px-4 py-3 text-xs leading-relaxed"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-[#010000]">
          {t(`${PREFIX}.title`, { network: t(`${PREFIX}.networks.${network}`) })}
        </p>
        {variantsEnabled && !videoOnly && !story && (
          <PillButton
            variant="outline"
            className="min-h-9 px-4 py-2 text-xs"
            onClick={onAdjust}
            disabled={rows.length === 0 || !measured}
          >
            {t(`${PREFIX}.adjustImages`)}
          </PillButton>
        )}
      </div>

      {lines.length > 0 && (
        <ul className="space-y-1">
          {lines.map((line) => (
            <li
              key={line.key}
              className={
                line.tone === "warn"
                  ? "text-amber-800"
                  : line.tone === "ok"
                    ? "text-emerald-800"
                    : "text-[#010000]/65"
              }
            >
              {line.text}
              {line.retryUrl && (
                <button
                  type="button"
                  className="ml-2 underline"
                  onClick={() => onRetry(line.retryUrl as string)}
                >
                  {t(`${PREFIX}.retry`)}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {clean && <p className="text-emerald-800">{t(`${PREFIX}.imagesOk`)}</p>}

      {story ? (
        <p className="border-t border-[#010000]/10 pt-2 text-[#010000]/65">
          {PANEL_TEXTS.storyNoCaption}
        </p>
      ) : (
      <div className="border-t border-[#010000]/10 pt-2">
        <p className="mb-1 font-medium text-[#010000]">{t(`${PREFIX}.textTitle`)}</p>
        <ul className="space-y-0.5">
          {counter(
            t(`${PREFIX}.characters`, { used: format(stats.characters), limit: format(limit) }),
            stats.characters,
            limit,
          )}
          {isInstagram &&
            counter(
              t(`${PREFIX}.hashtags`, { used: stats.hashtags, limit: INSTAGRAM_MAX_HASHTAGS }),
              stats.hashtags,
              INSTAGRAM_MAX_HASHTAGS,
            )}
          {isInstagram &&
            counter(
              t(`${PREFIX}.mentions`, { used: stats.mentions, limit: INSTAGRAM_MAX_MENTIONS }),
              stats.mentions,
              INSTAGRAM_MAX_MENTIONS,
            )}
        </ul>
        {stats.characters > limit && (
          <p className="mt-1 text-amber-800">
            {t(`${PREFIX}.textTooLong.${network}`, { limit: format(limit) })}
          </p>
        )}
        {isInstagram && (
          <p className="mt-1 text-[#010000]/50">{t(`${PREFIX}.instagramLimitsProvisional`)}</p>
        )}
      </div>
      )}
    </section>
  );
};
