import type { BillingPeriod } from "@/types";
import { Pill } from "@/features/newWeb/components/ui/Pill";

export type BillingToggleProps = {
  value: BillingPeriod;
  onChange: (period: BillingPeriod) => void;
};

const periods = [
  { value: "monthly", label: "Mensual" },
  { value: "annual", label: "Anual −20%" },
] as const;

export const BillingToggle = ({ value, onChange }: BillingToggleProps) => (
  <div
    role="group"
    aria-label="Periodo de facturación"
    className="flex w-fit max-w-full shrink-0 rounded-full border-[1.5px] border-[#d8e4d6] p-1"
  >
    {periods.map((period) => (
      <button
        key={period.value}
        type="button"
        aria-pressed={value === period.value}
        onClick={() => onChange(period.value)}
        className="min-h-11 cursor-pointer rounded-full font-['Geist_Mono',monospace] text-sm focus-visible:outline-[3px] focus-visible:outline-solid focus-visible:outline-[#fbea71]! focus-visible:outline-offset-4"
      >
        <Pill className={value === period.value
          ? "bg-[#d8e4d6] px-4 py-2.5 text-[#010000]"
          : "bg-transparent px-4 py-2.5 text-[#d8e4d6]"}
        >{period.label}</Pill>
      </button>
    ))}
  </div>
);
