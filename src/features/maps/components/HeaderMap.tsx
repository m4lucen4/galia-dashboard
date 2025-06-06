import React from "react";
import { useTranslation } from "react-i18next";
import provinces from "../../../assets/regions/provinces.json";

interface HeaderMapProps {
  onProvinceChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const sortedProvinces = [...provinces].sort((a, b) =>
  a.label.localeCompare(b.label)
);

export const HeaderMap: React.FC<HeaderMapProps> = ({ onProvinceChange }) => {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto p-4">
      <h3 className="text-base/7 font-semibold text-gray-900">
        {t("maps.title")}
      </h3>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <p className="mt-1 max-w-xl text-sm/6 text-gray-500">
          {t("maps.subtitle")}
        </p>
        <div className="w-full md:w-64">
          <select
            id="province-select"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            onChange={onProvinceChange}
            defaultValue=""
          >
            <option value="" disabled>
              {t("maps.selectProvince")}
            </option>
            {sortedProvinces.map((province) => (
              <option
                key={province.code}
                value={province.coordinates.join(",")}
              >
                {province.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
