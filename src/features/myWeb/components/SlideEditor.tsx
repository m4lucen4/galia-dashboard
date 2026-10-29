import React from "react";
import { HeaderSlideConfig } from "@/types";
import { ImageUploader } from "@/features/myWeb/components/ImageUploader";
import { TrashIcon } from "@heroicons/react/24/outline";
import { RichTextInput } from "@/features/myWeb/components/RichTextInput";
import { IconPicker } from "@/features/myWeb/components/IconPicker";
import { PillButton } from "@/components/shared/ui/PillButton";
import { LayoutChoice } from "@/features/myWeb/components/previews/LayoutChoice";
import {
  myWebChoiceGridClassName,
  myWebControlClassName,
  myWebFieldGridClassName,
  myWebGroupClassName,
  myWebIconButtonClassName,
  myWebOptionClassName,
  myWebSelectedOptionClassName,
} from "@/features/myWeb/components/myWebStyles";

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
    value: string | number | boolean,
  ) => {
    onUpdate(index, { ...slide, [field]: value });
  };

  const inputClass = myWebControlClassName;

  return (
    <section className={`${myWebGroupClassName} border-t border-[#010000]/15 pt-5`}>
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-medium text-gray-700">
          Diapositiva {index + 1}
        </h4>
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(index)}
            aria-label={`Eliminar diapositiva ${index + 1}`}
            className={myWebIconButtonClassName}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className={myWebGroupClassName}>
        <p className="text-sm font-medium">Distribución</p>
        <div className={myWebChoiceGridClassName}>
          {SLIDE_TYPE_OPTIONS.map(({ value, label, Preview }) => (
            <LayoutChoice
              key={value}
              label={label}
              preview={<Preview />}
              selected={slide.type === value}
              onSelect={() => {
                handleChange("type", value);
                setTimeout(onBlur, 0);
              }}
            />
          ))}
        </div>
      </div>

      <div className={myWebFieldGridClassName}>
        <div className={myWebGroupClassName}>
          <h5 className="text-sm font-medium">Imagen y logo</h5>
          <div>
            <p className="text-sm font-medium">Fondo</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  handleChange("background_type", "image");
                  setTimeout(onBlur, 0);
                }}
                aria-pressed={(slide.background_type ?? "image") === "image"}
                className={`min-h-11 flex-1 ${myWebOptionClassName} ${(slide.background_type ?? "image") === "image" ? myWebSelectedOptionClassName : ""}`}
              >
                Imagen
              </button>
              <button
                type="button"
                onClick={() => {
                  handleChange("background_type", "vimeo");
                  setTimeout(onBlur, 0);
                }}
                aria-pressed={slide.background_type === "vimeo"}
                className={`min-h-11 flex-1 ${myWebOptionClassName} ${slide.background_type === "vimeo" ? myWebSelectedOptionClassName : ""}`}
              >
                Vídeo Vimeo
              </button>
            </div>
          </div>

          {(slide.background_type ?? "image") === "image" ? (
            <ImageUploader
              label="Imagen de fondo"
              currentUrl={slide.image_url || undefined}
              onUpload={(file) => onImageUpload(index, file)}
              onRemove={() => onUpdate(index, { ...slide, image_url: "" })}
              loading={uploadingSlide === index}
            />
          ) : (
            <label className="block space-y-2 text-sm font-medium">
              <span>URL de Vimeo</span>
              <input
                type="text"
                value={slide.vimeo_url ?? ""}
                onChange={(e) => handleChange("vimeo_url", e.target.value)}
                onBlur={onBlur}
                className={inputClass}
                placeholder="https://vimeo.com/123456789"
              />
            </label>
          )}

          <div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-black">Mostrar logo</p>
                <p className="mt-0.5 text-sm leading-relaxed text-[#010000]/65">
                  Muestra el logo de la web encima del título en esta diapositiva
                </p>
              </div>
              <PillButton
                variant="outline"
                role="switch"
                aria-label={`Mostrar logo en la diapositiva ${index + 1}`}
                aria-checked={slide.show_logo ?? false}
                onClick={() => {
                  handleChange("show_logo", !(slide.show_logo ?? false));
                  setTimeout(onBlur, 0);
                }}
              >
                {slide.show_logo ? "Sí" : "No"}
              </PillButton>
            </div>

            {slide.show_logo && (
              <div className="mt-3">
                <label className="text-sm text-black">
                  Posición vertical del logo y el título
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleChange("logo_title_align", "bottom");
                      setTimeout(onBlur, 0);
                    }}
                    aria-pressed={(slide.logo_title_align ?? "bottom") === "bottom"}
                    className={`min-h-11 flex-1 ${myWebOptionClassName} ${(slide.logo_title_align ?? "bottom") === "bottom" ? myWebSelectedOptionClassName : ""}`}
                  >
                    Abajo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleChange("logo_title_align", "center");
                      setTimeout(onBlur, 0);
                    }}
                    aria-pressed={slide.logo_title_align === "center"}
                    className={`min-h-11 flex-1 ${myWebOptionClassName} ${slide.logo_title_align === "center" ? myWebSelectedOptionClassName : ""}`}
                  >
                    Centrado
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={`@container ${myWebGroupClassName}`}>
          <h5 className="text-sm font-medium">Texto y acción</h5>
          <label className="block space-y-2 text-sm font-medium">
            <span>Título</span>
            <input
              type="text"
              value={slide.title}
              onChange={(e) => handleChange("title", e.target.value)}
              onBlur={onBlur}
              className={inputClass}
              placeholder="Título de la diapositiva"
            />
          </label>

          <RichTextInput
            label="Descripción"
            value={slide.description}
            onChange={(html) => handleChange("description", html)}
            onBlur={onBlur}
            placeholder="Descripción de la diapositiva"
          />

          <div className={myWebFieldGridClassName}>
            <label className="block space-y-2 text-sm font-medium">
              <span>Texto del botón</span>
              <input
                type="text"
                value={slide.text_button}
                onChange={(e) => handleChange("text_button", e.target.value)}
                onBlur={onBlur}
                className={inputClass}
                placeholder="Ver más"
              />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              <span>URL del botón</span>
              <input
                type="text"
                value={slide.url_button}
                onChange={(e) => handleChange("url_button", e.target.value)}
                onBlur={onBlur}
                className={inputClass}
                placeholder="#seccion"
              />
            </label>
          </div>

          <IconPicker
            value={slide.icon_button}
            onChange={(name) => {
              handleChange("icon_button", name);
              setTimeout(onBlur, 0);
            }}
          />
        </div>
      </div>
    </section>
  );
};
