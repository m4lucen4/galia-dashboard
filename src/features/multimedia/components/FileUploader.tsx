import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export const FileUploader = ({
  onFilesSelected,
  disabled,
}: FileUploaderProps) => {
  const { t } = useTranslation();
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const validFiles = acceptedFiles.slice(0, 25);

      const errors: string[] = [];
      const filteredFiles = validFiles.filter((file) => {
        if (!file.type.startsWith("image/")) {
          errors.push(`${file.name} is not an image`);
          return false;
        }
        if (file.size > 5 * 1024 * 1024) {
          errors.push(`${file.name} exceeds 5MB limit`);
          return false;
        }
        return true;
      });

      if (errors.length > 0) {
        alert(errors.join("\n"));
      }

      if (filteredFiles.length > 0) {
        onFilesSelected(filteredFiles);
      }
    },
    [onFilesSelected],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
    },
    maxFiles: 25,
    disabled,
  });

  return (
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
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
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
            {t("multimedia.dropImages")}
          </p>
          <p className="text-sm text-gray-500">
            {t("multimedia.dropImagesDescription")}
          </p>
        </div>
      )}
    </div>
  );
};
