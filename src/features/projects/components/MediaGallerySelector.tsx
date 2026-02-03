import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { RootState } from "../../../redux/store";
import { fetchMediaItems } from "../../../redux/actions/MultimediaActions";
import {
  setCurrentPath,
  clearSelection,
} from "../../../redux/slices/MultimediaSlice";
import { FileItem as FileItemType } from "../../../types";
import { Button } from "../../../components/shared/ui/Button";
import { Breadcrumbs } from "../../multimedia/components/Breadcrumbs";
import {
  XMarkIcon,
  FolderIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";

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
  const { currentPath, files, folders, loading } = useAppSelector(
    (state: RootState) => state.multimedia,
  );

  const [selectedImages, setSelectedImages] = useState<FileItemType[]>([]);

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
    // Check if it's an image
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

  if (!isOpen) return null;

  // Filter only image files
  const imageFiles = files.filter((file) =>
    file.mime_type.startsWith("image/"),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
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

        {/* Breadcrumbs */}
        <div className="px-6 py-3 border-b bg-gray-50">
          <Breadcrumbs currentPath={currentPath} onNavigate={handleNavigate} />
        </div>

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
                        <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1">
                          <CheckCircleIcon className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>
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
      </div>
    </div>
  );
};
