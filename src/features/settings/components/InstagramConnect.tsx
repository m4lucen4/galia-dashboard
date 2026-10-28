import React from "react";
import { useTranslation } from "react-i18next";
import { InstagramIcon, AddIcon, CancelIcon } from "../../../components/icons";
import { truncateText } from "../../../helpers";

interface InstagramConnectProps {
  instagram: {
    isConnected: boolean;
    userName?: string;
    expiresAt?: string;
  };
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
      <p className="text-xs text-[#010000]/65">
        {checkInstagramRequest.inProgress ? (
          <span className="text-[#010000]/60">
            {" "}
            {t("settings.checkingConnection")}
          </span>
        ) : instagram.isConnected ? (
          <span className="text-[#365640]">
            {t("settings.connectedAs")}{" "}
            {instagram.userName ? truncateText(instagram.userName, 15) : ""}
          </span>
        ) : (
          <span className="text-[#9f231b]">{t("settings.notConnected")}</span>
        )}
      </p>
      {instagram.isConnected && instagram.expiresAt && (
        <p className="text-xs text-[#010000]/60 mt-1">
          {t("settings.validUntil")}{" "}
          {new Date(instagram.expiresAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
};
