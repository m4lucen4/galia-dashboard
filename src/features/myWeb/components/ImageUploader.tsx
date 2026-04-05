import React, { useRef } from "react";
import { PhotoIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

interface ImageUploaderProps {
  label: string;
  currentUrl?: string | null;
  onUpload: (file: File) => void;
  loading?: boolean;
  accept?: string;
  variant?: "default" | "logo";
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  label,
  currentUrl,
  onUpload,
  loading = false,
  accept = "image/*",
  variant = "default",
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  if (variant === "logo") {
    return (
      <div>
        <label className="text-sm text-black">{label}</label>
        <div
          className="mt-1 relative flex items-center justify-center border border-gray-300 rounded-md cursor-pointer hover:border-gray-400 transition-colors bg-gray-50 overflow-hidden"
          style={{ height: "80px" }}
          onClick={() => inputRef.current?.click()}
        >
          {currentUrl ? (
            <img
              src={currentUrl}
              alt={label}
              className="max-h-full max-w-full object-contain p-2"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-gray-400">
              <PhotoIcon className="h-7 w-7" />
              <span className="text-xs">Subir imagen</span>
            </div>
          )}
          {loading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <ArrowPathIcon className="h-5 w-5 text-gray-400 animate-spin" />
            </div>
          )}
          {currentUrl && !loading && (
            <div className="absolute bottom-1 right-1">
              <span className="text-xs text-gray-500 bg-white/80 px-1.5 py-0.5 rounded">
                Cambiar
              </span>
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div>
      <label className="text-sm text-black">{label}</label>
      <div
        className="mt-1 flex items-center gap-4 p-3 border border-gray-300 rounded-md cursor-pointer hover:border-gray-400 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        {currentUrl ? (
          <img
            src={currentUrl}
            alt={label}
            className="h-16 w-16 object-cover rounded-md"
          />
        ) : (
          <div className="h-16 w-16 flex items-center justify-center bg-gray-100 rounded-md">
            <PhotoIcon className="h-8 w-8 text-gray-400" />
          </div>
        )}
        <div className="flex-1">
          <p className="text-sm text-gray-600">
            {currentUrl ? "Clic para reemplazar" : "Clic para subir imagen"}
          </p>
        </div>
        {loading && (
          <ArrowPathIcon className="h-5 w-5 text-gray-400 animate-spin" />
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
};
