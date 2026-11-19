import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { InstagramIcon, LinkedInIcon } from "../../../../components/icons";
import type { PublicationTarget } from "../../../../types";
import {
  formatInstantInMadrid,
  madridDayKeyOf,
  madridTimeOf,
} from "../../../../helpers/publishDate";
import {
  isRetryable,
  isRunning,
  needsReconnect,
  targetErrorKey,
  targetPhase,
  visibleTargets,
  type TargetPhase,
} from "../../helpers/publicationTargets";
import { PHASE_STYLES } from "../../helpers/targetPhaseStyles";
import { useNow } from "../../hooks/useNow";
import { SOCIAL_VIDEO_ENABLED } from "../../helpers/socialVideo";
import { VIDEO_TARGET_ERROR_TEXTS, formatLabel } from "../../helpers/socialVideoTexts";

interface PublicationTargetsStatusProps {
  targets?: PublicationTarget[];
  /** An action on this publication is in flight: actions are disabled. */
  busy?: boolean;
  onRetry?: (target: PublicationTarget) => void;
  onReschedule?: () => void;
  /** Roomier layout for the publication view. */
  detailed?: boolean;
}

const PHASE_ICONS: Record<TargetPhase, React.ElementType> = {
  scheduled: ClockIcon,
  publishing: ArrowPathIcon,
  published: CheckCircleIcon,
  retrying: ArrowPathIcon,
  needsAction: ExclamationTriangleIcon,
  failed: XCircleIcon,
};

const actionButton =
  "rounded-full border border-[#010000]/25 px-3 py-1 text-xs font-medium text-[#010000] transition-colors hover:bg-[#d8e4d6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000] disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Per-network publication state (S1): scheduled, publishing, published (with link), retrying,
 * needs action and failed, each with its reason and how to fix it, plus Reintentar / Volver a programar.
 */
export const PublicationTargetsStatus: React.FC<PublicationTargetsStatusProps> = ({
  targets,
  busy = false,
  onRetry,
  onReschedule,
  detailed = false,
}) => {
  const { t } = useTranslation();
  const shown = visibleTargets(targets);
  const now = useNow(shown.some((target) => target.status === "pending"));

  if (shown.length === 0) return null;

  const anyRunning = shown.some(isRunning);
  const anyRetryable = shown.some(isRetryable);

  return (
    <div className={detailed ? "space-y-3" : "space-y-2"}>
      <ul aria-live="polite" className="space-y-2">
        {shown.map((target) => {
          const phase = targetPhase(target, now) as TargetPhase;
          const Icon = PHASE_ICONS[phase];
          const NetworkIcon = target.network === "instagram" ? InstagramIcon : LinkedInIcon;
          const network = t(`previewProjects.publication.networks.${target.network}`);
          const errorKey = targetErrorKey(target.errorCode);
          // Codes of the video formats carry their Spanish text as default (a locale may override it).
          const videoText = Object.prototype.hasOwnProperty.call(VIDEO_TARGET_ERROR_TEXTS, errorKey)
            ? VIDEO_TARGET_ERROR_TEXTS[errorKey]
            : null;
          const reason = t(`previewProjects.publication.targetErrors.${errorKey}.reason`, {
            network,
            defaultValue: videoText?.reason,
          });
          const fix = t(`previewProjects.publication.targetErrors.${errorKey}.fix`, {
            network,
            defaultValue: videoText?.fix,
          });
          const runAtDay = madridDayKeyOf(target.runAt);
          const today = madridDayKeyOf(new Date(now));
          const showError = phase === "retrying" || phase === "needsAction" || phase === "failed";

          let label: string;
          switch (phase) {
            case "scheduled":
              label = t("previewProjects.publication.status.scheduled", {
                date: formatInstantInMadrid(target.runAt),
              });
              break;
            case "published":
              label = target.publishedAt
                ? t("previewProjects.publication.status.publishedAt", {
                    date: formatInstantInMadrid(target.publishedAt),
                  })
                : t("previewProjects.publication.status.published");
              break;
            default:
              label = t(`previewProjects.publication.status.${phase}`);
          }

          return (
            <li
              key={target.id}
              className={`min-w-0 rounded-2xl border px-3 py-2 text-xs leading-relaxed ${PHASE_STYLES[phase].chip}`}
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <NetworkIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium">
                  {network}
                  {target.accountName ? ` · ${target.accountName}` : ""}
                </span>
                {SOCIAL_VIDEO_ENABLED && target.format && (
                  <span className="rounded-full border border-current/30 px-2 py-0.5 font-medium">
                    {formatLabel(target.network, target.format)}
                  </span>
                )}
                <span className="flex items-center gap-1 font-medium">
                  <Icon
                    aria-hidden="true"
                    className={`h-3.5 w-3.5 shrink-0 ${
                      phase === "publishing" ? "motion-safe:animate-spin" : ""
                    }`}
                  />
                  {label}
                </span>
                {phase === "published" && target.permalink && (
                  <a
                    href={target.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline"
                  >
                    {t("previewProjects.publication.viewPost")}
                  </a>
                )}
                {onRetry && isRetryable(target) && (
                  <button
                    type="button"
                    className={`${actionButton} ml-auto`}
                    disabled={busy || isRunning(target)}
                    onClick={() => onRetry(target)}
                  >
                    {busy
                      ? t("previewProjects.publication.actions.working")
                      : t("previewProjects.publication.actions.retry")}
                  </button>
                )}
              </div>
              {phase === "retrying" && (
                <p className="mt-1">
                  {runAtDay && runAtDay === today
                    ? t("previewProjects.publication.status.nextAttemptAt", {
                        time: madridTimeOf(target.runAt),
                      })
                    : t("previewProjects.publication.status.nextAttemptOn", {
                        date: formatInstantInMadrid(target.runAt),
                      })}{" "}
                  {t("previewProjects.publication.status.attempt", {
                    attempts: target.attempts,
                    max: target.maxAttempts,
                  })}
                </p>
              )}
              {showError && (
                <p className="mt-1">
                  <span className="font-medium">
                    {t("previewProjects.publication.reasonLabel")}
                  </span>{" "}
                  {reason}
                </p>
              )}
              {(phase === "needsAction" || phase === "failed") && (
                <p className="mt-1">
                  {fix}{" "}
                  {needsReconnect(target) && (
                    <Link to="/settings" className="font-medium underline">
                      {t("previewProjects.goToSettings")}
                    </Link>
                  )}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {onReschedule && anyRetryable && (
        <button
          type="button"
          className={actionButton}
          disabled={busy || anyRunning}
          onClick={onReschedule}
        >
          {t("previewProjects.publication.actions.reschedule")}
        </button>
      )}
    </div>
  );
};
