import React from "react";
import { useTranslation } from "react-i18next";
import { CreateUserProps } from "../../../redux/actions/UserActions";
import { InputField } from "../../../components/shared/ui/InputField";
import { SelectField } from "../../../components/shared/ui/SelectField";

interface UserFormMainDataProps {
  formData: CreateUserProps;
  handleChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
  isEditMode: boolean;
  passwordError: string;
  isAdmin?: boolean;
}

export const UserFormMainData: React.FC<UserFormMainDataProps> = ({
  formData,
  handleChange,
  isEditMode,
  passwordError,
  isAdmin = false,
}) => {
  const { t } = useTranslation();

  return (
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
      <div>
        <SelectField
          id="role"
          label={t("users.role")}
          value={formData.role}
          onChange={handleChange}
          options={[
            { value: "customer", label: t("users.customer") },
            { value: "photographer", label: t("users.photographer") },
            { value: "publisher", label: t("users.publisher") },
            { value: "admin", label: t("users.admin") },
          ]}
          required
          className="mb-2"
        />
        {isAdmin && (
          <div className="flex items-center mt-2">
            <input
              type="checkbox"
              id="has_web"
              name="has_web"
              checked={formData.has_web ?? false}
              onChange={handleChange}
              className="h-4 w-4 text-black focus:ring-gray-400 border-gray-300 rounded"
            />
            <label htmlFor="has_web" className="ml-2 block text-sm text-gray-700">
              {t("users.hasWeb")}
            </label>
          </div>
        )}
      </div>
    </div>
  );
};
