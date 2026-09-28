import { useEffect, useRef, useState } from "react";
import { useAppSelector, useAppDispatch } from "../../../redux/hooks";
import { RootState } from "../../../redux/store";
import {
  fetchMediaItems,
  createFolder,
  uploadFiles,
  deleteItems,
  moveItems,
  MoveMediaFailure,
} from "../../../redux/actions/MultimediaActions";
import {
  setCurrentPath,
  toggleSelectItem,
  clearSelection,
} from "../../../redux/slices/MultimediaSlice";
import { FileItem as FileItemType } from "../../../types";

import { Breadcrumbs } from "../components/Breadcrumbs";
import { Toolbar } from "../components/Toolbar";
import { FileGrid } from "../components/FileGrid";
import { FileUploader } from "../components/FileUploader";
import { ImagePreviewModal } from "../components/ImagePreviewModal";
import { CreateFolderModal } from "../components/CreateFolderModal";
import { MoveDestinationModal } from "../components/MoveDestinationModal";
import { useTranslation } from "react-i18next";
import { SocialMediaPreset } from "../../../helpers/imageOptimizer";
import { Alert } from "../../../components/shared/ui/Alert";
import { TrashIcon } from "@heroicons/react/24/outline";

const moveFailureStatuses = new Set<MoveMediaFailure["status"]>([
  "referenced",
  "validation",
  "conflict",
  "partial",
  "failed",
]);

const isMoveMediaFailure = (value: unknown): value is MoveMediaFailure =>
  typeof value === "object" &&
  value !== null &&
  "status" in value &&
  typeof value.status === "string" &&
  moveFailureStatuses.has(value.status as MoveMediaFailure["status"]);

