import React from "react";
import { useTranslation } from "react-i18next";
import { CreateUserProps } from "@/redux/actions/UserActions";
import { TextField } from "@/components/shared/ui/TextField";
import { userControlClassName } from "./userFormStyles";
import { InputAutoComplete } from "@/components/shared/ui/InputAutoComplete";
import countriesData from "@/assets/regions/countries.json";
import provincesData from "@/assets/regions/provinces.json";

const SPAIN_ID = 68;
const countriesOptions = countriesData.result.records.map((c) => ({
  id: c.id,
  name: c.name,
}));
const provincesOptions = provincesData.result.records.map((p) => ({
  id: p.id,
  name: p.name,
}));

interface UserFormAdditionalDataProps {
  formData: CreateUserProps;
  handleChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
  handleCountryChange: (id: number | null) => void;
  handleProvinceIdChange: (id: number | null) => void;
  handleProvinceTextChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
}

export const UserFormAdditionalData: React.FC<UserFormAdditionalDataProps> = ({
  formData,
  handleChange,
  handleCountryChange,
  handleProvinceIdChange,
  handleProvinceTextChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2">
      <div className="md:col-span-2">
        <TextField
          id="address"
          label={t("users.address")}
          className={userControlClassName}
          type="text"
          value={formData.address || ""}
          onChange={handleChange}
        />
      </div>
      <TextField
        id="city"
        label={t("users.city")}
        className={userControlClassName}
        type="text"
        value={formData.city || ""}
        onChange={handleChange}
      />
      <TextField
        id="postal_code"
        label={t("users.postalCode")}
        className={userControlClassName}
        type="text"
        value={formData.postal_code || ""}
        onChange={handleChange}
      />
      <InputAutoComplete
        id="country"
        label={t("users.country")}
        value={formData.country ?? null}
        onChange={handleCountryChange}
        options={countriesOptions}
        className={userControlClassName}
      />
      {formData.country !== null &&
        (formData.country === SPAIN_ID ? (
          <InputAutoComplete
            id="province_id"
            label={t("users.province")}
            value={formData.province_id ?? null}
            onChange={handleProvinceIdChange}
            options={provincesOptions}
            className={userControlClassName}
          />
        ) : (
          <TextField
            id="province"
            label={t("users.province")}
            className={userControlClassName}
            type="text"
            value={formData.province || ""}
            onChange={handleProvinceTextChange}
          />
        ))}
    </div>
  );
};
