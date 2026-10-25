import type { ComponentPropsWithoutRef } from "react";
import { twMerge } from "tailwind-merge";

type AccordionItemProps = Omit<ComponentPropsWithoutRef<"details">, "children"> & {
  question: string;
  answer: string;
};

export const AccordionItem = ({
  question,
  answer,
  className,
  ...props
}: AccordionItemProps) => (
  <details
    className={twMerge(
      "group rounded-[999px] border-[1.5px] border-[#010000] text-[#010000] open:rounded-[28px] open:bg-[#010000] open:text-[#d8e4d6]",
      className,
    )}
    {...props}
  >
    <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-[inherit] px-5 py-4.5 text-[19px] leading-[1.4] whitespace-pre-line group-open:pt-5.5 group-open:pb-2 group-open:text-xl group-open:font-medium focus-visible:outline-[3px] focus-visible:outline-solid focus-visible:outline-offset-4 focus-visible:outline-[#010000] group-open:focus-visible:outline-[#fbea71]! sm:px-7 [&::-webkit-details-marker]:hidden">
      <span>{question}</span>
      <span aria-hidden="true" className="shrink-0 font-['Geist_Mono',monospace]">
        <span className="group-open:hidden">+</span>
        <span className="hidden group-open:inline">–</span>
      </span>
    </summary>
    <p className="px-5 pb-5.5 text-base leading-normal whitespace-pre-line sm:px-7">
      {answer}
    </p>
  </details>
);
