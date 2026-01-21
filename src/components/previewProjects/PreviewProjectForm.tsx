import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import {
  updatePreviewProject,
  updateMainVersion,
  fetchPreviewProjectById,
} from "../../redux/actions/PreviewProjectActions";
import { PreviewProjectDataProps, ProjectImageData } from "../../types";
import { InputField } from "../shared/ui/InputField";
import { Button } from "../shared/ui/Button";
import { supabase } from "../../helpers/supabase";
import { LoadingSpinner } from "../shared/ui/LoadingSpinner";

type PreviewProjectFormProps = {
  project: PreviewProjectDataProps;
  loading: boolean;
  onSave: () => void;
};

export const PreviewProjectForm = ({
  project,
  loading,
  onSave,
}: PreviewProjectFormProps) => {
  const dispatch = useAppDispatch();
  const updateMainVersionRequest = useAppSelector(
    (state) => state.previewProject.previewProjectUpdateMainVersionRequest,
  );
  // Initialize description from project data
  const [description, setDescription] = useState(() => {
    if (project?.versions && project.versions.length > 0) {
      const mainVersionIndex = project.versions.findIndex((v) => v.main);
      const currentVersion =
        project.versions[mainVersionIndex >= 0 ? mainVersionIndex : 0];
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
      return mainVersionIndex >= 0 ? mainVersionIndex : 0;
    }
    return 0;
  });
  const [isIterating, setIsIterating] = useState(false);
  const [iterationInstructions, setIterationInstructions] = useState("");
  const MAX_INSTRUCTIONS_LENGTH = 200;

  const handlePreviousVersion = () => {
    if (project.versions && currentVersionIndex > 0) {
      const newIndex = currentVersionIndex - 1;
      setCurrentVersionIndex(newIndex);
      // Update description when navigating to a different version
      const currentVersion = project.versions[newIndex];
      setDescription(currentVersion?.description || "");
    }
  };

  const handleNextVersion = () => {
    if (project.versions && currentVersionIndex < project.versions.length - 1) {
      const newIndex = currentVersionIndex + 1;
      setCurrentVersionIndex(newIndex);
      // Update description when navigating to a different version
      const currentVersion = project.versions[newIndex];
      setDescription(currentVersion?.description || "");
    }
  };

  const isCurrentVersionMain = () => {
    return project.versions?.[currentVersionIndex]?.main || false;
  };

  const handleSetAsMainVersion = async () => {
    if (!project.versions || !project.versions[currentVersionIndex]) {
      return;
    }

    const versionId = project.versions[currentVersionIndex].id;

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
    if (project.versions && project.versions.length > 0) {
      const updatedVersions = project.versions.map((version, index) => {
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
    setIsIterating(true);

    // Set timeout to stop loading after 30 seconds
    setTimeout(() => {
      setIsIterating(false);
      dispatch(fetchPreviewProjectById(project.id));
    }, 30000);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.error("No active session found");
        return;
      }

      const webhookUrl = import.meta.env
        .VITE_SUPABASE_FUNCTION_N8N_ITERATE_PUBLICATION;

      // Build URL with project ID and instructions (if provided)
      let url = `${webhookUrl}?id=${project.id}`;

      if (iterationInstructions.trim()) {
        url += `&instructions=${encodeURIComponent(iterationInstructions.trim())}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        console.error(
          "Error calling iterate publication webhook:",
          await response.text(),
        );
      }

      // Clear instructions after iteration attempt (success or failure)
      setIterationInstructions("");
    } catch (error) {
      console.error("Failed to call iterate publication workflow:", error);
      // Clear instructions even on error
      setIterationInstructions("");
    }
  };

  if (updateMainVersionRequest.inProgress || isIterating) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <LoadingSpinner size="large" color="primary" />
        <p className="mt-4 text-gray-500">
          {isIterating
            ? "Creando nueva publicación (esto puede tardar unos 30 segundos)..."
            : "Actualizando versión principal..."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <InputField
        id="description"
        label="Descripción"
        type="textarea"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Escribe una descripción..."
        disabled={
          project.versions &&
          project.versions.length > 0 &&
          !isCurrentVersionMain()
        }
      />

      {/* Version Navigation */}
      {project.versions && project.versions.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
          {/* Navigation arrows and version counter */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePreviousVersion}
              disabled={currentVersionIndex === 0}
              className={`p-2 rounded-md transition-colors ${
                currentVersionIndex === 0
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-200"
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
              <span className="text-sm font-medium text-gray-700">
                {currentVersionIndex + 1}/{project.versions.length}
              </span>
              {isCurrentVersionMain() && (
                <span className="text-xs text-blue-600 font-medium">
                  Versión actual
                </span>
              )}
            </div>

            <button
              onClick={handleNextVersion}
              disabled={currentVersionIndex === project.versions.length - 1}
              className={`p-2 rounded-md transition-colors ${
                currentVersionIndex === project.versions.length - 1
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-200"
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
          {isCurrentVersionMain() &&
            project.versions &&
            project.versions.length < 10 && (
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
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={4}
                  />
                  <div className="flex justify-end mt-1">
                    <span
                      className={`text-xs ${
                        iterationInstructions.length >= MAX_INSTRUCTIONS_LENGTH
                          ? "text-red-600 font-medium"
                          : "text-gray-500"
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
                    disabled={loading}
                    className="text-xs text-blue-600 font-medium hover:text-blue-800 underline disabled:opacity-50 cursor-pointer"
                  >
                    Iterar esta publicación
                  </button>
                </div>
              </div>
            )}

          {/* Set as main version button - only on non-main versions */}
          {!isCurrentVersionMain() && (
            <div className="flex justify-center">
              <button
                onClick={handleSetAsMainVersion}
                disabled={loading || updateMainVersionRequest.inProgress}
                className="text-xs text-green-600 font-medium hover:text-green-800 underline disabled:opacity-50 cursor-pointer flex items-center gap-1"
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
      {(!project.versions || project.versions.length === 0) && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
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
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={4}
            />
            <div className="flex justify-end mt-1">
              <span
                className={`text-xs ${
                  iterationInstructions.length >= MAX_INSTRUCTIONS_LENGTH
                    ? "text-red-600 font-medium"
                    : "text-gray-500"
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
            disabled={loading}
            onClick={handleIteratePublication}
          />
        </div>
      )}

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Imágenes de la publicación
        </h4>
        <p className="text-xs text-gray-500 mb-3">
          Selecciona las imágenes que quieres incluir en la publicación. Las
          imágenes no seleccionadas no aparecerán en las publicaciones. Arrastra
          y suelta para reordenar la secuencia de publicación.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div
              key={`${image.url}-${index}`}
              className={`relative border rounded-md overflow-hidden cursor-move transition-all duration-200 ${
                draggedIndex === index
                  ? "opacity-50 scale-95 shadow-lg"
                  : "hover:shadow-md"
              }`}
              style={{ height: "180px" }}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
            >
              {/* Indicador de orden */}
              <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center z-10">
                {index + 1}
              </div>

              {/* Icono de drag */}
              <div className="absolute top-2 right-2 bg-gray-800 bg-opacity-75 text-white p-1 rounded z-10">
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
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 py-2 px-2">
                <label className="flex items-center justify-between text-white cursor-pointer">
                  <span className="text-xs">
                    {image.status === "pending" ? "Selected" : "Not Selected"}
                  </span>
                  <input
                    type="checkbox"
                    checked={image.status === "pending"}
                    onChange={() => handleToggleImageSelection(image.url)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <Button
          fullWidth
          title={loading ? "Guardando..." : "Guardar publicación"}
          disabled={loading}
          onClick={handleSave}
        />
      </div>
    </div>
  );
};
