import React, { useState, useEffect } from "react";
import { SiteComponentDataProps, ContentConfig } from "../../../types";
import { useAppDispatch } from "../../../redux/hooks";
import {
  updateSiteComponent,
  uploadContentImage,
} from "../../../redux/actions/SiteComponentActions";
import { InputField } from "../../../components/shared/ui/InputField";
import { ImageUploader } from "./ImageUploader";
import { Button } from "../../../components/shared/ui/Button";

interface ContentEditorProps {
  component: SiteComponentDataProps;
}

const defaultContentConfig: ContentConfig = {
  antetitulo: "",
  titulo: "",
  image: "",
  textoIzquierda: "",
  textoDerecha: "",
  dato1: undefined,
  leyenda1: "",
  dato2: undefined,
  leyenda2: "",
  dato3: undefined,
  leyenda3: "",
  dato4: undefined,
  leyenda4: "",
  type: 1,
};

// ─── Visual previews ──────────────────────────────────────────────────────────

const PreviewType1: React.FC = () => (
  <svg viewBox="0 0 120 80" className="w-full h-auto" fill="none">
    {/* Antetítulo */}
    <rect x="10" y="6" width="30" height="3" rx="1" fill="#D1D5DB" />
    {/* Título */}
    <rect x="10" y="13" width="70" height="6" rx="1" fill="#6B7280" />
    {/* Divisor */}
    <line x1="10" y1="25" x2="110" y2="25" stroke="#E5E7EB" strokeWidth="1" />
    {/* Columna izquierda — texto */}
    <rect x="10" y="30" width="45" height="3" rx="1" fill="#D1D5DB" />
    <rect x="10" y="36" width="40" height="3" rx="1" fill="#D1D5DB" />
    <rect x="10" y="42" width="43" height="3" rx="1" fill="#D1D5DB" />
    <rect x="10" y="48" width="35" height="3" rx="1" fill="#D1D5DB" />
    {/* Columna derecha — datos (2x2) */}
    <rect x="65" y="30" width="18" height="7" rx="1" fill="#9CA3AF" />
    <rect x="87" y="30" width="18" height="7" rx="1" fill="#9CA3AF" />
    <rect x="65" y="41" width="18" height="7" rx="1" fill="#9CA3AF" />
    <rect x="87" y="41" width="18" height="7" rx="1" fill="#9CA3AF" />
    {/* Leyendas */}
    <rect x="65" y="50" width="18" height="2" rx="1" fill="#D1D5DB" />
    <rect x="87" y="50" width="18" height="2" rx="1" fill="#D1D5DB" />
    <rect x="65" y="61" width="18" height="2" rx="1" fill="#D1D5DB" />
    <rect x="87" y="61" width="18" height="2" rx="1" fill="#D1D5DB" />
  </svg>
);

const PreviewType2: React.FC = () => (
  <svg viewBox="0 0 120 80" className="w-full h-auto" fill="none">
    {/* Foto izquierda */}
    <rect x="4" y="4" width="48" height="72" rx="2" fill="#D1D5DB" />
    {/* Antetítulo */}
    <rect x="60" y="8" width="22" height="3" rx="1" fill="#D1D5DB" />
    {/* Título */}
    <rect x="60" y="15" width="50" height="6" rx="1" fill="#6B7280" />
    {/* Texto */}
    <rect x="60" y="26" width="52" height="3" rx="1" fill="#D1D5DB" />
    <rect x="60" y="32" width="46" height="3" rx="1" fill="#D1D5DB" />
    <rect x="60" y="38" width="50" height="3" rx="1" fill="#D1D5DB" />
    {/* Datos (2x2) */}
    <rect x="60" y="48" width="22" height="7" rx="1" fill="#9CA3AF" />
    <rect x="86" y="48" width="22" height="7" rx="1" fill="#9CA3AF" />
    <rect x="60" y="59" width="22" height="7" rx="1" fill="#9CA3AF" />
    <rect x="86" y="59" width="22" height="7" rx="1" fill="#9CA3AF" />
  </svg>
);

