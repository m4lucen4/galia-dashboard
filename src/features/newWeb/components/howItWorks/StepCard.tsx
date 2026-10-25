import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export type StepCardProps = Omit<ComponentPropsWithoutRef<"article">, "children" | "title"> & {
  number: string;
  title: string;
  description: string;
  preview: ReactNode;
  variant?: "light" | "dark";
};

export const StepCard = ({
  number,
  title,
  description,
  preview,
  variant = "light",
  className,
  ...props
}: StepCardProps) => (
  <article
    className={twMerge(
      "flex min-w-0 flex-col gap-5 rounded-4xl border-[1.5px] border-solid border-[#010000] p-5 wrap-anywhere",
      variant === "dark" ? "bg-[#010000] text-[#d8e4d6]" : "bg-[#d8e4d6] text-[#010000]",
      className,
    )}
    {...props}
  >
    <div className="h-64 min-w-0 overflow-hidden rounded-[20px] lg:h-80 [&>img]:h-full [&>img]:w-full [&>img]:object-cover">
      {preview}
    </div>
    <div className="flex flex-col gap-2.5 px-2 pb-2">
      <span className="font-['Geist_Mono',monospace] text-[15px]">{number}</span>
      <h3 className="text-[26px] leading-tight font-medium tracking-[-0.02em]">{title}</h3>
      <p className="text-base leading-normal">{description}</p>
    </div>
  </article>
);
