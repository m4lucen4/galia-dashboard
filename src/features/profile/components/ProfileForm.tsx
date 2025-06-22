import { InputField } from "../../../components/shared/ui/InputField";
import { SelectField } from "../../../components/shared/ui/SelectField";
import { useTranslation } from "react-i18next";
import { UpdateUserProps } from "../../../redux/actions/UserActions";
import { UserDataProps } from "../../../types/index";

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
}

export const ProfileForm = ({
  formData,
  userData,
  isEditing,
  onChange,
  onLanguageChange,
}: ProfileFormProps) => {
  const { t } = useTranslation();

  const getInputClassName = (isEditing: boolean) => {
    return `block w-full py-1.5 text-base text-gray-900 ${
      isEditing
        ? "bg-transparent outline-none px-0 border-b-2 border-gray-800 focus:border-black"
        : "bg-transparent border-none outline-none px-0 border-b border-transparent hover:border-gray-200"
    } sm:text-sm/6`;
  };

  return (
    <div className="mt-6 border-t border-gray-100">
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
      <div className="py-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          id="company"
          label={t("profile.company")}
          type="text"
          disabled={!isEditing}
          value={formData.company ?? ""}
          onChange={onChange}
          required
          className={getInputClassName(isEditing)}
        />
        <InputField
          id="vat"
          label={t("profile.vat")}
          type="text"
          disabled={!isEditing}
          value={formData.vat ?? ""}
          onChange={onChange}
          required
          className={getInputClassName(isEditing)}
        />
      </div>
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
