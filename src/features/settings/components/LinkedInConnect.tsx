import { AddIcon, CancelIcon, LinkedInIcon } from "../../../components/icons";
import { truncateText } from "../../../helpers";
import React from "react";
import { useTranslation } from "react-i18next";

interface LinkedInConnectProps {
  linkedin: {
    isConnected: boolean;
    userName?: string;
    expiresAt?: string;
  };
  checkLinkedInRequest: {
    inProgress: boolean;
  };
  disconnectLinkedInRequest: {
    inProgress: boolean;
  };
  onConnect: () => void;
  onDisconnect: () => void;
}

export const LinkedInConnect: React.FC<LinkedInConnectProps> = ({
  linkedin,
  checkLinkedInRequest,
  disconnectLinkedInRequest,
  onConnect,
  onDisconnect,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex min-w-0 flex-col items-center rounded-3xl border border-[#010000]/15 p-5 text-center">
      <div className="relative">
        {/* LinkedIn icon and status */}
        <div
          className="p-4 rounded-full bg-[#010000]/5"
        >
          <LinkedInIcon
            className={`w-8 h-8 ${
              linkedin.isConnected ? "text-[#010000]" : "text-[#010000]/65"
            }`}
          />
        </div>
        {checkLinkedInRequest.inProgress ? (
          <div className="absolute -bottom-2 -right-3 bg-[#010000]/15 rounded-full p-1 w-6 h-6 flex items-center justify-center">
            <div className="animate-spin h-3 w-3 border-2 border-[#010000] rounded-full border-t-transparent"></div>
          </div>
        ) : linkedin.isConnected ? (
          <button
            type="button"
            onClick={onDisconnect}
            disabled={disconnectLinkedInRequest.inProgress}
            className={`absolute -bottom-2 -right-3 ${
              disconnectLinkedInRequest.inProgress
                ? "bg-[#010000]/40"
                : "bg-[#010000] hover:bg-[#3a3a3a]"
            } text-[#d8e4d6] rounded-full p-1.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#010000]`}
            title={t("settings.disconnect")}
            aria-label={t("settings.disconnect")}
          >
            {disconnectLinkedInRequest.inProgress ? (
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
            title={t("settings.connectLinkedIn")}
            aria-label={t("settings.connectLinkedIn")}
          >
            <AddIcon className="size-3.5" />
          </button>
        )}
      </div>
      <p className="mt-4 text-base font-medium">LinkedIn</p>
      <p className="text-xs text-[#010000]/65">
        {checkLinkedInRequest.inProgress ? (
          <span className="text-[#010000]/60">
            {" "}
            {t("settings.checkingConnection")}
          </span>
        ) : linkedin.isConnected ? (
          <span className="text-[#365640]">
            {t("settings.connectedAs")}{" "}
            {linkedin.userName ? truncateText(linkedin.userName, 15) : ""}
          </span>
        ) : (
          <span className="text-[#9f231b]">{t("settings.notConnected")}</span>
        )}
      </p>
      {linkedin.isConnected && linkedin.expiresAt && (
        <p className="text-xs text-[#010000]/60 mt-1">
          {t("settings.validUntil")}{" "}
          {new Date(linkedin.expiresAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
};
