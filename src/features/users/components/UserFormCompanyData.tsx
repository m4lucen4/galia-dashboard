import React from "react";
import { useTranslation } from "react-i18next";
import { CreateUserProps } from "../../../redux/actions/UserActions";
import { InputField } from "../../../components/shared/ui/InputField";

interface UserFormCompanyDataProps {
  formData: CreateUserProps;
  handleChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
}

export const UserFormCompanyData: React.FC<UserFormCompanyDataProps> = ({
  formData,
  handleChange,
}) => {
  const { t } = useTranslation();

  return (
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
  );
};
