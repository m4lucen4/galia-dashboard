import type { ComponentPropsWithoutRef } from "react";
import { twMerge } from "tailwind-merge";

type PillProps = ComponentPropsWithoutRef<"span"> & {
  tone?: "ink" | "yellow";
};

export const Pill = ({ tone = "ink", className, ...props }: PillProps) => (
  <span
    className={twMerge(
      "inline-block max-w-full rounded-full px-[0.4em] pt-[0.04em] pb-[0.12em] leading-[1.15]",
      tone === "ink" ? "bg-[#010000] text-[#d8e4d6]" : "bg-[#fbea71] text-[#010000]",
      className,
    )}
    {...props}
  />
);
