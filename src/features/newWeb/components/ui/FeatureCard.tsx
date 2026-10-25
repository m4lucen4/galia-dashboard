import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

const accentClasses = {
  violet: "bg-[#8c8abc]",
  orange: "bg-[#ff522a]",
  olive: "bg-[#8e8101]",
  mint: "bg-[#d8e4d6]",
};

type FeatureCardProps = Omit<ComponentPropsWithoutRef<"article">, "title" | "children"> & {
  title: string;
  description: string;
  icon: ReactNode;
  accent: keyof typeof accentClasses;
  variant?: "default" | "filled";
};

export const FeatureCard = ({
  title,
  description,
  icon,
  accent,
  variant = "default",
  className,
  ...props
}: FeatureCardProps) => (
  <article
    className={twMerge(
      "flex min-h-75 min-w-0 flex-col items-start justify-between gap-12 rounded-[28px] bg-white p-6 text-[#010000] lg:min-h-85 lg:p-7",
      variant === "filled" && accentClasses[accent],
      className,
    )}
    {...props}
  >
    <span
      className={twMerge(
        "inline-flex shrink-0 items-center justify-center",
        variant === "filled" ? "size-12" : twMerge("size-16 rounded-2xl", accentClasses[accent]),
      )}
      aria-hidden="true"
    >
      {icon}
    </span>
    <div className="flex flex-col gap-2">
      <h3 className="text-[28px] leading-[1.15] font-medium tracking-[-0.02em]">{title}</h3>
      <p className="text-base leading-[1.45]">{description}</p>
    </div>
  </article>
);
