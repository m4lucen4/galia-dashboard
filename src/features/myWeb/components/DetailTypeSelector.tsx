import React from "react";

type DetailType = 1 | 2;

// Tipo 1: imagen cabecera → título → descripción → galería grid
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

// Tipo 2: título → imagen cabecera → alternancia texto/imagen
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
    <div className="grid grid-cols-2 gap-3">
      {OPTIONS.map((option) => {
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
              <p className="text-sm font-medium leading-tight">{option.label}</p>
              <p className="mt-0.5 text-xs text-gray-400 leading-tight">{option.description}</p>
            </div>
            {selected && (
              <span className="self-end text-xs font-medium text-black">✓ Seleccionado</span>
            )}
          </button>
        );
      })}
    </div>
  );
};
