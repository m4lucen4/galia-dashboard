import type { PublicationFormat } from "@/types";
import type { SocialNetwork } from "../helpers/socialMediaRules";
import {
  formatContextOf,
  formatOptions,
  type PublicationVideoState,
} from "../helpers/socialVideo";
import { PREVIEW_TEXTS } from "../helpers/socialVideoTexts";
import type { PreviewProjectDataProps } from "@/types";

interface PreviewFormatTabsProps {
  network: SocialNetwork;
  project: Pick<PreviewProjectDataProps, "image_data" | "video_id">;
  video: PublicationVideoState;
  value: PublicationFormat;
  onChange: (format: PublicationFormat) => void;
}

/** Switch between the formats a network offers for this publication (only those that can work). */
export function PreviewFormatTabs({
  network,
  project,
  video,
  value,
  onChange,
}: PreviewFormatTabsProps) {
  const options = formatOptions(network, formatContextOf(project, video)).filter(
    (option) => !option.disabledReason || option.format === value,
  );
  if (options.length < 2) return null;

  return (
    <div
      role="group"
      aria-label={PREVIEW_TEXTS.formatTabs}
      className="mx-auto mb-3 flex max-w-md flex-wrap justify-center gap-1.5"
    >
      {options.map((option) => (
        <button
          key={option.format}
          type="button"
          aria-pressed={option.format === value}
          onClick={() => onChange(option.format)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000] ${
            option.format === value
              ? "border-[#010000] bg-[#010000] text-[#d8e4d6]"
              : "border-[#010000]/25 text-[#010000] hover:bg-[#d8e4d6]"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
