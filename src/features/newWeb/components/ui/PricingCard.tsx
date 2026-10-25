import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { Pill } from "@/features/newWeb/components/ui/Pill";

export type PricingCardProps = ComponentPropsWithoutRef<"article"> & {
  label: string;
  price: ReactNode;
  secondary: ReactNode;
  features: readonly string[];
  action: ReactNode;
  tone?: "yellow" | "outline";
};

export const PricingCard = ({
  label, price, secondary, features, action, tone = "outline", className, ...props
}: PricingCardProps) => (
  <article
    className={twMerge(
      "flex min-w-0 flex-col gap-4.5 rounded-4xl border-[1.5px] p-6 md:p-9",
      tone === "yellow"
        ? "border-[#fbea71] bg-[#fbea71] text-[#010000]"
        : "border-[#d8e4d6] bg-transparent text-[#d8e4d6]",
      className,
    )}
    {...props}
  >
    <h3 className="self-start text-sm font-normal">
      <Pill className={twMerge(
        "border-[1.5px] px-3.5 py-1.5 font-['Geist_Mono',monospace]",
        tone === "yellow"
          ? "border-[#010000] text-[#fbea71]"
          : "border-[#d8e4d6] bg-transparent text-[#d8e4d6]",
      )}>{label}</Pill>
    </h3>
    <div className="min-w-0 font-['Geist_Mono',monospace] text-[clamp(2rem,4.1667vw,3.75rem)] leading-[1.1] tracking-[-0.05em] wrap-anywhere">
      {price}
    </div>
    <div className="font-['Geist_Mono',monospace] text-[13px]">{secondary}</div>
    {action}
    <ul className="flex flex-col gap-2.5">
      {features.map((feature) => <li key={feature}>{feature}</li>)}
    </ul>
  </article>
);
