import React from "react";
import { useTranslation } from "react-i18next";
import { CreateUserProps } from "@/redux/actions/UserActions";
import { TextField } from "@/components/shared/ui/TextField";
import { userControlClassName } from "./userFormStyles";
import { SelectField } from "@/components/shared/ui/SelectField";

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
    <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2">
      <TextField
        id="first_name"
        label={t("users.firstName")}
        className={userControlClassName}
        type="text"
        value={formData.first_name}
        onChange={handleChange}
        required
      />
      <TextField
        id="last_name"
        label={t("users.lastName")}
        className={userControlClassName}
        type="text"
        value={formData.last_name}
        onChange={handleChange}
        required
      />
      <TextField
        id="email"
        label={t("users.email")}
        className={userControlClassName}
        type="email"
        value={formData.email}
        onChange={handleChange}
        required
        disabled={isEditMode}
      />
      <TextField
        id="phone"
        label={t("users.phone")}
        className={userControlClassName}
        type="tel"
        value={formData.phone}
        onChange={handleChange}
        required
      />
      {isEditMode ? null : (
        <TextField
          id="password"
          label={t("users.password")}
          className={userControlClassName}
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
          className={userControlClassName}
        />
        {isAdmin && (
          <div className="mt-3 flex min-h-12 items-center">
            <input
              type="checkbox"
              id="has_web"
              name="has_web"
              checked={formData.has_web ?? false}
              onChange={handleChange}
              className="size-4 shrink-0 rounded border-[#010000]/40 accent-[#010000] focus-visible:outline-2 focus-visible:outline-[#010000] focus-visible:outline-offset-2"
            />
            <label htmlFor="has_web" className="ml-2 text-sm text-[#010000]/80">
              {t("users.hasWeb")}
            </label>
          </div>
        )}
      </div>
    </div>
  );
};
