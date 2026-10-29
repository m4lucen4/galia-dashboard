import type { FC } from "react";
import type { BodyConfig } from "@/types";
import { myWebOptionClassName, myWebSelectedOptionClassName } from "@/features/myWeb/components/myWebStyles";

const PreviewType1: FC = () => (
  <svg viewBox="0 0 120 70" className="w-full h-auto" fill="none">
    <rect x="2" y="2" width="36" height="66" rx="2" fill="#D1D5DB" />
    <rect x="42" y="2" width="36" height="66" rx="2" fill="#D1D5DB" />
    <rect x="83" y="10" width="34" height="5" rx="1" fill="#9CA3AF" />
    <rect x="83" y="20" width="28" height="3" rx="1" fill="#D1D5DB" />
    <rect x="83" y="26" width="32" height="3" rx="1" fill="#D1D5DB" />
    <rect x="83" y="32" width="24" height="3" rx="1" fill="#D1D5DB" />
  </svg>
);

const PreviewType2: FC = () => (
  <svg viewBox="0 0 120 70" className="w-full h-auto" fill="none">
    <rect x="2" y="2" width="72" height="66" rx="2" fill="#D1D5DB" />
    <rect x="80" y="10" width="36" height="5" rx="1" fill="#9CA3AF" />
    <rect x="80" y="20" width="30" height="3" rx="1" fill="#D1D5DB" />
    <rect x="80" y="26" width="34" height="3" rx="1" fill="#D1D5DB" />
    <rect x="80" y="32" width="22" height="3" rx="1" fill="#D1D5DB" />
  </svg>
);

const PreviewType3: FC = () => (
  <svg viewBox="0 0 120 70" className="w-full h-auto" fill="none">
    <rect x="2" y="2" width="24" height="66" rx="2" fill="#D1D5DB" />
    <rect x="30" y="2" width="24" height="66" rx="2" fill="#D1D5DB" />
    <rect x="58" y="2" width="24" height="66" rx="2" fill="#D1D5DB" />
    <rect x="87" y="10" width="30" height="5" rx="1" fill="#9CA3AF" />
    <rect x="87" y="20" width="26" height="3" rx="1" fill="#D1D5DB" />
    <rect x="87" y="26" width="28" height="3" rx="1" fill="#D1D5DB" />
    <rect x="87" y="32" width="20" height="3" rx="1" fill="#D1D5DB" />
  </svg>
);

const PreviewType4: FC = () => (
  <svg viewBox="0 0 120 70" className="w-full h-auto" fill="none">
    <rect x="2" y="2" width="27" height="66" rx="2" fill="#D1D5DB" />
    <rect x="33" y="2" width="27" height="66" rx="2" fill="#D1D5DB" />
    <rect x="64" y="2" width="54" height="66" rx="2" fill="#9CA3AF" />
  </svg>
);

const PreviewType5: FC = () => (
  <svg viewBox="0 0 120 70" className="w-full h-auto" fill="none">
    <rect x="2" y="2" width="36" height="66" rx="2" fill="#D1D5DB" />
    <rect x="42" y="2" width="36" height="66" rx="2" fill="#D1D5DB" />
    <rect x="82" y="2" width="36" height="66" rx="2" fill="#D1D5DB" />
  </svg>
);

const TYPE_OPTIONS = [
  { value: 1, label: "Foto · Foto · Texto", Preview: PreviewType1 },
  { value: 2, label: "Foto grande · Texto", Preview: PreviewType2 },
  { value: 3, label: "3 fotos · Texto", Preview: PreviewType3 },
  { value: 4, label: "Foto · Foto · Foto grande (3 col.)", Preview: PreviewType4 },
  { value: 5, label: "3 fotos iguales (sin texto)", Preview: PreviewType5 },
] as const;

export function BodyLayoutSelector({ value, onChange }: {
  value: BodyConfig["type"];
  onChange: (value: BodyConfig["type"]) => void;
}) {
  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="text-sm font-medium">Distribución de imágenes y texto</legend>
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
