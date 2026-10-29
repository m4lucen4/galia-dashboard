import React, { useState, useEffect } from "react";
import { SiteComponentDataProps, FigureConfig } from "@/types";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  updateSiteComponent,
  uploadFigureImage,
} from "@/redux/actions/SiteComponentActions";
import { ImageUploader } from "@/features/myWeb/components/ImageUploader";
import { PillButton } from "@/components/shared/ui/PillButton";
import { InputField } from "@/components/shared/ui/InputField";
import { myWebEditorClassName, myWebGroupClassName, myWebFieldGridClassName, myWebOptionClassName, myWebSelectedOptionClassName, myWebLegacyControlsClassName } from "@/features/myWeb/components/myWebStyles";

interface FigureEditorProps {
  component: SiteComponentDataProps;
}

const defaultFigureConfig: FigureConfig = {
  image_url: "",
  caption: "",
  size: "full",
  link_url: "",
  link_type: undefined,
};

const SIZE_OPTIONS: { value: FigureConfig["size"]; label: string; description: string }[] = [
  { value: "full", label: "Ancho completo", description: "Con márgenes laterales" },
  { value: "half", label: "Mitad de pantalla", description: "50% del ancho" },
];

export const FigureEditor: React.FC<FigureEditorProps> = ({ component }) => {
  const dispatch = useAppDispatch();
  const uploadRequest = useAppSelector(
    (state) => state.siteComponent.uploadRequest,
  );

  const [form, setForm] = useState<FigureConfig>(() => {
    const cfg = component.config;
    if (!Array.isArray(cfg) && "image_url" in cfg && "caption" in cfg)
      return cfg as FigureConfig;
    return defaultFigureConfig;
  });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const cfg = component.config;
    if (!Array.isArray(cfg) && "image_url" in cfg && "caption" in cfg) {
      setForm(cfg as FigureConfig);
    }
  }, [component.config]);

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    await dispatch(
      uploadFigureImage({
        file,
        componentId: component.id,
        config: form,
      }),
    );
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await dispatch(
        updateSiteComponent({
          componentId: component.id,
          updates: { config: form },
        }),
      ).unwrap();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${myWebEditorClassName} text-[#010000] ${myWebLegacyControlsClassName}`}>
      <div className={myWebFieldGridClassName}>
        <section className={myWebGroupClassName}>
          <ImageUploader
            label="Imagen"
            currentUrl={form.image_url || null}
            onUpload={handleImageUpload}
            onRemove={() =>
              setForm((prev) => ({ ...prev, image_url: "" }))
            }
            loading={uploading || uploadRequest.inProgress}
          />
          <InputField
            id="figure-caption"
            type="text"
            label="Pie de foto"
            value={form.caption}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, caption: e.target.value }))
            }
            placeholder="Escribe un pie de foto..."
          />
        </section>
        <section className={myWebGroupClassName}>
          <div>
            <p className="text-sm font-medium text-gray-900 mb-3">Tamaño</p>
            <div className="flex flex-wrap gap-2">
              {SIZE_OPTIONS.map(({ value, label, description }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={form.size === value}
                  onClick={() => setForm((prev) => ({ ...prev, size: value }))}
                  className={`min-h-11 ${myWebOptionClassName} ${form.size === value ? myWebSelectedOptionClassName : ""}`}
                >
                  <span
                    className={`block text-sm font-medium ${
                      form.size === value ? "text-gray-900" : "text-gray-700"
                    }`}
                  >
                    {label}
                  </span>
                  <span className="block text-sm text-gray-500 mt-0.5">
                    {description}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 mb-3">Enlace (opcional)</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {(["none", "internal", "external"] as const).map((option) => {
                const current = form.link_type ?? "none";
                const labels = { none: "Sin enlace", internal: "Interno", external: "Externo" };
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={current === option}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        link_type: option === "none" ? undefined : option,
                        link_url: option === "none" ? "" : prev.link_url,
                      }))
                    }
                    className={`min-h-11 text-sm font-medium ${myWebOptionClassName} ${current === option ? myWebSelectedOptionClassName : ""}`}
                  >
                    {labels[option]}
                  </button>
                );
              })}
            </div>
            {form.link_type && (
              <InputField
                id="figure-link-url"
                type="text"
                label={form.link_type === "internal" ? "Ruta interna (ej. sobre-nosotros)" : "URL externa"}
                value={form.link_url ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, link_url: e.target.value }))
                }
                placeholder={form.link_type === "internal" ? "sobre-nosotros" : "https://..."}
              />
            )}
          </div>
        </section>
      </div>
      {/* ── Guardar ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <PillButton onClick={handleSave} disabled={saving}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </PillButton>
        {saved && (
          <span role="status" className="text-sm">Cambios guardados</span>
        )}
      </div>
    </div>
  );
};
