import React, { useState, useEffect, useRef } from "react";
import { SiteComponentDataProps, HeaderSlideConfig } from "../../../types";
import { SlideEditor } from "./SlideEditor";
import { useAppDispatch } from "../../../redux/hooks";
import {
  updateSiteComponent,
  uploadSlideImage,
} from "../../../redux/actions/SiteComponentActions";
import { PlusIcon } from "@heroicons/react/24/outline";
import { Button } from "../../../components/shared/ui/Button";

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">
          Slides ({localSlides.length}/{MAX_SLIDES})
        </h3>
        {localSlides.length < MAX_SLIDES && (
          <Button
            title="Añadir slide"
            icon={<PlusIcon className="h-4 w-4" />}
            onClick={handleAddSlide}
            secondary
          />
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
