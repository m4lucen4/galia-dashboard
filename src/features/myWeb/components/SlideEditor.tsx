import React from "react";
import { HeaderSlideConfig } from "../../../types";
import { ImageUploader } from "./ImageUploader";
import { TrashIcon } from "@heroicons/react/24/outline";

// ─── Visual type previews ──────────────────────────────────────────────────────

const PreviewType1: React.FC = () => (
  <svg viewBox="0 0 120 70" className="w-full h-auto" fill="none">
    {/* Imagen de fondo */}
    <rect x="0" y="0" width="120" height="70" rx="2" fill="#E5E7EB" />
    <rect x="0" y="0" width="120" height="70" rx="2" fill="url(#grad1)" opacity="0.5" />
    <defs>
      <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#6B7280" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#111827" stopOpacity="0.7" />
      </linearGradient>
    </defs>
    {/* Contenido centrado */}
    <rect x="35" y="18" width="50" height="5" rx="1" fill="white" opacity="0.9" />
    <rect x="40" y="27" width="40" height="3" rx="1" fill="white" opacity="0.6" />
    <rect x="40" y="33" width="36" height="3" rx="1" fill="white" opacity="0.6" />
    {/* Botón centrado */}
    <rect x="42" y="42" width="36" height="10" rx="2" fill="white" opacity="0.85" />
    <rect x="48" y="45.5" width="24" height="3" rx="1" fill="#6B7280" />
  </svg>
);

const PreviewType2: React.FC = () => (
  <svg viewBox="0 0 120 70" className="w-full h-auto" fill="none">
    {/* Imagen de fondo */}
    <rect x="0" y="0" width="120" height="70" rx="2" fill="#E5E7EB" />
    <rect x="0" y="0" width="120" height="70" rx="2" fill="url(#grad2)" opacity="0.5" />
    <defs>
      <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#6B7280" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#111827" stopOpacity="0.7" />
      </linearGradient>
    </defs>
    {/* Contenido alineado a la izquierda */}
    <rect x="12" y="18" width="50" height="5" rx="1" fill="white" opacity="0.9" />
    <rect x="12" y="27" width="45" height="3" rx="1" fill="white" opacity="0.6" />
    <rect x="12" y="33" width="41" height="3" rx="1" fill="white" opacity="0.6" />
    {/* Botón alineado a la izquierda */}
    <rect x="12" y="42" width="36" height="10" rx="2" fill="white" opacity="0.85" />
    <rect x="18" y="45.5" width="24" height="3" rx="1" fill="#6B7280" />
  </svg>
);

const SLIDE_TYPE_OPTIONS: { value: 1 | 2; label: string; Preview: React.FC }[] = [
  { value: 1, label: "Contenido centrado", Preview: PreviewType1 },
  { value: 2, label: "Contenido a la izquierda", Preview: PreviewType2 },
];

interface SlideEditorProps {
  slide: HeaderSlideConfig;
  index: number;
  canDelete: boolean;
  onUpdate: (index: number, slide: HeaderSlideConfig) => void;
  onBlur: () => void;
  onDelete: (index: number) => void;
  onImageUpload: (index: number, file: File) => void;
  uploadingSlide?: number | null;
}

export const SlideEditor: React.FC<SlideEditorProps> = ({
  slide,
  index,
  canDelete,
  onUpdate,
  onBlur,
  onDelete,
  onImageUpload,
  uploadingSlide,
}) => {
  const handleChange = (
    field: keyof HeaderSlideConfig,
    value: string | number,
  ) => {
    onUpdate(index, { ...slide, [field]: value });
  };

  const inputClass =
    "mt-1 block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-gray-800 sm:text-sm/6";

  return (
    <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700">
          Slide {index + 1}
        </h4>
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(index)}
            className="text-red-500 hover:text-red-700 p-1"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-3">
        {/* ── Selector de tipo ── primero para que el usuario elija antes de rellenar */}
        <div className="grid grid-cols-2 gap-3">
          {SLIDE_TYPE_OPTIONS.map(({ value, label, Preview }) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                handleChange("type", value);
                setTimeout(onBlur, 0);
              }}
              className={`rounded-md border-2 p-2 text-center transition-colors focus:outline-none ${
                slide.type === value
                  ? "border-gray-900 bg-gray-50"
                  : "border-gray-200 bg-white hover:border-gray-400"
              }`}
            >
              <Preview />
              <span
                className={`mt-2 block text-xs font-medium ${
                  slide.type === value ? "text-gray-900" : "text-gray-500"
                }`}
              >
                {label}
              </span>
            </button>
          ))}
        </div>

        <ImageUploader
          label="Imagen de fondo"
          currentUrl={slide.image_url || undefined}
          onUpload={(file) => onImageUpload(index, file)}
          loading={uploadingSlide === index}
        />

        <div>
          <label className="text-sm text-black">Título</label>
          <input
            type="text"
            value={slide.title}
            onChange={(e) => handleChange("title", e.target.value)}
            onBlur={onBlur}
            className={inputClass}
            placeholder="Título del slide"
          />
        </div>

        <div>
          <label className="text-sm text-black">Descripción</label>
          <textarea
            value={slide.description}
            onChange={(e) => handleChange("description", e.target.value)}
            onBlur={onBlur}
            className={`${inputClass} min-h-[4em]`}
            placeholder="Descripción del slide"
            rows={3}
          />
        </div>

        {slide.type === 2 && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-black">Texto del botón</label>
              <input
                type="text"
                value={slide.text_button}
                onChange={(e) => handleChange("text_button", e.target.value)}
                onBlur={onBlur}
                className={inputClass}
                placeholder="Ver más"
              />
            </div>
            <div>
              <label className="text-sm text-black">URL del botón</label>
              <input
                type="text"
                value={slide.url_button}
                onChange={(e) => handleChange("url_button", e.target.value)}
                onBlur={onBlur}
                className={inputClass}
                placeholder="#seccion"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
