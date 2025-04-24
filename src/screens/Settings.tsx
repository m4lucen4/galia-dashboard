import { Card } from "../components/shared/ui/Card";
import { InstagramIcon, LinkedInIcon } from "../components/icons";
import { useState } from "react";
import { Switch } from "../components/shared/ui/Switch";

export const Settings = () => {
  const [socialNetworks, setSocialNetworks] = useState({
    instagram: false,
    linkedin: false,
    twitter: false,
    facebook: false,
  });

  const handleToggleSocialNetwork = (network: keyof typeof socialNetworks) => {
    setSocialNetworks((prev) => ({
      ...prev,
      [network]: !prev[network],
    }));
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
                    socialNetworks.linkedin ? "bg-blue-50" : "bg-gray-100"
                  }`}
                >
                  <LinkedInIcon
                    className={`w-8 h-8 ${
                      socialNetworks.linkedin
                        ? "text-blue-600"
                        : "text-gray-500"
                    }`}
                  />
                </div>
                <Switch
                  checked={socialNetworks.linkedin}
                  onChange={() => handleToggleSocialNetwork("linkedin")}
                  className="absolute -bottom-2 -right-2"
                />
              </div>
              <p className="mt-3 text-sm font-medium text-gray-900">LinkedIn</p>
              <p className="text-xs text-gray-500">
                {socialNetworks.linkedin ? "Connected" : "Not connected"}
              </p>
            </div>

            {/* Twitter */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div
                  className={`p-4 rounded-full ${
                    socialNetworks.twitter ? "bg-blue-50" : "bg-gray-100"
                  }`}
                >
                  <svg
                    className={`w-8 h-8 ${
                      socialNetworks.twitter ? "text-blue-400" : "text-gray-500"
                    }`}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.061a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.937 4.937 0 004.604 3.417 9.868 9.868 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.054 0 13.999-7.496 13.999-13.986 0-.209 0-.42-.015-.63a9.936 9.936 0 002.46-2.548l-.047-.02z" />
                  </svg>
                </div>
                <Switch
                  checked={socialNetworks.twitter}
                  disabled
                  onChange={() => handleToggleSocialNetwork("twitter")}
                  className="absolute -bottom-2 -right-2"
                />
              </div>
              <p className="mt-3 text-sm font-medium text-gray-900">Twitter</p>
              <p className="text-xs text-gray-500">Coming soon...</p>
            </div>

            {/* Facebook */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div
                  className={`p-4 rounded-full ${
                    socialNetworks.facebook ? "bg-blue-50" : "bg-gray-100"
                  }`}
                >
                  <svg
                    className={`w-8 h-8 ${
                      socialNetworks.facebook
                        ? "text-blue-600"
                        : "text-gray-500"
                    }`}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </div>
                <Switch
                  disabled
                  checked={socialNetworks.facebook}
                  onChange={() => handleToggleSocialNetwork("facebook")}
                  className="absolute -bottom-2 -right-2"
                />
              </div>
              <p className="mt-3 text-sm font-medium text-gray-900">Facebook</p>
              <p className="text-xs text-gray-500">Coming soon...</p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
            >
              Save preferences
            </button>
          </div>
        </Card>

        <Card
          title="Notification Settings"
          subtitle="Manage how you receive notifications"
        >
          {/* Contenido de notificaciones aquí */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">
                  Email notifications
                </h4>
                <p className="text-xs text-gray-500">
                  Receive emails about your account activity
                </p>
              </div>
              <Switch checked={true} onChange={() => {}} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">
                  Project updates
                </h4>
                <p className="text-xs text-gray-500">
                  Get notified when your projects are published
                </p>
              </div>
              <Switch checked={true} onChange={() => {}} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">
                  Marketing emails
                </h4>
                <p className="text-xs text-gray-500">
                  Receive tips and product updates
                </p>
              </div>
              <Switch checked={false} onChange={() => {}} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