export const Multimedia = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const user = useAppSelector((state: RootState) => state.auth.user);
  const {
    currentPath,
    files,
    folders,
    selectedItems,
    loading,
    createFolderLoading,
    uploadLoading,
    deleteLoading,
    moveLoading,
  } = useAppSelector((state: RootState) => state.multimedia);

  const [showUploader, setShowUploader] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItemType | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoveDestination, setShowMoveDestination] = useState(false);
  const [moveFailure, setMoveFailure] = useState<MoveMediaFailure | null>(null);
  const [showUploadError, setShowUploadError] = useState(false);
  const [uploadErrorFileName, setUploadErrorFileName] = useState<string>("");
  const [optimizationPreset, setOptimizationPreset] =
    useState<SocialMediaPreset>("social");
  const currentPathRef = useRef(currentPath);

  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  useEffect(() => {
    if (user) {
      dispatch(fetchMediaItems({ userId: user.id, path: currentPath }));
    }
  }, [dispatch, user, currentPath]);

  if (!user) {
    return null;
  }

  const handleNavigate = (path: string) => {
    dispatch(setCurrentPath(path));
  };

  const handleSelectItem = (path: string) => {
    dispatch(toggleSelectItem(path));
  };

  const handleOpenFolder = (path: string) => {
    dispatch(setCurrentPath(path));
  };

  const handleOpenFile = (file: FileItemType) => {
    setPreviewFile(file);
  };

  const handleCreateFolder = async (folderName: string) => {
    const result = await dispatch(
      createFolder({ userId: user.id, path: currentPath, folderName }),
    );
    if (createFolder.fulfilled.match(result)) {
      setShowCreateFolder(false);
    }
  };

  const handleUploadFiles = async (selectedFiles: File[]) => {
    const result = await dispatch(
      uploadFiles({ userId: user.id, path: currentPath, files: selectedFiles }),
    );
    if (uploadFiles.fulfilled.match(result)) {
      setShowUploader(false);
    } else if (uploadFiles.rejected.match(result)) {
      // Extract the file name from the first file that failed
      const fileName = selectedFiles[0]?.name || "desconocido";
      setUploadErrorFileName(fileName);
      setShowUploadError(true);
      setShowUploader(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    const itemsToDelete = selectedItems.map((path) => {
      const file = files.find((f) => f.path === path);
      return {
        path,
        type: file ? ("file" as const) : ("folder" as const),
      };
    });

    await dispatch(deleteItems({ userId: user.id, items: itemsToDelete }));
    setShowDeleteConfirm(false);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const selectedFiles = files.filter((file) => selectedItems.includes(file.path));

  const handleMoveConfirm = async (destinationPath: string) => {
    const result = await dispatch(
      moveItems({
        userId: user.id,
        items: selectedFiles.map(({ path, name }) => ({ path, name })),
        destinationPath,
      }),
    );

    await dispatch(
      fetchMediaItems({ userId: user.id, path: currentPathRef.current }),
    );

    setShowMoveDestination(false);

    if (moveItems.fulfilled.match(result)) {
      dispatch(clearSelection());
      return;
    }

    const failure = result.payload;
    setMoveFailure(
      isMoveMediaFailure(failure)
        ? failure
        : { status: "failed", message: "Unable to move media" },
    );
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          {t("multimedia.title")}
        </h3>
        <p className="text-sm text-gray-500">{t("multimedia.description")}</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <Toolbar
          selectedCount={selectedItems.length}
          onCreateFolder={() => setShowCreateFolder(true)}
          onDelete={handleDeleteClick}
          onUpload={() => setShowUploader(true)}
          deleteLoading={deleteLoading}
          onMove={() => setShowMoveDestination(true)}
          moveLoading={moveLoading}
          canMove={selectedFiles.length > 0}
        />

        <div className="p-4 border-b">
          <Breadcrumbs currentPath={currentPath} onNavigate={handleNavigate} />
        </div>

        {showUploader && (
          <div className="p-4 border-b bg-gray-50">
            {/* Preset Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Optimizar para:
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setOptimizationPreset("social")}
                  className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
                    optimizationPreset === "social"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  📱 Redes Sociales
                </button>
                <button
                  onClick={() => setOptimizationPreset("web")}
                  className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
                    optimizationPreset === "web"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  🌐 Web
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {optimizationPreset === "social" &&
                  "Optimizado a 2080px, máx 4.5MB - Perfecto para Instagram, LinkedIn, Facebook"}
                {optimizationPreset === "web" &&
                  "Optimizado a 1920px, máx 3MB - Ideal para sitios web y carga rápida"}
              </p>
            </div>

            <FileUploader
              onFilesSelected={handleUploadFiles}
              disabled={uploadLoading}
              preset={optimizationPreset}
            />
            {uploadLoading && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">Uploading images...</p>
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowUploader(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={uploadLoading}
              >
                {t("multimedia.close")}
              </button>
            </div>
          </div>
        )}

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading...</p>
              </div>
            </div>
          ) : (
            <FileGrid
              files={files}
              folders={folders}
              selectedItems={selectedItems}
              onSelectItem={handleSelectItem}
              onOpenFolder={handleOpenFolder}
              onOpenFile={handleOpenFile}
              onContextMenu={handleContextMenu}
            />
          )}
        </div>
      </div>

      <CreateFolderModal
        isOpen={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        onCreateFolder={handleCreateFolder}
        loading={createFolderLoading}
      />

      {showMoveDestination && (
        <MoveDestinationModal
          isOpen={showMoveDestination}
          userId={user.id}
          selectedCount={selectedFiles.length}
          moving={moveLoading}
          onClose={() => setShowMoveDestination(false)}
          onConfirm={handleMoveConfirm}
        />
      )}

      <ImagePreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
      />

      {showDeleteConfirm && (
        <Alert
          title={t("multimedia.deleteConfirmTitle")}
          description={t("multimedia.deleteConfirmDescription", {
            count: selectedItems.length,
          })}
          onAccept={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          icon={TrashIcon}
          iconClassName="size-6 text-white"
          disabledConfirmButton={deleteLoading}
        />
      )}

      {showUploadError && (
        <Alert
          title="Error en la subida de imagen"
          description={`Hay un problema en la subida de la imagen ${uploadErrorFileName}, asegúrese que tiene un tamaño válido y el nombre del archivo no tiene caracteres especiales`}
          onAccept={() => setShowUploadError(false)}
        />
      )}

      {moveFailure && (
        <Alert
          title={t("multimedia.moveFailedTitle")}
          description={t(`multimedia.moveErrors.${moveFailure.status}`)}
          onAccept={() => setMoveFailure(null)}
        />
      )}
    </div>
  );
};
