import { SettingsSection } from "../components/SettingsSection";
import { MyWebInactiveInfo } from "../components/MyWebInactiveInfo";
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
import { SubscriptionInfo } from "../components/SubscriptionInfo";
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
    <div className="min-w-0 space-y-10">
      <header className="space-y-3 border-b border-[#010000]/15 pb-8">
        <h1 className="text-4xl leading-[1.05] font-medium tracking-[-0.04em] sm:text-5xl">
          {t("settings.title")}
        </h1>
        <p className="text-base leading-relaxed text-[#010000]/65">
          {t("settings.description")}
        </p>
      </header>

      <div className={`grid min-w-0 grid-cols-1 items-start gap-6 ${authUser?.role === "student" || authUser?.role === "customer" ? "2xl:grid-cols-2" : ""}`}>
        {(authUser?.role === "student" || authUser?.role === "customer") && (
          <SettingsSection
            title={t("settings.subscription")}
            subtitle={t("settings.subscriptionDescription")}
          >
            <SubscriptionInfo />
          </SettingsSection>
        )}
        <SettingsSection
          title={t("settings.socialNetworksAndWeb")}
          subtitle={t("settings.socialNetworksDescription")}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Mi Web */}
            <div className="flex min-w-0 flex-col items-center rounded-3xl border border-[#010000]/15 p-5 text-center">
              <button
                type="button"
                disabled={authUser?.has_web !== true}
                onClick={() => navigate("/my-web")}
                className="rounded-full border border-[#010000]/20 bg-[#fbea71] p-4 transition-colors enabled:hover:bg-[#d8e4d6] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#010000] disabled:cursor-not-allowed disabled:bg-[#010000]/5 disabled:opacity-40"
                title={t("settings.myWeb")}
              >
                <WebIcon size={32} className="text-[#010000]" />
              </button>
              <div className="mt-4 flex items-center justify-center gap-2">
                <p className="text-base font-medium">{t("settings.myWeb")}</p>
                {authUser?.has_web !== true && <MyWebInactiveInfo />}
              </div>
              <p className="mt-1 text-xs text-[#010000]/65">{t("settings.goToMyWeb")}</p>
            </div>

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
        </SettingsSection>
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
