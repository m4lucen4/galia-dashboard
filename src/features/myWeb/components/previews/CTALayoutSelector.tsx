import type { FC } from "react";
import type { CTAConfig } from "@/types";
import { myWebOptionClassName, myWebSelectedOptionClassName } from "@/features/myWeb/components/myWebStyles";

const PreviewSplit: FC = () => (
  <svg viewBox="0 0 120 70" className="w-full h-auto" fill="none">
    <rect x="0" y="0" width="58" height="70" fill="#D1D5DB" />
    <rect x="65" y="13" width="24" height="3" rx="1" fill="#D1D5DB" />
    <rect x="65" y="20" width="46" height="6" rx="1" fill="#6B7280" />
    <rect x="65" y="30" width="40" height="3" rx="1" fill="#D1D5DB" />
    <rect x="65" y="36" width="32" height="3" rx="1" fill="#D1D5DB" />
    <rect x="65" y="46" width="22" height="8" rx="2" fill="#374151" />
    <rect x="91" y="46" width="22" height="8" rx="2" fill="#E5E7EB" />
  </svg>
);

const PreviewCentered: FC = () => (
  <svg viewBox="0 0 120 70" className="w-full h-auto" fill="none">
    <rect x="0" y="0" width="120" height="70" fill="#F9FAFB" />
    <rect x="40" y="8" width="40" height="3" rx="1" fill="#D1D5DB" />
    <rect x="22" y="15" width="76" height="7" rx="1" fill="#6B7280" />
    <rect x="18" y="27" width="84" height="3" rx="1" fill="#D1D5DB" />
    <rect x="28" y="33" width="64" height="3" rx="1" fill="#D1D5DB" />
    <rect x="22" y="44" width="32" height="9" rx="2" fill="#374151" />
    <rect x="58" y="44" width="32" height="9" rx="2" fill="#E5E7EB" />
  </svg>
);

const PreviewMinimalist: FC = () => (
  <svg viewBox="0 0 120 70" className="w-full h-auto" fill="none">
    <rect x="0" y="0" width="120" height="70" fill="#F9FAFB" />
    <rect x="10" y="10" width="82" height="10" rx="1" fill="#6B7280" />
    <rect x="10" y="24" width="62" height="10" rx="1" fill="#6B7280" />
    <rect x="10" y="47" width="30" height="9" rx="2" fill="#374151" />
    <rect x="44" y="47" width="30" height="9" rx="2" fill="#E5E7EB" />
  </svg>
);

const TYPE_OPTIONS = [
  { value: 1, label: "Centrado", Preview: PreviewCentered },
  { value: 2, label: "Split color", Preview: PreviewSplit },
  { value: 3, label: "Alineado a la izquierda", Preview: PreviewMinimalist },
] as const;

export function CTALayoutSelector({ value, onChange }: {
  value: CTAConfig["type"];
  onChange: (value: CTAConfig["type"]) => void;
}) {
  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="text-sm font-medium">Diseño de la llamada a la acción</legend>
      <div className="grid grid-cols-1 gap-3 @min-[28rem]:grid-cols-3">
        {TYPE_OPTIONS.map(({ value: option, label, Preview }) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={`${myWebOptionClassName} ${value === option ? myWebSelectedOptionClassName : ""}`}
          >
            <span aria-hidden="true"><Preview /></span>
            <span className="mt-2 block text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
