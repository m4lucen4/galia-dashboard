import { useState } from "react";
import { PlayIcon, VideoCameraIcon } from "@heroicons/react/24/solid";
import { PREVIEW_TEXTS } from "../helpers/socialVideoTexts";

interface VideoPreviewFrameProps {
  videoUrl: string;
  posterUrl: string | null;
  /** CSS aspect-ratio of the frame, e.g. "9 / 16". */
  aspectRatio: string;
  className?: string;
}

/**
 * Poster of the publication's video in a fixed-ratio frame; the video is only requested when the
 * user presses play (`preload="none"`, nothing is downloaded before).
 */
export function VideoPreviewFrame({
  videoUrl,
  posterUrl,
  aspectRatio,
  className = "",
}: VideoPreviewFrameProps) {
  const [playing, setPlaying] = useState(false);

  return (
    <div
      className={`relative w-full overflow-hidden bg-[#010000] ${className}`}
      style={{ aspectRatio }}
    >
      {playing ? (
        <video
          src={videoUrl}
          poster={posterUrl ?? undefined}
          preload="none"
          controls
          autoPlay
          playsInline
          className="h-full w-full object-contain"
        />
      ) : (
        <>
          {posterUrl ? (
            <img src={posterUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <VideoCameraIcon
              aria-hidden="true"
              className="absolute inset-0 m-auto size-10 text-white/50"
            />
          )}
          <button
            type="button"
            aria-label={PREVIEW_TEXTS.play}
            onClick={() => setPlaying(true)}
            className="absolute inset-0 m-auto flex size-14 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <PlayIcon aria-hidden="true" className="size-7" />
          </button>
        </>
      )}
    </div>
  );
}
