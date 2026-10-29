import { useRef, useState, type ComponentPropsWithoutRef } from "react";
import { SpeakerWaveIcon } from "@heroicons/react/24/outline";
import { twMerge } from "tailwind-merge";
import { Button } from "@/features/newWeb/components/ui/Button";

type HeroMediaProps = ComponentPropsWithoutRef<"figure"> & {
  src: string;
};

export const HeroMedia = ({ src, className, ...props }: HeroMediaProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isSilent, setIsSilent] = useState(true);

  const enableSound = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.volume === 0) video.volume = 1;
    video.muted = false;
    setIsSilent(false);
  };

  return (
    <figure className={twMerge("relative min-w-0", className)} {...props}>
      <video
        ref={videoRef}
        src={src}
        autoPlay
        muted
        playsInline
        controls
        preload="metadata"
        onVolumeChange={({ currentTarget }) =>
          setIsSilent(currentTarget.muted || currentTarget.volume === 0)
        }
        aria-label="Vídeo de presentación de mocklab"
        className="h-[clamp(25rem,65vw,38.75rem)] w-full rounded-4xl bg-black object-contain min-[75rem]:h-155"
      >
        Tu navegador no admite la reproducción de vídeo.
      </video>
      {isSilent && (
        <Button
          type="button"
          onClick={enableSound}
          className="absolute top-4 left-4 max-w-[calc(100%-2rem)] gap-2 border-[#d8e4d6]/40 text-sm shadow-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d8e4d6]"
        >
          <SpeakerWaveIcon className="size-5 shrink-0" aria-hidden="true" />
          Activa el sonido
        </Button>
      )}
    </figure>
  );
};
