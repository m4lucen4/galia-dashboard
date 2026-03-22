import { useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  FolderArrowDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import {
  usePhotoProcessor,
  type ProcessorAnalysis,
} from "../hooks/usePhotoProcessor";
import type { UserDataProps } from "../../../types";
import { UserSearchSelector } from "./UserSearchSelector";

const NAS_URL = import.meta.env.VITE_NAS_PROXY_URL;
const NAS_KEY = import.meta.env.VITE_NAS_PROXY_API_KEY;

interface FileUploadItem {
  id: string;
  relativePath: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  size: number;
}

interface UploadSummary {
  folderName: string;
  totalFiles: number;
  totalSize: number;
  successCount: number;
  errorCount: number;
}

interface MultimediaUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  userNasFolder: string;
  photographers?: UserDataProps[];
  onCreateProject?: (
    analysis: ProcessorAnalysis,
    folderPath: string,
    targetUserId?: string,
  ) => void;
}

type ModalState = "idle" | "uploading" | "processing" | "done";

function normalizeFolderName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // remove diacritics (tildes, accents)
    .toLowerCase()
    .replace(/\s+/g, "_")              // spaces → underscores
    .replace(/[^a-z0-9_-]/g, "")      // remove anything not allowed
    .replace(/_{2,}/g, "_")            // collapse consecutive underscores
    .replace(/^[-_]+|[-_]+$/g, "");    // trim leading/trailing - or _
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

async function readAllFiles(
  dirEntry: FileSystemDirectoryEntry,
  basePath = "",
): Promise<{ file: File; relativePath: string }[]> {
  const results: { file: File; relativePath: string }[] = [];
  const reader = dirEntry.createReader();
  const readBatch = (): Promise<FileSystemEntry[]> =>
    new Promise((resolve, reject) => reader.readEntries(resolve, reject));

  let entries: FileSystemEntry[] = [];
  let batch: FileSystemEntry[];
  do {
    batch = await readBatch();
    entries = entries.concat(batch);
  } while (batch.length > 0);

  for (const entry of entries) {
    const entryPath = basePath ? `${basePath}/${entry.name}` : entry.name;
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) =>
        (entry as FileSystemFileEntry).file(resolve, reject),
      );
      results.push({ file, relativePath: entryPath });
    } else if (entry.isDirectory) {
      const subFiles = await readAllFiles(
        entry as FileSystemDirectoryEntry,
        entryPath,
      );
      results.push(...subFiles);
    }
  }
  return results;
}

