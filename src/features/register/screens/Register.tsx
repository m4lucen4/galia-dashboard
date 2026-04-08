import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { RootState } from "../../../redux/store";
import { RegisterForm } from "../components/RegisterForm";
import logoImage from "../../../assets/mocklab-grey.webp";

export const RegisterScreen = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const authenticated = useSelector((state: RootState) => state.auth.authenticated);
  const { registerRequest } = useSelector((state: RootState) => state.register);

  const paymentCancelled = searchParams.get("payment") === "cancelled";

  useEffect(() => {
    const browserLanguage = navigator.language.split("-")[0];
    const supportedLanguages = ["es", "en", "cat"];
    if (supportedLanguages.includes(browserLanguage)) {
      i18n.changeLanguage(browserLanguage);
    }
  }, [i18n]);

  useEffect(() => {
    if (authenticated) {
      navigate("/home");
    }
  }, [authenticated, navigate]);

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

        {paymentCancelled && (
          <div className="rounded-md bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800">
            {t("register.paymentCancelled")}
          </div>
        )}

        <RegisterForm registerInProgress={registerRequest.inProgress} />
      </div>
    </div>
  );
};
