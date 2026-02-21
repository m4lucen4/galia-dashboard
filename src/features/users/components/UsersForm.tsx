import React, { useState } from "react";
import { CreateUserProps } from "../../../redux/actions/UserActions";
import { Button } from "../../../components/shared/ui/Button";
import { useTranslation } from "react-i18next";
import { UserFormMainData } from "./UserFormMainData";
import { UserFormAdditionalData } from "./UserFormAdditionalData";
import { UserFormCompanyData } from "./UserFormCompanyData";
import { usePasswordValidation } from "../../../hooks/usePasswordValidation";

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
    province_id: null,
    country: null,
    job_position: "",
    web: "",
    tags: "",
  };

  const [formData, setFormData] = useState<CreateUserProps>(
    initialData ?? defaultFormData,
  );

  const { passwordError, validatePassword } = usePasswordValidation({
    isEditMode,
  });

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
    setFormData({ ...formData, country: id, province: "", province_id: null });
  };

  const handleProvinceIdChange = (id: number | null) => {
    setFormData({ ...formData, province_id: id, province: "" });
  };

  const handleProvinceTextChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    setFormData({ ...formData, province: e.target.value, province_id: null });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword(formData.password)) {
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <UserFormMainData
        formData={formData}
        handleChange={handleChange}
        isEditMode={isEditMode}
        passwordError={passwordError}
      />

      <div className="my-6 border-t border-gray-300" />

      <UserFormAdditionalData
        formData={formData}
        handleChange={handleChange}
        handleCountryChange={handleCountryChange}
        handleProvinceIdChange={handleProvinceIdChange}
        handleProvinceTextChange={handleProvinceTextChange}
      />

      <div className="my-6 border-t border-gray-300" />

      <UserFormCompanyData formData={formData} handleChange={handleChange} />

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
