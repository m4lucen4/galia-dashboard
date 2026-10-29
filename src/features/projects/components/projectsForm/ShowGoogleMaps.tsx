import React from "react";
import { useTranslation } from "react-i18next";
import { InputField } from "../../../../components/shared/ui/InputField";
import { Checkbox } from "../../../../components/shared/ui/Checkbox";
import { projectCheckboxClassName, projectControlClassName } from "../projectFormStyles";

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
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:gap-5">
      <div className="min-w-0 flex-1">
        <InputField
          id="googleMaps"
          className={projectControlClassName}
          label={t("projects.googleMaps")}
          placeholder={t("projects.placeholderGoogleMaps")}
          type="url"
          value={googleMaps}
          onChange={onGoogleMapsChange}
        />
      </div>

      {isAdmin && (
        <div className="shrink-0">
          <Checkbox
            id="showMap"
            className={projectCheckboxClassName}
            label="Mostrar?"
            checked={showMap}
            onChange={onShowMapChange}
          />
        </div>
      )}
    </div>
  );
};
