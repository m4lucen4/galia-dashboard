import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import {
  updatePreviewProject,
  updateMainVersion,
} from "../../redux/actions/PreviewProjectActions";
import {
  PreviewProjectDataProps,
  ProjectImageData,
  PublishVersions,
  FileItem as FileItemType,
} from "../../types";
import { InputField } from "../shared/ui/InputField";
import { Button } from "../shared/ui/Button";
import {
  MAX_ITERATION_INSTRUCTIONS,
  isPublicationIterationError,
  iteratePublication,
  newIterationRequestId,
  type PublicationIterationError,
} from "@/features/postPreview/services/publicationIteration";
import { LoadingSpinner } from "../shared/ui/LoadingSpinner";
import { MediaGallerySelector } from "../../features/projects/components/MediaGallerySelector";
import {
  projectControlClassName,
  projectPanelClassName,
} from "@/features/projects/components/projectFormStyles";
import {
  PhotoIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

type PreviewProjectFormProps = {
  project: PreviewProjectDataProps;
  loading: boolean;
  onSave: () => void;
  // Called after a new version was created so the parent can refresh its data.
  onIterated: (previewId: string) => void;
  readOnly?: boolean;
};

const MAX_IMAGES = 10;
const actionClassName =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#010000]/30 px-5 py-2 text-sm font-medium transition-colors hover:bg-[#010000]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000] disabled:cursor-not-allowed disabled:opacity-40";
const sharedButtonClassName =
  "[&_button]:min-h-12 [&_button]:rounded-full [&_button]:border-[#010000] [&_button]:bg-[#010000] [&_button]:text-[#d8e4d6] [&_button]:hover:bg-[#010000]/85 [&_button]:disabled:opacity-40 [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-2 [&_button]:focus-visible:outline-[#010000]";

export const PreviewProjectForm = ({
  project,
  loading,
  onSave,
  onIterated,
  readOnly = false,
}: PreviewProjectFormProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const updateMainVersionRequest = useAppSelector(
    (state) => state.previewProject.previewProjectUpdateMainVersionRequest,
  );
  // Initialize description from project data
  const [description, setDescription] = useState(() => {
    if (project?.versions && project.versions.length > 0) {
      const mainVersionIndex = project.versions.findIndex((v) => v.main);
      const currentVersion =
        project.versions[Math.max(mainVersionIndex, 0)];
      return currentVersion?.description || "";
    }
    return project?.description_rich || "";
  });
  // Initialize images from project data
  const [images, setImages] = useState<ProjectImageData[]>(
    () => project?.image_data || [],
  );
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  // Initialize currentVersionIndex by finding the main version
  const [currentVersionIndex, setCurrentVersionIndex] = useState(() => {
    if (project?.versions && project.versions.length > 0) {
      const mainVersionIndex = project.versions.findIndex((v) => v.main);
      return Math.max(mainVersionIndex, 0);
    }
    return 0;
  });
  const [iterationInstructions, setIterationInstructions] = useState("");
  const MAX_INSTRUCTIONS_LENGTH = MAX_ITERATION_INSTRUCTIONS;
  const [versions, setVersions] = useState<PublishVersions[]>(
    () => project?.versions || [],
  );
  const [syncedVersions, setSyncedVersions] = useState(project?.versions);
  const [isIterating, setIsIterating] = useState(false);
  const [iterationError, setIterationError] =
    useState<PublicationIterationError | null>(null);
  const [iterationSucceeded, setIterationSucceeded] = useState(false);
  const iteratingRef = useRef(false);
  const onIteratedRef = useRef(onIterated);
  useEffect(() => {
    onIteratedRef.current = onIterated;
  }, [onIterated]);

  // Re-sync local state when the stored versions change (iteration refresh,
  // saving, setting the main version). The new main version becomes current.
  if (project?.versions !== syncedVersions) {
    const nextVersions = project?.versions || [];
    const mainIndex = Math.max(nextVersions.findIndex((v) => v.main), 0);
    setSyncedVersions(project?.versions);
    setVersions(nextVersions);
    setCurrentVersionIndex(mainIndex);
    if (nextVersions.length > 0) {
      setDescription(nextVersions[mainIndex]?.description || "");
    }
  }
  const [showGallerySelector, setShowGallerySelector] = useState(false);

  const handlePreviousVersion = () => {
    if (currentVersionIndex > 0) {
      const newIndex = currentVersionIndex - 1;
      setCurrentVersionIndex(newIndex);
      // Update description when navigating to a different version
      const currentVersion = versions[newIndex];
      setDescription(currentVersion?.description || "");
    }
  };

  const handleNextVersion = () => {
    if (currentVersionIndex < versions.length - 1) {
      const newIndex = currentVersionIndex + 1;
      setCurrentVersionIndex(newIndex);
      // Update description when navigating to a different version
      const currentVersion = versions[newIndex];
      setDescription(currentVersion?.description || "");
    }
  };

  const isCurrentVersionMain = () => {
    return versions[currentVersionIndex]?.main || false;
  };

  const handleSetAsMainVersion = async () => {
    if (!project.versions?.[currentVersionIndex]) {
      return;
    }

    const versionId = versions[currentVersionIndex].id;

    try {
      await dispatch(
        updateMainVersion({
          projectId: project.id,
          versionId: versionId,
        }),
      ).unwrap();

      //Refresh to show updated data
      //onSave();
    } catch (error) {
      console.error("Error setting main version:", error);
    }
  };

  const handleToggleImageSelection = (imageUrl: string) => {
    setImages((currentImages) =>
      currentImages.map((img) => {
        if (img.url === imageUrl) {
          const newStatus =
            img.status === "pending" ? "not_selected" : "pending";
          return {
            ...img,
            status: newStatus,
          };
        }
        return img;
      }),
    );
  };

  const handleRemoveImage = (imageUrl: string) => {
    setImages((currentImages) =>
      currentImages.filter((img) => img.url !== imageUrl),
    );
  };

  const handleGallerySelect = (selectedFiles: FileItemType[]) => {
    const newImageData: ProjectImageData[] = selectedFiles.map((file) => ({
      url: file.url,
      status: "pending" as const,
    }));
    setImages((prev) => [...prev, ...newImageData]);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", index.toString());
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      return;
    }

    const newImages = [...images];
    const draggedImage = newImages[draggedIndex];

    // Remove the element from its original position
    newImages.splice(draggedIndex, 1);

    // Insert new position
    newImages.splice(dropIndex, 0, draggedImage);

    setImages(newImages);
    setDraggedIndex(null);
  };

  const handleSave = async () => {
    // If versions exist, update the versions array
    if (versions.length > 0) {
      const updatedVersions = versions.map((version, index) => {
        if (index === currentVersionIndex) {
          return {
            ...version,
            description: description,
          };
        }
        return version;
      });

      await dispatch(
        updatePreviewProject({
          projectId: project.id,
          image_data: images,
          versions: updatedVersions,
        }),
      ).unwrap();
    } else {
      // If no versions, update description_rich as before
      await dispatch(
        updatePreviewProject({
          projectId: project.id,
          description_rich: description,
          image_data: images,
        }),
      ).unwrap();
    }
    onSave();
  };

  const handleIteratePublication = async () => {
    if (iteratingRef.current) return;
    iteratingRef.current = true;
    setIsIterating(true);
    setIterationError(null);
    setIterationSucceeded(false);
    try {
      // Every click, including "Reintentar", is a new deliberate request.
      const result = await iteratePublication({
        previewId: project.id,
        instructions: iterationInstructions,
        requestId: newIterationRequestId(),
      });
      const newIndex = Math.max(
        result.versions.findIndex((v) => v.id === result.versionId),
        0,
      );
      setVersions(result.versions);
      setCurrentVersionIndex(newIndex);
      setDescription(result.versions[newIndex]?.description || "");
      setIterationInstructions("");
      setIterationSucceeded(true);
      onIteratedRef.current(project.id);
    } catch (error) {
      setIterationError(
        isPublicationIterationError(error)
          ? error
          : { code: "uncertain", retryable: true },
      );
    } finally {
      iteratingRef.current = false;
      setIsIterating(false);
    }
  };

  const iterationFeedback = (
    <div aria-live="polite" className="space-y-2">
      {isIterating && (
        <p
          role="status"
          className="flex items-center justify-center gap-2 text-sm text-[#010000]/75"
        >
          <LoadingSpinner size="small" color="secondary" />
          <span>{t("publicationIteration.loading")}</span>
        </p>
      )}
      {!isIterating && iterationSucceeded && (
        <p
          role="status"
          className="rounded-2xl border border-[#010000]/25 bg-white/50 px-4 py-3 text-sm"
        >
          {t("publicationIteration.success")}
        </p>
      )}
      {!isIterating && iterationError && (
        <div
          role="alert"
          className="space-y-3 rounded-2xl border border-red-700/40 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          <p>{t(`publicationIteration.errors.${iterationError.code}`)}</p>
          {iterationError.retryable && (
            <button
              type="button"
              onClick={handleIteratePublication}
              disabled={loading}
              className={actionClassName}
            >
              {t("publicationIteration.retry")}
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (updateMainVersionRequest.inProgress) {
    return (
      <div className={`${projectPanelClassName} flex flex-col items-center justify-center bg-[#d8e4d6] py-12 font-[Hanken_Grotesk] text-[#010000]`}>
        <LoadingSpinner size="large" color="primary" />
        <p className="mt-4 text-sm text-[#010000]/60">Actualizando versión principal...</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-5 bg-[#d8e4d6] font-[Hanken_Grotesk] text-[#010000]">
      <div className={`${projectPanelClassName} [&_label]:text-base [&_label]:font-medium`}>
        <InputField
          className={`${projectControlClassName} mt-3 resize-y`}
          id="description"
          label="Descripción"
          type="textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Escribe una descripción..."
          disabled={
            readOnly ||
            isIterating ||
            (versions.length > 0 && !isCurrentVersionMain())
          }
        />
      </div>

      {/* Version Navigation */}
      {versions.length > 0 && (
        <div className={projectPanelClassName}>
          {/* Navigation arrows and version counter */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handlePreviousVersion}
              disabled={isIterating || currentVersionIndex === 0}
              className={`${actionClassName} shrink-0 px-3 ${
                currentVersionIndex === 0
                  ? "text-[#010000]/25 cursor-not-allowed"
                  : "text-[#010000]"
              }`}
              aria-label="Versión anterior"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <div className="flex flex-col items-center gap-1">
              <span className="font-['Geist_Mono'] text-sm tabular-nums">
                {currentVersionIndex + 1}/{versions.length}
              </span>
              {isCurrentVersionMain() && (
                <span className="rounded-full border border-[#010000]/25 px-3 py-1 text-xs font-medium">
                  Versión actual
                </span>
              )}
            </div>

            <button
              onClick={handleNextVersion}
              disabled={isIterating || currentVersionIndex === versions.length - 1}
              className={`${actionClassName} shrink-0 px-3 ${
                currentVersionIndex === versions.length - 1
                  ? "text-[#010000]/25 cursor-not-allowed"
                  : "text-[#010000]"
              }`}
              aria-label="Versión siguiente"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          {/* Instructions and iterate button - only on main version */}
          {!readOnly &&
            isCurrentVersionMain() &&
            versions.length < 10 && (
              <div className="space-y-2">
                {/* Instructions field */}
                <div className="w-full">
                  <textarea
                    value={iterationInstructions}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= MAX_INSTRUCTIONS_LENGTH) {
                        setIterationInstructions(value);
                      }
                    }}
                    placeholder="Indicaciones para la nueva versión (opcional)..."
                    className={`${projectControlClassName} resize-none text-sm`}
                    rows={4}
                    disabled={isIterating}
                  />
                  <div className="flex justify-end mt-1">
                    <span
                      className={`font-['Geist_Mono'] text-xs tabular-nums ${
                        iterationInstructions.length >= MAX_INSTRUCTIONS_LENGTH
                          ? "text-red-600 font-medium"
                          : "text-[#010000]/60"
                      }`}
                    >
                      {iterationInstructions.length}/{MAX_INSTRUCTIONS_LENGTH}
                    </span>
                  </div>
                </div>
                {/* Iterate button */}
                <div className="flex justify-center">
                  <button
                    onClick={handleIteratePublication}
                    disabled={loading || isIterating}
                    className={actionClassName}
                  >
                    Iterar esta publicación
                  </button>
                </div>
              </div>
            )}

          {iterationFeedback}

          {/* Set as main version button - only on non-main versions */}
          {!readOnly && !isCurrentVersionMain() && (
            <div className="flex justify-center">
              <button
                onClick={handleSetAsMainVersion}
                disabled={
                  loading || isIterating || updateMainVersionRequest.inProgress
                }
                className={actionClassName}
              >
                {updateMainVersionRequest.inProgress ? (
                  <>
                    <LoadingSpinner size="small" color="primary" />
                    <span>Actualizando...</span>
                  </>
                ) : (
                  "Establecer como versión actual"
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Instructions and button when versions don't exist */}
      {!readOnly && versions.length === 0 && (
        <div className={`${projectPanelClassName} ${sharedButtonClassName}`}>
          {/* Instructions field */}
          <div className="w-full">
            <textarea
              value={iterationInstructions}
              onChange={(e) => {
                const value = e.target.value;
                if (value.length <= MAX_INSTRUCTIONS_LENGTH) {
                  setIterationInstructions(value);
                }
              }}
              placeholder="Indicaciones para la nueva versión (opcional)..."
              className={`${projectControlClassName} resize-none text-sm`}
              rows={4}
              disabled={isIterating}
            />
            <div className="flex justify-end mt-1">
              <span
                className={`font-['Geist_Mono'] text-xs tabular-nums ${
                  iterationInstructions.length >= MAX_INSTRUCTIONS_LENGTH
                    ? "text-red-600 font-medium"
                    : "text-[#010000]/60"
                }`}
              >
                {iterationInstructions.length}/{MAX_INSTRUCTIONS_LENGTH}
              </span>
            </div>
          </div>
          {/* Iterate button */}
          <Button
            fullWidth
            title="Iterar publicación"
            disabled={loading || isIterating}
            onClick={handleIteratePublication}
          />
          {iterationFeedback}
        </div>
      )}

      <div className={projectPanelClassName}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-lg font-medium tracking-[-0.03em]">
            Imágenes de la publicación
          </h4>
          {!readOnly && images.length < MAX_IMAGES && (
            <button
              onClick={() => setShowGallerySelector(true)}
              className={actionClassName}
            >
              <PhotoIcon className="h-4 w-4" />
              <span>Multimedia</span>
            </button>
          )}
        </div>
        <p className="text-sm leading-relaxed text-[#010000]/60">
          Selecciona las imágenes que quieres incluir en la publicación. Las
          imágenes no seleccionadas no aparecerán en las publicaciones. Arrastra
          y suelta para reordenar la secuencia de publicación.
        </p>

        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-3 gap-3">
          {images.map((image, index) => (
            <div
              key={`${image.url}-${index}`}
              className={`relative group border border-[#010000]/25 bg-[#010000]/5 rounded-2xl overflow-hidden transition-all duration-200 ${
                readOnly ? "" : "cursor-move"
              } ${
                draggedIndex === index
                  ? "opacity-50 scale-95 shadow-lg"
                  : "hover:shadow-md"
              }`}
              style={{ height: "180px" }}
              draggable={!readOnly}
              onDragStart={readOnly ? undefined : (e) => handleDragStart(e, index)}
              onDragEnd={readOnly ? undefined : handleDragEnd}
              onDragOver={readOnly ? undefined : handleDragOver}
              onDrop={readOnly ? undefined : (e) => handleDrop(e, index)}
            >
              {/* Indicador de orden */}
              <div className="absolute top-2 left-2 bg-[#d8e4d6] text-[#010000] font-['Geist_Mono'] text-xs rounded-full w-7 h-7 flex items-center justify-center z-10">
                {index + 1}
              </div>

              {!readOnly && (
                <>
                  {/* Icono de drag */}
                  <div className="absolute top-2 right-2 bg-[#010000]/75 text-[#d8e4d6] p-1.5 rounded-full z-10">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      <path d="M6 6a2 2 0 110-4 2 2 0 010 4zM6 12a2 2 0 110-4 2 2 0 010 4zM6 18a2 2 0 110-4 2 2 0 010 4z" />
                      <path d="M14 6a2 2 0 110-4 2 2 0 010 4zM14 12a2 2 0 110-4 2 2 0 010 4zM14 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </div>

                  {/* Botón eliminar */}
                  <button
                    onClick={() => handleRemoveImage(image.url)}
                    className="absolute top-2 right-11 p-1.5 bg-[#d8e4d6] rounded-full text-[#010000] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000] z-10"
                    title="Eliminar imagen"
                  >
                    <XMarkIcon className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              <img
                src={image.url}
                alt={`Imagen ${index + 1}`}
                className="w-full h-full object-contain"
                onError={(e) => {
                  console.error(`Error cargando imagen: ${image.url}`);
                  e.currentTarget.src =
                    "https://via.placeholder.com/150?text=Error";
                }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-[#010000]/80 py-3 px-3">
                <label
                  className={`flex items-center justify-between text-white ${
                    readOnly ? "" : "cursor-pointer"
                  }`}
                >
                  <span className="text-xs">
                    {image.status === "pending" ? "Seleccionada" : "No seleccionada"}
                  </span>
                  <input
                    type="checkbox"
                    checked={image.status === "pending"}
                    disabled={readOnly}
                    onChange={() => handleToggleImageSelection(image.url)}
                    className="h-4 w-4 rounded accent-[#d8e4d6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!readOnly && (
        <div className={sharedButtonClassName}>
          <Button
            fullWidth
            title={loading ? "Guardando..." : "Guardar publicación"}
            disabled={loading || isIterating}
            onClick={handleSave}
          />
        </div>
      )}

      <MediaGallerySelector
        variant="dashboard"
        isOpen={showGallerySelector}
        onClose={() => setShowGallerySelector(false)}
        onSelect={handleGallerySelect}
        maxSelection={MAX_IMAGES}
        currentSelectionCount={images.length}
      />
    </div>
  );
};
