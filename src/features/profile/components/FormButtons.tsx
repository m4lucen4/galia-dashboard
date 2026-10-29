import { PillButton } from "@/components/shared/ui/PillButton";
import { useTranslation } from "react-i18next";

interface FormButtonsProps {
  formId?: string;
  isEditing: boolean;
  isLoading: boolean;
  onEdit: () => void;
  onCancel: () => void;
}

export const FormButtons = ({
  formId,
  isEditing,
  isLoading,
  onEdit,
  onCancel,
}: FormButtonsProps) => {
  const { t } = useTranslation();

  if (isEditing) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <PillButton type="submit" form={formId} disabled={isLoading}>{t("profile.save")}</PillButton>
        <PillButton variant="outline" onClick={onCancel} disabled={isLoading}>{t("profile.cancel")}</PillButton>
      </div>
    );
  }

  return <PillButton onClick={onEdit}>{t("profile.editProfile")}</PillButton>;
};
