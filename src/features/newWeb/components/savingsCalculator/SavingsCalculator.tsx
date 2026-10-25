import { useId, useState } from "react";
import { formatMoney } from "@/helpers/subscriptionPricing";
import { Pill } from "@/features/newWeb/components/ui/Pill";
import { RangeControl } from "@/features/newWeb/components/ui/RangeControl";
import {
  calculateSavings,
  DEFAULT_SAVINGS_INPUTS,
  REVIEW_MINUTES_PER_POST,
  SAVINGS_RANGES,
  type SavingsInputs,
} from "./savingsCalculator.ts";

export interface SavingsCalculatorViewProps {
  idPrefix: string;
  value: SavingsInputs;
  onChange: (value: SavingsInputs) => void;
}

const formatHours = (hours: number) => hours.toLocaleString("es-ES", { maximumFractionDigits: 2 });

export const SavingsCalculatorView = ({ idPrefix, value, onChange }: SavingsCalculatorViewProps) => {
  const { savedHours, monetaryCents, baselineHours } = calculateSavings(value);
  const controls = [
    { key: "postsPerMonth", label: "Posts al mes", unit: "posts/mes" },
    { key: "minutesPerPost", label: "Tiempo medio dedicado al post", unit: "min/post" },
    { key: "hourlyRateEuros", label: "Tu hora", unit: "€/h" },
  ] as const;

  return (
    <section
      aria-labelledby={`${idPrefix}-title`}
      className="grid min-w-0 grid-cols-1 items-center gap-10 rounded-4xl bg-[#d8e4d6] px-6 py-8 text-[#010000] md:grid-cols-2 md:px-10"
    >
      <div className="flex min-w-0 flex-col gap-4">
        <h3 id={`${idPrefix}-title`} className="self-start text-sm">
          <Pill className="border-[1.5px] border-[#010000] bg-[#d8e4d6] px-3.5 py-1.5 font-['Geist_Mono',monospace] text-[#010000]">
            Tiempo que recuperas
          </Pill>
        </h3>
        {controls.map(({ key, label, unit }) => (
          <RangeControl
            key={key}
            id={`${idPrefix}-${key}`}
            label={label}
            unit={unit}
            value={value[key]}
            {...SAVINGS_RANGES[key]}
            onValueChange={(nextValue) => onChange({ ...value, [key]: nextValue })}
          />
        ))}
      </div>
      <div className="flex min-w-0 flex-col items-start gap-1.5 md:items-end md:text-right">
        <output
          htmlFor={controls.map(({ key }) => `${idPrefix}-${key}`).join(" ")}
          aria-live="polite"
          aria-atomic="true"
          className="flex max-w-full flex-wrap items-baseline justify-start gap-x-[0.2em] font-['Geist_Mono',monospace] text-[clamp(4rem,9.0278vw,8.125rem)] leading-[0.9] tracking-[-0.07em] md:justify-end"
        >
          <span className="min-w-0 wrap-anywhere">{formatHours(savedHours)}</span>
          <span>h</span>
          <span className="sr-only"> al mes · {formatMoney(monetaryCents)} de tu tiempo</span>
        </output>
        <p className="text-lg">al mes · ≈{formatMoney(monetaryCents)} de tu tiempo</p>
        <p className="text-sm leading-[1.4]">
          {value.postsPerMonth} posts × {value.minutesPerPost} min son {formatHours(baselineHours)} h al mes.
          {" "}Con mocklab estimamos {REVIEW_MINUTES_PER_POST} min de revisión por post.
          {" "}Es una estimación del valor de tu tiempo, no un descuento ni ingresos garantizados.
        </p>
      </div>
    </section>
  );
};

export const SavingsCalculator = () => {
  const idPrefix = useId();
  const [value, setValue] = useState<SavingsInputs>(DEFAULT_SAVINGS_INPUTS);
  return <SavingsCalculatorView idPrefix={idPrefix} value={value} onChange={setValue} />;
};
