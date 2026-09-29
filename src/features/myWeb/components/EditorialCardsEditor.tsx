import React, { useEffect, useRef, useState } from "react";
import {
  EditorialCardConfig,
  EditorialCardsConfig,
  SiteComponentDataProps,
} from "../../../types";
import { useAppDispatch } from "../../../redux/hooks";
import {
  updateSiteComponent,
  uploadEditorialCardImage,
} from "../../../redux/actions/SiteComponentActions";
import { Button } from "../../../components/shared/ui/Button";
import { InputField } from "../../../components/shared/ui/InputField";
import { ImageUploader } from "./ImageUploader";
import { RichTextInput } from "./RichTextInput";

interface EditorialCardsEditorProps {
  component: SiteComponentDataProps;
}

const createCard = (): EditorialCardConfig => ({
  image_url: "",
  title: "",
  description: "",
  text_secondary_button: "",
  url_secondary_button: "",
});

const defaultEditorialCardsConfig = (): EditorialCardsConfig => ({
  cards: [createCard(), createCard()],
});

const getEditorialCardsConfig = (
  config: SiteComponentDataProps["config"],
): EditorialCardsConfig => {
  if (!Array.isArray(config) && "cards" in config && config.cards.length === 2) {
    return config as EditorialCardsConfig;
  }

  return defaultEditorialCardsConfig();
};

export const EditorialCardsEditor: React.FC<EditorialCardsEditorProps> = ({
  component,
}) => {
  const dispatch = useAppDispatch();
  const [form, setForm] = useState<EditorialCardsConfig>(() =>
    getEditorialCardsConfig(component.config),
  );
  const formRef = useRef(form);
  const dirtyRef = useRef(false);
  const formVersionRef = useRef(0);
  const uploadQueueRef = useRef(Promise.resolve());
  const imageRequestRef = useRef<[number, number]>([0, 0]);
  const pendingUploadCountsRef = useRef<[number, number]>([0, 0]);
  const failedUploadsRef = useRef<Set<0 | 1>>(new Set());
  const [uploadingCards, setUploadingCards] = useState<Set<0 | 1>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const updateForm = (
    updater: (current: EditorialCardsConfig) => EditorialCardsConfig,
  ) => {
    const next = updater(formRef.current);
    formRef.current = next;
    dirtyRef.current = true;
    formVersionRef.current += 1;
    setForm(next);
  };

  useEffect(() => {
    if (dirtyRef.current || uploadingCards.size > 0) return;

    const next = getEditorialCardsConfig(component.config);
    formRef.current = next;
    setForm(next);
  }, [component.config, uploadingCards.size]);

  const updateCard = (
    cardIndex: 0 | 1,
    updates: Partial<EditorialCardConfig>,
  ) => {
    updateForm((current) => {
      const cards = [...current.cards] as EditorialCardsConfig["cards"];
      cards[cardIndex] = { ...cards[cardIndex], ...updates };
      return { ...current, cards };
    });
  };

  const handleImageUpload = (cardIndex: 0 | 1, file: File) => {
    const requestId = imageRequestRef.current[cardIndex] + 1;
    imageRequestRef.current[cardIndex] = requestId;
    pendingUploadCountsRef.current[cardIndex] += 1;
    failedUploadsRef.current.delete(cardIndex);
    setErrorMessage("");
    setUploadingCards((current) => new Set(current).add(cardIndex));

    uploadQueueRef.current = uploadQueueRef.current
      .then(async () => {
        const result = await dispatch(
          uploadEditorialCardImage({
            file,
            componentId: component.id,
            cardIndex,
          }),
        ).unwrap();

        if (imageRequestRef.current[cardIndex] === requestId) {
          updateCard(cardIndex, { image_url: result.url });
        }
      })
      .catch(() => {
        if (imageRequestRef.current[cardIndex] === requestId) {
          failedUploadsRef.current.add(cardIndex);
          setErrorMessage("No se ha podido subir la imagen. Inténtalo de nuevo.");
        }
      })
      .finally(() => {
        pendingUploadCountsRef.current[cardIndex] -= 1;
        setUploadingCards((current) => {
          const next = new Set(current);
          if (pendingUploadCountsRef.current[cardIndex] === 0) {
            next.delete(cardIndex);
          }
          return next;
        });
      });
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage("");
    try {
      await uploadQueueRef.current;
      if (failedUploadsRef.current.size > 0) {
        setErrorMessage(
          "No se pueden guardar los cambios hasta que se suban correctamente las imágenes.",
        );
        return;
      }

      const snapshot = formRef.current;
      const snapshotVersion = formVersionRef.current;
      await dispatch(
        updateSiteComponent({
          componentId: component.id,
          updates: { config: snapshot },
        }),
      ).unwrap();
      if (formVersionRef.current === snapshotVersion) {
        dirtyRef.current = false;
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      setErrorMessage("No se han podido guardar los cambios. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {form.cards.map((card, cardIndex) => {
        const index = cardIndex as 0 | 1;
        const isUploading = uploadingCards.has(index);

        return (
          <section key={index} className="space-y-4 rounded-md border border-gray-200 p-4">
            <h4 className="text-sm font-medium text-gray-900">
              Tarjeta {index + 1}
            </h4>
            <ImageUploader
              label="Imagen"
              currentUrl={card.image_url || null}
              onUpload={(file) => handleImageUpload(index, file)}
              onRemove={() => {
                imageRequestRef.current[index] += 1;
                failedUploadsRef.current.delete(index);
                updateCard(index, { image_url: "" });
              }}
              loading={isUploading}
            />
            <InputField
              id={`editorial-card-${index + 1}-title`}
              type="text"
              label="Título"
              value={card.title}
              onChange={(event) => updateCard(index, { title: event.target.value })}
              placeholder="Título de la tarjeta"
            />
            <RichTextInput
              label="Descripción"
              value={card.description}
              onChange={(description) => updateCard(index, { description })}
              placeholder="Escribe una descripción..."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <InputField
                id={`editorial-card-${index + 1}-button-text`}
                type="text"
                label="Texto del botón secundario"
                value={card.text_secondary_button}
                onChange={(event) =>
                  updateCard(index, { text_secondary_button: event.target.value })
                }
                placeholder="Ver más"
              />
              <InputField
                id={`editorial-card-${index + 1}-button-url`}
                type="text"
                label="URL del botón secundario"
                value={card.url_secondary_button}
                onChange={(event) =>
                  updateCard(index, { url_secondary_button: event.target.value })
                }
                placeholder="https://ejemplo.com o /proyectos"
              />
            </div>
          </section>
        );
      })}
      <div className="flex items-center gap-3">
        <Button
          title={saving ? "Guardando..." : "Guardar cambios"}
          onClick={handleSave}
          disabled={saving || uploadingCards.size > 0}
        />
        {uploadingCards.size > 0 && (
          <span className="text-sm text-gray-500">Subiendo imágenes...</span>
        )}
        {saved && <span className="text-sm text-green-600">Cambios guardados</span>}
        {errorMessage && (
          <span role="alert" className="text-sm text-red-600">
            {errorMessage}
          </span>
        )}
      </div>
    </div>
  );
};
