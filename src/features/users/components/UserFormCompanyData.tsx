import React from "react";
import { useTranslation } from "react-i18next";
import { CreateUserProps } from "@/redux/actions/UserActions";
import { TextField } from "@/components/shared/ui/TextField";
import { userControlClassName } from "./userFormStyles";

interface UserFormCompanyDataProps {
  formData: CreateUserProps;
  handleChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
  isAdmin?: boolean;
  isEditMode?: boolean;
}

export const UserFormCompanyData: React.FC<UserFormCompanyDataProps> = ({
  formData,
  handleChange,
  isAdmin = false,
  isEditMode = false,
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2">
      <TextField
        id="company"
        label={t("users.company")}
        className={userControlClassName}
        type="text"
        value={formData.company}
        onChange={handleChange}
      />
      <TextField
        id="job_position"
        label={t("users.jobPosition")}
        className={userControlClassName}
        type="text"
        value={formData.job_position || ""}
        onChange={handleChange}
      />
      <TextField
        id="vat"
        label={t("users.vat")}
        className={userControlClassName}
        type="text"
        value={formData.vat}
        onChange={handleChange}
      />
      <TextField
        id="web"
        label={t("users.web")}
        className={userControlClassName}
        type="url"
        value={formData.web || ""}
        onChange={handleChange}
      />
      <TextField
        id="tags"
        label={t("users.tags")}
        className={userControlClassName}
        type="text"
        value={formData.tags || ""}
        onChange={handleChange}
      />
      <div className="flex min-h-12 items-center">
        <input
          type="checkbox"
          id="active"
          name="active"
          checked={formData.active}
          onChange={handleChange}
          className="size-4 shrink-0 rounded border-[#010000]/40 accent-[#010000] focus-visible:outline-2 focus-visible:outline-[#010000] focus-visible:outline-offset-2"
        />
        <label htmlFor="active" className="ml-2 text-sm text-[#010000]/80">
          {t("users.active")}
        </label>
      </div>
      {isAdmin && (
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <TextField
              id="folder_nas"
              label="Carpeta NAS"
              placeholder="/emailusuario/carpeta"
              className={userControlClassName}
              type="text"
              value={formData.folder_nas || ""}
              onChange={handleChange}
            />
            <p className="mt-2 text-xs leading-relaxed text-[#010000]/65">
              Ruta de la carpeta en el NAS asignada a este usuario. Solo visible
              para administradores.
            </p>
          </div>
          {isEditMode && (
            <div>
              <TextField
                id="odoo_id"
                label="Odoo ID"
                className={userControlClassName}
                type="number"
                value={formData.odoo_id == null ? "" : String(formData.odoo_id)}
                onChange={handleChange}
              />
              <p className="mt-2 text-xs leading-relaxed text-[#010000]/65">
                Identificador del usuario en Odoo. Solo visible para
                administradores.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
