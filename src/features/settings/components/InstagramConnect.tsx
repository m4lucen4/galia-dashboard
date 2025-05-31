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
    <div className="flex flex-col items-center">
      <div className="relative">
        {/* Instagram icon and status */}
        <div
          className={`p-4 rounded-full ${
            instagram.isConnected ? "bg-pink-50" : "bg-gray-100"
          }`}
        >
          <InstagramIcon
            className={`w-8 h-8 ${
              instagram.isConnected ? "text-pink-600" : "text-gray-500"
            }`}
          />
        </div>
        {checkInstagramRequest.inProgress ? (
          <div className="absolute -bottom-2 -right-2 bg-gray-300 rounded-full p-1 w-6 h-6 flex items-center justify-center">
            <div className="animate-spin h-3 w-3 border-2 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
        ) : instagram.isConnected ? (
          <button
            onClick={onDisconnect}
            disabled={disconnectInstagramInRequest.inProgress}
            className={`absolute -bottom-2 -right-2 ${
              disconnectInstagramInRequest.inProgress
                ? "bg-gray-400"
                : "bg-red-500 hover:bg-red-600"
            } text-white rounded-full p-1`}
            title={t("settings.disconnect")}
          >
            {disconnectInstagramInRequest.inProgress ? (
              <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
            ) : (
              <CancelIcon />
            )}
          </button>
        ) : (
          <button
            onClick={onConnect}
            className="absolute -bottom-2 -right-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1"
            title="Connect with Instagram"
          >
            <AddIcon />
          </button>
        )}
      </div>
      <p className="mt-3 text-sm font-medium text-gray-900">Instagram</p>
      <p className="text-xs text-gray-500">
        {checkInstagramRequest.inProgress ? (
          <span className="text-gray-400">
            {" "}
            {t("settings.checkingConnection")}
          </span>
        ) : instagram.isConnected ? (
          <span className="text-green-500">
            {t("settings.connectedAs")}{" "}
            {instagram.userName ? truncateText(instagram.userName, 15) : ""}
          </span>
        ) : (
          <span className="text-red-500">{t("settings.notConnected")}</span>
        )}
      </p>
      {instagram.isConnected && instagram.expiresAt && (
        <p className="text-xs text-gray-400 mt-1">
          {t("settings.validUntil")}{" "}
          {new Date(instagram.expiresAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
};
