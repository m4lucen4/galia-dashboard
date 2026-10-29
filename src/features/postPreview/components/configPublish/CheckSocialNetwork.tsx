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
    <div
      className={`flex flex-wrap items-center gap-y-2 rounded-2xl border px-4 py-3 ${
        isChecked
          ? "border-[#010000]/30 bg-[#010000]/5"
          : "border-[#010000]/15 bg-transparent"
      }`}
    >
      <input
        id={id}
        type="checkbox"
        className={`h-4 w-4 shrink-0 rounded border-[#010000]/30 accent-[#010000] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#010000] disabled:cursor-not-allowed disabled:opacity-40 ${
          isDateValid && isConnected
            ? "cursor-pointer"
            : "cursor-not-allowed"
        }`}
        checked={isChecked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={!isDateValid || !isConnected || loading}
      />
      <label
        htmlFor={id}
        className={`ml-3 flex items-center gap-2 text-sm font-medium ${
          isDateValid && isConnected ? "text-[#010000]" : "text-[#010000]/40"
        }`}
      >
        <NetworkIcon
          className={`h-5 w-5 shrink-0 ${
            !isDateValid || !isConnected ? "opacity-50" : ""
          }`}
        />
        {networkName}
      </label>
      {!isConnected && !!publishDate && (
        <span className="ml-7 min-w-0 text-xs leading-relaxed text-red-700 sm:ml-auto sm:pl-3">
          {t(`previewProjects.${connectionKey}`)}
        </span>
      )}
    </div>
  );
};
