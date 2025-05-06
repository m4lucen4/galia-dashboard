import { Card } from "../components/shared/ui/Card";
import { InstagramIcon, LinkedInIcon } from "../components/icons";
import { useState, useEffect } from "react";
import { Switch } from "../components/shared/ui/Switch";
import { CardPreferences } from "../components/settings/CardPreferences";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import {
  checkLinkedInConnection,
  initiateLinkedInAuth,
  disconnectLinkedIn,
  fetchLinkedInPages,
} from "../redux/actions/SocialNetworksActions";
import { Alert } from "../components/shared/ui/Alert";
import {
  LinkSlashIcon,
  ArrowPathIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

export const Settings = () => {
  const dispatch = useAppDispatch();
  const {
    linkedin,
    checkLinkedInRequest,
    disconnectLinkedInRequest,
    fetchLinkedInPagesRequest,
  } = useAppSelector((state) => state.socialNetworks);

  const [showAlertDisconneted, setShowAlertDisconneted] = useState(false);
  const [showPagesSection, setShowPagesSection] = useState(false);

  const [socialNetworks, setSocialNetworks] = useState({
    instagram: false,
    linkedin: false,
    twitter: false,
    facebook: false,
  });

  // Verificar conexión con LinkedIn al cargar
  useEffect(() => {
    dispatch(checkLinkedInConnection());
  }, [dispatch]);

  // Cargar páginas de LinkedIn cuando se muestra la sección de páginas
  useEffect(() => {
    if (
      linkedin.isConnected &&
      showPagesSection &&
      (!linkedin.adminPages || linkedin.adminPages?.length === 0)
    ) {
      dispatch(fetchLinkedInPages({ isConnected: linkedin.isConnected }));
    }
  }, [dispatch, linkedin.isConnected, showPagesSection, linkedin.adminPages]);

  const handleToggleSocialNetwork = (network: keyof typeof socialNetworks) => {
    setSocialNetworks((prev) => ({
      ...prev,
      [network]: !prev[network],
    }));
  };

  const handleConnectLinkedIn = () => {
    dispatch(initiateLinkedInAuth());
  };

  const handleDisconnectLinkedIn = () => {
    dispatch(disconnectLinkedIn());
    setShowAlertDisconneted(false);
  };

  const handleTogglePagesSection = () => {
    setShowPagesSection(!showPagesSection);
  };

  const handleRefreshPages = () => {
    if (linkedin.isConnected) {
      dispatch(fetchLinkedInPages({ isConnected: linkedin.isConnected }));
    }
  };

  const getLastUpdateText = () => {
    if (!linkedin.pagesFetchedAt) return "";

    const fetchDate = new Date(linkedin.pagesFetchedAt);
    const now = new Date();
    const diffMinutes = Math.floor(
      (now.getTime() - fetchDate.getTime()) / (1000 * 60)
    );

    if (diffMinutes < 1) return "updated just now";
    if (diffMinutes < 60) return `updated ${diffMinutes} minutes ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `updated ${diffHours} hours ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `updated ${diffDays} days ago`;
  };

  return (
    <div className="container mx-auto p-4">
      <h3 className="text-base/7 font-semibold text-gray-900">Settings</h3>
      <div className="flex justify-between items-center mb-4">
        <p className="mt-1 max-w-2xl text-sm/6 text-gray-500">
          Configure your social networks and user preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Card
          title="Social Networks"
          subtitle="Connect your accounts to share your projects"
        >
          <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-6">
            {/* Instagram */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div
                  className={`p-4 rounded-full ${
                    socialNetworks.instagram ? "bg-pink-50" : "bg-gray-100"
                  }`}
                >
                  <InstagramIcon
                    className={`w-8 h-8 ${
                      socialNetworks.instagram
                        ? "text-pink-600"
                        : "text-gray-500"
                    }`}
                  />
                </div>
                <Switch
                  checked={socialNetworks.instagram}
                  onChange={() => handleToggleSocialNetwork("instagram")}
                  className="absolute -bottom-2 -right-2"
                />
              </div>
              <p className="mt-3 text-sm font-medium text-gray-900">
                Instagram
              </p>
              <p className="text-xs text-gray-500">
                {socialNetworks.instagram ? "Connected" : "Not connected"}
              </p>
            </div>

            {/* LinkedIn */}
            <div className="flex flex-col items-center">
              <div className="relative">
                {/* Icono de LinkedIn y su estado */}
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
                    title="Disconnect LinkedIn"
                  >
                    {disconnectLinkedInRequest.inProgress ? (
                      <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleConnectLinkedIn}
                    className="absolute -bottom-2 -right-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1"
                    title="Connect with LinkedIn"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>
              <p className="mt-3 text-sm font-medium text-gray-900">LinkedIn</p>
              <p className="text-xs text-gray-500">
                {checkLinkedInRequest.inProgress ? (
                  <span className="text-gray-400">Checking connection...</span>
                ) : linkedin.isConnected ? (
                  <span className="text-green-500">
                    Connected as {linkedin.userName}
                  </span>
                ) : (
                  <span className="text-red-500">Not Connected</span>
                )}
              </p>
              {linkedin.isConnected && linkedin.expiresAt && (
                <p className="text-xs text-gray-400 mt-1">
                  Valid until{" "}
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
                <span className="font-medium">LinkedIn Managed Pages</span>
                <span className="flex items-center">
                  {linkedin.pagesFetchedAt && (
                    <span className="text-xs text-gray-500 mr-2">
                      {getLastUpdateText()}
                    </span>
                  )}
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
                      Pages you can publish to
                    </span>
                    <button
                      onClick={handleRefreshPages}
                      disabled={fetchLinkedInPagesRequest.inProgress}
                      className={`p-1 rounded text-xs flex items-center ${
                        fetchLinkedInPagesRequest.inProgress
                          ? "text-gray-400"
                          : "text-blue-600 hover:text-blue-700"
                      }`}
                    >
                      {fetchLinkedInPagesRequest.inProgress ? (
                        <div className="animate-spin h-3 w-3 border border-blue-500 rounded-full border-t-transparent mr-1"></div>
                      ) : (
                        <ArrowPathIcon className="h-3 w-3 mr-1" />
                      )}
                      Refresh
                    </button>
                  </div>

                  {fetchLinkedInPagesRequest.inProgress ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent mr-2"></div>
                      <span className="text-sm text-gray-600">
                        Loading pages...
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
                                ? "Personal Profile"
                                : "Company Page"}
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
                      No LinkedIn pages found. If you manage any company pages,
                      they will appear here.
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
          title="Do you want to disconnect LinkedIn?"
          description="This action will remove your LinkedIn connection."
          onAccept={handleDisconnectLinkedIn}
          onCancel={() => setShowAlertDisconneted(false)}
          icon={LinkSlashIcon}
        />
      )}
    </div>
  );
};
