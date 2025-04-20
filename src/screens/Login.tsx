import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import { InputField } from "../components/shared/ui/InputField";
import { Button } from "../components/shared/ui/Button";

import { LoginProps } from "../types";
import { Card } from "../components/shared/ui/Card";

import {
  checkAuthState,
  login,
  resetPassword,
} from "../redux/actions/AuthActions";
import { RootState, AppDispatch } from "../redux/store";
import { isFormValid, validateLoginForm } from "../helpers";
import { Alert } from "../components/shared/ui/Alert";
import { clearLoginErrors } from "../redux/slices/AuthSlice";

export const LoginScreen = () => {
  const [formData, setFormData] = useState<LoginProps>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Partial<LoginProps>>({});
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name as keyof LoginProps]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Usamos nuestras funciones helper
    const newErrors = validateLoginForm(formData);
    setErrors(newErrors);

    if (isFormValid(newErrors)) {
      await dispatch(login(formData));
    }
  };

  const handleShowRecoveryModal = () => {
    setShowRecoveryModal(true);
    setRecoveryEmailSent(false);
  };

  const handleCancelShowRecoveryModal = () => {
    setShowRecoveryModal(false);
    setRecoveryEmail("");
  };

  const handleRecoveryEmailChange = (
    e: React.ChangeEvent<HTMLInputElement>
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
        <Card title="Login" subtitle="Enter your credentials">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <InputField
              label="Email"
              id="email"
              onChange={handleChange}
              required
              type="email"
              value={formData.email}
            />
            <InputField
              label="Password"
              id="password"
              onChange={handleChange}
              required
              type="password"
              value={formData.password}
            />
            <div className="flex row items-center justify-between">
              <Button
                title="Login"
                disabled={loginRequest.inProgress}
                type="submit"
              />
              <span
                className="text-sm cursor-pointer"
                onClick={handleShowRecoveryModal}
              >
                Recovery password
              </span>
            </div>
          </form>
        </Card>
        {/* Este es el Alert para avisar que hay un problema con el login */}
        {loginRequest.messages && loginRequest.messages.length > 0 && (
          <Alert
            title={loginRequest.messages}
            description="There seems to be a login problem, please check your credentials"
            onAccept={() => {
              dispatch(clearLoginErrors());
            }}
          />
        )}
        {/* Este es el Alert para iniciar el proceso de recuperación de contraseña */}
        {showRecoveryModal && (
          <Alert
            title="Recovery password"
            description="Enter your email to receive a password reset link"
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
