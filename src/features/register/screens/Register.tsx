import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppSelector } from "@/redux/hooks";
import { useTranslation } from "react-i18next";
import { RootState } from "../../../redux/store";
import { RegisterForm } from "../components/RegisterForm";
import { AuthLayout } from "@/components/shared/auth/AuthLayout";

export const RegisterScreen = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const authenticated = useAppSelector((state: RootState) => state.auth.authenticated);
  const { registerRequest } = useAppSelector((state: RootState) => state.register);

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
    <AuthLayout wide>
      <div className="space-y-6">

        {paymentCancelled && (
          <div className="rounded-3xl bg-[#fbea71] p-5 text-sm">
            {t("register.paymentCancelled")}
          </div>
        )}

        <RegisterForm registerInProgress={registerRequest.inProgress} />
      </div>
    </AuthLayout>
  );
};
