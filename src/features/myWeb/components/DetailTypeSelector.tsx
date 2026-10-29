import React from "react";
import { LayoutChoice } from "@/features/myWeb/components/previews/LayoutChoice";

type DetailType = 1 | 2;

// Type 1: header image, title, description and gallery grid.
const DetailType1Preview: React.FC = () => (
  <svg viewBox="0 0 80 72" className="w-full h-full" fill="none">
    {/* Header image */}
    <rect x={1} y={1} width={78} height={20} rx={2} fill="currentColor" opacity={0.25} stroke="currentColor" strokeWidth={1} strokeOpacity={0.4} />
    {/* Title */}
    <rect x={1} y={25} width={40} height={4} rx={1} fill="currentColor" opacity={0.5} />
    {/* Description lines */}
    <rect x={1} y={33} width={78} height={2.5} rx={1} fill="currentColor" opacity={0.2} />
    <rect x={1} y={37} width={65} height={2.5} rx={1} fill="currentColor" opacity={0.2} />
    <rect x={1} y={41} width={72} height={2.5} rx={1} fill="currentColor" opacity={0.2} />
    {/* Gallery grid: 4 images */}
    <rect x={1}  y={48} width={18} height={22} rx={1.5} fill="currentColor" opacity={0.2} stroke="currentColor" strokeWidth={0.8} strokeOpacity={0.3} />
    <rect x={21} y={48} width={18} height={22} rx={1.5} fill="currentColor" opacity={0.2} stroke="currentColor" strokeWidth={0.8} strokeOpacity={0.3} />
    <rect x={41} y={48} width={18} height={22} rx={1.5} fill="currentColor" opacity={0.2} stroke="currentColor" strokeWidth={0.8} strokeOpacity={0.3} />
    <rect x={61} y={48} width={18} height={22} rx={1.5} fill="currentColor" opacity={0.2} stroke="currentColor" strokeWidth={0.8} strokeOpacity={0.3} />
  </svg>
);

// Type 2: title, header image and alternating text/image rows.
const DetailType2Preview: React.FC = () => (
  <svg viewBox="0 0 80 72" className="w-full h-full" fill="none">
    {/* Title */}
    <rect x={1} y={1} width={40} height={4} rx={1} fill="currentColor" opacity={0.5} />
    {/* Header image */}
    <rect x={1} y={9} width={78} height={18} rx={2} fill="currentColor" opacity={0.25} stroke="currentColor" strokeWidth={1} strokeOpacity={0.4} />
    {/* Row 1: text left, image right */}
    <rect x={1}  y={31} width={36} height={2.5} rx={1} fill="currentColor" opacity={0.2} />
    <rect x={1}  y={35} width={30} height={2.5} rx={1} fill="currentColor" opacity={0.2} />
    <rect x={1}  y={39} width={33} height={2.5} rx={1} fill="currentColor" opacity={0.2} />
    <rect x={42} y={31} width={37} height={13} rx={1.5} fill="currentColor" opacity={0.2} stroke="currentColor" strokeWidth={0.8} strokeOpacity={0.3} />
    {/* Row 2: image left, text right */}
    <rect x={1}  y={49} width={37} height={21} rx={1.5} fill="currentColor" opacity={0.2} stroke="currentColor" strokeWidth={0.8} strokeOpacity={0.3} />
    <rect x={42} y={49} width={36} height={2.5} rx={1} fill="currentColor" opacity={0.2} />
    <rect x={42} y={53} width={30} height={2.5} rx={1} fill="currentColor" opacity={0.2} />
    <rect x={42} y={57} width={33} height={2.5} rx={1} fill="currentColor" opacity={0.2} />
  </svg>
);

interface DetailTypeOption {
  value: DetailType;
  label: string;
  description: string;
  preview: React.ReactNode;
}

const OPTIONS: DetailTypeOption[] = [
  {
    value: 1,
    label: "Galería",
    description: "Cabecera · título · descripción · galería en grid",
    preview: <DetailType1Preview />,
  },
  {
    value: 2,
    label: "Editorial",
    description: "Título · cabecera · alternancia texto e imágenes",
    preview: <DetailType2Preview />,
  },
];

interface DetailTypeSelectorProps {
  value: DetailType;
  onChange: (type: DetailType) => void;
  disabled?: boolean;
}

export const DetailTypeSelector: React.FC<DetailTypeSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="min-w-0 space-y-2">
      {OPTIONS.map((option) => (
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
