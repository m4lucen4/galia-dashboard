import type { ComponentPropsWithoutRef } from "react";
import { twMerge } from "tailwind-merge";
import { Badge, type BadgeProps } from "@/features/newWeb/components/ui/Badge";

export type HeroBannerProps = ComponentPropsWithoutRef<"div"> & {
  label: string;
  tone?: "light" | "dark";
  badges: (BadgeProps & { label: string })[];
};

export const HeroBanner = ({ label, tone = "light", badges, className, ...props }: HeroBannerProps) => (
  <div
    className={twMerge(
      "flex max-w-full flex-wrap items-center gap-2 rounded-[18px] border-[1.5px] border-solid border-[#010000] py-2.5 pr-2.5 pl-5 text-lg leading-normal",
      tone === "light" ? "bg-[#f4f7f3] text-[#010000]" : "bg-[#010000] text-[#d8e4d6]",
      className,
    )}
    {...props}
  >
    <span>{label}</span>
    {badges.map(({ label: badgeLabel, ...badge }) => (
      <Badge key={badgeLabel} {...badge}>{badgeLabel}</Badge>
    ))}
  </div>
);
