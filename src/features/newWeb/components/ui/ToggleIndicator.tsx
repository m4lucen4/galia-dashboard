import type { ComponentPropsWithoutRef } from "react";
import { twMerge } from "tailwind-merge";

type ToggleIndicatorProps = Omit<ComponentPropsWithoutRef<"span">, "children"> & {
  active: boolean;
};

/** Static status artwork, not an interactive preference control. */
export const ToggleIndicator = ({
  active,
  className,
  ...props
}: ToggleIndicatorProps) => (
  <span
    role="img"
    aria-label={active ? "Activo" : "Inactivo"}
    className={twMerge(
      "inline-flex h-12 w-23 shrink-0 items-center justify-between rounded-[999px] font-['Geist_Mono',monospace] text-[13px] leading-none",
      active
        ? "bg-[#010000] pr-1.25 pl-3.5 text-[#d8e4d6]"
        : "flex-row-reverse border-[1.5px] border-[#010000] bg-transparent pr-3 pl-1 text-[#010000]",
      className,
    )}
    {...props}
  >
    <span aria-hidden="true">{active ? "ON" : "OFF"}</span>
    <span
      aria-hidden="true"
      className={twMerge(
        "size-9.5 shrink-0 rounded-full",
        active ? "bg-[#fbea71]" : "bg-[#010000]",
      )}
    />
  </span>
);
