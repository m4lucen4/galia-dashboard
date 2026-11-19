import React, { useId } from "react";
import { POSITION_TEXTS } from "../../helpers/socialVideoTexts";

interface VideoPositionPickerProps {
  /** Selected photos of the publication (the carousel holds this many items plus the video). */
  photoCount: number;
  /** 0-based position of the video (see resolveVideoPosition). */
  value: number;
  onChange: (position: number) => void;
}

/**
 * "Posición del vídeo" of the Instagram "Carrusel con vídeo" (S14): positions 1..N+1 for N selected
 * photos, shown 1-based; the photos keep their order around the video.
 */
export const VideoPositionPicker: React.FC<VideoPositionPickerProps> = ({
  photoCount,
  value,
  onChange,
}) => {
  const id = useId();
  const total = photoCount + 1;

  return (
    <div className="min-w-0 space-y-2 rounded-2xl border border-[#010000]/10 bg-white/40 px-4 py-3 text-xs">
      <label htmlFor={id} className="block font-medium text-[#010000]">
        {POSITION_TEXTS.legend}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-describedby={`${id}-hint`}
        className="block w-full min-w-0 rounded-full border border-[#010000]/20 bg-[#e8eee5] py-2 pl-4 pr-10 text-sm text-[#010000] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000]"
      >
        {Array.from({ length: total }, (_, index) => (
          <option key={index} value={index}>
            {POSITION_TEXTS.option(index + 1, total)}
          </option>
        ))}
      </select>
      <p id={`${id}-hint`} className="text-[#010000]/65">
        {POSITION_TEXTS.summary(value + 1, total)} {POSITION_TEXTS.hint}
      </p>
    </div>
  );
};
