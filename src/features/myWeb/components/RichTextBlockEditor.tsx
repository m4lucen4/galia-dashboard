import React, { useState, useEffect } from "react";
import { SiteComponentDataProps, RichTextConfig } from "@/types";
import { useAppDispatch } from "@/redux/hooks";
import { updateSiteComponent } from "@/redux/actions/SiteComponentActions";
import { PillButton } from "@/components/shared/ui/PillButton";
import { RichTextInput } from "@/features/myWeb/components/RichTextInput";
import { myWebEditorClassName, myWebFieldGridClassName, myWebOptionClassName, myWebSelectedOptionClassName } from "@/features/myWeb/components/myWebStyles";

interface RichTextBlockEditorProps {
  component: SiteComponentDataProps;
}

const defaultConfig: RichTextConfig = {
  content: "",
  alignment: "left",
  width: "full",
};

export const RichTextBlockEditor: React.FC<RichTextBlockEditorProps> = ({
  component,
}) => {
  const dispatch = useAppDispatch();

  const [form, setForm] = useState<RichTextConfig>(() => {
    const cfg = component.config;
    if (!Array.isArray(cfg) && "content" in cfg) return cfg as RichTextConfig;
    return defaultConfig;
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const cfg = component.config;
    if (!Array.isArray(cfg) && "content" in cfg) {
      setForm(cfg as RichTextConfig);
    }
  }, [component.config]);

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
    <div className={`${myWebEditorClassName} text-[#010000]`}>
      <div className={myWebFieldGridClassName}>
        {/* Alignment and width share one responsive control plane. */}
        <div>
          <p className="text-sm font-medium text-gray-900 mb-2">Alineación</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={form.alignment === "left"}
              onClick={() => setForm((prev) => ({ ...prev, alignment: "left" }))}
              className={`min-h-11 ${myWebOptionClassName} ${form.alignment === "left" ? myWebSelectedOptionClassName : ""}`}
            >
              ← Izquierda
            </button>
            <button
              type="button"
              aria-pressed={form.alignment === "right"}
              onClick={() => setForm((prev) => ({ ...prev, alignment: "right" }))}
              className={`min-h-11 ${myWebOptionClassName} ${form.alignment === "right" ? myWebSelectedOptionClassName : ""}`}
            >
              Derecha →
            </button>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-900 mb-2">Ancho</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { value: "full", label: "Completo" },
                { value: "two-thirds", label: "2/3" },
                { value: "half", label: "50%" },
              ] as const
            ).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={(form.width ?? "full") === value}
                onClick={() => setForm((prev) => ({ ...prev, width: value }))}
                className={`min-h-11 ${myWebOptionClassName} ${(form.width ?? "full") === value ? myWebSelectedOptionClassName : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* ── Contenido ───────────────────────────────────────────────────────── */}
      <RichTextInput
        label="Contenido"
        value={form.content}
        onChange={(html) => setForm((prev) => ({ ...prev, content: html }))}
        placeholder="Escribe el contenido del bloque..."
      />

      {/* ── Guardar ─────────────────────────────────────────────────────────── */}
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
