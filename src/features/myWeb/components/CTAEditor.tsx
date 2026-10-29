import React, { useState, useEffect } from "react";
import { SiteComponentDataProps, CTAConfig } from "@/types";
import { useAppDispatch } from "@/redux/hooks";
import { updateSiteComponent } from "@/redux/actions/SiteComponentActions";
import { InputField } from "@/components/shared/ui/InputField";
import { PillButton } from "@/components/shared/ui/PillButton";
import { ColorPicker } from "@/features/myWeb/components/ColorPicker";
import { RichTextInput } from "@/features/myWeb/components/RichTextInput";
import { CTALayoutSelector } from "@/features/myWeb/components/previews/CTALayoutSelector";
import { myWebPanelClassName, myWebLegacyControlsClassName } from "@/features/myWeb/components/myWebStyles";

const isRichTextEmpty = (html: string) =>
  !html.replace(/<[^>]*>/g, "").trim();

interface CTAEditorProps {
  component: SiteComponentDataProps;
}

const defaultCTAConfig: CTAConfig = {
  type: 1,
  title: "",
  description: "",
  subtitle: "",
  text_primary_button: "",
  url_primary_button: "",
  text_secondary_button: "",
  url_secondary_button: "",
};

export const CTAEditor: React.FC<CTAEditorProps> = ({ component }) => {
  const dispatch = useAppDispatch();

  const [form, setForm] = useState<CTAConfig>(() => {
    const cfg = component.config;
    if (!Array.isArray(cfg) && "title" in cfg) return cfg as CTAConfig;
    return defaultCTAConfig;
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState({ title: "", description: "" });

  useEffect(() => {
    const cfg = component.config;
    if (!Array.isArray(cfg) && "title" in cfg) {
      setForm(cfg as CTAConfig);
    }
  }, [component.config]);

  const handleChange = (
    field: keyof CTAConfig,
    value: string | number,
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "title" || field === "description") {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSave = async () => {
    const newErrors = {
      title: form.title.trim() ? "" : "El título es obligatorio",
      description: !isRichTextEmpty(form.description)
        ? ""
        : "La descripción es obligatoria",
    };
    setErrors(newErrors);
    if (newErrors.title || newErrors.description) return;

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
    <div className={`@container space-y-6 text-[#010000] ${myWebLegacyControlsClassName}`}>
      <CTALayoutSelector value={form.type} onChange={(value) => handleChange("type", value)} />
      <ColorPicker
        label="Color del bloque"
        value={form.split_color ?? "#2D3436"}
        onChange={(color) => handleChange("split_color", color)}
      />
      <section className={myWebPanelClassName}>
        <h4 className="text-base font-medium">Contenido de la llamada a la acción</h4>
        <InputField
          id="cta-subtitle"
          type="text"
          label="Subtítulo"
          value={form.subtitle}
          onChange={(e) => handleChange("subtitle", e.target.value)}
          placeholder="Texto pequeño encima del título"
        />
        <InputField
          id="cta-title"
          type="text"
          label="Título *"
          value={form.title}
          onChange={(e) => handleChange("title", e.target.value)}
          placeholder="Título de la llamada a la acción"
          error={errors.title}
        />
        <div>
          <RichTextInput
            label="Descripción *"
            value={form.description}
            onChange={(html) => {
              handleChange("description", html);
            }}
            placeholder="Descripción del CTA..."
            error={errors.description}
          />
          {form.type === 3 && (
            <p className="mt-1 text-sm text-[#010000]/65">No se muestra en el tipo 3</p>
          )}
        </div>
      </section>
      <section className={myWebPanelClassName}>
        <h4 className="text-base font-medium">Enlaces y botones</h4>
        <div>
          <p className="mb-2 text-sm font-medium">Botón principal</p>
          <div className="grid grid-cols-1 gap-3 @min-[28rem]:grid-cols-2">
            <InputField
              id="cta-btn-primary-text"
              type="text"
              label="Texto"
              value={form.text_primary_button}
              onChange={(e) => handleChange("text_primary_button", e.target.value)}
              placeholder="Contactar"
            />
            <InputField
              id="cta-btn-primary-url"
              type="text"
              label="URL"
              value={form.url_primary_button}
              onChange={(e) => handleChange("url_primary_button", e.target.value)}
              placeholder="/contacto"
            />
          </div>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Botón secundario</p>
          <p className="mb-2 text-sm text-[#010000]/65">Se mostrará con una flecha → al final</p>
          <div className="grid grid-cols-1 gap-3 @min-[28rem]:grid-cols-2">
            <InputField
              id="cta-btn-secondary-text"
              type="text"
              label="Texto"
              value={form.text_secondary_button}
              onChange={(e) => handleChange("text_secondary_button", e.target.value)}
              placeholder="Saber más"
            />
            <InputField
              id="cta-btn-secondary-url"
              type="text"
              label="URL"
              value={form.url_secondary_button}
              onChange={(e) => handleChange("url_secondary_button", e.target.value)}
              placeholder="/proyectos"
            />
          </div>
        </div>
      </section>
      <div className="flex flex-wrap items-center gap-3">
        <PillButton onClick={handleSave} disabled={saving}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </PillButton>
        {saved && <span role="status" className="text-sm">Cambios guardados</span>}
      </div>
    </div>
  );
};
