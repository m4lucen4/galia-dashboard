import React, { useState, useEffect } from "react";
import { SiteComponentDataProps, ContactConfig } from "../../../types";
import { useAppDispatch } from "../../../redux/hooks";
import { updateSiteComponent } from "../../../redux/actions/SiteComponentActions";
import { InputField } from "../../../components/shared/ui/InputField";
import { Button } from "../../../components/shared/ui/Button";
import { ColorPicker } from "./ColorPicker";

interface ContactEditorProps {
  component: SiteComponentDataProps;
}

const defaultContactConfig: ContactConfig = {
  type: 1,
  antetitulo: "",
  titulo: "",
  descripcion: "",
  direccion1: "",
  direccion2: "",
};

// ─── Visual previews ──────────────────────────────────────────────────────────

const PreviewThreeColumns: React.FC = () => (
  <svg viewBox="0 0 120 70" className="w-full h-auto" fill="none">
    {/* Left col 50% — antetítulo + título + descripción */}
    <rect x="4" y="10" width="22" height="3" rx="1" fill="#D1D5DB" />
    <rect x="4" y="17" width="52" height="7" rx="1" fill="#6B7280" />
    <rect x="4" y="28" width="50" height="3" rx="1" fill="#D1D5DB" />
    <rect x="4" y="33" width="42" height="3" rx="1" fill="#D1D5DB" />
    <rect x="4" y="38" width="46" height="3" rx="1" fill="#D1D5DB" />
    {/* Center col 25% — dirección 1 */}
    <rect x="64" y="10" width="20" height="3" rx="1" fill="#D1D5DB" />
    <rect x="64" y="17" width="24" height="3" rx="1" fill="#D1D5DB" />
    <rect x="64" y="22" width="18" height="3" rx="1" fill="#D1D5DB" />
    <rect x="64" y="27" width="22" height="3" rx="1" fill="#D1D5DB" />
    {/* Right col 25% — dirección 2 */}
    <rect x="94" y="10" width="20" height="3" rx="1" fill="#D1D5DB" />
    <rect x="94" y="17" width="24" height="3" rx="1" fill="#D1D5DB" />
    <rect x="94" y="22" width="18" height="3" rx="1" fill="#D1D5DB" />
    <rect x="94" y="27" width="22" height="3" rx="1" fill="#D1D5DB" />
  </svg>
);

const PreviewSplitForm: React.FC = () => (
  <svg viewBox="0 0 120 70" className="w-full h-auto" fill="none">
    {/* Left col 50% — título + descripción + dirección */}
    <rect x="4" y="10" width="50" height="7" rx="1" fill="#6B7280" />
    <rect x="4" y="21" width="48" height="3" rx="1" fill="#D1D5DB" />
    <rect x="4" y="26" width="40" height="3" rx="1" fill="#D1D5DB" />
    <rect x="4" y="34" width="44" height="3" rx="1" fill="#D1D5DB" />
    <rect x="4" y="39" width="36" height="3" rx="1" fill="#D1D5DB" />
    <rect x="4" y="44" width="40" height="3" rx="1" fill="#D1D5DB" />
    {/* Right col 50% — form */}
    <rect x="64" y="8" width="52" height="10" rx="2" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="0.5" />
    <rect x="64" y="22" width="52" height="10" rx="2" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="0.5" />
    <rect x="64" y="36" width="52" height="16" rx="2" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="0.5" />
    <rect x="64" y="56" width="24" height="8" rx="2" fill="#374151" />
  </svg>
);

const TYPE_OPTIONS: {
  value: 1 | 2;
  label: string;
  Preview: React.FC;
}[] = [
  { value: 1, label: "Tres columnas", Preview: PreviewThreeColumns },
  { value: 2, label: "Split con formulario", Preview: PreviewSplitForm },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const ContactEditor: React.FC<ContactEditorProps> = ({ component }) => {
  const dispatch = useAppDispatch();

  const [form, setForm] = useState<ContactConfig>(() => {
    const cfg = component.config;
    if (!Array.isArray(cfg) && "titulo" in cfg && "direccion1" in cfg) {
      return cfg as ContactConfig;
    }
    return defaultContactConfig;
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const cfg = component.config;
    if (!Array.isArray(cfg) && "titulo" in cfg && "direccion1" in cfg) {
      setForm(cfg as ContactConfig);
    }
  }, [component.config]);

  const handleChange = (field: keyof ContactConfig, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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
    <div className="space-y-6">
      {/* ── Selector de tipo ──────────────────────────────────────────────── */}
      <div>
        <p className="text-sm font-medium text-gray-900 mb-3">Tipo de contacto</p>
        <div className="grid grid-cols-2 gap-3">
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

      {/* ── Campos comunes ────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {form.type === 1 && (
          <InputField
            id="contact-antetitulo"
            type="text"
            label="Antetítulo"
            value={form.antetitulo ?? ""}
            onChange={(e) => handleChange("antetitulo", e.target.value)}
            placeholder="Texto pequeño encima del título"
          />
        )}

        <InputField
          id="contact-titulo"
          type="text"
          label="Título"
          value={form.titulo}
          onChange={(e) => handleChange("titulo", e.target.value)}
          placeholder="Estudio de Arquitectura"
        />

        <InputField
          id="contact-descripcion"
          type="textarea"
          label="Descripción"
          value={form.descripcion}
          onChange={(e) => handleChange("descripcion", e.target.value)}
          placeholder="Breve descripción o texto de contacto..."
        />
      </div>

      {/* ── Direcciones ───────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-black mb-1">
            {form.type === 1 ? "Dirección 1" : "Dirección"}
          </label>
          <textarea
            value={form.direccion1}
            onChange={(e) => handleChange("direccion1", e.target.value)}
            rows={4}
            className="w-full rounded-md bg-white px-3 py-2 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-gray-800 resize-y"
            placeholder={"Calle Ejemplo, 12\n28001 Madrid\nEspaña"}
          />
        </div>

        {form.type === 1 && (
          <div>
            <label className="block text-sm text-black mb-1">Dirección 2</label>
            <textarea
              value={form.direccion2 ?? ""}
              onChange={(e) => handleChange("direccion2", e.target.value)}
              rows={4}
              className="w-full rounded-md bg-white px-3 py-2 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-gray-800 resize-y"
              placeholder={"Calle Ejemplo, 34\n08001 Barcelona\nEspaña"}
            />
          </div>
        )}
      </div>

      {form.type === 2 && (
        <div className="space-y-4">
          <InputField
            id="contact-form-email"
            type="email"
            label="Email de destino del formulario"
            value={form.form_email ?? ""}
            onChange={(e) => handleChange("form_email", e.target.value)}
            placeholder="contacto@estudio.com"
          />
          <ColorPicker
            label="Color de fondo del formulario"
            value={form.form_bg_color ?? "#FFFFFF"}
            onChange={(color) => handleChange("form_bg_color", color)}
          />
          <p className="text-xs text-gray-400">
            El formulario de contacto se renderiza automáticamente en el sitio web.
          </p>
        </div>
      )}

      {/* ── Guardar ───────────────────────────────────────────────────────── */}
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
