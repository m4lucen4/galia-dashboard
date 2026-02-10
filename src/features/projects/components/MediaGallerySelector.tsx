import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
} from "@headlessui/react";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { RootState } from "../../../redux/store";
import {
  fetchMediaItems,
  createFolder,
  uploadFiles,
  deleteItems,
} from "../../../redux/actions/MultimediaActions";
import {
  setCurrentPath,
  clearSelection,
} from "../../../redux/slices/MultimediaSlice";
import { FileItem as FileItemType } from "../../../types";
import { Button } from "../../../components/shared/ui/Button";
import { Breadcrumbs } from "../../multimedia/components/Breadcrumbs";
import { FileUploader } from "../../multimedia/components/FileUploader";
import { CreateFolderModal } from "../../multimedia/components/CreateFolderModal";
import { ImagePreviewModal } from "../../multimedia/components/ImagePreviewModal";
import { Alert } from "../../../components/shared/ui/Alert";
import {
  XMarkIcon,
  FolderIcon,
  CheckCircleIcon,
  FolderPlusIcon,
  ArrowUpTrayIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { SocialMediaPreset } from "../../../helpers/imageOptimizer";

interface MediaGallerySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (images: FileItemType[]) => void;
  maxSelection?: number;
  currentSelectionCount?: number;
}

