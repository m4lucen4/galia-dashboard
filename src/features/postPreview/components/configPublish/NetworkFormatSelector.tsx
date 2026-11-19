import React, { useId } from "react";
import type { PublicationFormat } from "@/types";
import type { SocialNetwork } from "../../helpers/socialMediaRules";
import type { FormatOption } from "../../helpers/socialVideo";
import { SELECTOR_TEXTS } from "../../helpers/socialVideoTexts";

interface NetworkFormatSelectorProps {
  network: SocialNetwork;
  options: FormatOption[];
  /** Format that will be published (the user's choice, else the default). */
  value: PublicationFormat;
  onChange: (format: PublicationFormat) => void;
}

/**
 * Format of one network (VITE_SOCIAL_VIDEO): Instagram Post / Historia (imagen) / Reel / Historia
 * (vídeo), LinkedIn Imagen(es) / Vídeo. Options that cannot work are disabled with a short reason.
 */
export const NetworkFormatSelector: React.FC<NetworkFormatSelectorProps> = ({
  network,
  options,
  value,
  onChange,
}) => {
  const groupName = useId();
  // A single option is not a choice.
  if (options.length < 2) return null;

  return (
    <fieldset className="min-w-0 space-y-2 rounded-2xl border border-[#010000]/10 bg-white/40 px-4 py-3">
      <legend className="px-1 text-xs font-medium text-[#010000]">
        {SELECTOR_TEXTS.title(network)}
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const selected = option.format === value;
          const reasonId = `${groupName}-${option.format}-reason`;
          return (
            <label
              key={option.format}
              className={`min-w-0 rounded-xl border px-3 py-2 text-xs transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#010000] ${
                selected ? "border-[#010000] bg-white/70" : "border-[#010000]/20"
              } ${option.disabledReason ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name={groupName}
                  value={option.format}
                  checked={selected}
                  disabled={!!option.disabledReason}
                  aria-describedby={option.disabledReason ? reasonId : undefined}
                  onChange={() => onChange(option.format)}
                  className="size-4 shrink-0 accent-[#010000]"
                />
                <span className="font-medium">{option.label}</span>
              </span>
              {option.disabledReason && (
                <span id={reasonId} className="mt-1 block pl-6 text-[#010000]/65">
                  {option.disabledReason}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
};
