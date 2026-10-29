import { useState } from "react";
import { Link } from "react-router-dom";
import { BrandMark } from "@/components/shared/ui/BrandMark";
import { useAppDispatch } from "@/redux/hooks";
import { useTranslation } from "react-i18next";
import { login } from "../../../redux/actions/AuthActions";
import { LoginProps } from "../../../types";
import { TextField } from "@/components/shared/ui/TextField";
import { PillButton } from "@/components/shared/ui/PillButton";
import { isFormValid, validateLoginForm } from "../../../helpers";
import { AuthPanel, AuthHeading, AuthActionLink } from "@/components/shared/auth/AuthLayout";

interface LoginFormProps {
  loginRequest: {
    inProgress: boolean;
  };
  onForgotPassword: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  loginRequest,
  onForgotPassword,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<LoginProps>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Partial<LoginProps>>({});

  const dispatch = useAppDispatch();

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name as keyof LoginProps]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors = validateLoginForm(formData);
    setErrors(newErrors);

    if (isFormValid(newErrors)) {
      await dispatch(login(formData));
    }
  };

  return (
    <>
      <div className="mb-8 flex h-20 items-center justify-center">
        <Link to="/" className="scale-150 rounded-full" aria-label="Mocklab: inicio"><BrandMark /></Link>
      </div>
      <AuthPanel>
        <AuthHeading title={t("login.title")} subtitle={t("login.subtitle")} />
        <form className="space-y-6" onSubmit={handleSubmit}>
          <TextField label={t("login.email")} id="email" onChange={handleChange} required type="email" autoComplete="email" value={formData.email} />
          <TextField label={t("login.password")} id="password" onChange={handleChange} required type="password" autoComplete="current-password" value={formData.password} />
          <PillButton disabled={loginRequest.inProgress} type="submit" className="w-full">{t("login.button")}</PillButton>
          <button type="button" className="mx-auto block rounded-full text-sm underline underline-offset-4" onClick={onForgotPassword}>
            {t("login.recoveryPassword")}
          </button>
        </form>
        <div className="mt-6 text-center">
          <Link to="/" className="inline-flex min-h-11 items-center rounded-full text-sm text-[#010000]/70 underline underline-offset-4 hover:text-[#010000]">
            {t("login.goBackWeb")}
          </Link>
        </div>
      </AuthPanel>
      <div className="mt-6 space-y-4 rounded-[28px] border border-[#010000]/20 p-6 text-center sm:p-8">
        <p className="text-sm text-[#010000]/70">{t("login.noAccount")}</p>
        <AuthActionLink to="/register">{t("login.createAccount")}</AuthActionLink>
      </div>
    </>
  );
};
