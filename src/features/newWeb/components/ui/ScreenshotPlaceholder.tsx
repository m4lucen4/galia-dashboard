import type { ComponentPropsWithoutRef } from "react";
import { twMerge } from "tailwind-merge";

export type ScreenshotPlaceholderProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  label: string;
};

export const ScreenshotPlaceholder = ({
  label,
  className,
  ...props
}: ScreenshotPlaceholderProps) => (
  <div
    className={twMerge(
      "flex h-full min-w-0 flex-col items-center justify-center gap-2 rounded-[20px] border-[1.5px] border-dashed border-current bg-[#d8e4d6] p-5 text-center text-[#010000]",
      className,
    )}
    {...props}
  >
    <span className="font-['Geist_Mono',monospace] text-sm">Captura pendiente</span>
    <span className="max-w-full text-base wrap-anywhere">{label}</span>
  </div>
);
