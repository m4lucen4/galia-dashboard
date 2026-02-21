import React from "react";
import { useTranslation } from "react-i18next";
import { CreateUserProps } from "../../../redux/actions/UserActions";
import { InputField } from "../../../components/shared/ui/InputField";
import { InputAutoComplete } from "../../../components/shared/ui/InputAutoComplete";
import countriesData from "../../../assets/regions/countries.json";
import provincesData from "../../../assets/regions/provinces.json";

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
      <InputAutoComplete
        id="country"
        label={t("users.country")}
        value={formData.country ?? null}
        onChange={handleCountryChange}
        options={countriesOptions}
      />
      {formData.country !== null &&
        (formData.country === SPAIN_ID ? (
          <InputAutoComplete
            id="province_id"
            label={t("users.province")}
            value={formData.province_id ?? null}
            onChange={handleProvinceIdChange}
            options={provincesOptions}
          />
        ) : (
          <InputField
            id="province"
            label={t("users.province")}
            type="text"
            value={formData.province || ""}
            onChange={handleProvinceTextChange}
          />
        ))}
    </div>
  );
};
