import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { NETWORK_ICONS } from "../networkIcons";
import { PublicationNetwork, SocialConnectionStatus } from "../../../../types";
import {
  formatMadridDate,
  isBrokenConnection,
  reasonTranslationKey,
} from "../../../settings/helpers/socialConnectionStatus";
import { madridWallClockToInstant } from "../../../../helpers/publishDate";

interface CheckSocialNetworkProps {
  id: string;
  network: PublicationNetwork;
  isConnected: boolean;
  isChecked: boolean;
  isDateValid: boolean;
  publishDate: string;
  loading: boolean;
  status?: SocialConnectionStatus;
  statusReason?: string | null;
  expiresAt?: string;
  /** Replaces the generic "no connection" text (Facebook: reconnect Meta, no Pages...). */
  unavailableHint?: string;
  onChange: (checked: boolean) => void;
}

const NETWORK_LABELS: Record<PublicationNetwork, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  facebook: "Facebook",
};

const NO_CONNECTION_KEYS: Record<PublicationNetwork, string> = {
  instagram: "noInstagramConnection",
  linkedin: "noLinkedlnConnection",
  facebook: "noFacebookConnection",
};

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
  unavailableHint,
  onChange,
}) => {
  const { t } = useTranslation();

  const NetworkIcon = NETWORK_ICONS[network];
  const networkName = NETWORK_LABELS[network];
  const connectionKey = NO_CONNECTION_KEYS[network];

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
            : (unavailableHint ?? t(`previewProjects.${connectionKey}`))}{" "}
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
