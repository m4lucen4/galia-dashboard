import React, { useEffect, useState } from "react";
import { InputField } from "../../../components/shared/ui/InputField";
import { PillButton } from "@/components/shared/ui/PillButton";
import {
  projectControlClassName,
  projectPanelClassName,
  projectLegendClassName,
  projectLegacyControlsClassName,
} from "./projectFormStyles";
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
  projectId?: string;
  odooId?: string;
}

export const ProjectsForm: React.FC<ProjectsFormProps> = ({
  initialData,
  onSubmit,
  loading,
  isEditMode = false,
  user,
  nasFolder,
  projectId,
  odooId,
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
    <form
      onSubmit={handleSubmit}
      className="min-w-0 space-y-6 bg-[#d8e4d6] font-['Hanken_Grotesk',system-ui,sans-serif] text-[#010000] [&_label]:text-sm [&_label]:font-medium"
    >
      <fieldset className={projectPanelClassName}>
        <legend className={projectLegendClassName}>
          {t("projects.projectTitle")}
        </legend>
        <div className="mb-2">
          <InputField
            id="title"
            className={projectControlClassName}
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
            className={projectControlClassName}
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
        <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2">
          <div
            className="min-w-0 [&>div>div]:min-h-12 [&>div>div]:rounded-2xl [&>div>div]:border-[#010000]/40 [&>div>div]:bg-transparent [&>div>div]:p-3 [&_input]:min-w-20 [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-solid [&_button]:focus-visible:outline-[#010000] [&_button]:focus-visible:outline-offset-2"
          >
            <KeywordInput
              id="keywords"
              label={t("projects.keywords")}
              value={formData.keywords || ""}
              onChange={(value) =>
                setFormData({ ...formData, keywords: value })
              }
            />
          </div>
          <div className="min-w-0">
            <InputField
              id="weblink"
              className={projectControlClassName}
              label={t("projects.web")}
              placeholder="https://example.com"
              type="text"
              value={formData.weblink || ""}
              onChange={handleChange}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className={projectPanelClassName}>
        <legend className={projectLegendClassName}>
          {t("projects.projectImages")}
        </legend>
        {nasFolder && (
          <div>
            <button
              type="button"
              onClick={() => setShowNasModal(true)}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#010000] px-5 py-3 text-sm font-medium hover:bg-[#010000]/5 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#010000] focus-visible:outline-offset-2"
            >
              <FolderOpenIcon className="h-5 w-5 shrink-0" />
              Archivos en NAS
              <span className="ml-1 rounded-full border border-current px-2 py-0.5 font-mono text-xs">
                {nasFiles.filter((f) => !f.isDirectory).length}
              </span>
            </button>
          </div>
        )}
        <div className="min-w-0 space-y-5">
          <p className="text-sm font-medium">
            {t("projects.projectImages")}{" "}
            <span className="font-mono">({totalImagesCount}/10)</span>
          </p>
          <div className="mt-1">
            <button
              type="button"
              onClick={() => setShowGallerySelector(true)}
              disabled={allImages.length >= 10}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#010000] px-5 py-3 text-sm font-medium hover:bg-[#010000]/5 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#010000] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <PhotoIcon className="h-5 w-5 mr-2" />
              {t("projects.selectFromGallery")}
            </button>
          </div>

          <p className="text-sm text-[#010000]/65">
            {t("projects.selectFromGalleryHelp")}
          </p>

          <div
            className={`${projectLegacyControlsClassName} [&_img]:rounded-2xl [&_img]:border-[#010000]/20 [&_button]:rounded-full [&_button]:bg-[#010000] [&_button]:text-[#d8e4d6] [&_button]:opacity-100 [&_.justify-between]:flex-wrap [&_.justify-between]:gap-2`}
          >
            <ImageDragList
              images={allImages}
              onReorder={handleReorderImages}
              onRemove={handleRemoveImage}
              maxImages={10}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className={projectPanelClassName}>
        <legend className={projectLegendClassName}>
          {t("projects.howManyPublications")}
        </legend>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {[1, 2, 3, 4].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setFormData({ ...formData, publications: value })
              }
              aria-pressed={formData.publications === value}
              className={`min-h-12 rounded-full border border-[#010000]/40 py-3 font-mono transition-colors focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#010000] focus-visible:outline-offset-2 ${
                formData.publications === value
                  ? "bg-[#010000] text-[#d8e4d6]"
                  : "bg-transparent text-[#010000] hover:bg-[#010000]/5"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={projectPanelClassName}>
        <legend className={projectLegendClassName}>
          {t("projects.category")} / {t("projects.year")}
        </legend>
        <ShowGoogleMaps
          googleMaps={formData.googleMaps || ""}
          showMap={!!formData.showMap}
          isAdmin={user?.role === "admin"}
          onGoogleMapsChange={handleChange}
          onShowMapChange={(checked) =>
            setFormData({ ...formData, showMap: checked })
          }
        />
        <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2">
          <div className="min-w-0">
            <SelectField
              id="category"
              className={projectControlClassName}
              label={t("projects.category")}
              value={formData.category || ""}
              onChange={handleChange}
              placeholder={t("projects.selectCategory")}
              required
              options={[
                { value: "residencial", label: "Residencial" },
                { value: "docente", label: "Docente" },
                { value: "oficinas", label: "Oficinas" },
                { value: "planeamiento", label: "Planeamiento" },
                { value: "industrial", label: "Industrial" },
                { value: "cultural", label: "Cultural" },
                { value: "publico", label: "Espacio público" },
                { value: "rehabilitacion", label: "Rehabilitación" },
                { value: "interiorismo", label: "Interiorismo" },
                { value: "sanitario", label: "Sanitario" },
              ]}
            />
          </div>
          <div className="min-w-0">
            <InputField
              id="year"
              className={projectControlClassName}
              label={t("projects.year")}
              placeholder={t("projects.placeholderYear")}
              type="number"
              value={formData.year || ""}
              onChange={handleChange}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className={projectPanelClassName}>
        <legend className={projectLegendClassName}>
          {t("projects.collaborators")}
        </legend>
        <div
          className={`${projectLegacyControlsClassName} [&_button]:rounded-full [&_div.bg-gray-50]:rounded-2xl [&_div.bg-gray-50]:border-[#010000]/20 [&_div.bg-gray-50]:bg-transparent [&_div.mb-3]:flex-wrap [&_div.mb-3]:gap-3`}
        >
          <Collaborators
            collaborators={formData.projectCollaborators || []}
            onChange={handleProjectCollaboratorsChange}
          />
        </div>
      </fieldset>

      <PillButton className="w-full" disabled={loading} type="submit">
        {isEditMode ? t("projects.saveChanges") : t("projects.createProject")}
      </PillButton>

      <MediaGallerySelector
        variant="dashboard"
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
          projectId={projectId}
          odooId={odooId}
          userId={user.id}
        />
      )}
    </form>
  );
};
