import React from "react";
import { useTranslation } from "react-i18next";
import { InputField } from "../../../../components/shared/ui/InputField";
import { Checkbox } from "../../../../components/shared/ui/Checkbox";

interface ShowGoogleMapsProps {
  googleMaps: string;
  showMap: boolean;
  isAdmin: boolean;
  onGoogleMapsChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
  onShowMapChange: (checked: boolean) => void;
}

export const ShowGoogleMaps: React.FC<ShowGoogleMapsProps> = ({
  googleMaps,
  showMap,
  isAdmin,
  onGoogleMapsChange,
  onShowMapChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-end space-x-4 mb-2">
      <div className="flex-1">
        <InputField
          id="googleMaps"
          label={t("projects.googleMaps")}
          placeholder={t("projects.placeholderGoogleMaps")}
          type="url"
          value={googleMaps}
          onChange={onGoogleMapsChange}
        />
      </div>

      {isAdmin && (
        <div className="pb-1">
          <Checkbox
            id="showMap"
            label="Mostrar?"
            checked={showMap}
            onChange={onShowMapChange}
          />
        </div>
      )}
    </div>
  );
};
