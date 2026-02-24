import { useEffect, useRef, useState } from "react";
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
} from "@heroicons/react/24/outline";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { nasFetchFiles, nasDeleteFile } from "../../../redux/actions/NasActions";

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
}) => {
  const dispatch = useAppDispatch();
  const { files, loading, error } = useAppSelector((state) => state.nas);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isUploading = uploads.some(
    (u) => u.status === "uploading" || u.status === "pending",
  );

  useEffect(() => {
    if (isOpen) {
      dispatch(nasFetchFiles(folderPath));
    }
  }, [isOpen, folderPath, dispatch]);

  const handleClose = () => {
    if (isUploading) return;
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
        dispatch(nasFetchFiles(folderPath));
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

    xhr.open("POST", `${NAS_URL}/upload?path=${encodeURIComponent(folderPath)}`);
    xhr.setRequestHeader("x-api-key", NAS_KEY);
    xhr.send(formData);
  };

  const handleDelete = (filename: string) => {
    setDeletingFile(filename);
    dispatch(nasDeleteFile({ folderPath, filename }))
      .unwrap()
      .finally(() => setDeletingFile(null));
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-800">
                    <FolderOpenIcon className="size-5 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-semibold text-gray-900">
                      Archivos en NAS
                    </DialogTitle>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">
                      {folderPath}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => dispatch(nasFetchFiles(folderPath))}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                    title="Recargar"
                  >
                    <ArrowPathIcon
                      className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
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
              <div className="flex items-center gap-2 px-6 py-3 bg-amber-50 border-b border-amber-100">
                <ExclamationTriangleIcon className="h-4 w-4 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-700 font-medium">
                  Subida en curso. No cierres este modal hasta que finalice.
                </p>
              </div>
            )}

            {/* Body */}
            <div className="px-6 py-4 space-y-4">
              {error && (
                <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded">
                  {error}
                </p>
              )}

              {/* Upload progress */}
              {uploads.length > 0 && (
                <div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {uploads.map((upload) => (
                      <div key={upload.id} className="text-xs">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-gray-600 truncate max-w-xs">
                            {upload.name}
                          </span>
                          <span
                            className={
                              upload.status === "success"
                                ? "text-green-600 font-medium"
                                : upload.status === "error"
                                  ? "text-red-600"
                                  : "text-gray-500"
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
                  {hasFinishedUploads && (
                    <button
                      type="button"
                      onClick={clearFinishedUploads}
                      className="text-xs text-gray-400 hover:text-gray-600 underline mt-2"
                    >
                      Limpiar completados
                    </button>
                  )}
                </div>
              )}

              {/* File list */}
              {loading && fileList.length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">
                  Cargando...
                </p>
              ) : fileList.length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">
                  No hay archivos en esta carpeta
                </p>
              ) : (
                <div>
                  <p className="text-xs text-gray-500 mb-2">
                    {fileList.length} archivo{fileList.length !== 1 ? "s" : ""}
                  </p>
                  <ul className="divide-y divide-gray-100 max-h-72 overflow-y-auto pr-1">
                    {fileList.map((file) => (
                      <li
                        key={file.name}
                        className="flex items-center justify-between py-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <DocumentIcon className="h-4 w-4 text-gray-400 shrink-0" />
                          <span className="text-sm text-gray-700 truncate">
                            {file.name}
                          </span>
                          <span className="text-xs text-gray-400 shrink-0">
                            {formatBytes(file.size)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDelete(file.name)}
                          disabled={deletingFile === file.name}
                          className="ml-2 p-1 text-gray-400 hover:text-red-500 rounded shrink-0 disabled:opacity-50"
                          title="Eliminar"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-3 flex justify-end rounded-b-lg">
              <button
                type="button"
                onClick={handleClose}
                disabled={isUploading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? "Esperando subida..." : "Cerrar"}
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};
