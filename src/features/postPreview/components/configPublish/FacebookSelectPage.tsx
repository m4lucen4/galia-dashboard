import React, { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import type { FacebookPage } from "../../../../types";

interface FacebookSelectPageProps {
  pages?: FacebookPage[];
  selectedPageId: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
}

export const FacebookSelectPage: React.FC<FacebookSelectPageProps> = ({
  pages,
  selectedPageId,
  onChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="min-w-0 px-2 pb-2 sm:px-4">
      <label
        htmlFor="facebook-page"
        className="mb-2 block text-xs font-medium text-[#010000]/65"
      >
        {t("previewProjects.selectFacebookPage")}
      </label>

      {pages && pages.length > 0 ? (
        <select
          id="facebook-page"
          className="block w-full min-w-0 rounded-full border border-[#010000]/20 bg-[#e8eee5] py-3 pl-4 pr-10 text-sm text-[#010000] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000]"
          value={selectedPageId}
          onChange={onChange}
        >
          {pages.map((page) => (
            <option key={page.id} value={page.id}>
              {page.name}
            </option>
          ))}
        </select>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#010000]/20 px-4 py-3 text-xs leading-relaxed text-[#010000]/60">
          {t("previewProjects.noFacebookPages")}
        </div>
      )}
    </div>
  );
};
