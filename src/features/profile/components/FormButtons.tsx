import { Button } from "../../../components/shared/ui/Button";
import { useTranslation } from "react-i18next";

interface FormButtonsProps {
  isEditing: boolean;
  isLoading: boolean;
  onEdit: () => void;
  onCancel: () => void;
}

export const FormButtons = ({
  isEditing,
  isLoading,
  onEdit,
  onCancel,
}: FormButtonsProps) => {
  const { t } = useTranslation();

  if (isEditing) {
    return (
      <div className="flex space-x-3">
        <Button title={t("profile.save")} type="submit" disabled={isLoading} />
        <Button
          title={t("profile.cancel")}
          secondary
          onClick={onCancel}
          disabled={isLoading}
        />
      </div>
    );
  }

  return <Button title={t("profile.editProfile")} onClick={onEdit} />;
};
