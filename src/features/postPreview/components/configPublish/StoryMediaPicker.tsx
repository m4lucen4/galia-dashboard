import React, { useId } from "react";
import { VideoCameraIcon } from "@heroicons/react/24/solid";
import type { PublicationVideoState } from "../../helpers/socialVideo";
import { STORY_TEXTS } from "../../helpers/socialVideoTexts";

interface StoryMediaPickerProps {
  /** Instagram format of the story. */
  format: "story_image" | "story_video";
  /** Selected photos (originals, not network variants), in the order of the publication. */
  photoUrls: string[];
  /** Photo the story publishes (see resolveStoryImage). */
  selectedUrl: string | null;
  onSelect: (url: string) => void;
  video: PublicationVideoState;
}

const box =
  "min-w-0 space-y-2 rounded-2xl border border-[#010000]/10 bg-white/40 px-4 py-3 text-xs";

/**
 * What an Instagram story publishes (S13): "Historia (imagen)" lists the selected photos as small
 * thumbnails to choose one; "Historia (vídeo)" shows the publication's video (poster and name).
 */
export const StoryMediaPicker: React.FC<StoryMediaPickerProps> = ({
  format,
  photoUrls,
  selectedUrl,
  onSelect,
  video,
}) => {
  const groupName = useId();

  if (format === "story_video") {
    // Loading, unreadable or missing video: the format selector and the network panel say so.
    if (video.status !== "ready") return null;
    return (
      <section aria-label={STORY_TEXTS.videoLegend} className={box}>
        <p className="font-medium text-[#010000]">{STORY_TEXTS.videoLegend}</p>
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#010000]">
            {video.posterUrl ? (
              <img src={video.posterUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <VideoCameraIcon aria-label={STORY_TEXTS.videoNoPoster} className="size-6 text-white/50" />
            )}
          </div>
          <p className="min-w-0 break-words text-[#010000]" title={video.video.original_name}>
            {video.video.original_name}
          </p>
        </div>
      </section>
    );
  }

  if (photoUrls.length === 0) return null;
  // The same photo may appear twice: only the first match is the selected one.
  const selectedIndex = selectedUrl ? photoUrls.indexOf(selectedUrl) : -1;

  return (
    <fieldset className={box}>
      <legend className="px-1 font-medium text-[#010000]">{STORY_TEXTS.imageLegend}</legend>
      <p className="text-[#010000]/65">{STORY_TEXTS.imageHint}</p>
      <div className="flex flex-wrap gap-2">
        {photoUrls.map((url, index) => (
          <label key={`${index}|${url}`} className="relative cursor-pointer">
            <input
              type="radio"
              name={groupName}
              value={url}
              checked={index === selectedIndex}
              onChange={() => onSelect(url)}
              className="peer sr-only"
            />
            <img
              src={url}
              alt={STORY_TEXTS.imageAlt(index + 1)}
              loading="lazy"
              className="size-16 rounded-lg object-cover opacity-70 ring-2 ring-transparent transition peer-checked:opacity-100 peer-checked:ring-[#010000] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#010000]"
            />
            <span
              aria-hidden="true"
              className="absolute bottom-1 left-1 rounded bg-[#010000]/70 px-1 text-[10px] leading-4 text-white"
            >
              {index + 1}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
};
