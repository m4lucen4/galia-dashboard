import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface StudentCardUploadProps {
  file: File | undefined;
  onFileChange: (file: File | undefined) => void;
  error?: string;
}

const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const StudentCardUpload: React.FC<StudentCardUploadProps> = ({
  file,
  onFileChange,
  error,
}) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!ALLOWED_TYPES.includes(selected.type)) {
      onFileChange(undefined);
      return;
    }

    if (selected.size > MAX_SIZE_MB * 1024 * 1024) {
      onFileChange(undefined);
      return;
    }

    onFileChange(selected);
  };

  const preview = file ? URL.createObjectURL(file) : null;

  return (
    <div className="space-y-2">
      <label className="text-sm text-black">
        {t("register.studentCard")}
      </label>

      {preview ? (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Student card preview"
            className="h-14 w-auto rounded-md border border-gray-300 object-cover"
          />
          <button
            type="button"
            onClick={() => {
              onFileChange(undefined);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="absolute -top-2 -right-2 bg-white border border-gray-300 rounded-full p-0.5 hover:bg-gray-100"
          >
            <XMarkIcon className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center justify-center gap-3 w-full h-14 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors cursor-pointer bg-gray-50"
        >
          <PhotoIcon className="h-5 w-5 text-gray-400 shrink-0" />
          <span className="text-sm text-gray-500">{t("register.uploadStudentCard")}</span>
          <span className="text-xs text-gray-400">JPG, PNG, WEBP · máx. 5MB</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
};
