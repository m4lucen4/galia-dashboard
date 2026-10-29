import React, { useState, useEffect } from "react";
import { SiteComponentDataProps, BodyConfig } from "@/types";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { updateSiteComponent, uploadBodyImage } from "@/redux/actions/SiteComponentActions";
import { ImageUploader } from "@/features/myWeb/components/ImageUploader";
import { PillButton } from "@/components/shared/ui/PillButton";
import { RichTextInput } from "@/features/myWeb/components/RichTextInput";
import { BodyLayoutSelector } from "@/features/myWeb/components/previews/BodyLayoutSelector";
import {
  myWebControlClassName,
  myWebEditorClassName,
  myWebGroupClassName,
} from "@/features/myWeb/components/myWebStyles";

interface BodyEditorProps {
  component: SiteComponentDataProps;
}

const defaultBodyConfig: BodyConfig = {
  description: "",
  image_1: "",
  image_2: "",
  image_3: "",
  link_1: "",
  link_2: "",
  link_3: "",
  type: 1,
};

function imagesForType(type: 1 | 2 | 3 | 4 | 5): Array<1 | 2 | 3> {
  if (type === 2) return [1];
  if (type === 1) return [1, 2];
  return [1, 2, 3];
}

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
    <div className={`${myWebEditorClassName} text-[#010000]`}>
      <BodyLayoutSelector value={form.type} onChange={handleTypeChange} />
      <section className={myWebGroupClassName}>
        <h4 className="text-base font-medium">Imágenes y enlaces</h4>
        <div className="grid min-w-0 grid-cols-1 gap-4 @min-[36rem]:grid-cols-2 @min-[52rem]:grid-cols-3">
          {visibleImages.map((n) => (
            <div key={n} className="min-w-0 space-y-3">
              <ImageUploader
                label={`Imagen ${n}`}
                currentUrl={form[`image_${n}`] || null}
                onUpload={(file) => handleImageUpload(n, file)}
                onRemove={() =>
                  setForm((prev) => ({ ...prev, [`image_${n}`]: "" }))
                }
                loading={
                  uploadingImage === n ||
                  (uploadingImage === n && uploadRequest.inProgress)
                }
              />
              <label className="block space-y-2 text-sm font-medium">
                <span>Enlace de imagen {n} (opcional)</span>
                <input
                  type="text"
                  value={form[`link_${n}` as `link_${1 | 2 | 3}`] ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      [`link_${n}`]: e.target.value,
                    }))
                  }
                  placeholder="https://ejemplo.com  o  /proyectos"
                  className={myWebControlClassName}
                />
              </label>
            </div>
          ))}
        </div>
      </section>
      {showDescription && (
        <section className={myWebGroupClassName}>
          <RichTextInput
            label="Descripción"
            value={form.description}
            onChange={handleDescriptionChange}
            placeholder="Escribe una descripción..."
          />
        </section>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <PillButton onClick={handleSave} disabled={saving}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </PillButton>
        {saved && <span role="status" className="text-sm">Cambios guardados</span>}
      </div>
    </div>
  );
};
