import React, { useState, useEffect } from "react";
import { SiteComponentDataProps, RichTextConfig } from "../../../types";
import { useAppDispatch } from "../../../redux/hooks";
import { updateSiteComponent } from "../../../redux/actions/SiteComponentActions";
import { Button } from "../../../components/shared/ui/Button";
import { RichTextInput } from "./RichTextInput";

interface RichTextBlockEditorProps {
  component: SiteComponentDataProps;
}

const defaultConfig: RichTextConfig = {
  content: "",
  alignment: "left",
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
    <div className="space-y-6">
      {/* ── Alineación ──────────────────────────────────────────────────────── */}
      <div>
        <p className="text-sm font-medium text-gray-900 mb-2">Alineación</p>
        <div className="flex rounded-md border border-gray-300 overflow-hidden w-fit">
          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, alignment: "left" }))}
            className={`px-4 py-1.5 text-xs font-medium transition-colors ${
              form.alignment === "left"
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            ← Izquierda
          </button>
          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, alignment: "right" }))}
            className={`px-4 py-1.5 text-xs font-medium transition-colors border-l border-gray-300 ${
              form.alignment === "right"
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Derecha →
          </button>
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
      <div className="flex items-center gap-3">
        <Button
          title={saving ? "Guardando..." : "Guardar cambios"}
          onClick={handleSave}
          disabled={saving}
        />
        {saved && (
          <span className="text-sm text-green-600">Cambios guardados</span>
        )}
      </div>
    </div>
  );
};
