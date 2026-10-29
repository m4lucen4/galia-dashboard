import React, { useState, useEffect } from "react";
import { SiteComponentDataProps, ContactConfig } from "@/types";
import { useAppDispatch } from "@/redux/hooks";
import { updateSiteComponent } from "@/redux/actions/SiteComponentActions";
import { InputField } from "@/components/shared/ui/InputField";
import { PillButton } from "@/components/shared/ui/PillButton";
import { ColorPicker } from "@/features/myWeb/components/ColorPicker";
import { RichTextInput } from "@/features/myWeb/components/RichTextInput";
import { myWebEditorClassName, myWebGroupClassName, myWebFieldGridClassName, myWebLegacyControlsClassName } from "@/features/myWeb/components/myWebStyles";
import { LayoutChoice } from "@/features/myWeb/components/previews/LayoutChoice";
import { ArrowsRightLeftIcon } from "@heroicons/react/24/outline";

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

interface PreviewProps {
  reversed?: boolean;
}

const PreviewThreeColumns: React.FC<PreviewProps> = ({ reversed }) => (
  <svg viewBox="0 0 120 70" className="w-full h-auto" fill="none">
    <g transform={reversed ? "translate(120,0) scale(-1,1)" : undefined}>
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
    </g>
  </svg>
);

const PreviewSplitForm: React.FC<PreviewProps> = ({ reversed }) => (
  <svg viewBox="0 0 120 70" className="w-full h-auto" fill="none">
    <g transform={reversed ? "translate(120,0) scale(-1,1)" : undefined}>
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
    </g>
  </svg>
);

const TYPE_OPTIONS: {
  value: 1 | 2;
  label: string;
  Preview: React.FC<PreviewProps>;
  reverseField: "columns_reverse" | "form_reverse";
}[] = [
  { value: 1, label: "Tres columnas", Preview: PreviewThreeColumns, reverseField: "columns_reverse" },
  { value: 2, label: "Split con formulario", Preview: PreviewSplitForm, reverseField: "form_reverse" },
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

  const handleChange = (field: keyof ContactConfig, value: string | number | boolean) => {
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
    <div className={`${myWebEditorClassName} text-[#010000] ${myWebLegacyControlsClassName}`}>
      {/* ── Selector de tipo ──────────────────────────────────────────────── */}
      <div>
        <p className="text-sm font-medium text-gray-900 mb-3">Tipo de contacto</p>
        <div className={myWebFieldGridClassName}>
          {TYPE_OPTIONS.map(({ value, label, Preview, reverseField }) => {
            const reversed = form[reverseField] ?? false;
            return (
              <div key={value} className="min-w-0 space-y-2">
                <LayoutChoice
                  label={label}
                  preview={<Preview reversed={reversed} />}
                  selected={form.type === value}
                  onSelect={() => handleChange("type", value)}
                />
                <PillButton
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChange(reverseField, !reversed);
                  }}
                  aria-label={`Invertir orden: ${label}`}
                  aria-pressed={reversed}
                  title="Invertir orden"
                >
                  <ArrowsRightLeftIcon aria-hidden="true" className="h-4 w-4" />
                  Invertir orden
                </PillButton>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Campos comunes ────────────────────────────────────────────────── */}
      <section className={myWebGroupClassName}>
        <h4 className="text-base font-medium">Presentación del contacto</h4>
        <div className={myWebFieldGridClassName}>
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
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-black">Mostrar logo</p>
            <p className="text-sm text-gray-500 mt-0.5">
              Muestra el logo de la web encima del título en este componente
            </p>
          </div>
          <PillButton
            variant="outline"
            role="switch"
            aria-label="Mostrar logo en el contacto"
            aria-checked={form.show_logo ?? false}
            onClick={() => handleChange("show_logo", !(form.show_logo ?? false))}
          >
            {form.show_logo ? "Sí" : "No"}
          </PillButton>
        </div>

        <RichTextInput
          label="Descripción"
          value={form.descripcion}
          onChange={(html) => handleChange("descripcion", html)}
          placeholder="Breve descripción o texto de contacto..."
        />
      </section>

      {/* ── Direcciones ───────────────────────────────────────────────────── */}
      <section className={myWebGroupClassName}>
        <h4 className="text-base font-medium">Direcciones del estudio</h4>
        <div className={myWebFieldGridClassName}>
          <div className={myWebGroupClassName}>
            <InputField
              id="contact-titulo-direccion1"
              type="text"
              label={form.type === 1 ? "Título dirección 1 (opcional)" : "Título dirección (opcional)"}
              value={form.titulo_direccion1 ?? ""}
              onChange={(e) => handleChange("titulo_direccion1", e.target.value)}
              placeholder="Oficina principal"
            />
            <RichTextInput
              label={form.type === 1 ? "Dirección 1" : "Dirección"}
              value={form.direccion1}
              onChange={(html) => handleChange("direccion1", html)}
              placeholder="Calle Ejemplo, 12&#10;28001 Madrid&#10;España"
            />
          </div>
          {form.type === 1 && (
            <div className={myWebGroupClassName}>
              <InputField
                id="contact-titulo-direccion2"
                type="text"
                label="Título dirección 2 (opcional)"
                value={form.titulo_direccion2 ?? ""}
                onChange={(e) => handleChange("titulo_direccion2", e.target.value)}
                placeholder="Oficina Barcelona"
              />
              <RichTextInput
                label="Dirección 2"
                value={form.direccion2 ?? ""}
                onChange={(html) => handleChange("direccion2", html)}
                placeholder="Calle Ejemplo, 34&#10;08001 Barcelona&#10;España"
              />
            </div>
          )}
        </div>
      </section>

      {form.type === 2 && (
        <section className={myWebGroupClassName}>
          <h4 className="text-base font-medium">Formulario de contacto</h4>
          <div className={myWebFieldGridClassName}>
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
          </div>
          <p className="text-sm text-gray-500">
            El formulario de contacto se renderiza automáticamente en el sitio web.
          </p>
        </section>
      )}

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
