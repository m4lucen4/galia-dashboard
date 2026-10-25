import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

type InfoRowProps = ComponentPropsWithoutRef<"article"> & {
  title: string;
  description: string;
  trailing: ReactNode;
};

export const InfoRow = ({
  title,
  description,
  trailing,
  className,
  ...props
}: InfoRowProps) => (
  <article
    className={twMerge(
      "flex min-w-0 flex-col items-start justify-between gap-6 rounded-4xl border-[1.5px] border-[#010000] p-4 sm:flex-row sm:items-center sm:rounded-[999px] sm:pl-8",
      className,
    )}
    {...props}
  >
    <div className="flex min-w-0 flex-col gap-0.5 wrap-break-word">
      <h3 className="text-[22px] leading-[1.2] font-medium">{title}</h3>
      <p className="text-[15px] leading-normal">{description}</p>
    </div>
    {trailing}
  </article>
);
