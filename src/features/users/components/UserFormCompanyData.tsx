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
  isAdmin?: boolean;
}

export const UserFormCompanyData: React.FC<UserFormCompanyDataProps> = ({
  formData,
  handleChange,
  isAdmin = false,
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
      {isAdmin && (
        <div className="md:col-span-2">
          <InputField
            id="folder_nas"
            label="Carpeta NAS"
            placeholder="/emailusuario/carpeta"
            type="text"
            value={formData.folder_nas || ""}
            onChange={handleChange}
          />
          <p className="text-xs text-gray-400 mt-1">
            Ruta de la carpeta en el NAS asignada a este usuario. Solo visible para administradores.
          </p>
        </div>
      )}
    </div>
  );
};
