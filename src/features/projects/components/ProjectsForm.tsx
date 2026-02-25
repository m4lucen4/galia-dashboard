import React, { useEffect, useState } from "react";
import { InputField } from "../../../components/shared/ui/InputField";
import { Button } from "../../../components/shared/ui/Button";
import { ProjectDataProps, UserDataProps } from "../../../types";
import { CreateProjectProps } from "../../../redux/actions/ProjectActions";
import { KeywordInput } from "../../../components/shared/ui/KeywordInput";
import { Collaborators } from "../../../components/shared/ui/Collaborators";
import { SelectField } from "../../../components/shared/ui/SelectField";
import { ImageDragList } from "../../../components/shared/ui/ImageDragList";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import {
  fetchPrompts,
  fetchPromptsByUser,
} from "../../../redux/actions/AdminActions";
import { nasFetchFiles } from "../../../redux/actions/NasActions";
import { clearNasFiles } from "../../../redux/slices/NasSlice";
import { MediaGallerySelector } from "./MediaGallerySelector";
import { AIPromptSelector } from "./projectsForm/AIPromptSelector";
import { ShowGoogleMaps } from "./projectsForm/ShowGoogleMaps";
import { NasFilesModal } from "./NasFilesModal";
import { PhotoIcon, FolderOpenIcon } from "@heroicons/react/24/outline";
import { useProjectsForm } from "../hooks/useProjectsForm";

interface ProjectsFormProps {
  initialData?: ProjectDataProps;
  onSubmit: (project: CreateProjectProps) => void;
  loading: boolean;
  isEditMode?: boolean;
  user: UserDataProps;
  nasFolder?: string;
}

export const ProjectsForm: React.FC<ProjectsFormProps> = ({
  initialData,
  onSubmit,
  loading,
  isEditMode = false,
  user,
  nasFolder,
}) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [showNasModal, setShowNasModal] = useState(false);
  const { files: nasFiles } = useAppSelector((state) => state.nas);
  const { prompts } = useAppSelector((state) => state.admin);

  const {
    formData,
    setFormData,
    allImages,
    totalImagesCount,
    handleChange,
    handleSubmit,
    handleGallerySelect,
    handleRemoveImage,
    handleReorderImages,
    handleProjectCollaboratorsChange,
  } = useProjectsForm({ initialData, user, onSubmit });

  const [showGallerySelector, setShowGallerySelector] = useState(false);

  useEffect(() => {
    if (user?.role === "admin") {
      dispatch(fetchPrompts());
    } else if (user?.uid) {
      dispatch(fetchPromptsByUser({ userUid: user.uid }));
    }
  }, [dispatch, user?.role, user?.uid]);

  useEffect(() => {
    if (nasFolder) {
      dispatch(nasFetchFiles(nasFolder));
    }
    return () => {
      dispatch(clearNasFiles());
    };
  }, [dispatch, nasFolder]);

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
        <AIPromptSelector
          requiredAI={!!formData.requiredAI}
          prompt={formData.prompt || ""}
          prompts={prompts}
          onAIChange={(checked) =>
            setFormData({ ...formData, requiredAI: checked })
          }
          onPromptChange={handleChange}
        />
        <div className="flex gap-4 mb-2">
          <div className="flex-1">
            <KeywordInput
              id="keywords"
              label={t("projects.keywords")}
              value={formData.keywords || ""}
              onChange={(value) =>
                setFormData({ ...formData, keywords: value })
              }
            />
          </div>
          <div className="flex-1">
            <InputField
              id="weblink"
              label={t("projects.web")}
              placeholder="https://example.com"
              type="text"
              value={formData.weblink || ""}
              onChange={handleChange}
            />
          </div>
        </div>
        {nasFolder && (
          <div className="my-4">
            <button
              type="button"
              onClick={() => setShowNasModal(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
            >
              <FolderOpenIcon className="h-5 w-5 text-gray-500" />
              Archivos en NAS
              <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                {nasFiles.filter((f) => !f.isDirectory).length}
              </span>
            </button>
          </div>
        )}
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
          <ShowGoogleMaps
            googleMaps={formData.googleMaps || ""}
            showMap={!!formData.showMap}
            isAdmin={user?.role === "admin"}
            onGoogleMapsChange={handleChange}
            onShowMapChange={(checked) =>
              setFormData({ ...formData, showMap: checked })
            }
          />
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

      {nasFolder && (
        <NasFilesModal
          isOpen={showNasModal}
          onClose={() => setShowNasModal(false)}
          folderPath={nasFolder}
        />
      )}
    </form>
  );
};
