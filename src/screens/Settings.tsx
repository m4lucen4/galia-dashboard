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
} from "../redux/actions/SocialNetworksActions";

export const Settings = () => {
  const dispatch = useAppDispatch();
  const { linkedin, checkLinkedInRequest, disconnectLinkedInRequest } =
    useAppSelector((state) => state.socialNetworks);

  const [socialNetworks, setSocialNetworks] = useState({
    instagram: false,
    linkedin: false,
    twitter: false,
    facebook: false,
  });

  useEffect(() => {
    dispatch(checkLinkedInConnection());
  }, [dispatch]);

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
    if (confirm("Are you sure you want to disconnect your LinkedIn account?")) {
      dispatch(disconnectLinkedIn());
    }
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                    onClick={handleDisconnectLinkedIn}
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
                  "Not connected"
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
        </Card>
        <CardPreferences />
      </div>
    </div>
  );
};
