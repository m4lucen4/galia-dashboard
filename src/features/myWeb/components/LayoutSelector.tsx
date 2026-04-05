import React from "react";
import { ProjectListLayout } from "../../../types";

interface LayoutOption {
  value: ProjectListLayout;
  label: string;
  description: string;
  preview: React.ReactNode;
}

const Grid4Preview: React.FC = () => (
  <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
    {[0, 1, 2, 3].map((col) => (
      <rect
        key={col}
        x={col * 20 + 1}
        y={1}
        width={18}
        height={58}
        rx={2}
        fill="currentColor"
        opacity={0.15}
        stroke="currentColor"
        strokeWidth={1}
        strokeOpacity={0.4}
      />
    ))}
    {[0, 1, 2, 3].map((col) =>
      [0, 1].map((row) => (
        <rect
          key={`${col}-${row}`}
          x={col * 20 + 3}
          y={row * 30 + 3}
          width={14}
          height={24}
          rx={1.5}
          fill="currentColor"
          opacity={0.25}
        />
      )),
    )}
  </svg>
);

const GridAlternatingPreview: React.FC = () => (
  <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
    {/* Row 1: 1/4 + 1/4 + 1/2 */}
    <rect x={1} y={1} width={18} height={27} rx={2} fill="currentColor" opacity={0.15} stroke="currentColor" strokeWidth={1} strokeOpacity={0.4} />
    <rect x={21} y={1} width={18} height={27} rx={2} fill="currentColor" opacity={0.15} stroke="currentColor" strokeWidth={1} strokeOpacity={0.4} />
    <rect x={41} y={1} width={38} height={27} rx={2} fill="currentColor" opacity={0.25} stroke="currentColor" strokeWidth={1} strokeOpacity={0.4} />
    {/* Row 2: 1/2 + 1/4 + 1/4 */}
    <rect x={1} y={31} width={38} height={27} rx={2} fill="currentColor" opacity={0.25} stroke="currentColor" strokeWidth={1} strokeOpacity={0.4} />
    <rect x={41} y={31} width={18} height={27} rx={2} fill="currentColor" opacity={0.15} stroke="currentColor" strokeWidth={1} strokeOpacity={0.4} />
    <rect x={61} y={31} width={18} height={27} rx={2} fill="currentColor" opacity={0.15} stroke="currentColor" strokeWidth={1} strokeOpacity={0.4} />
  </svg>
);

const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    value: "grid-4",
    label: "Rejilla uniforme",
    description: "Todos los proyectos en una cuadrícula uniforme de 4 columnas",
    preview: <Grid4Preview />,
  },
  {
    value: "grid-alternating",
    label: "Rejilla alternada",
    description: "Patrón alternado: filas de ¼+¼+½ y ½+¼+¼",
    preview: <GridAlternatingPreview />,
  },
];

interface LayoutSelectorProps {
  value: ProjectListLayout;
  onChange: (layout: ProjectListLayout) => void;
  disabled?: boolean;
}

export const LayoutSelector: React.FC<LayoutSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {LAYOUT_OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => !disabled && onChange(option.value)}
            disabled={disabled}
            className={`flex flex-col gap-2 rounded-md border-2 p-3 text-left transition-colors disabled:opacity-50 ${
              selected
                ? "border-black bg-gray-50 text-black"
                : "border-gray-200 bg-white text-gray-500 hover:border-gray-400"
            }`}
          >
            <div className="h-16 w-full text-gray-600">
              {option.preview}
            </div>
            <div>
              <p className="text-sm font-medium leading-tight">
                {option.label}
              </p>
              <p className="mt-0.5 text-xs text-gray-400 leading-tight">
                {option.description}
              </p>
            </div>
            {selected && (
              <span className="self-end text-xs font-medium text-black">
                ✓ Seleccionado
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
