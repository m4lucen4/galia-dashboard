import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppDispatch } from "../../../redux/hooks";
import { processInstagramCallback } from "../../../redux/actions/SocialNetworksActions";
import { InstagramIcon } from "../../../components/icons";

export const InstagramCallback = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState(() =>
    t("socialConnections.callback.processing", { network: "Instagram" })
  );
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const processAuth = async () => {
      try {
        const queryParams = new URLSearchParams(location.search);
        const code = queryParams.get("code");
        const state = queryParams.get("state");
        const error = queryParams.get("error");
        const errorDescription = queryParams.get("error_description");

        if (error) {
          setStatus(
            t("socialConnections.callback.authorizationFailed", {
              reason: errorDescription || error,
            })
          );
          setTimeout(() => navigate("/settings"), 3000);
          return;
        }

        if (!code || !state) {
          setStatus(t("socialConnections.callback.missingParams"));
          setTimeout(() => navigate("/settings"), 3000);
          return;
        }

        const result = await dispatch(
          processInstagramCallback({ code, state })
        ).unwrap();

        if (result) {
          setStatus(t("socialConnections.callback.success", { network: "Instagram" }));
          setTimeout(() => navigate("/settings"), 1500);
        }
      } catch (error: unknown) {
        // The thunk rejects with an already localized message.
        setStatus(
          t("socialConnections.callback.failed", {
            network: "Instagram",
            reason:
              typeof error === "string"
                ? error
                : t("socialConnections.errors.unknown"),
          })
        );
        setTimeout(() => navigate("/settings"), 3000);
      }
    };

    processAuth();
    // `t` is intentionally not a dependency: the OAuth code is single-use and must not be re-sent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, location, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <InstagramIcon className="w-16 h-16 text-pink-600 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-4">
          {t("socialConnections.callback.title", { network: "Instagram" })}
        </h2>
        <p className="mb-4">{status}</p>
        <div className="animate-pulse flex justify-center">
          <div className="h-2 w-24 bg-pink-200 rounded"></div>
        </div>
      </div>
    </div>
  );
};
