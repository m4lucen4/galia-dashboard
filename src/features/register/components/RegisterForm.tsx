import { useState } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppDispatch } from "../../../redux/store";
import { registerUser } from "../../../redux/actions/RegisterActions";
import { RegisterFormData, SubscriptionPlanType, BillingPeriod } from "../../../types";
import { InputField } from "../../../components/shared/ui/InputField";
import { Button } from "../../../components/shared/ui/Button";
import { Card } from "../../../components/shared/ui/Card";
import { PlanSelector } from "./PlanSelector";
import { StudentCardUpload } from "./StudentCardUpload";

interface RegisterFormProps {
  registerInProgress: boolean;
}

interface FormErrors {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  password?: string;
  student_card?: string;
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
  if (formData.plan_type === "student" && !formData.student_card) {
    errors.student_card = "El carnet de estudiante es obligatorio para este plan";
  }

  return errors;
};

export const RegisterForm: React.FC<RegisterFormProps> = ({ registerInProgress }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();

  const [formData, setFormData] = useState<RegisterFormData>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    plan_type: "professional",
    billing_period: "monthly",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handlePlanChange = (plan: SubscriptionPlanType) => {
    setFormData((prev) => ({ ...prev, plan_type: plan, student_card: undefined }));
    setErrors((prev) => ({ ...prev, student_card: undefined }));
  };

  const handlePeriodChange = (period: BillingPeriod) => {
    setFormData((prev) => ({ ...prev, billing_period: period }));
  };

  const handleStudentCardChange = (file: File | undefined) => {
    setFormData((prev) => ({ ...prev, student_card: file }));
    if (errors.student_card) {
      setErrors((prev) => ({ ...prev, student_card: undefined }));
    }
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
    <Card>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {/* Left column: form fields */}
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">{t("register.title")}</h3>
              <p className="text-sm text-gray-400">{t("register.subtitle")}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField
                label={t("register.firstName")}
                id="first_name"
                onChange={handleChange}
                required
                type="text"
                value={formData.first_name}
                error={errors.first_name}
              />
              <InputField
                label={t("register.lastName")}
                id="last_name"
                onChange={handleChange}
                required
                type="text"
                value={formData.last_name}
                error={errors.last_name}
              />
            </div>

            <InputField
              label={t("register.email")}
              id="email"
              onChange={handleChange}
              required
              type="email"
              value={formData.email}
              error={errors.email}
            />

            <InputField
              label={t("register.phone")}
              id="phone"
              onChange={handleChange}
              required
              type="tel"
              value={formData.phone}
              error={errors.phone}
            />

            <InputField
              label={t("register.password")}
              id="password"
              onChange={handleChange}
              required
              type="password"
              value={formData.password}
              error={errors.password}
            />
          </div>

          {/* Right column: plan selector + actions */}
          <div className="flex flex-col gap-6">
            <div className="space-y-3">
              <label className="text-xl font-semibold text-gray-800">
                {t("register.planType")}
              </label>
              <PlanSelector
                selectedPlan={formData.plan_type}
                selectedPeriod={formData.billing_period}
                onPlanChange={handlePlanChange}
                onPeriodChange={handlePeriodChange}
              />
            </div>

            <div className={formData.plan_type !== "student" ? "invisible" : ""}>
              <StudentCardUpload
                file={formData.student_card}
                onFileChange={handleStudentCardChange}
                error={errors.student_card}
              />
            </div>

            {generalError && (
              <p className="text-sm text-red-600">{generalError}</p>
            )}

            <div className="mt-auto space-y-3">
              <Button
                title={t("register.submit")}
                disabled={registerInProgress}
                type="submit"
                fullWidth
              />

              <Link
                to="/login"
                className="w-full flex items-center justify-center py-2 px-4 border border-black rounded-md text-sm font-medium text-black hover:bg-gray-100 transition-colors"
              >
                {t("register.goToLogin")}
              </Link>
            </div>
          </div>
        </div>
      </form>
    </Card>
  );
};
