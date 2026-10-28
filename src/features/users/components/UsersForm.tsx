import React, { useState } from "react";
import { CreateUserProps } from "@/redux/actions/UserActions";
import { PillButton } from "@/components/shared/ui/PillButton";
import { useTranslation } from "react-i18next";
import { UserFormMainData } from "./UserFormMainData";
import { UserFormAdditionalData } from "./UserFormAdditionalData";
import { UserFormCompanyData } from "./UserFormCompanyData";
import { usePasswordValidation } from "@/hooks/usePasswordValidation";

interface UsersFormProps {
  initialData?: CreateUserProps;
  onSubmit: (userData: CreateUserProps) => void;
  loading: boolean;
  isEditMode?: boolean;
  isAdmin?: boolean;
}

export const UsersForm: React.FC<UsersFormProps> = ({
  initialData,
  onSubmit,
  loading,
  isEditMode = false,
  isAdmin = false,
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
    folder_nas: "",
    has_web: false,
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
    } else if (type === "number") {
      const numValue = value === "" ? undefined : Number(value);
      setFormData({ ...formData, [name]: numValue });
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
    <form onSubmit={handleSubmit} className="min-w-0 space-y-6 [&_label]:text-sm [&_label]:font-medium">
      <fieldset className="min-w-0 rounded-[28px] border border-[#010000]/20 p-5 sm:p-6">
        <legend className="px-2 text-xl font-medium tracking-[-0.03em]">{t("users.sections.personal")}</legend>
        <UserFormMainData
          formData={formData}
          handleChange={handleChange}
          isEditMode={isEditMode}
          passwordError={passwordError}
          isAdmin={isAdmin}
        />
      </fieldset>

      <fieldset className="min-w-0 rounded-[28px] border border-[#010000]/20 p-5 sm:p-6">
        <legend className="px-2 text-xl font-medium tracking-[-0.03em]">{t("users.sections.location")}</legend>
        <UserFormAdditionalData
          formData={formData}
          handleChange={handleChange}
          handleCountryChange={handleCountryChange}
          handleProvinceIdChange={handleProvinceIdChange}
          handleProvinceTextChange={handleProvinceTextChange}
        />
      </fieldset>

      <fieldset className="min-w-0 rounded-[28px] border border-[#010000]/20 p-5 sm:p-6">
        <legend className="px-2 text-xl font-medium tracking-[-0.03em]">{t("users.sections.professional")}</legend>
        <UserFormCompanyData
          formData={formData}
          handleChange={handleChange}
          isAdmin={isAdmin}
          isEditMode={isEditMode}
        />
      </fieldset>

      <PillButton className="w-full" disabled={loading} type="submit">
        {isEditMode ? t("users.editUser") : t("users.createUser")}
      </PillButton>
    </form>
  );
};
