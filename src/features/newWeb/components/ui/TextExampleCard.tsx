import type { ComponentPropsWithoutRef } from "react";
import { twMerge } from "tailwind-merge";

type TextExampleCardProps = ComponentPropsWithoutRef<"article"> & {
  label: string;
  text: string;
  variant?: "generic" | "studio";
};

export const TextExampleCard = ({
  label,
  text,
  variant = "studio",
  className,
  ...props
}: TextExampleCardProps) => (
  <article
    className={twMerge(
      "flex min-w-0 flex-col gap-2.5 rounded-3xl p-6 lg:p-6.5",
      variant === "generic"
        ? "border-[1.5px] border-dashed border-[#d8e4d6] bg-transparent text-[#d8e4d6]"
        : "bg-[#d8e4d6] text-[#010000]",
      className,
    )}
    {...props}
  >
    <h3 className="font-['Geist_Mono',monospace] text-[13px] font-normal">{label}</h3>
    <p className={twMerge("text-[17px] leading-[1.55]", variant === "generic" && "line-through")}>
      {text}
    </p>
  </article>
);
