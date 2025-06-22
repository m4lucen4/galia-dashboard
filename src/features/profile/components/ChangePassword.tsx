import { InputField } from "../../../components/shared/ui/InputField";
import { Alert } from "../../../components/shared/ui/Alert";
import { LockClosedIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";

interface ChangePasswordProps {
  isVisible: boolean;
  newPassword: string;
  repeatPassword: string;
  passwordError: string;
  isLoading: boolean;
  onPasswordChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => void;
  onAccept: () => void;
  onCancel: () => void;
}

export const ChangePassword = ({
  isVisible,
  newPassword,
  repeatPassword,
  passwordError,
  isLoading,
  onPasswordChange,
  onAccept,
  onCancel,
}: ChangePasswordProps) => {
  const { t } = useTranslation();

  if (!isVisible) return null;

  return (
    <Alert
      title={t("profile.titleChangePassword")}
      description={t("profile.descriptionChangePassword")}
      icon={LockClosedIcon}
      onAccept={onAccept}
      onCancel={onCancel}
    >
      <InputField
        id="password"
        label={t("profile.newPassword")}
        type="password"
        value={newPassword}
        onChange={onPasswordChange}
        required
        error={passwordError}
        disabled={isLoading}
      />
      <InputField
        id="repeatPassword"
        label={t("profile.confirmPassword")}
        type="password"
        value={repeatPassword}
        onChange={onPasswordChange}
        required
        disabled={isLoading}
        error=""
      />
    </Alert>
  );
};
