import React from "react";
import { useTranslation } from "react-i18next";
import { SocialConnectionStatus } from "../../../types";
import {
  formatMadridDate,
  reasonTranslationKey,
} from "../helpers/socialConnectionStatus";

interface SocialConnectionStatusBadgeProps {
  status?: SocialConnectionStatus;
  statusReason?: string | null;
  expiresAt?: string;
}

const TONE_BY_STATUS: Record<SocialConnectionStatus, string> = {
  connected: "text-[#365640]",
  expiring: "text-[#8a5a00]",
  expired: "text-[#9f231b]",
  revoked: "text-[#9f231b]",
  error: "text-[#9f231b]",
  disconnected: "text-[#9f231b]",
};

export const SocialConnectionStatusBadge: React.FC<
  SocialConnectionStatusBadgeProps
> = ({ status = "disconnected", statusReason, expiresAt }) => {
  const { t } = useTranslation();
  const date = formatMadridDate(expiresAt);

  let label: string;
  switch (status) {
    case "connected":
      label = t("socialConnections.status.connected");
      break;
    case "expiring":
      label = date
        ? t("socialConnections.status.expiring", { date })
        : t("socialConnections.status.expiringNoDate");
      break;
    case "expired":
      label = t("socialConnections.status.expired");
      break;
    case "revoked":
    case "error":
      label = t("socialConnections.status.reconnect", {
        reason: t(reasonTranslationKey(statusReason)),
      });
      break;
    default:
      label = t("socialConnections.status.disconnected");
  }

  return (
    <p className={`text-xs ${TONE_BY_STATUS[status]}`} role="status">
      {label}
    </p>
  );
};
