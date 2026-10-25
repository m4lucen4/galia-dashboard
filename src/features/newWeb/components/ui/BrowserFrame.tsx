import type { ComponentPropsWithoutRef } from "react";
import { twMerge } from "tailwind-merge";

type BrowserFrameProps = ComponentPropsWithoutRef<"figure"> & {
  address: string;
};

export const BrowserFrame = ({
  address,
  children,
  className,
  ...props
}: BrowserFrameProps) => (
  <figure
    className={twMerge(
      "min-w-0 overflow-hidden rounded-3xl border-[1.5px] border-[#010000] bg-white text-[#010000]",
      className,
    )}
    {...props}
  >
    <figcaption className="flex min-h-11 items-center border-b-[1.5px] border-[#010000] px-4 py-2">
      <span className="min-w-0 rounded-full bg-[#d8e4d6] px-3 py-1.25 font-['Geist_Mono',monospace] text-[13px] wrap-break-word">
        {address}
      </span>
    </figcaption>
    {children}
  </figure>
);
