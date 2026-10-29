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
    <div className="min-w-0 px-2 pb-2 sm:px-4">
      <label
        htmlFor="linkedin-page"
        className="mb-2 block text-xs font-medium text-[#010000]/65"
      >
        {t("previewProjects.selectLindkedlnPage")}
      </label>

      {adminPages && adminPages.length > 0 ? (
        <select
          id="linkedin-page"
          className="block w-full min-w-0 rounded-full border border-[#010000]/20 bg-[#e8eee5] py-3 pl-4 pr-10 text-sm text-[#010000] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000]"
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
        <div className="rounded-2xl border border-dashed border-[#010000]/20 px-4 py-3 text-xs leading-relaxed text-[#010000]/60">
          {t("previewProjects.noLinkedlnPages")}
        </div>
      )}
    </div>
  );
};
