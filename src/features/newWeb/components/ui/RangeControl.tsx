import type { ComponentPropsWithoutRef } from "react";
import { twMerge } from "tailwind-merge";

export type RangeControlProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "type" | "id" | "value" | "defaultValue" | "min" | "max" | "step" | "onChange"
> & {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onValueChange: (value: number) => void;
};

export const RangeControl = ({
  id, label, value, min, max, step, unit, onValueChange, className, ...props
}: RangeControlProps) => {
  const displayValue = `${value.toLocaleString("es-ES")} ${unit}`;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 text-[15px]">
        <label htmlFor={id}>{label}</label>
        <output id={`${id}-output`} htmlFor={id} className="font-['Geist_Mono',monospace]">
          {displayValue}
        </output>
      </div>
      <input
        {...props}
        id={id}
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        aria-valuetext={displayValue}
        className={twMerge(
          "m-0 h-6 w-full cursor-pointer accent-[#010000] focus-visible:outline-[3px] focus-visible:outline-solid focus-visible:outline-[#010000] focus-visible:outline-offset-4",
          className,
        )}
        onChange={(event) => {
          const nextValue = event.currentTarget.valueAsNumber;
          if (Number.isFinite(nextValue)) onValueChange(nextValue);
        }}
      />
    </div>
  );
};
