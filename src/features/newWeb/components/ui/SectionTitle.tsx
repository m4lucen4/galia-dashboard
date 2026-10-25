import type { ComponentPropsWithoutRef } from "react";
import { twMerge } from "tailwind-merge";

export const SectionTitle = ({
  className,
  ...props
}: ComponentPropsWithoutRef<"h2">) => (
  <h2
    className={twMerge(
      "text-[clamp(2rem,4.1667vw,3.75rem)] leading-[1.02] font-medium tracking-[-0.035em] text-[#010000]",
      className,
    )}
    {...props}
  />
);
