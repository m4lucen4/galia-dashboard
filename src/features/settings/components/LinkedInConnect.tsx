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
    <div className="flex flex-col items-center">
      <div className="relative">
        {/* LinkedIn icon and status */}
        <div
          className={`p-4 rounded-full ${
            linkedin.isConnected ? "bg-blue-50" : "bg-gray-100"
          }`}
        >
          <LinkedInIcon
            className={`w-8 h-8 ${
              linkedin.isConnected ? "text-blue-600" : "text-gray-500"
            }`}
          />
        </div>
        {checkLinkedInRequest.inProgress ? (
          <div className="absolute -bottom-2 -right-2 bg-gray-300 rounded-full p-1 w-6 h-6 flex items-center justify-center">
            <div className="animate-spin h-3 w-3 border-2 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
        ) : linkedin.isConnected ? (
          <button
            onClick={onDisconnect}
            disabled={disconnectLinkedInRequest.inProgress}
            className={`absolute -bottom-2 -right-2 ${
              disconnectLinkedInRequest.inProgress
                ? "bg-gray-400"
                : "bg-red-500 hover:bg-red-600"
            } text-white rounded-full p-1`}
            title={t("settings.disconnect")}
          >
            {disconnectLinkedInRequest.inProgress ? (
              <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
            ) : (
              <CancelIcon />
            )}
          </button>
        ) : (
          <button
            onClick={onConnect}
            className="absolute -bottom-2 -right-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1"
            title="Connect with LinkedIn"
          >
            <AddIcon />
          </button>
        )}
      </div>
      <p className="mt-3 text-sm font-medium text-gray-900">LinkedIn</p>
      <p className="text-xs text-gray-500">
        {checkLinkedInRequest.inProgress ? (
          <span className="text-gray-400">
            {" "}
            {t("settings.checkingConnection")}
          </span>
        ) : linkedin.isConnected ? (
          <span className="text-green-500">
            {t("settings.connectedAs")}{" "}
            {linkedin.userName ? truncateText(linkedin.userName, 15) : ""}
          </span>
        ) : (
          <span className="text-red-500">{t("settings.notConnected")}</span>
        )}
      </p>
      {linkedin.isConnected && linkedin.expiresAt && (
        <p className="text-xs text-gray-400 mt-1">
          {t("settings.validUntil")}{" "}
          {new Date(linkedin.expiresAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
};
