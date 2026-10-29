import type { FC } from "react";
import type { ContentConfig } from "@/types";
import { myWebOptionClassName, myWebSelectedOptionClassName } from "@/features/myWeb/components/myWebStyles";

const PreviewType1: FC = () => (
  <svg viewBox="0 0 120 80" className="w-full h-auto" fill="none">
    <rect x="10" y="6" width="30" height="3" rx="1" fill="#D1D5DB" />
    <rect x="10" y="13" width="70" height="6" rx="1" fill="#6B7280" />
    <line x1="10" y1="25" x2="110" y2="25" stroke="#E5E7EB" strokeWidth="1" />
    <rect x="10" y="30" width="45" height="3" rx="1" fill="#D1D5DB" />
    <rect x="10" y="36" width="40" height="3" rx="1" fill="#D1D5DB" />
    <rect x="10" y="42" width="43" height="3" rx="1" fill="#D1D5DB" />
    <rect x="10" y="48" width="35" height="3" rx="1" fill="#D1D5DB" />
    <rect x="65" y="30" width="18" height="7" rx="1" fill="#9CA3AF" />
    <rect x="87" y="30" width="18" height="7" rx="1" fill="#9CA3AF" />
    <rect x="65" y="41" width="18" height="7" rx="1" fill="#9CA3AF" />
    <rect x="87" y="41" width="18" height="7" rx="1" fill="#9CA3AF" />
    <rect x="65" y="50" width="18" height="2" rx="1" fill="#D1D5DB" />
    <rect x="87" y="50" width="18" height="2" rx="1" fill="#D1D5DB" />
    <rect x="65" y="61" width="18" height="2" rx="1" fill="#D1D5DB" />
    <rect x="87" y="61" width="18" height="2" rx="1" fill="#D1D5DB" />
  </svg>
);

const PreviewType2: FC = () => (
  <svg viewBox="0 0 120 80" className="w-full h-auto" fill="none">
    <rect x="4" y="4" width="48" height="72" rx="2" fill="#D1D5DB" />
    <rect x="60" y="8" width="22" height="3" rx="1" fill="#D1D5DB" />
    <rect x="60" y="15" width="50" height="6" rx="1" fill="#6B7280" />
    <rect x="60" y="26" width="52" height="3" rx="1" fill="#D1D5DB" />
    <rect x="60" y="32" width="46" height="3" rx="1" fill="#D1D5DB" />
    <rect x="60" y="38" width="50" height="3" rx="1" fill="#D1D5DB" />
    <rect x="60" y="48" width="22" height="7" rx="1" fill="#9CA3AF" />
    <rect x="86" y="48" width="22" height="7" rx="1" fill="#9CA3AF" />
    <rect x="60" y="59" width="22" height="7" rx="1" fill="#9CA3AF" />
    <rect x="86" y="59" width="22" height="7" rx="1" fill="#9CA3AF" />
  </svg>
);

const TYPE_OPTIONS = [
  { value: 1, label: "Título + dos columnas", Preview: PreviewType1 },
  { value: 2, label: "Foto + contenido", Preview: PreviewType2 },
] as const;

export function ContentLayoutSelector({ value, onChange }: {
  value: ContentConfig["type"];
  onChange: (value: ContentConfig["type"]) => void;
}) {
  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="text-sm font-medium">Distribución del contenido</legend>
      <div className="grid grid-cols-1 gap-3 @min-[24rem]:grid-cols-2">
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
