import React, { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";

interface InstagramPage {
  instagram_business_account_id: string;
  instagram_username: string;
  facebook_page_name: string;
  page_access_token: string;
  facebook_page_id: string;
}

interface InstagramSelectPageProps {
  businessPages?: InstagramPage[];
  selectedPageId: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
}

export const InstagramSelectPage: React.FC<InstagramSelectPageProps> = ({
  businessPages,
  selectedPageId,
  onChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="min-w-0 px-2 pb-2 sm:px-4">
      <label
        htmlFor="instagram-page"
        className="mb-2 block text-xs font-medium text-[#010000]/65"
      >
        {t("previewProjects.selectInstagramPage")}
      </label>

      {businessPages && businessPages.length > 0 ? (
        <select
          id="instagram-page"
          className="block w-full min-w-0 rounded-full border border-[#010000]/20 bg-white py-3 pl-4 pr-10 text-sm text-[#010000] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000]"
          value={selectedPageId}
          onChange={onChange}
        >
          {businessPages.map((page) => (
            <option
              key={page.instagram_business_account_id}
              value={page.instagram_business_account_id}
            >
              @{page.instagram_username} ({page.facebook_page_name})
            </option>
          ))}
        </select>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#010000]/20 px-4 py-3 text-xs leading-relaxed text-[#010000]/60">
          {t("previewProjects.noInstagramPages")}
        </div>
      )}
    </div>
  );
};
