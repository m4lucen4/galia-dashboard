import React, { useState } from "react";
import { CreateUserProps } from "../../redux/actions/UserActions";
import { InputField } from "../shared/ui/InputField";
import { InputAutoComplete } from "../shared/ui/InputAutoComplete";
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
    address: "",
    postal_code: "",
    city: "",
    province: "",
    country: null,
    job_position: "",
    web: "",
    tags: "",
  };

  const [formData, setFormData] = useState<CreateUserProps>(
    initialData ?? defaultFormData,
  );

  const [passwordError, setPasswordError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    if (type === "checkbox") {
      const { checked } = e.target as HTMLInputElement;
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleCountryChange = (id: number | null) => {
    setFormData({ ...formData, country: id });
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
      {/* Bloque 1: Información Principal */}
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
      </div>

      {/* Separador */}
      <div className="my-6 border-t border-gray-300"></div>

      {/* Bloque 2: Información Adicional */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <InputField
            id="address"
            label={t("users.address")}
            type="text"
            value={formData.address || ""}
            onChange={handleChange}
          />
        </div>
        <InputField
          id="city"
          label={t("users.city")}
          type="text"
          value={formData.city || ""}
          onChange={handleChange}
        />
        <InputField
          id="postal_code"
          label={t("users.postalCode")}
          type="text"
          value={formData.postal_code || ""}
          onChange={handleChange}
        />
        <InputField
          id="province"
          label={t("users.province")}
          type="text"
          value={formData.province || ""}
          onChange={handleChange}
        />
        <InputAutoComplete
          id="country"
          label={t("users.country")}
          value={formData.country ?? null}
          onChange={handleCountryChange}
        />
      </div>

      {/* Separador */}
      <div className="my-6 border-t border-gray-300"></div>

      {/* Bloque 3: Información Empresarial */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          id="company"
          label={t("users.company")}
          type="text"
          value={formData.company}
          onChange={handleChange}
        />
        <InputField
          id="job_position"
          label={t("users.jobPosition")}
          type="text"
          value={formData.job_position || ""}
          onChange={handleChange}
        />
        <InputField
          id="vat"
          label={t("users.vat")}
          type="text"
          value={formData.vat}
          onChange={handleChange}
        />
        <InputField
          id="web"
          label={t("users.web")}
          type="url"
          value={formData.web || ""}
          onChange={handleChange}
        />
        <InputField
          id="tags"
          label={t("users.tags")}
          type="text"
          value={formData.tags || ""}
          onChange={handleChange}
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
