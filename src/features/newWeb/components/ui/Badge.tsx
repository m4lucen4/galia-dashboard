import type { ComponentPropsWithoutRef } from "react";
import { twMerge } from "tailwind-merge";

export type BadgeProps = ComponentPropsWithoutRef<"span"> & {
  tone?: "lavender" | "orange" | "sage" | "olive" | "ink";
};

const tones = {
  lavender: "bg-[#8c8abc] text-[#010000]",
  orange: "bg-[#ff522a] text-[#010000]",
  sage: "bg-[#d8e4d6] text-[#010000]",
  olive: "bg-[#8e8101] text-[#010000]",
  ink: "bg-[#010000] text-[#d8e4d6]",
};

export const Badge = ({ tone = "lavender", className, ...props }: BadgeProps) => (
  <span
    className={twMerge(
      "inline-block rounded-[10px] px-2.5 py-1.25 font-['Geist_Mono',monospace] text-sm leading-normal wrap-anywhere",
      tones[tone],
      className,
    )}
    {...props}
  />
);
