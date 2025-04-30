import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import { InputField } from "../components/shared/ui/InputField";

import { checkAuthState, resetPassword } from "../redux/actions/AuthActions";
import { RootState, AppDispatch } from "../redux/store";
import { Alert } from "../components/shared/ui/Alert";
import { clearLoginErrors } from "../redux/slices/AuthSlice";
import { LoginForm } from "../components/login/LoginForm";

import logoImage from "../assets/mocklab-grey.webp";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

export const LoginScreen = () => {
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryEmailSent, setRecoveryEmailSent] = useState(false);

  const dispatch = useDispatch<AppDispatch>();

  const navigate = useNavigate();

  const { loginRequest } = useSelector((state: RootState) => state.auth);

  const authenticated = useSelector(
    (state: RootState) => state.auth.authenticated
  );

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
            description="There seems to be a login problem, please check your credentials"
            onAccept={() => {
              dispatch(clearLoginErrors());
            }}
          />
        )}
        {showRecoveryModal && (
          <Alert
            title="Recovery password"
            description="Enter your email to receive a password reset link"
            icon={InformationCircleIcon}
            onAccept={
              recoveryEmailSent
                ? handleCancelShowRecoveryModal
                : handleRecoverySubmit
            }
            onCancel={handleCancelShowRecoveryModal}
          >
            <InputField
              label="Email"
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
