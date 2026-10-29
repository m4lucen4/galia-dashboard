import React from "react";
import { myWebLabelClassName, myWebOptionClassName, myWebSelectedOptionClassName } from "@/features/myWeb/components/myWebStyles";

interface NavbarOption {
  value: number;
  label: string;
  preview: React.ReactNode;
}

const NavType1Preview: React.FC = () => (
  <svg viewBox="0 0 80 24" className="w-full h-full" fill="none">
    {/* Bar background */}
    <rect x={0} y={0} width={80} height={24} rx={3} fill="currentColor" opacity={0.08} />
    {/* Left: Menu links */}
    <rect x={4} y={9} width={8} height={2} rx={1} fill="currentColor" opacity={0.4} />
    <rect x={14} y={9} width={8} height={2} rx={1} fill="currentColor" opacity={0.4} />
    <rect x={24} y={9} width={8} height={2} rx={1} fill="currentColor" opacity={0.4} />
    {/* Center: Logo */}
    <rect x={34} y={7} width={12} height={10} rx={2} fill="currentColor" opacity={0.6} />
    {/* Right: Social icons */}
    <circle cx={58} cy={12} r={3} fill="currentColor" opacity={0.35} />
    <circle cx={65} cy={12} r={3} fill="currentColor" opacity={0.35} />
    <circle cx={72} cy={12} r={3} fill="currentColor" opacity={0.35} />
  </svg>
);

const NavType2Preview: React.FC = () => (
  <svg viewBox="0 0 80 24" className="w-full h-full" fill="none">
    {/* Bar background */}
    <rect x={0} y={0} width={80} height={24} rx={3} fill="currentColor" opacity={0.08} />
    {/* Left: Logo */}
    <rect x={4} y={7} width={12} height={10} rx={2} fill="currentColor" opacity={0.6} />
    {/* Center: Menu links */}
    <rect x={24} y={9} width={8} height={2} rx={1} fill="currentColor" opacity={0.4} />
    <rect x={34} y={9} width={8} height={2} rx={1} fill="currentColor" opacity={0.4} />
    <rect x={44} y={9} width={8} height={2} rx={1} fill="currentColor" opacity={0.4} />
    {/* Right: Social icons */}
    <circle cx={58} cy={12} r={3} fill="currentColor" opacity={0.35} />
    <circle cx={65} cy={12} r={3} fill="currentColor" opacity={0.35} />
    <circle cx={72} cy={12} r={3} fill="currentColor" opacity={0.35} />
  </svg>
);

const NAVBAR_OPTIONS: NavbarOption[] = [
  {
    value: 1,
    label: "Menú · Logo · Redes",
    preview: <NavType1Preview />,
  },
  {
    value: 2,
    label: "Logo · Menú · Redes",
    preview: <NavType2Preview />,
  },
];

interface NavbarTypeSelectorProps {
  value: number;
  onChange: (type: number) => void;
}

export const NavbarTypeSelector: React.FC<NavbarTypeSelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className={myWebLabelClassName}>Tipo de navegación</legend>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        {NAVBAR_OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={selected}
              className={`${myWebOptionClassName} flex min-h-11 flex-col gap-2 ${selected ? myWebSelectedOptionClassName : ""}`}
            >
              <div className="h-8 w-full text-gray-600">
                {option.preview}
              </div>
              <p className="text-xs font-medium leading-tight">{option.label}</p>
              {selected && (
                <span className="text-xs font-medium text-black">✓ Seleccionado</span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
};
