import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import { InputField } from "../../../components/shared/ui/InputField";

import {
  checkAuthState,
  resetPassword,
} from "../../../redux/actions/AuthActions";
import { RootState, AppDispatch } from "../../../redux/store";
import { Alert } from "../../../components/shared/ui/Alert";
import { clearLoginErrors } from "../../../redux/slices/AuthSlice";
import { LoginForm } from "../components/LoginForm";

import logoImage from "../../../assets/mocklab-grey.webp";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";

export const LoginScreen = () => {
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryEmailSent, setRecoveryEmailSent] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const { t, i18n } = useTranslation();

  const navigate = useNavigate();

  const { loginRequest } = useSelector((state: RootState) => state.auth);

  const authenticated = useSelector(
    (state: RootState) => state.auth.authenticated
  );

  useEffect(() => {
    const browserLanguage = navigator.language.split("-")[0];
    const supportedLanguages = ["es", "en", "cat"];

    if (supportedLanguages.includes(browserLanguage)) {
      i18n.changeLanguage(browserLanguage);
    }
  }, [i18n]);

  useEffect(() => {
    dispatch(checkAuthState());
  }, [dispatch]);

  useEffect(() => {
    if (authenticated) {
      navigate("/home");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

  const handleShowRecoveryModal = () => {
    setShowRecoveryModal(true);
    setRecoveryEmailSent(false);
  };

  const handleCancelShowRecoveryModal = () => {
    setShowRecoveryModal(false);
    setRecoveryEmail("");
  };

  const handleRecoveryEmailChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setRecoveryEmail(e.target.value);
  };

  const handleRecoverySubmit = async () => {
    if (recoveryEmail && recoveryEmail.includes("@")) {
      await dispatch(resetPassword(recoveryEmail));
      setRecoveryEmailSent(true);
    }
    setShowRecoveryModal(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="flex justify-center">
          <img
            src={logoImage}
            alt="Logo"
            className="h-16 md:h-20 lg:h-24 w-auto mx-auto object-contain"
          />
        </div>
        <LoginForm
          loginRequest={loginRequest}
          onForgotPassword={handleShowRecoveryModal}
        />
        {loginRequest.messages && loginRequest.messages.length > 0 && (
          <Alert
            title={loginRequest.messages}
            description={t("login.descriptionLoginError")}
            onAccept={() => {
              dispatch(clearLoginErrors());
            }}
          />
        )}
        {showRecoveryModal && (
          <Alert
            title={t("login.titleRecoveryPassword")}
            description={t("login.descriptionRecoveryPassword")}
            icon={InformationCircleIcon}
            onAccept={
              recoveryEmailSent
                ? handleCancelShowRecoveryModal
                : handleRecoverySubmit
            }
            onCancel={handleCancelShowRecoveryModal}
          >
            <InputField
              label={t("login.email")}
              id="recoveryEmail"
              onChange={handleRecoveryEmailChange}
              required
              type="email"
              value={recoveryEmail}
            />
          </Alert>
        )}
      </div>
    </div>
  );
};
