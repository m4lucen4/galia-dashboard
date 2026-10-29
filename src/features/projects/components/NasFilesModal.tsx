import { useEffect, useRef, useState } from "react";
import { PillButton } from "@/components/shared/ui/PillButton";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  ArrowUpTrayIcon,
  DocumentIcon,
  TrashIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  FolderOpenIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

const IMAGE_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "tiff", "tif", "bmp", "heic",
]);

function isImage(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTENSIONS.has(ext);
}

function thumbnailUrl(filePath: string): string {
  return `${NAS_URL}/serve?path=${encodeURIComponent(filePath)}&apikey=${NAS_KEY}`;
}

import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import {
  nasFetchFiles,
  nasDeleteFile,
  nasDeletePhoto,
} from "../../../redux/actions/NasActions";
import { deleteProjectPhoto, addProjectPhotos } from "../../../redux/actions/ProjectPhotoActions";
import { usePhotoProcessor } from "../hooks/usePhotoProcessor";
import { enrichFotoTagsWithStorage } from "../utils/enrichFotoTags";

const NAS_URL = import.meta.env.VITE_NAS_PROXY_URL;
const NAS_KEY = import.meta.env.VITE_NAS_PROXY_API_KEY;

interface UploadItem {
  id: string;
  name: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

interface NasFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderPath: string;
  projectId?: string;
  odooId?: string;
  userId?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const NasFilesModal: React.FC<NasFilesModalProps> = ({
  isOpen,
  onClose,
  folderPath,
  projectId,
  odooId,
  userId,
}) => {
  const dispatch = useAppDispatch();
  const { files, loading, error } = useAppSelector((state) => state.nas);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { processorState, processorMessage, addPhotosResult, startAddPhotos } =
    usePhotoProcessor();

  // Base project folder (no leading slash, no suffix) — used by POST /add-photos and uploads
  const baseFolder = folderPath.replace(/^\//, "").split("/").slice(0, -1).join("/");

  // When projectId is set, uploads go to the project root so add_photos.py detects them
  const uploadTarget = projectId ? baseFolder : folderPath;

  const isUploading = uploads.some(
    (u) => u.status === "uploading" || u.status === "pending",
  );
  const isProcessing = processorState === "processing";
  const hasSuccessfulUploads = uploads.some((u) => u.status === "success");

  useEffect(() => {
    if (isOpen) {
      dispatch(nasFetchFiles(folderPath));
    }
  }, [isOpen, folderPath, dispatch]);

  // After add-photos completes, upload heroica/principal to Supabase Storage and insert records
  useEffect(() => {
    if (processorState !== "done" || !addPhotosResult?.foto_tags || !projectId) return;

    const insertPhotos = async () => {
      const enriched = userId
        ? await enrichFotoTagsWithStorage(
            addPhotosResult.foto_tags,
            baseFolder,
            `${projectId}_baja`,
            projectId,
            userId,
          )
        : addPhotosResult.foto_tags;

      dispatch(addProjectPhotos({ projectId, fotoTags: enriched, nasBasePath: baseFolder }));
      dispatch(nasFetchFiles(folderPath));
    };

    insertPhotos();
  }, [processorState, addPhotosResult, projectId, userId, dispatch, folderPath, baseFolder]);

  const handleClose = () => {
    if (isUploading || isProcessing) return;
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const newItems: UploadItem[] = selectedFiles.map((file) => ({
      id: `${Date.now()}-${file.name}`,
      name: file.name,
      progress: 0,
      status: "pending",
    }));

    setUploads((prev) => [...prev, ...newItems]);
    selectedFiles.forEach((file, index) => uploadFile(file, newItems[index].id));

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadFile = (file: File, uploadId: string) => {
    setUploads((prev) =>
      prev.map((u) => (u.id === uploadId ? { ...u, status: "uploading" } : u)),
    );

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const progress = Math.round((e.loaded / e.total) * 100);
        setUploads((prev) =>
          prev.map((u) => (u.id === uploadId ? { ...u, progress } : u)),
        );
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId
              ? { ...u, status: "success", progress: 100 }
              : u,
          ),
        );
        // Only refresh the _min gallery if not in project mode
        // (thumbnails won't exist until after processing)
        if (!projectId) {
          dispatch(nasFetchFiles(folderPath));
        }
      } else {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId
              ? { ...u, status: "error", error: `Error ${xhr.status}` }
              : u,
          ),
        );
      }
    };

    xhr.onerror = () => {
      setUploads((prev) =>
        prev.map((u) =>
          u.id === uploadId
            ? { ...u, status: "error", error: "Error de red" }
            : u,
        ),
      );
    };

    xhr.open("POST", `${NAS_URL}/upload?path=${encodeURIComponent(uploadTarget)}`);
    xhr.setRequestHeader("x-api-key", NAS_KEY);
    xhr.send(formData);
  };

  const handleDelete = (filename: string) => {
    setDeletingFile(filename);

    if (projectId) {
      dispatch(nasDeletePhoto({ folder: baseFolder, filename, projectId }))
        .unwrap()
        .then(() => {
          dispatch(deleteProjectPhoto({ projectId, filename }));
          dispatch(nasFetchFiles(folderPath));
        })
        .finally(() => setDeletingFile(null));
    } else {
      dispatch(nasDeleteFile({ folderPath, filename }))
        .unwrap()
        .finally(() => setDeletingFile(null));
    }
  };

  const handleAnalyze = () => {
    startAddPhotos(baseFolder, projectId!, odooId ?? "");
  };

  const clearFinishedUploads = () => {
    setUploads((prev) =>
      prev.filter((u) => u.status === "pending" || u.status === "uploading"),
    );
  };

  const hasFinishedUploads = uploads.some(
    (u) => u.status === "success" || u.status === "error",
  );

  const fileList = files.filter((f) => !f.isDirectory);

  const isLocked = isUploading || isProcessing;

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-55 font-['Hanken_Grotesk'] text-[#010000]">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-[#010000]/45 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto font-['Hanken_Grotesk'] text-[#010000] [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-2 [&_button]:focus-visible:outline-[#010000]">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel
            transition
            className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl transform flex-col overflow-hidden rounded-[28px] border-[1.5px] border-[#010000] bg-[#d8e4d6] text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
          >
            {/* Header */}
            <div className="shrink-0 border-b border-[#010000]/20 px-5 py-5 sm:px-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#010000]">
                    <FolderOpenIcon className="size-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-xl font-semibold tracking-tight">
                      Archivos en NAS
                    </DialogTitle>
                    <p className="mt-1 break-all font-mono text-xs text-[#010000]/65">
                      {folderPath}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => dispatch(nasFetchFiles(folderPath))}
                    className="flex size-11 items-center justify-center rounded-full border border-[#010000]/40 hover:bg-[#010000]/10"
                    title="Recargar"
                  >
                    <ArrowPathIcon
                      className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="inline-flex min-h-11 items-center rounded-full border-[1.5px] border-[#010000] bg-[#010000] px-4 py-2 text-sm font-medium text-[#d8e4d6] hover:bg-[#010000]/80 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowUpTrayIcon className="h-4 w-4 mr-1.5" />
                    Subir archivos
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
              </div>
            </div>

            {/* Warning durante subida */}
            {isUploading && (
              <div className="flex shrink-0 items-center gap-2 border-b border-amber-800/20 bg-amber-50 px-5 py-3 sm:px-7">
                <ExclamationTriangleIcon className="h-4 w-4 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-700 font-medium">
                  Subida en curso. No cierres este modal hasta que finalice.
                </p>
              </div>
            )}

            {/* Warning durante procesado */}
            {isProcessing && (
              <div className="flex shrink-0 items-center gap-2 border-b border-[#010000]/20 bg-white/25 px-5 py-3 sm:px-7">
                <ArrowPathIcon className="h-4 w-4 shrink-0 animate-spin text-[#010000]/65" />
                <p className="text-xs font-medium text-[#010000]/75">
                  Procesando fotos... No cierres este modal hasta que finalice.
                </p>
              </div>
            )}

            {/* Body */}
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
              {error && (
                <p className="rounded-2xl border border-red-800/25 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </p>
              )}

              {/* Upload progress */}
              {uploads.length > 0 && (
                <div>
                  <div className="max-h-40 space-y-3 overflow-y-auto rounded-2xl border border-[#010000]/20 bg-white/25 p-4">
                    {uploads.map((upload) => (
                      <div key={upload.id} className="text-xs">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="min-w-0 max-w-xs truncate text-[#010000]/75">
                            {upload.name}
                          </span>
                          <span
                            className={
                              upload.status === "success"
                                ? "shrink-0 font-mono font-medium text-green-800"
                                : upload.status === "error"
                                  ? "shrink-0 text-red-800"
                                  : "shrink-0 font-mono text-[#010000]/65"
                            }
                          >
                            {upload.status === "success"
                              ? "✓ Subido"
                              : upload.status === "error"
                                ? `✗ ${upload.error}`
                                : `${upload.progress}%`}
                          </span>
                        </div>
                        {(upload.status === "uploading" ||
                          upload.status === "pending") && (
                          <div className="h-1 w-full rounded-full bg-[#010000]/15">
                            <div
                              className="h-1 rounded-full bg-[#010000] transition-all duration-200"
                              style={{ width: `${upload.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {hasFinishedUploads && (
                    <button
                      type="button"
                      onClick={clearFinishedUploads}
                      className="mt-2 min-h-11 rounded-full px-3 text-xs underline underline-offset-4 hover:bg-[#010000]/10"
                    >
                      Limpiar completados
                    </button>
                  )}
                </div>
              )}

              {/* Botón analizar fotos nuevas */}
              {projectId && hasSuccessfulUploads && !isUploading && !isProcessing && (
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-[#010000]/35 bg-white/25 p-5">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      Fotos listas para procesar
                    </p>
                    <p className="mt-1 text-sm text-[#010000]/65">
                      Se generarán las versiones baja, baja_ma y min y se analizarán automáticamente.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAnalyze}
                    className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-[#010000] px-5 py-2 text-sm font-medium text-[#d8e4d6] hover:bg-[#010000]/80"
                  >
                    <SparklesIcon className="h-3.5 w-3.5" />
                    Analizar
                  </button>
                </div>
              )}

              {/* Resultado del procesado */}
              {processorState === "done" && (
                <div className="flex items-center gap-2 rounded-2xl border border-[#010000]/25 bg-white/30 p-4">
                  <span className="text-green-600 text-sm">✓</span>
                  <p className="text-xs text-green-700 font-medium">
                    {processorMessage}
                  </p>
                </div>
              )}
              {processorState === "error" && (
                <div className="rounded-2xl border border-red-800/25 bg-red-50 p-4">
                  <p className="text-xs text-red-700 font-medium">
                    {processorMessage || "Error al procesar las fotos."}
                  </p>
                </div>
              )}

              {/* File list */}
              {loading && fileList.length === 0 ? (
                <p className="rounded-[28px] border border-dashed border-[#010000]/35 px-4 py-10 text-center text-sm text-[#010000]/65">
                  Cargando...
                </p>
              ) : fileList.length === 0 ? (
                <p className="rounded-[28px] border border-dashed border-[#010000]/35 px-4 py-10 text-center text-sm text-[#010000]/65">
                  No hay archivos en esta carpeta
                </p>
              ) : (
                <div>
                  <p className="mb-3 font-mono text-xs text-[#010000]/65">
                    {fileList.length} archivo{fileList.length !== 1 ? "s" : ""}
                  </p>
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {fileList.map((file) => (
                      <li key={file.name} className="relative group">
                        {isImage(file.name) ? (
                          <>
                            <img
                              src={thumbnailUrl(file.path)}
                              alt={file.name}
                              loading="lazy"
                              className="h-32 w-full rounded-2xl border border-[#010000]/20 bg-white/30 object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleDelete(file.name)}
                              disabled={deletingFile === file.name}
                              className="absolute right-1 top-1 flex size-9 items-center justify-center rounded-full border border-[#010000]/20 bg-[#d8e4d6] text-[#010000] transition-colors hover:bg-red-50 hover:text-red-800 disabled:opacity-50"
                              title="Eliminar"
                            >
                              <TrashIcon className="h-3.5 w-3.5" />
                            </button>
                            <p className="mt-2 truncate px-1 font-mono text-xs text-[#010000]/70">
                              {file.name}
                            </p>
                          </>
                        ) : (
                          <div className="flex h-full flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#010000]/25 bg-white/25 p-3">
                            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                              <DocumentIcon className="h-4 w-4 text-gray-400 shrink-0" />
                              <span className="text-sm text-gray-700 truncate">
                                {file.name}
                              </span>
                              <span className="shrink-0 font-mono text-xs text-[#010000]/65">
                                {formatBytes(file.size)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDelete(file.name)}
                              disabled={deletingFile === file.name}
                              className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-red-50 hover:text-red-800 disabled:opacity-50"
                              title="Eliminar"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex shrink-0 justify-end border-t border-[#010000]/20 px-5 py-4 sm:px-7">
              <PillButton
                variant="outline"
                type="button"
                onClick={handleClose}
                disabled={isLocked}
              >
                {isUploading
                  ? "Esperando subida..."
                  : isProcessing
                    ? "Procesando..."
                    : "Cerrar"}
              </PillButton>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};
