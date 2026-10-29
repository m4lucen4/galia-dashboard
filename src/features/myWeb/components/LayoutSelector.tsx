import React from "react";
import { ProjectListLayout } from "@/types";
import { LayoutChoice } from "@/features/myWeb/components/previews/LayoutChoice";

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
    <div className="min-w-0 space-y-2">
      {LAYOUT_OPTIONS.map((option) => (
        <LayoutChoice
          key={option.value}
          label={option.label}
          description={option.description}
          preview={option.preview}
          selected={value === option.value}
          disabled={disabled}
          onSelect={() => !disabled && onChange(option.value)}
        />
      ))}
    </div>
  );
};
