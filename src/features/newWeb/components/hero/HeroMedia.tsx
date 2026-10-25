import type { ComponentPropsWithoutRef } from "react";
import { twMerge } from "tailwind-merge";
import { HeroBanner, type HeroBannerProps } from "@/features/newWeb/components/hero/HeroBanner";

type HeroMediaProps = ComponentPropsWithoutRef<"figure"> & {
  src: string;
  alt: string;
  credit: string;
  width: number;
  height: number;
  banners: HeroBannerProps[];
};

export const HeroMedia = ({ src, alt, credit, width, height, banners, className, ...props }: HeroMediaProps) => (
  <figure className={twMerge("relative grid min-w-0 grid-cols-[minmax(0,1fr)]", className)} {...props}>
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="eager"
      fetchPriority="high"
      className="col-start-1 row-start-1 h-[clamp(25rem,65vw,38.75rem)] w-full rounded-4xl object-cover min-[75rem]:h-155"
    />
    <div className="relative col-start-1 row-start-2 mt-4 flex flex-col items-start gap-3 min-[75rem]:static min-[75rem]:mt-0 min-[75rem]:block">
      {banners.map(({ className: bannerClassName, ...banner }) => (
        <HeroBanner key={banner.label} {...banner} className={twMerge("min-[75rem]:absolute", bannerClassName)} />
      ))}
    </div>
    <figcaption className="col-start-1 row-start-1 mx-5 mb-5 min-w-0 w-fit max-w-[calc(100%-40px)] self-end justify-self-start rounded-[20px] bg-[#010000] px-3.5 py-2 text-sm wrap-anywhere text-[#d8e4d6]">
      {credit}
    </figcaption>
  </figure>
);
