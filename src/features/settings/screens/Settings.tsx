import { Card } from "../../../components/shared/ui/Card";
import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import {
  checkLinkedInConnection,
  initiateLinkedInAuth,
  disconnectLinkedIn,
  fetchLinkedInPages,
  initiateInstagramAuth,
  checkInstagramConnection,
  disconnectInstagram,
  fetchInstagramPages,
} from "../../../redux/actions/SocialNetworksActions";
import { Alert } from "../../../components/shared/ui/Alert";
import { LinkSlashIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { LinkedInConnect } from "../components/LinkedInConnect";
import { LinkedInPages } from "../components/LinkedInPages";
import { InstagramConnect } from "../components/InstagramConnect";
import { InstagramPages } from "../components/InstagramPages";
import { WebIcon } from "../../../components/icons/WebIcon";
import { useNavigate } from "react-router-dom";
import { RootState } from "../../../redux/store";

export const Settings = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const authUser = useAppSelector((state: RootState) => state.auth.user);
  const {
    linkedin,
    checkLinkedInRequest,
    disconnectLinkedInRequest,
    fetchLinkedInPagesRequest,
    instagram,
    checkInstagramRequest,
    disconnectInstagramInRequest,
    fetchInstagramPagesRequest,
  } = useAppSelector((state) => state.socialNetworks);

  const [showAlertDisconneted, setShowAlertDisconneted] = useState(false);
  const [showAlertInstagramDisconneted, setShowAlertInstagramDisconneted] =
    useState(false);
  const [showPagesSection, setShowPagesSection] = useState(false);
  const [showInstagramPagesSection, setShowInstagramPagesSection] =
    useState(false);
  const [instagramPagesFetched, setInstagramPagesFetched] = useState(false);

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

  useEffect(() => {
    if (
      instagram.isConnected &&
      showInstagramPagesSection &&
      !instagramPagesFetched &&
      !fetchInstagramPagesRequest.inProgress
    ) {
      setInstagramPagesFetched(true);
      dispatch(fetchInstagramPages({ isConnected: instagram.isConnected }));
    }
  }, [
    dispatch,
    instagram.isConnected,
    showInstagramPagesSection,
    instagramPagesFetched,
    fetchInstagramPagesRequest.inProgress,
  ]);

  // Reset cuando se cierra la sección
  useEffect(() => {
    if (!showInstagramPagesSection) {
      setInstagramPagesFetched(false);
    }
  }, [showInstagramPagesSection]);

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
    setShowAlertInstagramDisconneted(false);
  };

  const handleTogglePagesSection = () => {
    setShowPagesSection(!showPagesSection);
  };

  const handleToggleInstagramPagesSection = () => {
    setShowInstagramPagesSection(!showInstagramPagesSection);
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
          title={authUser?.has_web ? t("settings.socialNetworksAndWeb") : t("settings.socialNetworks")}
          subtitle={t("settings.socialNetworksDescription")}
        >
          <div className="flex flex-row justify-around mb-6">
            {/* Mi Web */}
            {authUser?.has_web && (
              <div className="flex flex-col items-center">
                <button
                  onClick={() => navigate("/my-web")}
                  className="p-4 rounded-full bg-blue-50 hover:bg-blue-100 transition-colors"
                  title={t("settings.myWeb")}
                >
                  <WebIcon size={32} className="text-blue-600" />
                </button>
                <p className="mt-3 text-sm font-medium text-gray-900">
                  {t("settings.myWeb")}
                </p>
                <p className="text-xs text-blue-500">{t("settings.goToMyWeb")}</p>
              </div>
            )}

            {/* Instagram */}
            <InstagramConnect
              instagram={instagram}
              checkInstagramRequest={checkInstagramRequest}
              disconnectInstagramInRequest={disconnectInstagramInRequest}
              onConnect={handleConnectInstagram}
              onDisconnect={() => setShowAlertInstagramDisconneted(true)}
            />

            {/* LinkedIn */}
            <LinkedInConnect
              linkedin={linkedin}
              checkLinkedInRequest={checkLinkedInRequest}
              disconnectLinkedInRequest={disconnectLinkedInRequest}
              onConnect={handleConnectLinkedIn}
              onDisconnect={() => setShowAlertDisconneted(true)}
            />
          </div>

          {/* Instagram Business Pages Section */}
          {instagram.isConnected && (
            <InstagramPages
              businessPages={instagram.businessPages}
              fetchRequest={fetchInstagramPagesRequest}
              showPagesSection={showInstagramPagesSection}
              onToggleSection={handleToggleInstagramPagesSection}
            />
          )}

          {/* LinkedIn Managed Pages Section */}
          {linkedin.isConnected && (
            <LinkedInPages
              adminPages={linkedin.adminPages}
              fetchRequest={fetchLinkedInPagesRequest}
              showPagesSection={showPagesSection}
              onToggleSection={handleTogglePagesSection}
            />
          )}
        </Card>
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
