import React, { useEffect, useState } from "react";
import { CreateUserProps } from "../../redux/actions/UserActions";
import { InputField } from "../shared/ui/InputField";
import { Button } from "../shared/ui/Button";
import { SelectField } from "../shared/ui/SelectField";
import { useTranslation } from "react-i18next";

interface UsersFormProps {
  initialData?: CreateUserProps;
  onSubmit: (userData: CreateUserProps) => void;
  loading: boolean;
  isEditMode?: boolean;
}

export const UsersForm: React.FC<UsersFormProps> = ({
  initialData,
  onSubmit,
  loading,
  isEditMode = false,
}) => {
  const { t } = useTranslation();
  const defaultFormData: CreateUserProps = {
    avatar_url: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    active: true,
    phone: "",
    company: "",
    vat: "",
    description: "",
    role: "customer",
  };

  const [formData, setFormData] = useState<CreateUserProps>(
    initialData || defaultFormData
  );

  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    if (type === "checkbox") {
      const { checked } = e.target as HTMLInputElement;
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEditMode && formData.password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    if (
      isEditMode &&
      formData.password !== "" &&
      formData.password.length < 6
    ) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          id="first_name"
          label={t("users.firstName")}
          type="text"
          value={formData.first_name}
          onChange={handleChange}
          required
        />
        <InputField
          id="last_name"
          label={t("users.lastName")}
          type="text"
          value={formData.last_name}
          onChange={handleChange}
          required
        />
        <InputField
          id="email"
          label={t("users.email")}
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          disabled={isEditMode}
        />
        <InputField
          id="phone"
          label={t("users.phone")}
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          required
        />
        <InputField
          id="company"
          label={t("users.company")}
          type="text"
          value={formData.company}
          onChange={handleChange}
        />
        <InputField
          id="vat"
          label={t("users.vat")}
          type="text"
          value={formData.vat}
          onChange={handleChange}
        />
        {isEditMode ? null : (
          <InputField
            id="password"
            label={t("users.password")}
            type="password"
            value={formData.password}
            onChange={handleChange}
            required={!isEditMode}
            error={passwordError}
          />
        )}
        <SelectField
          id="role"
          label={t("users.role")}
          value={formData.role}
          onChange={handleChange}
          options={[
            { value: "basic", label: t("users.basic") },
            { value: "customer", label: t("users.customer") },
            { value: "publisher", label: t("users.publisher") },
            { value: "admin", label: t("users.admin") },
          ]}
          required
          className="mb-2"
        />
        <div className="flex items-center">
          <input
            type="checkbox"
            id="active"
            name="active"
            checked={formData.active}
            onChange={handleChange}
            className="h-4 w-4 text-black focus:ring-gray-400 border-gray-300 rounded"
          />
          <label htmlFor="active" className="ml-2 block text-sm text-gray-700">
            {t("users.active")}
          </label>
        </div>
      </div>
      <div className="mt-6">
        <Button
          fullWidth
          title={isEditMode ? t("users.editUser") : t("users.createUser")}
          disabled={loading}
          type="submit"
        />
      </div>
    </form>
  );
};
