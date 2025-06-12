import { useTranslation } from "react-i18next";
import { Card } from "../../../components/shared/ui/Card";
import { PromptsTable } from "../components/promptsTable";

export const AdminPanel = () => {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto p-4">
      <h3 className="text-base/7 font-semibold text-gray-900">
        {t("admin.title")}
      </h3>
      <div className="flex justify-between items-center mb-4">
        <p className="mt-1 max-w-2xl text-sm/6 text-gray-500">
          {t("admin.description")}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card title={t("admin.prompts")}>Gestión de prompts</Card>
      </div>
      <PromptsTable />
    </div>
  );
};
