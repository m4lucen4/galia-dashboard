import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { Badge, type BadgeProps } from "@/features/newWeb/components/ui/Badge";
import { Pill } from "@/features/newWeb/components/ui/Pill";

export type CaseStudyCardProps = Omit<ComponentPropsWithoutRef<"article">, "children"> & {
  image: string;
  alt: string;
  width: number;
  height: number;
  objectPosition?: "center" | "top";
  studio: string;
  channel: string;
  badgeTone: NonNullable<BadgeProps["tone"]>;
  caption: ReactNode;
};

export const CaseStudyCard = ({
  image,
  alt,
  width,
  height,
  objectPosition = "center",
  studio,
  channel,
  badgeTone,
  caption,
  className,
  ...props
}: CaseStudyCardProps) => (
  <article
    className={twMerge("flex min-w-0 flex-col gap-4 text-[#010000]", className)}
    {...props}
  >
    <img
      src={image}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className={twMerge(
        "block h-80 w-full rounded-[28px] object-cover",
        objectPosition === "top" ? "object-top" : "object-center",
      )}
    />
    <div className="flex max-w-full flex-wrap items-center gap-2 self-start rounded-[18px] bg-[#010000] p-2 text-[#d8e4d6]">
      <h3 className="min-w-0 text-[17px] leading-[1.15] font-normal">
        <Pill className="px-2 py-1 wrap-anywhere">{studio}</Pill>
      </h3>
      <Badge tone={badgeTone} className="text-[13px]">{channel}</Badge>
    </div>
    <div className="font-['Geist_Mono',monospace] text-[15px] leading-normal wrap-anywhere">
      {caption}
    </div>
  </article>
);
