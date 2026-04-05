import React from "react";
import { HeaderSlideConfig } from "../../../types";
import { ImageUploader } from "./ImageUploader";
import { TrashIcon } from "@heroicons/react/24/outline";

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

        <div>
          <label className="text-sm text-black">Tipo de diseño</label>
          <select
            value={slide.type}
            onChange={(e) => {
              handleChange("type", Number(e.target.value));
              // Select changes are immediate, persist right away
              setTimeout(onBlur, 0);
            }}
            className={inputClass}
          >
            <option value={1}>Tipo 1</option>
            <option value={2}>Tipo 2</option>
          </select>
        </div>

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
      </div>
    </div>
  );
};
