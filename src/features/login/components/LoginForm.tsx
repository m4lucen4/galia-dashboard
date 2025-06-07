import { useState } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../../redux/store";
import { useTranslation } from "react-i18next";
import { login } from "../../../redux/actions/AuthActions";
import { LoginProps } from "../../../types";
import { InputField } from "../../../components/shared/ui/InputField";
import { Button } from "../../../components/shared/ui/Button";
import { isFormValid, validateLoginForm } from "../../../helpers";
import { Card } from "../../../components/shared/ui/Card";

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

  const dispatch = useDispatch<AppDispatch>();

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
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
    <Card title={t("login.title")} subtitle={t("login.subtitle")}>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <InputField
          label={t("login.email")}
          id="email"
          onChange={handleChange}
          required
          type="email"
          value={formData.email}
        />
        <InputField
          label={t("login.password")}
          id="password"
          onChange={handleChange}
          required
          type="password"
          value={formData.password}
        />
        <div className="flex row items-center justify-between">
          <Button
            title={t("login.button")}
            disabled={loginRequest.inProgress}
            type="submit"
          />
          <span className="text-sm cursor-pointer" onClick={onForgotPassword}>
            {t("login.recoveryPassword")}
          </span>
        </div>
      </form>
    </Card>
  );
};
