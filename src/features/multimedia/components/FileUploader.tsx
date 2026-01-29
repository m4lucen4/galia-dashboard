import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  ArrowUpTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import {
  optimizeImages,
  OptimizationProgress,
  SocialMediaPreset,
  formatFileSize,
  calculateReduction,
} from "../../../helpers/imageOptimizer";

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  preset?: SocialMediaPreset;
}

export const FileUploader = ({
  onFilesSelected,
  disabled,
  preset = "social",
}: FileUploaderProps) => {
  const { t } = useTranslation();
  const [optimizing, setOptimizing] = useState(false);
  const [progressList, setProgressList] = useState<OptimizationProgress[]>([]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const validFiles = acceptedFiles.slice(0, 25);

      const errors: string[] = [];
      const filteredFiles = validFiles.filter((file) => {
        if (!file.type.startsWith("image/")) {
          errors.push(`${file.name} is not an image`);
          return false;
        }
        // Aumentamos el límite ya que vamos a optimizar
        if (file.size > 50 * 1024 * 1024) {
          // 50MB antes de optimizar
          errors.push(
            `${file.name} is too large (max 50MB before optimization)`,
          );
          return false;
        }
        return true;
      });

      if (errors.length > 0) {
        alert(errors.join("\n"));
      }

      if (filteredFiles.length > 0) {
        setOptimizing(true);
        setProgressList([]);

        try {
          // Optimizar todas las imágenes
          const optimizedFiles = await optimizeImages(
            filteredFiles,
            preset,
            (progress) => {
              setProgressList(progress);
            },
          );

          // Pasar los archivos optimizados al parent
          onFilesSelected(optimizedFiles);

          // Limpiar progreso después de 2 segundos
          setTimeout(() => {
            setProgressList([]);
            setOptimizing(false);
          }, 2000);
        } catch (error) {
          console.error("Error optimizing images:", error);
          alert("Error optimizing images. Please try again.");
          setOptimizing(false);
          setProgressList([]);
        }
      }
    },
    [onFilesSelected, preset],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
    },
    maxFiles: 25,
    disabled: disabled || optimizing,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        transition-colors duration-200
        ${
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }
        ${disabled || optimizing ? "opacity-50 cursor-not-allowed" : ""}
      `}
      >
        <input {...getInputProps()} />
        <ArrowUpTrayIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        {isDragActive ? (
          <p className="text-blue-600 font-medium">
            {t("multimedia.dropImages")}
          </p>
        ) : (
          <div>
            <p className="text-gray-700 font-medium mb-2">
              {optimizing ? "Optimizing images..." : t("multimedia.dropImages")}
            </p>
            <p className="text-sm text-gray-500">
              {t("multimedia.dropImagesDescription")}
            </p>
            <p className="text-xs text-blue-600 mt-2 font-medium">
              ✨ Las imágenes se optimizarán automáticamente para{" "}
              {preset === "social" ? "Redes Sociales" : "Web"}
            </p>
          </div>
        )}
      </div>

      {/* Progress List */}
      {progressList.length > 0 && (
        <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
          {progressList.map((item) => (
            <div
              key={item.fileName}
              className="bg-white border border-gray-200 rounded-lg p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {item.status === "completed" && (
                    <CheckCircleIcon className="h-5 w-5 text-green-600 shrink-0" />
                  )}
                  {item.status === "error" && (
                    <XCircleIcon className="h-5 w-5 text-red-600 shrink-0" />
                  )}
                  {item.status === "optimizing" && (
                    <div className="h-5 w-5 shrink-0">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {item.fileName}
                  </span>
                </div>
                <span className="text-xs text-gray-500 ml-2">
                  {item.progress}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    item.status === "error"
                      ? "bg-red-600"
                      : item.status === "completed"
                        ? "bg-green-600"
                        : "bg-blue-600"
                  }`}
                  style={{ width: `${item.progress}%` }}
                ></div>
              </div>

              {/* Size Info */}
              {item.status === "completed" && item.optimizedSize && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">
                    {formatFileSize(item.originalSize)} →{" "}
                    {formatFileSize(item.optimizedSize)}
                  </span>
                  <span className="text-green-600 font-medium">
                    -{calculateReduction(item.originalSize, item.optimizedSize)}
                    %
                  </span>
                </div>
              )}

              {item.status === "error" && item.error && (
                <p className="text-xs text-red-600 mt-1">{item.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
