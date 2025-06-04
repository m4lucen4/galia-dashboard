import React, { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";

interface LinkedInPage {
  id: string;
  name: string;
  type: string;
}

interface LinkedlnSelectPageProps {
  adminPages?: LinkedInPage[];
  selectedPageId: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
}

export const LinkedlnSelectPage: React.FC<LinkedlnSelectPageProps> = ({
  adminPages,
  selectedPageId,
  onChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="ml-6 mt-2">
      <label
        htmlFor="linkedin-page"
        className="block text-xs text-gray-600 mb-1"
      >
        {t("previewProjects.selectLindkedlnPage")}
      </label>

      {adminPages && adminPages.length > 0 ? (
        <select
          id="linkedin-page"
          className="mt-1 block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
          value={selectedPageId}
          onChange={onChange}
        >
          {adminPages.map((page) => (
            <option key={page.id} value={page.id}>
              {page.name} (
              {page.type === "PERSON"
                ? t("previewProjects.personalProfile")
                : t("previewProjects.companyPage")}
              )
            </option>
          ))}
        </select>
      ) : (
        <div className="text-xs text-gray-500">
          {t("previewProjects.noLinkedlnPages")}
        </div>
      )}
    </div>
  );
};
