import React, { useState, useEffect, useRef } from "react";
import { SiteComponentDataProps, HeaderSlideConfig } from "@/types";
import { SlideEditor } from "@/features/myWeb/components/SlideEditor";
import { useAppDispatch } from "@/redux/hooks";
import {
  updateSiteComponent,
  uploadSlideImage,
} from "@/redux/actions/SiteComponentActions";
import { PlusIcon } from "@heroicons/react/24/outline";
import { PillButton } from "@/components/shared/ui/PillButton";
import { myWebEditorClassName, myWebHeadingClassName, myWebMutedClassName } from "@/features/myWeb/components/myWebStyles";

interface HeaderEditorProps {
  component: SiteComponentDataProps;
}

const MAX_SLIDES = 5;

export const HeaderEditor: React.FC<HeaderEditorProps> = ({ component }) => {
  const dispatch = useAppDispatch();
  const [uploadingSlide, setUploadingSlide] = useState<number | null>(null);

  // Local state for slides — synced from Redux only when component.config changes externally
  const [localSlides, setLocalSlides] = useState<HeaderSlideConfig[]>(() =>
    Array.isArray(component.config) ? component.config : [],
  );
  // Ref always holds the latest slides so onBlur closures don't capture stale state
  const localSlidesRef = useRef(localSlides);

  useEffect(() => {
    const slides = Array.isArray(component.config) ? component.config : [];
    setLocalSlides(slides);
    localSlidesRef.current = slides;
  }, [component.config]);

  const persistConfig = (newConfig: HeaderSlideConfig[]) => {
    dispatch(
      updateSiteComponent({
        componentId: component.id,
        updates: { config: newConfig },
      }),
    );
  };

  // Update local state immediately, persist to Redux on blur
  const handleSlideUpdate = (index: number, updated: HeaderSlideConfig) => {
    setLocalSlides((prev) => {
      const next = [...prev];
      next[index] = updated;
      localSlidesRef.current = next;
      return next;
    });
  };

  const handleSlideBlur = () => {
    persistConfig(localSlidesRef.current);
  };

  const handleAddSlide = () => {
    if (localSlides.length >= MAX_SLIDES) return;
    const newSlide: HeaderSlideConfig = {
      image_url: "",
      title: "",
      description: "",
      type: 1,
      text_button: "",
      url_button: "",
    };
    const newConfig = [...localSlides, newSlide];
    setLocalSlides(newConfig);
    persistConfig(newConfig);
  };

  const handleDeleteSlide = (index: number) => {
    if (localSlides.length <= 1) return;
    const newConfig = localSlides.filter((_, i) => i !== index);
    setLocalSlides(newConfig);
    persistConfig(newConfig);
  };

  const handleImageUpload = async (index: number, file: File) => {
    setUploadingSlide(index);
    await dispatch(
      uploadSlideImage({
        file,
        componentId: component.id,
        slideIndex: index,
        config: localSlides,
      }),
    );
    setUploadingSlide(null);
  };

  return (
    <div className={`${myWebEditorClassName} text-[#010000]`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className={myWebHeadingClassName}>
            Diapositivas ({localSlides.length}/{MAX_SLIDES})
          </h3>
          <p className={myWebMutedClassName}>Los textos se guardan al salir del campo. Máximo 5 diapositivas.</p>
        </div>
        {localSlides.length < MAX_SLIDES && (
          <PillButton onClick={handleAddSlide} variant="outline">
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            Añadir diapositiva
          </PillButton>
        )}
      </div>

      <div className="space-y-3">
        {localSlides.map((slide, index) => (
          <SlideEditor
            key={index}
            slide={slide}
            index={index}
            canDelete={localSlides.length > 1}
            onUpdate={handleSlideUpdate}
            onBlur={handleSlideBlur}
            onDelete={handleDeleteSlide}
            onImageUpload={handleImageUpload}
            uploadingSlide={uploadingSlide}
          />
        ))}
      </div>
    </div>
  );
};
