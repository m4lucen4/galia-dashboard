import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { InstagramIcon, LinkedInIcon } from "../../../../components/icons";
import { SocialConnectionStatus } from "../../../../types";
import {
  formatMadridDate,
  isBrokenConnection,
  reasonTranslationKey,
} from "../../../settings/helpers/socialConnectionStatus";

const MADRID_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Madrid",
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

// Europe/Madrid offset (ms, DST included) at a real instant.
const madridOffsetMs = (instantMs: number): number => {
  const parts: Record<string, number> = {};
  for (const part of MADRID_PARTS.formatToParts(new Date(instantMs))) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return asUtc - Math.floor(instantMs / 1000) * 1000;
};

// The stored publishDate ("YYYY-MM-DD HH:mm:ss+00") is Madrid wall-clock labelled +00 (S9: converted
// to a real instant at cutover). Read the digits as Madrid wall-clock and return the real instant.
const madridWallClockToInstant = (value?: string): Date | null => {
  const match = value
    ?.trim()
    .match(
      /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|\+00(?::?00)?)?$/
    );
  if (!match) return null;
  const [year, month, day, hour, minute, second] = match
    .slice(1)
    .map((part) => Number(part ?? 0));
  const wall = Date.UTC(year, month - 1, day, hour, minute, second);
  const check = new Date(wall);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    check.getUTCHours() !== hour
  ) {
    return null;
  }
  // Two passes settle the offset around DST changes.
  const first = wall - madridOffsetMs(wall);
  return new Date(wall - madridOffsetMs(first));
};

interface CheckSocialNetworkProps {
  id: string;
  network: "instagram" | "linkedin";
  isConnected: boolean;
  isChecked: boolean;
  isDateValid: boolean;
  publishDate: string;
  loading: boolean;
  status?: SocialConnectionStatus;
  statusReason?: string | null;
  expiresAt?: string;
  onChange: (checked: boolean) => void;
}

export const CheckSocialNetwork: React.FC<CheckSocialNetworkProps> = ({
  id,
  network,
  isConnected,
  isChecked,
  isDateValid,
  publishDate,
  loading,
  status,
  statusReason,
  expiresAt,
  onChange,
}) => {
  const { t } = useTranslation();

  const NetworkIcon = network === "instagram" ? InstagramIcon : LinkedInIcon;
  const networkName = network === "instagram" ? "Instagram" : "LinkedIn";
  const connectionKey =
    network === "instagram" ? "noInstagramConnection" : "noLinkedlnConnection";

  const isBroken = isBrokenConnection(status);

  // A working connection (connected or expiring) stops working before the selected publication instant.
  const expiresBeforePublishing = (() => {
    if ((status !== "connected" && status !== "expiring") || !expiresAt) {
      return false;
    }
    const expiry = new Date(expiresAt);
    const publishAt = madridWallClockToInstant(publishDate);
    return !!publishAt && !Number.isNaN(expiry.getTime()) && expiry < publishAt;
  })();

  return (
    <div
      className={`flex flex-wrap items-center gap-y-2 rounded-2xl border px-4 py-3 ${
        isChecked
          ? "border-[#010000]/30 bg-[#010000]/5"
          : "border-[#010000]/15 bg-transparent"
      }`}
    >
      <input
        id={id}
        type="checkbox"
        className={`h-4 w-4 shrink-0 rounded border-[#010000]/30 accent-[#010000] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#010000] disabled:cursor-not-allowed disabled:opacity-40 ${
          isDateValid && isConnected
            ? "cursor-pointer"
            : "cursor-not-allowed"
        }`}
        checked={isChecked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={!isDateValid || (!isConnected && !isChecked) || loading}
      />
      <label
        htmlFor={id}
        className={`ml-3 flex items-center gap-2 text-sm font-medium ${
          isDateValid && isConnected ? "text-[#010000]" : "text-[#010000]/40"
        }`}
      >
        <NetworkIcon
          className={`h-5 w-5 shrink-0 ${
            !isDateValid || !isConnected ? "opacity-50" : ""
          }`}
        />
        {networkName}
      </label>
      {!isConnected && !!publishDate && !loading && (
        <span className="ml-7 min-w-0 text-xs leading-relaxed text-red-700 sm:ml-auto sm:pl-3">
          {isBroken
            ? t("previewProjects.connectionProblem", {
                reason: t(reasonTranslationKey(statusReason)),
              })
            : t(`previewProjects.${connectionKey}`)}{" "}
          <Link to="/settings" className="font-medium underline">
            {t("previewProjects.goToSettings")}
          </Link>
        </span>
      )}
      {isConnected && isChecked && expiresBeforePublishing && (
        <span
          role="alert"
          className="ml-7 min-w-0 text-xs leading-relaxed text-[#8a5a00] sm:ml-auto sm:pl-3"
        >
          {t("previewProjects.connectionExpiresBeforePublishing", {
            date: formatMadridDate(expiresAt),
          })}{" "}
          <Link to="/settings" className="font-medium underline">
            {t("previewProjects.goToSettings")}
          </Link>
        </span>
      )}
    </div>
  );
};
