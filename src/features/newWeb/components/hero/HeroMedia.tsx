import type { ComponentPropsWithoutRef } from "react";
import { twMerge } from "tailwind-merge";

type HeroMediaProps = ComponentPropsWithoutRef<"figure"> & {
  src: string;
};

export const HeroMedia = ({ src, className, ...props }: HeroMediaProps) => (
  <figure className={twMerge("min-w-0", className)} {...props}>
    <video
      src={src}
      autoPlay
      muted
      playsInline
      controls
      preload="metadata"
      aria-label="Vídeo de presentación de mocklab"
      className="h-[clamp(25rem,65vw,38.75rem)] w-full rounded-4xl bg-black object-contain min-[75rem]:h-155"
    >
      Tu navegador no admite la reproducción de vídeo.
    </video>
  </figure>
);
