import { Card } from "../components/shared/ui/Card";
import {
  AddIcon,
  CancelIcon,
  InstagramIcon,
  LinkedInIcon,
} from "../components/icons";
import { useState, useEffect } from "react";
import { CardPreferences } from "../components/settings/CardPreferences";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import {
  checkLinkedInConnection,
  initiateLinkedInAuth,
  disconnectLinkedIn,
  fetchLinkedInPages,
  initiateInstagramAuth,
  checkInstagramConnection,
  disconnectInstagram,
} from "../redux/actions/SocialNetworksActions";
import { Alert } from "../components/shared/ui/Alert";
import {
  LinkSlashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { truncateText } from "../helpers";
import { useTranslation } from "react-i18next";

export const Settings = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const {
    linkedin,
    checkLinkedInRequest,
    disconnectLinkedInRequest,
    fetchLinkedInPagesRequest,
    instagram,
    checkInstagramRequest,
    disconnectInstagramInRequest,
  } = useAppSelector((state) => state.socialNetworks);

  const [showAlertDisconneted, setShowAlertDisconneted] = useState(false);
  const [showAlertInstagramDisconneted, setShowAlertInstagramDisconneted] =
    useState(false);
  const [showPagesSection, setShowPagesSection] = useState(false);

  useEffect(() => {
    dispatch(checkLinkedInConnection());
    dispatch(checkInstagramConnection());
  }, [dispatch]);

  useEffect(() => {
    if (
      linkedin.isConnected &&
      showPagesSection &&
      (!linkedin.adminPages || linkedin.adminPages?.length === 0)
    ) {
      dispatch(fetchLinkedInPages({ isConnected: linkedin.isConnected }));
    }
  }, [dispatch, linkedin.isConnected, showPagesSection, linkedin.adminPages]);

  const handleConnectLinkedIn = () => {
    dispatch(initiateLinkedInAuth());
  };

  const handleConnectInstagram = () => {
    dispatch(initiateInstagramAuth());
  };

  const handleDisconnectLinkedIn = () => {
    dispatch(disconnectLinkedIn());
    setShowAlertDisconneted(false);
  };

  const handleDisconnectInstagram = () => {
    dispatch(disconnectInstagram());
    setShowAlertDisconneted(false);
  };

  const handleTogglePagesSection = () => {
    setShowPagesSection(!showPagesSection);
  };

  return (
    <div className="container mx-auto p-4">
      <h3 className="text-base/7 font-semibold text-gray-900">
        {t("settings.title")}
      </h3>
      <div className="flex justify-between items-center mb-4">
        <p className="mt-1 max-w-2xl text-sm/6 text-gray-500">
          {t("settings.description")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Card
          title={t("settings.socialNetworks")}
          subtitle={t("settings.socialNetworksDescription")}
        >
          <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-6">
            {/* Instagram */}
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
                    onClick={() => setShowAlertDisconneted(true)}
                    disabled={disconnectInstagramInRequest.inProgress}
                    className={`absolute -bottom-2 -right-2 ${
                      disconnectLinkedInRequest.inProgress
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
                    onClick={handleConnectInstagram}
                    className="absolute -bottom-2 -right-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1"
                    title="Connect with Instagram"
                  >
                    <AddIcon />
                  </button>
                )}
              </div>
              <p className="mt-3 text-sm font-medium text-gray-900">
                Instagram
              </p>
              <p className="text-xs text-gray-500">
                {checkInstagramRequest.inProgress ? (
                  <span className="text-gray-400">
                    {" "}
                    {t("settings.checkingConnection")}
                  </span>
                ) : instagram.isConnected ? (
                  <span className="text-green-500">
                    {t("settings.connectedAs")}{" "}
                    {instagram.userName
                      ? truncateText(instagram.userName, 15)
                      : ""}
                  </span>
                ) : (
                  <span className="text-red-500">
                    {t("settings.notConnected")}
                  </span>
                )}
              </p>
              {instagram.isConnected && instagram.expiresAt && (
                <p className="text-xs text-gray-400 mt-1">
                  {t("settings.validUntil")}{" "}
                  {new Date(instagram.expiresAt).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* LinkedIn */}
            <div className="flex flex-col items-center">
              <div className="relative">
                {/* Linkedld icon and status */}
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
                    onClick={() => setShowAlertDisconneted(true)}
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
                    onClick={handleConnectLinkedIn}
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
                    {linkedin.userName
                      ? truncateText(linkedin.userName, 15)
                      : ""}
                  </span>
                ) : (
                  <span className="text-red-500">
                    {t("settings.notConnected")}
                  </span>
                )}
              </p>
              {linkedin.isConnected && linkedin.expiresAt && (
                <p className="text-xs text-gray-400 mt-1">
                  {t("settings.validUntil")}{" "}
                  {new Date(linkedin.expiresAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* LinkedIn Managed Pages Section */}
          {linkedin.isConnected && (
            <div className="mt-2 border-t pt-4">
              <button
                onClick={handleTogglePagesSection}
                className="w-full flex justify-between items-center text-sm text-gray-700 hover:text-gray-900 focus:outline-none mb-2"
              >
                <span className="font-medium">
                  {t("settings.publishLinkedlnPages")}
                </span>
                <span className="flex items-center">
                  {showPagesSection ? (
                    <ChevronUpIcon className="h-6 w-6" />
                  ) : (
                    <ChevronDownIcon className="h-6 w-6" />
                  )}
                </span>
              </button>

              {showPagesSection && (
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-500">
                      {t("settings.whereCanPublishPages")}
                    </span>
                  </div>

                  {fetchLinkedInPagesRequest.inProgress ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent mr-2"></div>
                      <span className="text-sm text-gray-600">
                        {t("settings.loadingPages")}
                      </span>
                    </div>
                  ) : linkedin.adminPages && linkedin.adminPages.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {linkedin.adminPages.map((page) => (
                        <div
                          key={page.id}
                          className="flex items-center p-2 bg-gray-50 rounded-md border border-gray-100"
                        >
                          {page.logoUrl ? (
                            <img
                              src={page.logoUrl}
                              alt={page.name}
                              className="h-8 w-8 rounded-full mr-3"
                            />
                          ) : (
                            <div
                              className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${
                                page.type === "PERSON"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-200 text-gray-700"
                              }`}
                            >
                              {page.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {page.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {page.type === "PERSON"
                                ? t("settings.personalPage")
                                : t("settings.companyPage")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : fetchLinkedInPagesRequest.messages &&
                    !fetchLinkedInPagesRequest.ok ? (
                    <div className="p-4 bg-red-50 rounded-md text-sm text-red-600">
                      {fetchLinkedInPagesRequest.messages}
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-md text-sm text-gray-500 text-center">
                      {t("settings.notFoundPages")}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
        <CardPreferences />
      </div>
      {showAlertDisconneted && (
        <Alert
          title={t("settings.disconnectLinkedIn")}
          description={t("settings.disconnectLinkedInDescription")}
          onAccept={handleDisconnectLinkedIn}
          onCancel={() => setShowAlertDisconneted(false)}
          icon={LinkSlashIcon}
        />
      )}
      {showAlertInstagramDisconneted && (
        <Alert
          title={t("settings.disconnectInstagram")}
          description={t("settings.disconnectInstagramDescription")}
          onAccept={handleDisconnectInstagram}
          onCancel={() => setShowAlertInstagramDisconneted(false)}
          icon={LinkSlashIcon}
        />
      )}
    </div>
  );
};