const TYPE_OPTIONS: {
  value: 1 | 2;
  label: string;
  Preview: React.FC;
}[] = [
  { value: 1, label: "Título + dos columnas", Preview: PreviewType1 },
  { value: 2, label: "Foto + contenido", Preview: PreviewType2 },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const ContentEditor: React.FC<ContentEditorProps> = ({ component }) => {
  const dispatch = useAppDispatch();

  const [form, setForm] = useState<ContentConfig>(() => {
    const cfg = component.config;
    if (!Array.isArray(cfg) && "type" in cfg && "titulo" in cfg)
      return cfg as ContentConfig;
    return defaultContentConfig;
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const cfg = component.config;
    if (!Array.isArray(cfg) && "type" in cfg && "titulo" in cfg) {
      setForm(cfg as ContentConfig);
    }
  }, [component.config]);

  const handleChange = (
    field: keyof ContentConfig,
    value: string | number | undefined,
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    await dispatch(
      uploadContentImage({ file, componentId: component.id, config: form }),
    );
    setUploadingImage(false);
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
      {/* ── Selector de tipo ────────────────────────────────────────────────── */}
      <div>
        <p className="text-sm font-medium text-gray-900 mb-3">
          Tipo de diseño
        </p>
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

      {/* ── Textos principales ──────────────────────────────────────────────── */}
      <div>
        <p className="text-sm font-medium text-gray-900 mb-3">
          Textos principales
        </p>
        <div className="space-y-3">
          <InputField
            id="content-antetitulo"
            type="text"
            label="Antetítulo"
            value={form.antetitulo ?? ""}
            onChange={(e) => handleChange("antetitulo", e.target.value)}
            placeholder="Sobre nosotros"
          />
          <InputField
            id="content-titulo"
            type="text"
            label="Título"
            value={form.titulo ?? ""}
            onChange={(e) => handleChange("titulo", e.target.value)}
            placeholder="Quiénes somos"
          />
        </div>
      </div>

      {/* ── Columna izquierda ───────────────────────────────────────────────── */}
      <div>
        <p className="text-sm font-medium text-gray-900 mb-3">
          Columna izquierda
        </p>
        <InputField
          id="content-texto-izquierda"
          type="textarea"
          label="Texto columna izquierda"
          value={form.textoIzquierda ?? ""}
          onChange={(e) => handleChange("textoIzquierda", e.target.value)}
          placeholder="Descripción principal..."
        />
      </div>

      {/* ── Columna derecha ─────────────────────────────────────────────────── */}
      <div>
        <p className="text-sm font-medium text-gray-900 mb-3">
          Columna derecha
        </p>
        <div className="space-y-3">
          <ImageUploader
            label="Imagen columna derecha"
            currentUrl={form.image || null}
            onUpload={handleImageUpload}
            loading={uploadingImage}
          />
          <InputField
            id="content-texto-derecha"
            type="textarea"
            label="Texto columna derecha"
            value={form.textoDerecha ?? ""}
            onChange={(e) => handleChange("textoDerecha", e.target.value)}
            placeholder="Texto complementario..."
          />
        </div>
      </div>

      {/* ── Datos estadísticos ──────────────────────────────────────────────── */}
      <div>
        <p className="text-sm font-medium text-gray-900 mb-3">
          Datos estadísticos
        </p>
        <div className="grid grid-cols-2 gap-4">
          {([1, 2, 3, 4] as const).map((n) => (
            <div
              key={n}
              className="rounded-md border border-gray-200 p-3 space-y-2"
            >
              <InputField
                id={`content-dato${n}`}
                type="text"
                label="Número"
                value={form[`dato${n}` as keyof ContentConfig] != null ? String(form[`dato${n}` as keyof ContentConfig]) : ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  handleChange(
                    `dato${n}` as keyof ContentConfig,
                    raw === "" ? undefined : Number(raw),
                  );
                }}
                placeholder="120"
              />
              <InputField
                id={`content-leyenda${n}`}
                type="text"
                label="Leyenda"
                value={(form[`leyenda${n}` as keyof ContentConfig] as string) ?? ""}
                onChange={(e) =>
                  handleChange(
                    `leyenda${n}` as keyof ContentConfig,
                    e.target.value,
                  )
                }
                placeholder="Proyectos completados"
              />
            </div>
          ))}
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
