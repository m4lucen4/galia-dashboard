import { InputField } from "@/components/shared/ui/InputField";
import { TextField } from "@/components/shared/ui/TextField";
import { ProfileSection } from "./ProfileSection";
import { InputAutoComplete } from "@/components/shared/ui/InputAutoComplete";
import { SelectField } from "@/components/shared/ui/SelectField";
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
import { useTranslation } from "react-i18next";
import { UpdateUserProps } from "@/redux/actions/UserActions";
import { UserDataProps } from "@/types/index";

import avatarDefault from "@/assets/profile-default.png";
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

  const inputClassName = "block min-h-12 w-full min-w-0 rounded-2xl border-[1.5px] border-[#010000]/40 bg-transparent px-4 py-3 text-base text-[#010000] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#010000] focus-visible:outline-offset-2 disabled:cursor-default disabled:border-[#010000]/15 disabled:opacity-100";

  const displayAvatar = avatarPreview || formData.avatar_url || avatarDefault;

  return (
    <div className="space-y-6">
      <ProfileSection title={t("profile.sections.personal")}>
        <div className="grid min-w-0 grid-cols-1 items-center gap-6 lg:grid-cols-2">
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
            className={inputClassName}
          />
        </div>
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          <TextField
            id="first_name"
            label={t("profile.firstName")}
            type="text"
            disabled={!isEditing}
            value={formData.first_name ?? ""}
            onChange={onChange}
            required
            className={inputClassName}
          />
          <TextField
            id="last_name"
            label={t("profile.lastName")}
            type="text"
            disabled={!isEditing}
            value={formData.last_name ?? ""}
            onChange={onChange}
            required
            className={inputClassName}
          />
        </div>
        <div className="mt-5">
          <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2">
            <dl className="min-w-0">
              <dt className="mb-2 text-sm font-medium">{t("profile.email")}</dt>
              <dd className="min-h-12 wrap-break-word rounded-2xl border border-[#010000]/15 px-4 py-3 text-base">{userData.email}</dd>
            </dl>
            <TextField
              id="phone"
              label={t("profile.phone")}
              type="text"
              disabled={!isEditing}
              value={formData.phone ?? ""}
              onChange={onChange}
              required
              className={inputClassName}
            />
          </div>
        </div>
      </ProfileSection>

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-2">
        <ProfileSection title={t("profile.sections.location")}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <TextField
                id="address"
                label={t("profile.address")}
                type="text"
                disabled={!isEditing}
                value={formData.address ?? ""}
                onChange={onChange}
                className={inputClassName}
              />
            </div>
            <TextField
              id="city"
              label={t("profile.city")}
              type="text"
              disabled={!isEditing}
              value={formData.city ?? ""}
              onChange={onChange}
              className={inputClassName}
            />
            <TextField
              id="postal_code"
              label={t("profile.postalCode")}
              type="text"
              disabled={!isEditing}
              value={formData.postal_code ?? ""}
              onChange={onChange}
              className={inputClassName}
            />
            <InputAutoComplete
              id="country"
              label={t("profile.country")}
              value={formData.country ?? null}
              onChange={onCountryChange}
              options={countriesOptions}
              disabled={!isEditing}
              className={inputClassName}
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
                  className={inputClassName}
                />
              ) : (
                <TextField
                  id="province"
                  label={t("profile.province")}
                  type="text"
                  disabled={!isEditing}
                  value={formData.province ?? ""}
                  onChange={onChange}
                  className={inputClassName}
                />
              )
            )}
          </div>
        </ProfileSection>

        <ProfileSection title={t("profile.sections.professional")}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <TextField
              id="company"
              label={t("profile.company")}
              type="text"
              disabled={!isEditing}
              value={formData.company ?? ""}
              onChange={onChange}
              className={inputClassName}
            />
            <TextField
              id="job_position"
              label={t("profile.jobPosition")}
              type="text"
              disabled={!isEditing}
              value={formData.job_position ?? ""}
              onChange={onChange}
              className={inputClassName}
            />
            <TextField
              id="vat"
              label={t("profile.vat")}
              type="text"
              disabled={!isEditing}
              value={formData.vat ?? ""}
              onChange={onChange}
              className={inputClassName}
            />
            <TextField
              id="web"
              label={t("profile.web")}
              type="url"
              disabled={!isEditing}
              value={formData.web ?? ""}
              onChange={onChange}
              className={inputClassName}
            />
            <TextField
              id="tags"
              label={t("profile.tags")}
              type="text"
              disabled={!isEditing}
              value={formData.tags ?? ""}
              onChange={onChange}
              className={inputClassName}
            />
          </div>
        </ProfileSection>
      </div>

      <ProfileSection title={t("profile.sections.preferences")}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <SelectField
            id="language"
            className={inputClassName}
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
      </ProfileSection>
    </div>
  );
};
