import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";

import { TextField } from "@/components/shared/ui/TextField";
import { AuthLayout } from "@/components/shared/auth/AuthLayout";

import {
  checkAuthState,
  resetPassword,
} from "../../../redux/actions/AuthActions";
import type { RootState } from "../../../redux/store";
import { Alert } from "../../../components/shared/ui/Alert";
import { clearLoginErrors } from "../../../redux/slices/AuthSlice";
import { LoginForm } from "../components/LoginForm";

import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";

export const LoginScreen = () => {
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryEmailSent, setRecoveryEmailSent] = useState(false);
  const [recoveryEmailError, setRecoveryEmailError] = useState("");

  const dispatch = useAppDispatch();
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();

  const registrationSuccess = searchParams.get("registration") === "success";

  const navigate = useNavigate();

  const { loginRequest } = useAppSelector((state: RootState) => state.auth);

  const authenticated = useAppSelector(
    (state: RootState) => state.auth.authenticated,
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
    setRecoveryEmailError("");
  };

  const handleCancelShowRecoveryModal = () => {
    setShowRecoveryModal(false);
    setRecoveryEmail("");
    setRecoveryEmailError("");
  };

  const handleRecoveryEmailChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    setRecoveryEmail(e.target.value);
    setRecoveryEmailError("");
  };

  const handleRecoverySubmit = async () => {
    const email = recoveryEmail.trim();
    if (!email) {
      setRecoveryEmailError(t("login.recoveryEmailRequired"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setRecoveryEmailError(t("login.recoveryEmailInvalid"));
      return;
    }

    setRecoveryEmailError("");
    await dispatch(resetPassword(email));
    setRecoveryEmailSent(true);
    setShowRecoveryModal(false);
  };

  return (
    <AuthLayout showHeader={false}>
      <div className="space-y-6">
        {registrationSuccess && (
          <div className="rounded-3xl border border-[#010000]/20 bg-[#fbea71] p-5 text-sm">
            {t("login.registrationSuccess")}
          </div>
        )}
        <LoginForm
          loginRequest={loginRequest}
          onForgotPassword={handleShowRecoveryModal}
        />
        {loginRequest.messages &&
          loginRequest.messages.length > 0 && (
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
            <TextField
              label={t("login.email")}
              id="recoveryEmail"
              onChange={handleRecoveryEmailChange}
              required
              type="email"
              value={recoveryEmail}
              error={recoveryEmailError}
            />
          </Alert>
        )}
      </div>
    </AuthLayout>
  );
};
