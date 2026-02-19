import { InputField } from "../../../components/shared/ui/InputField";
import { InputAutoComplete } from "../../../components/shared/ui/InputAutoComplete";
import { SelectField } from "../../../components/shared/ui/SelectField";
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
import { useTranslation } from "react-i18next";
import { UpdateUserProps } from "../../../redux/actions/UserActions";
import { UserDataProps } from "../../../types/index";

import avatarDefault from "../../../assets/profile-default.png";
import { Avatar } from "./Avatar";

interface ProfileFormProps {
  formData: UpdateUserProps;
  userData: UserDataProps;
  isEditing: boolean;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => void;
  onLanguageChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCountryChange: (id: number | null) => void;
  onProvinceIdChange: (id: number | null) => void;
  avatarPreview?: string | null;
}

export const ProfileForm = ({
  formData,
  userData,
  isEditing,
  onChange,
  onLanguageChange,
  onAvatarChange,
  onCountryChange,
  onProvinceIdChange,
  avatarPreview,
}: ProfileFormProps) => {
  const { t } = useTranslation();

  const getInputClassName = (isEditing: boolean) => {
    return `block w-full py-1.5 text-base text-gray-900 ${
      isEditing
        ? "bg-transparent outline-none px-0 border-b-2 border-gray-800 focus:border-black"
        : "bg-transparent border-none outline-none px-0 border-b border-transparent hover:border-gray-200"
    } sm:text-sm/6`;
  };

  const displayAvatar = avatarPreview || formData.avatar_url || avatarDefault;

  return (
    <div className="mt-6 border-t border-gray-100">
      <div className="py-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Avatar
          displayAvatar={displayAvatar}
          isEditing={isEditing}
          onAvatarChange={onAvatarChange}
        />
        <InputField
          id="description"
          label={t("profile.descriptionProfile")}
          type="textarea"
          disabled={!isEditing}
          value={formData.description ?? ""}
          onChange={onChange}
          className={getInputClassName(isEditing)}
        />
      </div>
      <div className="py-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          id="first_name"
          label={t("profile.firstName")}
          type="text"
          disabled={!isEditing}
          value={formData.first_name ?? ""}
          onChange={onChange}
          required
          className={getInputClassName(isEditing)}
        />
        <InputField
          id="last_name"
          label={t("profile.lastName")}
          type="text"
          disabled={!isEditing}
          value={formData.last_name ?? ""}
          onChange={onChange}
          required
          className={getInputClassName(isEditing)}
        />
      </div>
      <div className="py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <dt className="text-sm/6 font-medium text-gray-900">Email</dt>
            <dd className="mt-1 text-sm/6 text-gray-700">{userData.email}</dd>
          </div>
          <InputField
            id="phone"
            label={t("profile.phone")}
            type="text"
            disabled={!isEditing}
            value={formData.phone ?? ""}
            onChange={onChange}
            required
            className={getInputClassName(isEditing)}
          />
        </div>
      </div>
      {/* Separador */}
      <div className="my-6 border-t border-gray-300"></div>

      {/* Bloque: Información Adicional */}
      <div className="py-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <InputField
            id="address"
            label={t("profile.address")}
            type="text"
            disabled={!isEditing}
            value={formData.address ?? ""}
            onChange={onChange}
            className={getInputClassName(isEditing)}
          />
        </div>
        <InputField
          id="city"
          label={t("profile.city")}
          type="text"
          disabled={!isEditing}
          value={formData.city ?? ""}
          onChange={onChange}
          className={getInputClassName(isEditing)}
        />
        <InputField
          id="postal_code"
          label={t("profile.postalCode")}
          type="text"
          disabled={!isEditing}
          value={formData.postal_code ?? ""}
          onChange={onChange}
          className={getInputClassName(isEditing)}
        />
        <InputAutoComplete
          id="country"
          label={t("profile.country")}
          value={formData.country ?? null}
          onChange={onCountryChange}
          options={countriesOptions}
          disabled={!isEditing}
          className={getInputClassName(isEditing)}
        />
        {formData.country != null && (
          formData.country === SPAIN_ID ? (
            <InputAutoComplete
              id="province_id"
              label={t("profile.province")}
              value={formData.province_id ?? null}
              onChange={onProvinceIdChange}
              options={provincesOptions}
              disabled={!isEditing}
              className={getInputClassName(isEditing)}
            />
          ) : (
            <InputField
              id="province"
              label={t("profile.province")}
              type="text"
              disabled={!isEditing}
              value={formData.province ?? ""}
              onChange={onChange}
              className={getInputClassName(isEditing)}
            />
          )
        )}
      </div>

      {/* Separador */}
      <div className="my-6 border-t border-gray-300"></div>

      {/* Bloque: Información Empresarial */}
      <div className="py-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          id="company"
          label={t("profile.company")}
          type="text"
          disabled={!isEditing}
          value={formData.company ?? ""}
          onChange={onChange}
          className={getInputClassName(isEditing)}
        />
        <InputField
          id="job_position"
          label={t("profile.jobPosition")}
          type="text"
          disabled={!isEditing}
          value={formData.job_position ?? ""}
          onChange={onChange}
          className={getInputClassName(isEditing)}
        />
        <InputField
          id="vat"
          label={t("profile.vat")}
          type="text"
          disabled={!isEditing}
          value={formData.vat ?? ""}
          onChange={onChange}
          className={getInputClassName(isEditing)}
        />
        <InputField
          id="web"
          label={t("profile.web")}
          type="url"
          disabled={!isEditing}
          value={formData.web ?? ""}
          onChange={onChange}
          className={getInputClassName(isEditing)}
        />
        <InputField
          id="tags"
          label={t("profile.tags")}
          type="text"
          disabled={!isEditing}
          value={formData.tags ?? ""}
          onChange={onChange}
          className={getInputClassName(isEditing)}
        />
      </div>

      {/* Separador */}
      <div className="my-6 border-t border-gray-300"></div>

      <div className="py-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectField
          id="language"
          className={getInputClassName(isEditing)}
          disabled={!isEditing}
          label={t("profile.language")}
          value={formData.language ?? ""}
          onChange={onLanguageChange}
          options={[
            { value: "es", label: "Español" },
            { value: "en", label: "English" },
            { value: "cat", label: "Català" },
          ]}
        />
      </div>
    </div>
  );
};
