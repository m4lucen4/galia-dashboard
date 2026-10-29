import type { ComponentPropsWithoutRef } from "react";
import { twMerge } from "tailwind-merge";

type PillButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: "solid" | "outline";
};

const variants = {
  solid: "bg-[#010000] text-[#d8e4d6] hover:bg-[#3a3a3a]",
  outline: "border-[#010000] bg-transparent text-[#010000] hover:bg-[#010000] hover:text-[#d8e4d6]",
};

export const PillButton = ({ variant = "solid", type = "button", className, ...props }: PillButtonProps) => (
  <button
    type={type}
    className={twMerge(
      "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-[1.5px] border-transparent px-5 py-3 text-sm leading-tight font-medium focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#010000] focus-visible:outline-offset-4 disabled:cursor-not-allowed disabled:opacity-50",
      variants[variant],
      className,
    )}
    {...props}
  />
);
