import { useEffect, useRef, useState } from "react";
import {
  ArrowUpTrayIcon,
  DocumentIcon,
  TrashIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import {
  nasFetchFiles,
  nasDeleteFile,
} from "../../../redux/actions/NasActions";
import { clearNasFiles } from "../../../redux/slices/NasSlice";

const NAS_URL = import.meta.env.VITE_NAS_PROXY_URL;
const NAS_KEY = import.meta.env.VITE_NAS_PROXY_API_KEY;

interface UploadItem {
  id: string;
  name: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

interface NasFilesSectionProps {
  folderPath: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const NasFilesSection: React.FC<NasFilesSectionProps> = ({
  folderPath,
}) => {
  const dispatch = useAppDispatch();
  const { files, loading, error } = useAppSelector((state) => state.nas);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dispatch(nasFetchFiles(folderPath));
    return () => {
      dispatch(clearNasFiles());
    };
  }, [dispatch, folderPath]);

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

    selectedFiles.forEach((file, index) => {
      uploadFile(file, newItems[index].id);
    });

    // Reset input so the same file can be selected again
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
            u.id === uploadId ? { ...u, status: "success", progress: 100 } : u,
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

    xhr.open(
      "POST",
      `${NAS_URL}/upload?path=${encodeURIComponent(folderPath)}`,
    );
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

  return (
    <div className="mt-8 border-t pt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">
            Archivos en NAS
          </h4>
          <p className="text-xs text-gray-500 mt-0.5 font-mono">{folderPath}</p>
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

      {error && (
        <p className="text-xs text-red-600 mb-3 bg-red-50 px-3 py-2 rounded">
          {error}
        </p>
      )}

      {/* Upload progress */}
      {uploads.length > 0 && (
        <div className="mb-4 space-y-2 max-h-48 overflow-y-auto pr-1">
          {uploads.map((upload) => (
            <div key={upload.id} className="text-xs">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-gray-600 truncate max-w-xs">
                  {upload.name}
                </span>
                <span
                  className={
                    upload.status === "success"
                      ? "text-green-600"
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
          {hasFinishedUploads && (
            <button
              type="button"
              onClick={clearFinishedUploads}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Limpiar completados
            </button>
          )}
        </div>
      )}

      {/* File list */}
      {loading && files.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">Cargando...</p>
      ) : files.filter((f) => !f.isDirectory).length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">
          No hay archivos en esta carpeta
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 max-h-80 overflow-y-auto pr-1">
          {files
            .filter((f) => !f.isDirectory)
            .map((file) => (
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
      )}
    </div>
  );
};
