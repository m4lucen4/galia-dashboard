import React, { useState, useEffect } from "react";
import { SiteComponentDataProps, BodyConfig } from "../../../types";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import {
  updateSiteComponent,
  uploadBodyImage,
} from "../../../redux/actions/SiteComponentActions";
import { ImageUploader } from "./ImageUploader";
import { Button } from "../../../components/shared/ui/Button";
import { RichTextInput } from "./RichTextInput";

interface BodyEditorProps {
  component: SiteComponentDataProps;
}

const defaultBodyConfig: BodyConfig = {
  description: "",
  image_1: "",
  image_2: "",
  image_3: "",
  type: 1,
};

// ─── Layout previews ──────────────────────────────────────────────────────────

const PreviewType1: React.FC = () => (
  <svg viewBox="0 0 120 70" className="w-full h-auto" fill="none">
    {/* foto 1 */}
    <rect x="2" y="2" width="36" height="66" rx="2" fill="#D1D5DB" />
    {/* foto 2 */}
    <rect x="42" y="2" width="36" height="66" rx="2" fill="#D1D5DB" />
    {/* texto */}
    <rect x="83" y="10" width="34" height="5" rx="1" fill="#9CA3AF" />
    <rect x="83" y="20" width="28" height="3" rx="1" fill="#D1D5DB" />
    <rect x="83" y="26" width="32" height="3" rx="1" fill="#D1D5DB" />
    <rect x="83" y="32" width="24" height="3" rx="1" fill="#D1D5DB" />
  </svg>
);

const PreviewType2: React.FC = () => (
  <svg viewBox="0 0 120 70" className="w-full h-auto" fill="none">
    {/* foto grande */}
    <rect x="2" y="2" width="72" height="66" rx="2" fill="#D1D5DB" />
    {/* texto */}
    <rect x="80" y="10" width="36" height="5" rx="1" fill="#9CA3AF" />
    <rect x="80" y="20" width="30" height="3" rx="1" fill="#D1D5DB" />
    <rect x="80" y="26" width="34" height="3" rx="1" fill="#D1D5DB" />
    <rect x="80" y="32" width="22" height="3" rx="1" fill="#D1D5DB" />
  </svg>
);

const PreviewType3: React.FC = () => (
  <svg viewBox="0 0 120 70" className="w-full h-auto" fill="none">
    {/* foto 1 */}
    <rect x="2" y="2" width="24" height="66" rx="2" fill="#D1D5DB" />
    {/* foto 2 */}
    <rect x="30" y="2" width="24" height="66" rx="2" fill="#D1D5DB" />
    {/* foto 3 */}
    <rect x="58" y="2" width="24" height="66" rx="2" fill="#D1D5DB" />
    {/* texto */}
    <rect x="87" y="10" width="30" height="5" rx="1" fill="#9CA3AF" />
    <rect x="87" y="20" width="26" height="3" rx="1" fill="#D1D5DB" />
    <rect x="87" y="26" width="28" height="3" rx="1" fill="#D1D5DB" />
    <rect x="87" y="32" width="20" height="3" rx="1" fill="#D1D5DB" />
  </svg>
);

const PreviewType4: React.FC = () => (
  <svg viewBox="0 0 120 70" className="w-full h-auto" fill="none">
    {/* foto 1 — 1/4 */}
    <rect x="2" y="2" width="27" height="66" rx="2" fill="#D1D5DB" />
    {/* foto 2 — 1/4 */}
    <rect x="33" y="2" width="27" height="66" rx="2" fill="#D1D5DB" />
    {/* foto grande — 1/2 */}
    <rect x="64" y="2" width="54" height="66" rx="2" fill="#9CA3AF" />
  </svg>
);

const PreviewType5: React.FC = () => (
  <svg viewBox="0 0 120 70" className="w-full h-auto" fill="none">
    {/* foto 1 — 1/3 */}
    <rect x="2" y="2" width="36" height="66" rx="2" fill="#D1D5DB" />
    {/* foto 2 — 1/3 */}
    <rect x="42" y="2" width="36" height="66" rx="2" fill="#D1D5DB" />
    {/* foto 3 — 1/3 */}
    <rect x="82" y="2" width="36" height="66" rx="2" fill="#D1D5DB" />
  </svg>
);

const TYPE_OPTIONS: {
  value: 1 | 2 | 3 | 4 | 5;
  label: string;
  Preview: React.FC;
}[] = [
  { value: 1, label: "Foto · Foto · Texto", Preview: PreviewType1 },
  { value: 2, label: "Foto grande · Texto", Preview: PreviewType2 },
  { value: 3, label: "3 fotos · Texto", Preview: PreviewType3 },
  { value: 4, label: "Foto · Foto · Foto grande (3 col.)", Preview: PreviewType4 },
  { value: 5, label: "3 fotos iguales (sin texto)", Preview: PreviewType5 },
];

function imagesForType(type: 1 | 2 | 3 | 4 | 5): Array<1 | 2 | 3> {
  if (type === 2) return [1];
  if (type === 1) return [1, 2];
  return [1, 2, 3];
}

// ─── Component ────────────────────────────────────────────────────────────────

export const BodyEditor: React.FC<BodyEditorProps> = ({ component }) => {
  const dispatch = useAppDispatch();
  const uploadRequest = useAppSelector(
    (state) => state.siteComponent.uploadRequest,
  );

  const [form, setForm] = useState<BodyConfig>(() => {
    const cfg = component.config;
    if (!Array.isArray(cfg) && "type" in cfg && "description" in cfg)
      return cfg as BodyConfig;
    return defaultBodyConfig;
  });

  const [uploadingImage, setUploadingImage] = useState<1 | 2 | 3 | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const cfg = component.config;
    if (!Array.isArray(cfg) && "type" in cfg && "description" in cfg) {
      setForm(cfg as BodyConfig);
    }
  }, [component.config]);

  const handleTypeChange = (value: 1 | 2 | 3 | 4 | 5) => {
    setForm((prev) => ({ ...prev, type: value }));
  };

  const handleDescriptionChange = (html: string) => {
    setForm((prev) => ({ ...prev, description: html }));
  };

  const handleImageUpload = async (index: 1 | 2 | 3, file: File) => {
    setUploadingImage(index);
    await dispatch(
      uploadBodyImage({
        file,
        componentId: component.id,
        imageIndex: index,
        config: form,
      }),
    );
    setUploadingImage(null);
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

  const visibleImages = imagesForType(form.type);
  const showDescription = form.type !== 4 && form.type !== 5;

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
              onClick={() => handleTypeChange(value)}
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

      {/* ── Imágenes ────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {visibleImages.map((n) => (
          <ImageUploader
            key={n}
            label={`Imagen ${n}`}
            currentUrl={form[`image_${n}`] || null}
            onUpload={(file) => handleImageUpload(n, file)}
            loading={
              uploadingImage === n ||
              (uploadingImage === n && uploadRequest.inProgress)
            }
          />
        ))}
      </div>

      {/* ── Descripción ─────────────────────────────────────────────────────── */}
      {showDescription && (
        <RichTextInput
          label="Descripción"
          value={form.description}
          onChange={handleDescriptionChange}
          placeholder="Escribe una descripción..."
        />
      )}

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
