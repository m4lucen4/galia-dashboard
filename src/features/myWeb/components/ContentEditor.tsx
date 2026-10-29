import React, { useState, useEffect } from "react";
import { SiteComponentDataProps, ContentConfig } from "@/types";
import { useAppDispatch } from "@/redux/hooks";
import { updateSiteComponent, uploadContentImage } from "@/redux/actions/SiteComponentActions";
import { InputField } from "@/components/shared/ui/InputField";
import { ImageUploader } from "@/features/myWeb/components/ImageUploader";
import { PillButton } from "@/components/shared/ui/PillButton";
import { RichTextInput } from "@/features/myWeb/components/RichTextInput";
import { ContentLayoutSelector } from "@/features/myWeb/components/previews/ContentLayoutSelector";
import { myWebPanelClassName, myWebLegacyControlsClassName } from "@/features/myWeb/components/myWebStyles";

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
    <div className={`@container space-y-6 text-[#010000] ${myWebLegacyControlsClassName}`}>
      <ContentLayoutSelector value={form.type} onChange={(value) => handleChange("type", value)} />
      <section className={myWebPanelClassName}>
        <h4 className="text-base font-medium">Textos principales</h4>
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
      </section>
      <section className={myWebPanelClassName}>
        <h4 className="text-base font-medium">Columna izquierda</h4>
        <RichTextInput
          label="Texto columna izquierda"
          value={form.textoIzquierda ?? ""}
          onChange={(html) => handleChange("textoIzquierda", html)}
          placeholder="Descripción principal..."
        />
      </section>
      <section className={myWebPanelClassName}>
        <h4 className="text-base font-medium">Columna derecha</h4>
        <ImageUploader
          label="Imagen columna derecha"
          currentUrl={form.image || null}
          onUpload={handleImageUpload}
          onRemove={() => setForm((prev) => ({ ...prev, image: "" }))}
          loading={uploadingImage}
        />
        <RichTextInput
          label="Texto columna derecha"
          value={form.textoDerecha ?? ""}
          onChange={(html) => handleChange("textoDerecha", html)}
          placeholder="Texto complementario..."
        />
      </section>
      <section className={myWebPanelClassName}>
        <h4 className="text-base font-medium">Datos estadísticos</h4>
        <div className="grid grid-cols-1 gap-4 @min-[28rem]:grid-cols-2">
          {([1, 2, 3, 4] as const).map((n) => (
            <div key={n} className="min-w-0 space-y-3 rounded-2xl border border-[#010000]/20 p-4">
              <p className="text-sm font-medium">Dato {n}</p>
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
