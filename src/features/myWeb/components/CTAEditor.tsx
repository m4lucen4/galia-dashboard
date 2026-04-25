import React, { useState, useEffect } from "react";
import { SiteComponentDataProps, CTAConfig } from "../../../types";
import { useAppDispatch } from "../../../redux/hooks";
import { updateSiteComponent } from "../../../redux/actions/SiteComponentActions";
import { InputField } from "../../../components/shared/ui/InputField";
import { Button } from "../../../components/shared/ui/Button";
import { ColorPicker } from "./ColorPicker";

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

// ─── Visual previews ──────────────────────────────────────────────────────────

const PreviewSplit: React.FC = () => (
  <svg viewBox="0 0 120 70" className="w-full h-auto" fill="none">
    {/* Left half – color block */}
    <rect x="0" y="0" width="58" height="70" fill="#D1D5DB" />
    {/* Subtitle */}
    <rect x="65" y="13" width="24" height="3" rx="1" fill="#D1D5DB" />
    {/* Title */}
    <rect x="65" y="20" width="46" height="6" rx="1" fill="#6B7280" />
    {/* Description line 1 */}
    <rect x="65" y="30" width="40" height="3" rx="1" fill="#D1D5DB" />
    {/* Description line 2 */}
    <rect x="65" y="36" width="32" height="3" rx="1" fill="#D1D5DB" />
    {/* Primary button */}
    <rect x="65" y="46" width="22" height="8" rx="2" fill="#374151" />
    {/* Secondary button */}
    <rect x="91" y="46" width="22" height="8" rx="2" fill="#E5E7EB" />
  </svg>
);

const PreviewCentered: React.FC = () => (
  <svg viewBox="0 0 120 70" className="w-full h-auto" fill="none">
    <rect x="0" y="0" width="120" height="70" fill="#F9FAFB" />
    {/* Subtitle – centered */}
    <rect x="40" y="8" width="40" height="3" rx="1" fill="#D1D5DB" />
    {/* Title – centered */}
    <rect x="22" y="15" width="76" height="7" rx="1" fill="#6B7280" />
    {/* Description line 1 */}
    <rect x="18" y="27" width="84" height="3" rx="1" fill="#D1D5DB" />
    {/* Description line 2 */}
    <rect x="28" y="33" width="64" height="3" rx="1" fill="#D1D5DB" />
    {/* Buttons – centered */}
    <rect x="22" y="44" width="32" height="9" rx="2" fill="#374151" />
    <rect x="58" y="44" width="32" height="9" rx="2" fill="#E5E7EB" />
  </svg>
);

const PreviewMinimalist: React.FC = () => (
  <svg viewBox="0 0 120 70" className="w-full h-auto" fill="none">
    <rect x="0" y="0" width="120" height="70" fill="#F9FAFB" />
    {/* Large title – left, two lines */}
    <rect x="10" y="10" width="82" height="10" rx="1" fill="#6B7280" />
    <rect x="10" y="24" width="62" height="10" rx="1" fill="#6B7280" />
    {/* Buttons – left */}
    <rect x="10" y="47" width="30" height="9" rx="2" fill="#374151" />
    <rect x="44" y="47" width="30" height="9" rx="2" fill="#E5E7EB" />
  </svg>
);

const TYPE_OPTIONS: {
  value: 1 | 2 | 3;
  label: string;
  Preview: React.FC;
}[] = [
  { value: 1, label: "Centrado", Preview: PreviewCentered },
  { value: 2, label: "Split color", Preview: PreviewSplit },
  { value: 3, label: "Alineado a la izquierda", Preview: PreviewMinimalist },
];

// ─── Component ────────────────────────────────────────────────────────────────

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
      description: form.description.trim()
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
    <div className="space-y-6">
      {/* ── Sección 1: Selector de tipo ────────────────────────────────────── */}
      <div>
        <p className="text-sm font-medium text-gray-900 mb-3">Tipo de CTA</p>
        <div className="grid grid-cols-3 gap-3">
          {TYPE_OPTIONS.map(({ value, label, Preview }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleChange("type", value)}
              className={`rounded-md border-2 p-2 text-center transition-colors focus:outline-none ${
                form.type === value
                  ? "border-gray-900 bg-gray-50"
                  : "border-gray-200 bg-white hover:border-gray-400"
              }`}
            >
              <Preview />
              <span
                className={`mt-2 block text-xs font-medium ${
                  form.type === value ? "text-gray-900" : "text-gray-500"
                }`}
              >
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Color del bloque (solo tipo 2) ─────────────────────────────────── */}
      {form.type === 2 && (
        <ColorPicker
          label="Color del bloque"
          value={form.split_color ?? "#2D3436"}
          onChange={(color) => handleChange("split_color", color)}
        />
      )}

      {/* ── Sección 2: Campos de contenido ─────────────────────────────────── */}
      <div className="space-y-4">
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
          placeholder="Lorem Ipsum Dolor Sit Amet"
          error={errors.title}
        />

        <div>
          <InputField
            id="cta-description"
            type="textarea"
            label="Descripción *"
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Descripción del CTA..."
            error={errors.description}
          />
          {form.type === 3 && (
            <p className="mt-1 text-xs text-gray-400">
              No se muestra en el tipo 3
            </p>
          )}
        </div>
      </div>

      {/* ── Sección 3: Botones ──────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-900 mb-2">
            Botón principal
          </p>
          <div className="grid grid-cols-2 gap-3">
            <InputField
              id="cta-btn-primary-text"
              type="text"
              label="Texto"
              value={form.text_primary_button}
              onChange={(e) =>
                handleChange("text_primary_button", e.target.value)
              }
              placeholder="Contactar"
            />
            <InputField
              id="cta-btn-primary-url"
              type="text"
              label="URL"
              value={form.url_primary_button}
              onChange={(e) =>
                handleChange("url_primary_button", e.target.value)
              }
              placeholder="/contacto"
            />
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-900 mb-1">
            Botón secundario
          </p>
          <p className="mb-2 text-xs text-gray-400">
            Se mostrará con una flecha → al final
          </p>
          <div className="grid grid-cols-2 gap-3">
            <InputField
              id="cta-btn-secondary-text"
              type="text"
              label="Texto"
              value={form.text_secondary_button}
              onChange={(e) =>
                handleChange("text_secondary_button", e.target.value)
              }
              placeholder="Saber más"
            />
            <InputField
              id="cta-btn-secondary-url"
              type="text"
              label="URL"
              value={form.url_secondary_button}
              onChange={(e) =>
                handleChange("url_secondary_button", e.target.value)
              }
              placeholder="/proyectos"
            />
          </div>
        </div>
      </div>

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
