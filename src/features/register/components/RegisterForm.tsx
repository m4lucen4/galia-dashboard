import { useState } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { useTranslation } from "react-i18next";
import { registerUser } from "../../../redux/actions/RegisterActions";
import { RegisterFormData, BillingPeriod } from "../../../types";
import { TextField } from "@/components/shared/ui/TextField";
import { PillButton } from "@/components/shared/ui/PillButton";
import { AuthPanel, AuthHeading, AuthActionLink } from "@/components/shared/auth/AuthLayout";
import { RegistrationMemberships } from "./RegistrationMemberships";

interface RegisterFormProps {
  registerInProgress: boolean;
}

interface FormErrors {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  password?: string;
  general?: string;
}

const validateForm = (formData: RegisterFormData): FormErrors => {
  const errors: FormErrors = {};

  if (!formData.first_name || formData.first_name.length < 2) {
    errors.first_name = "El nombre debe tener al menos 2 caracteres";
  }
  if (!formData.last_name || formData.last_name.length < 2) {
    errors.last_name = "Los apellidos deben tener al menos 2 caracteres";
  }
  if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
    errors.email = "Introduce un correo electrónico válido";
  }
  if (!formData.phone || formData.phone.length < 6) {
    errors.phone = "Introduce un teléfono válido";
  }
  if (!formData.password || formData.password.length < 6) {
    errors.password = "La contraseña debe tener al menos 6 caracteres";
  }

  return errors;
};

export const RegisterForm: React.FC<RegisterFormProps> = ({ registerInProgress }) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const [formData, setFormData] = useState<RegisterFormData>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    plan_type: "professional",
    billing_period: "monthly",
    myweb: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleMyWebChange = (myweb: boolean) => {
    setFormData((prev) => ({ ...prev, myweb }));
  };

  const handlePeriodChange = (period: BillingPeriod) => {
    setFormData((prev) => ({ ...prev, billing_period: period }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const result = await dispatch(registerUser(formData));

    if (registerUser.rejected.match(result)) {
      const payload = result.payload as string;
      if (payload === "email_already_exists") {
        setErrors({ email: t("register.emailExists") });
      } else {
        setGeneralError(payload || t("register.generalError"));
      }
    }
  };

  return (
    <AuthPanel>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Left column: form fields */}
          <div className="space-y-6">
            <AuthHeading title={t("register.title")} subtitle={t("register.subtitle")} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label={t("register.firstName")}
                id="first_name"
                onChange={handleChange}
                required
                type="text"
                value={formData.first_name}
                error={errors.first_name}
              />
              <TextField
                label={t("register.lastName")}
                id="last_name"
                onChange={handleChange}
                required
                type="text"
                value={formData.last_name}
                error={errors.last_name}
              />
            </div>

            <TextField
              label={t("register.email")}
              id="email"
              onChange={handleChange}
              required
              type="email"
              value={formData.email}
              error={errors.email}
            />

            <TextField
              label={t("register.phone")}
              id="phone"
              onChange={handleChange}
              required
              type="tel"
              value={formData.phone}
              error={errors.phone}
            />

            <TextField
              label={t("register.password")}
              id="password"
              onChange={handleChange}
              required
              type="password"
              value={formData.password}
              error={errors.password}
            />

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[#010000]"
              />
              <span className="text-sm text-[#010000]/75">
                {t("register.acceptTerms.prefix")}{" "}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-sm underline underline-offset-4"
                >
                  {t("register.acceptTerms.link")}
                </a>
              </span>
            </label>
          </div>

          {/* Right column: plan selector + actions */}
          <div className="flex flex-col gap-6">
            <div className="space-y-3">
              <h2 className="text-2xl font-medium tracking-[-0.03em]">
                {t("register.planType")}
              </h2>
              <RegistrationMemberships
                selectedPeriod={formData.billing_period}
                myweb={formData.myweb}
                onMyWebChange={handleMyWebChange}
                onPeriodChange={handlePeriodChange}
              />
            </div>


            {generalError && (
              <p role="alert" className="text-sm font-medium">{generalError}</p>
            )}

            <div className="mt-auto space-y-3">
              <PillButton disabled={registerInProgress || !acceptedTerms} type="submit" className="w-full">
                {t("register.submit")}
              </PillButton>

              <AuthActionLink to="/login">{t("register.goToLogin")}</AuthActionLink>
            </div>
          </div>
        </div>
      </form>
    </AuthPanel>
  );
};