export const MultimediaUploadModal: React.FC<MultimediaUploadModalProps> = ({
  isOpen,
  onClose,
  userNasFolder,
  photographers,
  onCreateProject,
}) => {
  const [modalState, setModalState] = useState<ModalState>("idle");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<FileUploadItem[]>([]);
  const [summary, setSummary] = useState<UploadSummary | null>(null);
  const [normalizedName, setNormalizedName] = useState<{
    original: string;
    result: string;
  } | null>(null);
  const [selectedPhotographer, setSelectedPhotographer] =
    useState<UserDataProps | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const uploadedFolderPathRef = useRef<string>("");

  const isAdminMode = !!photographers;
  const activeNasFolder = selectedPhotographer?.folder_nas ?? userNasFolder;

  const { processorState, processorMessage, analysis, startProcessing } =
    usePhotoProcessor();

  // Derived state — avoids setState inside useEffect
  const processingComplete =
    modalState === "processing" &&
    (processorState === "done" || processorState === "error");
  const isDone = modalState === "done" || processingComplete;
  const isLocked =
    modalState === "uploading" ||
    (modalState === "processing" && processorState === "processing");

  const handleClose = () => {
    if (isLocked) return;
    setModalState("idle");
    setUploads([]);
    setSummary(null);
    setDragError(null);
    setNormalizedName(null);
    setSelectedPhotographer(null);
    onClose();
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
      setDragError(null);

      const items = Array.from(e.dataTransfer.items);

      if (items.length !== 1) {
        setDragError("Solo puedes subir una carpeta a la vez.");
        return;
      }

      const entry = items[0].webkitGetAsEntry();

      if (!entry || !entry.isDirectory) {
        setDragError("Debes arrastrar una carpeta, no archivos sueltos.");
        return;
      }

      const dirEntry = entry as FileSystemDirectoryEntry;
      const originalName = dirEntry.name;
      const folderName = normalizeFolderName(originalName);

      if (!folderName) {
        setDragError(
          "El nombre de la carpeta no contiene caracteres válidos tras la normalización. Renómbrala e inténtalo de nuevo.",
        );
        return;
      }

      if (originalName !== folderName) {
        setNormalizedName({ original: originalName, result: folderName });
      }

      let allFiles: { file: File; relativePath: string }[];
      try {
        allFiles = await readAllFiles(dirEntry);
      } catch {
        setDragError("Error leyendo la carpeta. Inténtalo de nuevo.");
        return;
      }

      if (allFiles.length === 0) {
        setDragError("La carpeta está vacía.");
        return;
      }

      const uploadItems: FileUploadItem[] = allFiles.map(
        ({ file, relativePath }, i) => ({
          id: `${Date.now()}-${i}`,
          relativePath,
          progress: 0,
          status: "pending",
          size: file.size,
        }),
      );

      setUploads(uploadItems);
      setModalState("uploading");

      const summaryData: UploadSummary = {
        folderName,
        totalFiles: allFiles.length,
        totalSize: allFiles.reduce((acc, { file }) => acc + file.size, 0),
        successCount: 0,
        errorCount: 0,
      };

      for (let i = 0; i < allFiles.length; i++) {
        const { file, relativePath } = allFiles[i];
        const uploadId = uploadItems[i].id;

        const relDir = relativePath.includes("/")
          ? relativePath.substring(0, relativePath.lastIndexOf("/"))
          : "";
        const destPath = relDir
          ? `/${activeNasFolder}/${folderName}/${relDir}`
          : `/${activeNasFolder}/${folderName}`;

        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId ? { ...u, status: "uploading" } : u,
          ),
        );

        await new Promise<void>((resolve) => {
          const formData = new FormData();
          formData.append("file", file);
          const xhr = new XMLHttpRequest();

          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable) {
              const progress = Math.round((ev.loaded / ev.total) * 100);
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
              summaryData.successCount++;
            } else {
              setUploads((prev) =>
                prev.map((u) =>
                  u.id === uploadId
                    ? { ...u, status: "error", error: "Error al subir" }
                    : u,
                ),
              );
              summaryData.errorCount++;
            }
            resolve();
          };

          xhr.onerror = () => {
            setUploads((prev) =>
              prev.map((u) =>
                u.id === uploadId
                  ? { ...u, status: "error", error: "Error al subir" }
                  : u,
              ),
            );
            summaryData.errorCount++;
            resolve();
          };

          xhr.open(
            "POST",
            `${NAS_URL}/upload?path=${encodeURIComponent(destPath)}`,
          );
          xhr.setRequestHeader("x-api-key", NAS_KEY);
          xhr.send(formData);
        });
      }

      setSummary({ ...summaryData });

      // Only trigger processing if all files uploaded successfully
      if (summaryData.errorCount === 0) {
        const folderPath = `${activeNasFolder}/${folderName}`;
        uploadedFolderPathRef.current = folderPath;
        setModalState("processing");
        startProcessing(folderPath);
      } else {
        setModalState("done");
      }
    },
    [activeNasFolder, startProcessing],
  );

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-60">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
      />
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel
            transition
            className="relative transform rounded-lg bg-white text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 w-full sm:max-w-2xl"
          >
            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-800">
                  <FolderArrowDownIcon className="size-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-base font-semibold text-gray-900">
                    Crear desde multimedia
                  </DialogTitle>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Arrastra una carpeta con tus fotografías para crear un
                    proyecto. Se mantendrá la estructura de carpetas dentro del
                    proyecto. Solo se aceptan archivos dentro de una carpeta, no
                    archivos sueltos.
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-6 space-y-4">
              {/* Drop zone */}
              {modalState === "idle" && (
                <>
                  {/* Photographer selector — admin mode only */}
                  {isAdminMode && (
                    <UserSearchSelector
                      users={photographers!}
                      selectedUser={selectedPhotographer?.uid ?? null}
                      onUserSelect={(uid) =>
                        setSelectedPhotographer(
                          photographers!.find((p) => p.uid === uid) ?? null,
                        )
                      }
                    />
                  )}

                  <div
                    ref={dropZoneRef}
                    onDragOver={isAdminMode && !selectedPhotographer ? undefined : handleDragOver}
                    onDragLeave={isAdminMode && !selectedPhotographer ? undefined : handleDragLeave}
                    onDrop={isAdminMode && !selectedPhotographer ? undefined : handleDrop}
                    className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg py-14 px-6 transition-colors ${
                      isAdminMode && !selectedPhotographer
                        ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                        : isDraggingOver
                          ? "border-black bg-gray-50"
                          : "border-gray-300 bg-white"
                    }`}
                  >
                    <FolderArrowDownIcon
                      className={`h-12 w-12 mb-3 transition-colors ${
                        isDraggingOver ? "text-black" : "text-gray-300"
                      }`}
                    />
                    <p className="text-sm font-medium text-gray-700">
                      Arrastra aquí tu carpeta
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Solo se admite una carpeta. No se aceptan archivos
                      sueltos.
                    </p>
                  </div>
                  {dragError && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-md">
                      <ExclamationTriangleIcon className="h-4 w-4 text-red-500 shrink-0" />
                      <p className="text-xs text-red-600">{dragError}</p>
                    </div>
                  )}
                </>
              )}

              {/* Normalization notice — shown once uploading starts */}
              {normalizedName && (
                <div className="flex items-start gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-md">
                  <ExclamationTriangleIcon className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    El nombre de la carpeta ha sido normalizado:{" "}
                    <span className="font-mono line-through text-blue-400">
                      {normalizedName.original}
                    </span>{" "}
                    →{" "}
                    <span className="font-mono font-semibold">
                      {normalizedName.result}
                    </span>
                  </p>
                </div>
              )}

              {/* Upload progress */}
              {(modalState === "uploading" ||
                modalState === "processing" ||
                isDone) && (
                <div className="space-y-4">
                  {modalState === "uploading" && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-md">
                      <ExclamationTriangleIcon className="h-4 w-4 text-amber-500 shrink-0" />
                      <p className="text-xs text-amber-700 font-medium">
                        Subida en curso. No cierres este modal hasta que
                        finalice.
                      </p>
                    </div>
                  )}

                  <div className="max-h-48 overflow-y-auto pr-1 space-y-2">
                    {uploads.map((upload) => (
                      <div key={upload.id} className="text-xs">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-gray-600 truncate max-w-sm font-mono">
                            {upload.relativePath}
                          </span>
                          <span
                            className={`ml-2 shrink-0 ${
                              upload.status === "success"
                                ? "text-green-600 font-medium"
                                : upload.status === "error"
                                  ? "text-red-600"
                                  : "text-gray-500"
                            }`}
                          >
                            {upload.status === "success"
                              ? "✓"
                              : upload.status === "error"
                                ? `✗ ${upload.error}`
                                : `${upload.progress}%`}
                          </span>
                        </div>
                        {(upload.status === "uploading" ||
                          upload.status === "pending") && (
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div
                              className="bg-black h-1 rounded-full transition-all duration-200"
                              style={{ width: `${upload.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Processing spinner */}
                  {modalState === "processing" && processorState === "processing" && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <svg
                        className="animate-spin h-5 w-5 text-gray-600 shrink-0"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Procesando imágenes...
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Generando versiones de alta, baja y miniaturas. No
                          cierres este modal.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  {isDone && summary && (
                    <div className="space-y-3">
                      {/* Upload summary */}
                      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Subida
                        </p>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                          <dt className="text-gray-500">Carpeta</dt>
                          <dd className="font-mono text-gray-800 font-medium">
                            {summary.folderName}
                          </dd>
                          <dt className="text-gray-500">Archivos subidos</dt>
                          <dd className="text-gray-800 font-medium">
                            {summary.successCount} / {summary.totalFiles}
                          </dd>
                          <dt className="text-gray-500">Tamaño total</dt>
                          <dd className="text-gray-800 font-medium">
                            {formatBytes(summary.totalSize)}
                          </dd>
                          {summary.errorCount > 0 && (
                            <>
                              <dt className="text-red-500">Errores</dt>
                              <dd className="text-red-600 font-medium">
                                {summary.errorCount} archivo
                                {summary.errorCount !== 1 ? "s" : ""}
                              </dd>
                            </>
                          )}
                        </dl>
                      </div>

                      {/* Processing result */}
                      {processorState !== "idle" && (
                        <div
                          className={`border rounded-lg p-4 ${
                            processorState === "done"
                              ? "border-green-200 bg-green-50"
                              : "border-red-200 bg-red-50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {processorState === "done" ? (
                              <CheckCircleIcon className="h-5 w-5 text-green-600 shrink-0" />
                            ) : (
                              <XCircleIcon className="h-5 w-5 text-red-500 shrink-0" />
                            )}
                            <div>
                              <p
                                className={`text-sm font-semibold ${
                                  processorState === "done"
                                    ? "text-green-800"
                                    : "text-red-700"
                                }`}
                              >
                                {processorState === "done"
                                  ? "Procesado completado"
                                  : "Error en el procesado"}
                              </p>
                              {processorMessage && (
                                <p
                                  className={`text-xs mt-0.5 ${
                                    processorState === "done"
                                      ? "text-green-700"
                                      : "text-red-600"
                                  }`}
                                >
                                  {processorMessage}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Upload errors without processing (errorCount > 0) */}
                      {summary.errorCount > 0 && processorState === "idle" && (
                        <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                          <div className="flex items-center gap-2">
                            <XCircleIcon className="h-5 w-5 text-red-500 shrink-0" />
                            <p className="text-sm font-semibold text-red-700">
                              Procesado omitido
                            </p>
                          </div>
                          <p className="text-xs text-red-600 mt-1 ml-7">
                            Algunos archivos no se subieron correctamente. Revisa
                            los errores y vuelve a intentarlo.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-3 flex justify-end gap-2 rounded-b-lg">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLocked}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {modalState === "uploading"
                  ? "Subiendo..."
                  : modalState === "processing" && processorState === "processing"
                    ? "Procesando..."
                    : "Cerrar"}
              </button>
              {isDone && processorState === "done" && analysis && onCreateProject && (
                <button
                  type="button"
                  onClick={() => {
                    onCreateProject(
                      analysis,
                      uploadedFolderPathRef.current,
                      selectedPhotographer?.uid,
                    );
                    handleClose();
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-black border border-transparent rounded-md shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                >
                  Crear proyecto
                </button>
              )}
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};
