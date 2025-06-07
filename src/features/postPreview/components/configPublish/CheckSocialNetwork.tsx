import React from "react";
import { useTranslation } from "react-i18next";
import { InstagramIcon, LinkedInIcon } from "../../../../components/icons";

interface CheckSocialNetworkProps {
  id: string;
  network: "instagram" | "linkedin";
  isConnected: boolean;
  isChecked: boolean;
  isDateValid: boolean;
  publishDate: string;
  loading: boolean;
  onChange: (checked: boolean) => void;
}

export const CheckSocialNetwork: React.FC<CheckSocialNetworkProps> = ({
  id,
  network,
  isConnected,
  isChecked,
  isDateValid,
  publishDate,
  loading,
  onChange,
}) => {
  const { t } = useTranslation();

  const NetworkIcon = network === "instagram" ? InstagramIcon : LinkedInIcon;
  const networkName = network === "instagram" ? "Instagram" : "LinkedIn";
  const connectionKey =
    network === "instagram" ? "noInstagramConnection" : "noLinkedlnConnection";

  return (
    <div className="flex items-center">
      <input
        id={id}
        type="checkbox"
        className={`h-4 w-4 focus:ring-indigo-500 border-gray-300 rounded ${
          isDateValid && isConnected
            ? "text-indigo-600"
            : "text-gray-300 cursor-not-allowed"
        }`}
        checked={isChecked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={!isDateValid || !isConnected || loading}
      />
      <label
        htmlFor={id}
        className={`ml-2 flex items-center text-sm ${
          isDateValid && isConnected ? "text-gray-700" : "text-gray-400"
        }`}
      >
        <NetworkIcon
          className={`w-5 h-5 mr-1 ${
            !isDateValid || !isConnected ? "opacity-50" : ""
          }`}
        />
        {networkName}
      </label>
      {!isConnected && !!publishDate && (
        <span className="ml-2 text-xs text-red-500">
          {t(`previewProjects.${connectionKey}`)}
        </span>
      )}
    </div>
  );
};