export const MediaGallerySelector: React.FC<MediaGallerySelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  maxSelection = 10,
  currentSelectionCount = 0,
}) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const user = useAppSelector((state: RootState) => state.auth.user);
  const {
    currentPath,
    files,
    folders,
    loading,
    createFolderLoading,
    uploadLoading,
    deleteLoading,
  } = useAppSelector((state: RootState) => state.multimedia);

  const [selectedImages, setSelectedImages] = useState<FileItemType[]>([]);
  const [showUploader, setShowUploader] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItemType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    path: string;
    type: "file" | "folder";
    name: string;
  } | null>(null);
  const [showUploadError, setShowUploadError] = useState(false);
  const [uploadErrorFileName, setUploadErrorFileName] = useState("");
  const [optimizationPreset, setOptimizationPreset] =
    useState<SocialMediaPreset>("social");

  // Calculate available slots for selection
  const availableSlots = maxSelection - currentSelectionCount;
  const canSelectMore = selectedImages.length < availableSlots;

  useEffect(() => {
    if (isOpen && user) {
      dispatch(fetchMediaItems({ userId: user.id, path: currentPath }));
    }
  }, [isOpen, user, currentPath, dispatch]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedImages([]);
      setShowUploader(false);
      setShowCreateFolder(false);
      setPreviewFile(null);
      setDeleteTarget(null);
      dispatch(clearSelection());
    }
  }, [isOpen, dispatch]);

  const handleNavigate = (path: string) => {
    dispatch(setCurrentPath(path));
  };

  const handleOpenFolder = (path: string) => {
    dispatch(setCurrentPath(path));
  };

  const handleToggleImage = (file: FileItemType) => {
    if (!file.mime_type.startsWith("image/")) {
      return;
    }

    const isSelected = selectedImages.some((img) => img.id === file.id);

    if (isSelected) {
      setSelectedImages((prev) => prev.filter((img) => img.id !== file.id));
    } else {
      if (canSelectMore) {
        setSelectedImages((prev) => [...prev, file]);
      }
    }
  };

  const handleConfirm = () => {
    onSelect(selectedImages);
    onClose();
  };

  const handleCancel = () => {
    setSelectedImages([]);
    onClose();
  };

  // --- Management handlers ---

  const handleCreateFolder = async (folderName: string) => {
    if (!user) return;
    const result = await dispatch(
      createFolder({ userId: user.id, path: currentPath, folderName }),
    );
    if (createFolder.fulfilled.match(result)) {
      setShowCreateFolder(false);
    }
  };

  const handleUploadFiles = async (selectedFiles: File[]) => {
    if (!user) return;
    const result = await dispatch(
      uploadFiles({ userId: user.id, path: currentPath, files: selectedFiles }),
    );
    if (uploadFiles.fulfilled.match(result)) {
      setShowUploader(false);
    } else if (uploadFiles.rejected.match(result)) {
      const fileName = selectedFiles[0]?.name || "desconocido";
      setUploadErrorFileName(fileName);
      setShowUploadError(true);
      setShowUploader(false);
    }
  };

  const handleDeleteClick = (
    e: React.MouseEvent,
    path: string,
    type: "file" | "folder",
    name: string,
  ) => {
    e.stopPropagation();
    setDeleteTarget({ path, type, name });
  };

  const handleDeleteConfirm = async () => {
    if (!user || !deleteTarget) return;
    await dispatch(
      deleteItems({
        userId: user.id,
        items: [{ path: deleteTarget.path, type: deleteTarget.type }],
      }),
    );
    // Remove from selection if deleted
    if (deleteTarget.type === "file") {
      setSelectedImages((prev) =>
        prev.filter((img) => img.path !== deleteTarget.path),
      );
    }
    setDeleteTarget(null);
  };

  const handleImageDoubleClick = (e: React.MouseEvent, file: FileItemType) => {
    e.stopPropagation();
    setPreviewFile(file);
  };

  // Filter only image files
  const imageFiles = files.filter((file) =>
    file.mime_type.startsWith("image/"),
  );

  return (
    <Dialog open={isOpen} onClose={handleCancel} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/50 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
      />

      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel
            transition
            className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col transition-all data-closed:opacity-0 data-closed:scale-95 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  {t("projects.selectFromGallery")}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {t("projects.selectedImages")}: {selectedImages.length} /{" "}
                  {availableSlots}
                </p>
              </div>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2 px-6 py-3 border-b bg-gray-50">
              <button
                onClick={() => setShowCreateFolder(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <FolderPlusIcon className="h-4 w-4" />
                <span>{t("multimedia.newFolder")}</span>
              </button>
              <button
                onClick={() => setShowUploader((prev) => !prev)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  showUploader
                    ? "text-blue-700 bg-blue-50 border border-blue-300"
                    : "text-white bg-blue-600 hover:bg-blue-700"
                }`}
              >
                <ArrowUpTrayIcon className="h-4 w-4" />
                <span>{t("multimedia.upload")}</span>
              </button>

              <div className="flex-1" />

              <Breadcrumbs
                currentPath={currentPath}
                onNavigate={handleNavigate}
              />
            </div>

            {/* Upload area */}
            {showUploader && (
              <div className="px-6 py-4 border-b bg-gray-50">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Optimizar para:
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOptimizationPreset("social")}
                      className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        optimizationPreset === "social"
                          ? "bg-blue-600 text-white"
                          : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      Redes Sociales
                    </button>
                    <button
                      onClick={() => setOptimizationPreset("web")}
                      className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        optimizationPreset === "web"
                          ? "bg-blue-600 text-white"
                          : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      Web
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {optimizationPreset === "social" &&
                      "Optimizado a 2080px, max 4.5MB - Perfecto para Instagram, LinkedIn, Facebook"}
                    {optimizationPreset === "web" &&
                      "Optimizado a 1920px, max 3MB - Ideal para sitios web y carga rapida"}
                  </p>
                </div>

                <FileUploader
                  onFilesSelected={handleUploadFiles}
                  disabled={uploadLoading}
                  preset={optimizationPreset}
                />
                {uploadLoading && (
                  <div className="mt-3 text-center">
                    <p className="text-sm text-gray-600">Uploading images...</p>
                  </div>
                )}
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => setShowUploader(false)}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    disabled={uploadLoading}
                  >
                    {t("multimedia.close")}
                  </button>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {/* Folders */}
                  {folders.map((folder) => (
                    <div
                      key={folder.path}
                      onClick={() => handleOpenFolder(folder.path)}
                      className="relative group cursor-pointer"
                    >
                      <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors">
                        <FolderIcon className="w-12 h-12 text-gray-400" />
                      </div>
                      <button
                        onClick={(e) =>
                          handleDeleteClick(
                            e,
                            folder.path,
                            "folder",
                            folder.name,
                          )
                        }
                        className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        title={t("multimedia.delete")}
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                      <p className="mt-2 text-sm text-gray-700 truncate">
                        {folder.name}
                      </p>
                    </div>
                  ))}

                  {/* Image Files */}
                  {imageFiles.map((file) => {
                    const isSelected = selectedImages.some(
                      (img) => img.id === file.id,
                    );
                    const canSelect = canSelectMore || isSelected;

                    return (
                      <div
                        key={file.id}
                        onClick={() => handleToggleImage(file)}
                        onDoubleClick={(e) => handleImageDoubleClick(e, file)}
                        className={`relative group cursor-pointer ${
                          !canSelect && !isSelected
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        <div
                          className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            isSelected
                              ? "border-blue-500 ring-2 ring-blue-200"
                              : "border-transparent hover:border-gray-300"
                          }`}
                        >
                          <img
                            src={file.thumbnail_url || file.url}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                          {isSelected && (
                            <div className="absolute top-2 left-2 bg-blue-500 rounded-full p-1">
                              <CheckCircleIcon className="w-5 h-5 text-white" />
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) =>
                            handleDeleteClick(e, file.path, "file", file.name)
                          }
                          className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          title={t("multimedia.delete")}
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                        <p className="mt-2 text-xs text-gray-600 truncate">
                          {file.name}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {!loading && folders.length === 0 && imageFiles.length === 0 && (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <div className="text-center">
                    <p>{t("multimedia.noImages")}</p>
                    <p className="text-sm mt-2">
                      {t("multimedia.uploadImagesFirst")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t bg-gray-50">
              <p className="text-sm text-gray-600">
                {selectedImages.length > 0
                  ? `${selectedImages.length} ${t("projects.imagesSelected")}`
                  : t("projects.selectImages")}
              </p>
              <div className="flex space-x-3">
                <Button
                  title={t("projects.cancel")}
                  onClick={handleCancel}
                  secondary
                />
                <Button
                  title={t("projects.addSelected")}
                  onClick={handleConfirm}
                  disabled={selectedImages.length === 0}
                />
              </div>
            </div>
          </DialogPanel>
        </div>
      </div>

      {/* Sub-modals */}
      <CreateFolderModal
        isOpen={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        onCreateFolder={handleCreateFolder}
        loading={createFolderLoading}
      />

      <ImagePreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
      />

      {deleteTarget && (
        <Alert
          title={t("multimedia.deleteConfirmTitle")}
          description={t("multimedia.deleteConfirmDescription", { count: 1 })}
          onAccept={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          icon={TrashIcon}
          iconClassName="size-6 text-white"
          disabledConfirmButton={deleteLoading}
        />
      )}

      {showUploadError && (
        <Alert
          title="Error en la subida de imagen"
          description={`Hay un problema en la subida de la imagen ${uploadErrorFileName}, asegurese que tiene un tamano valido y el nombre del archivo no tiene caracteres especiales`}
          onAccept={() => setShowUploadError(false)}
        />
      )}
    </Dialog>
  );
};
