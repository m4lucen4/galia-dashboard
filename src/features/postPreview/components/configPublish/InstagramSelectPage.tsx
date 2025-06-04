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
    <div className="ml-6 mt-2">
      <label
        htmlFor="instagram-page"
        className="block text-xs text-gray-600 mb-1"
      >
        {t("previewProjects.selectInstagramPage")}
      </label>

      {businessPages && businessPages.length > 0 ? (
        <select
          id="instagram-page"
          className="mt-1 block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
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
        <div className="text-xs text-gray-500">
          {t("previewProjects.noInstagramPages")}
        </div>
      )}
    </div>
  );
};
