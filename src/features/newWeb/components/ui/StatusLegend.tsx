import type { ComponentPropsWithoutRef } from "react";
import { twMerge } from "tailwind-merge";

export type StatusLegendProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  items: readonly { label: string; highlighted?: boolean }[];
};

export const StatusLegend = ({ items, className, ...props }: StatusLegendProps) => (
  <div
    className={twMerge(
      "inline-flex max-w-full flex-wrap items-center rounded-full border-[1.5px] border-solid border-[#010000] p-1 font-['Geist_Mono',monospace] text-sm text-[#010000]",
      className,
    )}
    {...props}
  >
    {items.map(({ label, highlighted }) => (
      <span
        key={label}
        className={twMerge(
          "rounded-full px-4 py-2.5 wrap-anywhere",
          highlighted && "bg-[#010000] text-[#d8e4d6]",
        )}
      >
        {label}
      </span>
    ))}
  </div>
);
