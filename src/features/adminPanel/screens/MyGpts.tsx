import { useTranslation } from "react-i18next";
import { MyGptsTable } from "../components/myGptsTable";

export const MyGpts = () => {
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
      <MyGptsTable />
    </div>
  );
};
