import React, { useEffect, useState, useLayoutEffect } from "react";
import { InputField } from "../../../components/shared/ui/InputField";
import { Button } from "../../../components/shared/ui/Button";
import {
  ProjectDataProps,
  ProjectImageData,
  UserDataProps,
  ProjectCollaboratorsProps,
  FileItem as FileItemType,
} from "../../../types";
import { CreateProjectProps } from "../../../redux/actions/ProjectActions";
import { KeywordInput } from "../../../components/shared/ui/KeywordInput";
import { Collaborators } from "../../../components/shared/ui/Collaborators";
import { SelectField } from "../../../components/shared/ui/SelectField";
import {
  ImageDragList,
  ImageItem,
} from "../../../components/shared/ui/ImageDragList";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import {
  fetchPrompts,
  fetchPromptsByUser,
} from "../../../redux/actions/AdminActions";
import { normalizeUrl } from "../../../helpers";
import { MediaGallerySelector } from "./MediaGallerySelector";
import { PhotoIcon } from "@heroicons/react/24/outline";

interface ProjectsFormProps {
  initialData?: ProjectDataProps;
  onSubmit: (project: CreateProjectProps) => void;
  loading: boolean;
  isEditMode?: boolean;
  user: UserDataProps;
}

export const ProjectsForm: React.FC<ProjectsFormProps> = ({
  initialData,
  onSubmit,
  loading,
  isEditMode = false,
  user,
}) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const defaultFormData: CreateProjectProps = {
    user: user?.uid,
    title: "",
    state: "draft",
    description: "",
    requiredAI: false,
    prompt: "",
    keywords: "",
    weblink: "",
    image_data: [],
    publications: 1,
    googleMaps: "",
    showMap: false,
    projectCollaborators: [],
  };

  const { prompts } = useAppSelector((state) => state.admin);

  const [formData, setFormData] = useState<CreateProjectProps>(
    initialData || defaultFormData,
  );
  const [allImages, setAllImages] = useState<ImageItem[]>([]);
  const [showGallerySelector, setShowGallerySelector] = useState(false);

  useEffect(() => {
    if (user?.role === "admin") {
      dispatch(fetchPrompts());
    } else if (user?.uid) {
      dispatch(fetchPromptsByUser({ userUid: user.uid }));
    }
  }, [dispatch, user?.role, user?.uid]);

  // This effect is necessary to sync initialData prop changes to local state
  // when editing different projects. While React discourages this pattern,
  // it's required here because the form needs to maintain local state for
  // user edits while also responding to prop changes when switching projects.
  /* eslint-disable */
  useLayoutEffect(() => {
    if (initialData) {
      setFormData(initialData);

      if (initialData.image_data && initialData.image_data.length > 0) {
        const existingImageItems: ImageItem[] = initialData.image_data.map(
          (img, index) => ({
            id: `existing-${index}`,
            type: "existing" as const,
            url: img.url,
            originalIndex: index,
          }),
        );
        setAllImages(existingImageItems);
      } else {
        setAllImages([]);
      }
    }
  }, [initialData]);
  /* eslint-enable */

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    if (type === "checkbox") {
      const { checked } = e.target as HTMLInputElement;
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleGallerySelect = (selectedFiles: FileItemType[]) => {
    // Convert FileItem[] to ImageItem[] with type "existing"
    const newImageItems: ImageItem[] = selectedFiles.map((file, index) => ({
      id: `gallery-${file.id}`,
      type: "existing" as const,
      url: file.url,
      originalIndex: allImages.length + index,
    }));

    setAllImages((prev) => [...prev, ...newImageItems]);

    // Also update formData.image_data to maintain the database structure
    const newImageData: ProjectImageData[] = selectedFiles.map((file) => ({
      url: file.url,
      status: "pending" as const,
    }));

    setFormData((prev) => ({
      ...prev,
      image_data: [...(prev.image_data || []), ...newImageData],
    }));
  };

  const handleRemoveImage = (id: string) => {
    setAllImages((prev) => {
      const imageToRemove = prev.find((img) => img.id === id);

      // if image is a newly added one, revoke its object URL
      if (imageToRemove?.type === "new" && imageToRemove.url) {
        URL.revokeObjectURL(imageToRemove.url);
      }

      const newImages = prev.filter((img) => img.id !== id);

      // if the removed image was an existing one, update formData.image_data
      if (imageToRemove?.type === "existing" && initialData?.image_data) {
        const updatedExistingImages: ProjectImageData[] = newImages
          .filter((img) => img.type === "existing")
          .map((img) => {
            const originalImage = initialData.image_data?.find(
              (original) => original.url === img.url,
            );
            return (
              originalImage || {
                url: img.url,
                status: "pending" as const,
              }
            );
          });

        setFormData((prevData) => ({
          ...prevData,
          image_data: updatedExistingImages,
        }));
      }

      return newImages;
    });
  };

  const handleReorderImages = (reorderedImages: ImageItem[]) => {
    setAllImages(reorderedImages);

    if (initialData?.image_data) {
      const reorderedExistingImages: ProjectImageData[] = reorderedImages
        .filter((img) => img.type === "existing")
        .map((img) => {
          const originalImage = initialData.image_data?.find(
            (original) => original.url === img.url,
          );
          return (
            originalImage || {
              url: img.url,
              status: "pending" as const,
            }
          );
        });

      setFormData((prevData) => ({
        ...prevData,
        image_data: reorderedExistingImages,
      }));
    }
  };

  const handleProjectCollaboratorsChange = (
    collaborators: ProjectCollaboratorsProps[],
  ) => {
    setFormData({ ...formData, projectCollaborators: collaborators });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Normalize the weblink URL if provided
    const normalizedWeblink = formData.weblink
      ? normalizeUrl(formData.weblink)
      : "";

    const updatedFormData = {
      ...formData,
      weblink: normalizedWeblink,
      image_data: [...(formData.image_data || [])],
    };

    onSubmit(updatedFormData);
  };

  const totalImagesCount = allImages.length;

  return (
    <form onSubmit={handleSubmit}>
      <div className="col-span-2">
        <div className="mb-2">
          <InputField
            id="title"
            label={t("projects.projectTitle")}
            placeholder={t("projects.projectPlaceholderTitle")}
            type="text"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-2">
          <InputField
            id="description"
            label={t("projects.projectDescription")}
            type="textarea"
            value={formData.description}
            onChange={handleChange}
            required
          />
        </div>
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            id="requiredAI"
            name="requiredAI"
            checked={formData.requiredAI}
            onChange={handleChange}
            className="h-4 w-4 text-black focus:ring-gray-400 border-gray-300 rounded"
          />
          <label htmlFor="active" className="ml-2 block text-sm text-gray-700">
            {t("projects.requiredAI")}
          </label>
        </div>
        {formData.requiredAI && (
          <div className="flex items-center mb-2">
            <SelectField
              id="prompt"
              label={t("projects.selectPrompt")}
              value={formData.prompt || ""}
              onChange={handleChange}
              options={[
                { value: "", label: t("projects.selectPromptOption") },
                ...prompts.map((prompt) => ({
                  value: prompt.description,
                  label: prompt.title,
                })),
              ]}
            />
          </div>
        )}
        <div className="mb-2">
          <KeywordInput
            id="keywords"
            label={t("projects.keywords")}
            value={formData.keywords || ""}
            onChange={(value) => setFormData({ ...formData, keywords: value })}
          />
        </div>
        <div className="mb-2">
          <InputField
            id="weblink"
            label={t("projects.web")}
            placeholder="https://example.com"
            type="text"
            value={formData.weblink || ""}
            onChange={handleChange}
          />
        </div>
        <div className="col-span-2 mb-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("projects.projectImages")} ({totalImagesCount}/10)
          </label>
          <div className="mt-1">
            <button
              type="button"
              onClick={() => setShowGallerySelector(true)}
              disabled={allImages.length >= 10}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PhotoIcon className="h-5 w-5 mr-2" />
              {t("projects.selectFromGallery")}
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-2">
            {t("projects.selectFromGalleryHelp")}
          </p>

          {/* Lista de imágenes con drag and drop */}
          <ImageDragList
            images={allImages}
            onReorder={handleReorderImages}
            onRemove={handleRemoveImage}
            maxImages={10}
          />

          <div className="my-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("projects.howManyPublications")}
            </label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, publications: value })
                  }
                  className={`flex-1 py-2 rounded-md transition-colors ${
                    formData.publications === value
                      ? "bg-black text-white font-medium"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end space-x-4 mb-2">
            <div className="flex-1">
              <InputField
                id="googleMaps"
                label={t("projects.googleMaps")}
                placeholder={t("projects.placeholderGoogleMaps")}
                type="url"
                value={formData.googleMaps || ""}
                onChange={handleChange}
              />
            </div>
            {user?.role === "admin" && (
              <div className="flex items-center pb-1">
                <input
                  type="checkbox"
                  id="showMap"
                  name="showMap"
                  checked={formData.showMap}
                  onChange={handleChange}
                  className="h-4 w-4 text-black focus:ring-gray-400 border-gray-300 rounded"
                />
                <label
                  htmlFor="showMap"
                  className="ml-2 block text-sm text-gray-700 whitespace-nowrap"
                >
                  Mostrar?
                </label>
              </div>
            )}
          </div>
          <div className="flex space-x-4 mb-2">
            <div className="flex-1">
              <SelectField
                id="category"
                label={t("projects.category")}
                value={formData.category || ""}
                onChange={handleChange}
                options={[
                  { value: "residencial", label: "Residencial" },
                  { value: "docente", label: "Docente" },
                  { value: "oficinas", label: "Oficinas" },
                  { value: "planeamiento", label: "Planeamiento" },
                  { value: "cultural", label: "Cultural" },
                  { value: "publico", label: "Espacio público" },
                  { value: "rehabilitacion", label: "Rehabilitación" },
                  { value: "interiorismo", label: "Interiorismo" },
                  { value: "sanitario", label: "Sanitario" },
                ]}
              />
            </div>
            <div className="flex-1">
              <InputField
                id="year"
                label={t("projects.year")}
                placeholder={t("projects.placeholderYear")}
                type="number"
                value={formData.year || ""}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="mb-2">
            <Collaborators
              collaborators={formData.projectCollaborators || []}
              onChange={handleProjectCollaboratorsChange}
            />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Button
          fullWidth
          title={
            isEditMode ? t("projects.saveChanges") : t("projects.createProject")
          }
          disabled={loading}
          type="submit"
        />
      </div>

      <MediaGallerySelector
        isOpen={showGallerySelector}
        onClose={() => setShowGallerySelector(false)}
        onSelect={handleGallerySelect}
        maxSelection={10}
        currentSelectionCount={allImages.length}
      />
    </form>
  );
};
