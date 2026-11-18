import React from "react";
import { useTranslation } from "react-i18next";
import { InstagramIcon, AddIcon, CancelIcon } from "../../../components/icons";
import { truncateText } from "../../../helpers";
import { InstagramData } from "../../../types";
import { SocialConnectionStatusBadge } from "./SocialConnectionStatusBadge";
import {
  formatMadridDate,
  needsReconnect,
} from "../helpers/socialConnectionStatus";

interface InstagramConnectProps {
  instagram: InstagramData;
  checkInstagramRequest: {
    inProgress: boolean;
  };
  disconnectInstagramInRequest: {
    inProgress: boolean;
  };
  onConnect: () => void;
  onDisconnect: () => void;
}

export const InstagramConnect: React.FC<InstagramConnectProps> = ({
  instagram,
  checkInstagramRequest,
  disconnectInstagramInRequest,
  onConnect,
  onDisconnect,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex min-w-0 flex-col items-center rounded-3xl border border-[#010000]/15 p-5 text-center">
      <div className="relative">
        {/* Instagram icon and status */}
        <div
          className="p-4 rounded-full bg-[#010000]/5"
        >
          <InstagramIcon
            className={`w-8 h-8 ${
              instagram.isConnected ? "text-[#010000]" : "text-[#010000]/65"
            }`}
          />
        </div>
        {checkInstagramRequest.inProgress ? (
          <div className="absolute -bottom-2 -right-3 bg-[#010000]/15 rounded-full p-1 w-6 h-6 flex items-center justify-center">
            <div className="animate-spin h-3 w-3 border-2 border-[#010000] rounded-full border-t-transparent"></div>
          </div>
        ) : instagram.isConnected ? (
          <button
            type="button"
            onClick={onDisconnect}
            disabled={disconnectInstagramInRequest.inProgress}
            className={`absolute -bottom-2 -right-3 ${
              disconnectInstagramInRequest.inProgress
                ? "bg-[#010000]/40"
                : "bg-[#010000] hover:bg-[#3a3a3a]"
            } text-[#d8e4d6] rounded-full p-1.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#010000]`}
            title={t("settings.disconnect")}
            aria-label={t("settings.disconnect")}
          >
            {disconnectInstagramInRequest.inProgress ? (
              <div className="animate-spin size-3.5 border-2 border-white rounded-full border-t-transparent"></div>
            ) : (
              <CancelIcon className="size-3.5" />
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onConnect}
            className="absolute -bottom-2 -right-3 bg-[#010000] hover:bg-[#3a3a3a] text-[#d8e4d6] rounded-full p-1.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#010000]"
            title={t("settings.connectInstagram")}
            aria-label={t("settings.connectInstagram")}
          >
            <AddIcon className="size-3.5" />
          </button>
        )}
      </div>
      <p className="mt-4 text-base font-medium">Instagram</p>
      {checkInstagramRequest.inProgress ? (
        <p className="text-xs text-[#010000]/60">
          {t("settings.checkingConnection")}
        </p>
      ) : (
        <SocialConnectionStatusBadge
          status={instagram.status}
          statusReason={instagram.statusReason}
          expiresAt={instagram.expiresAt}
        />
      )}
      {!checkInstagramRequest.inProgress && instagram.isConnected && instagram.userName && (
        <p className="text-xs text-[#010000]/65">
          {t("settings.connectedAs")} {truncateText(instagram.userName, 15)}
        </p>
      )}
      {!checkInstagramRequest.inProgress && instagram.status === "connected" && instagram.expiresAt && (
        <p className="mt-1 text-xs text-[#010000]/60">
          {t("settings.validUntil")} {formatMadridDate(instagram.expiresAt)}
        </p>
      )}
      {!checkInstagramRequest.inProgress && instagram.status === "expired" && instagram.expiresAt && (
        <p className="mt-1 text-xs text-[#010000]/60">
          {t("socialConnections.expiredOn", {
            date: formatMadridDate(instagram.expiresAt),
          })}
        </p>
      )}
      {!checkInstagramRequest.inProgress && needsReconnect(instagram.status) && (
        <button
          type="button"
          onClick={onConnect}
          className="mt-3 rounded-full border border-[#010000]/30 px-4 py-1.5 text-xs font-medium text-[#010000] hover:bg-[#010000]/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#010000]"
        >
          {t("socialConnections.reconnect")}
        </button>
      )}
    </div>
  );
};
