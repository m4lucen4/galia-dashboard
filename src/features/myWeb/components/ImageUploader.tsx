import React, { useRef } from "react";
import { PhotoIcon, ArrowPathIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { myWebIconButtonClassName, myWebLabelClassName, myWebOptionClassName } from "@/features/myWeb/components/myWebStyles";

interface ImageUploaderProps {
  label: string;
  currentUrl?: string | null;
  onUpload: (file: File) => void;
  onRemove?: () => void;
  loading?: boolean;
  accept?: string;
  variant?: "default" | "logo";
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  label,
  currentUrl,
  onUpload,
  onRemove,
  loading = false,
  accept = "image/*",
  variant = "default",
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isLogo = variant === "logo";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && !loading) onUpload(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="min-w-0" aria-busy={loading}>
      <p className={myWebLabelClassName}>{label}</p>
      <div className="relative mt-2">
        <button
          type="button"
          aria-label={`${currentUrl ? "Cambiar" : "Subir"} ${label}`}
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className={`${myWebOptionClassName} relative flex w-full items-center gap-4 overflow-hidden ${isLogo ? "h-24 justify-center" : "p-4"}`}
        >
          {currentUrl ? (
            <img
              src={currentUrl}
              alt={label}
              className={isLogo ? "max-h-full max-w-full object-contain" : "size-16 shrink-0 rounded-2xl object-cover"}
            />
          ) : (
            <PhotoIcon aria-hidden="true" className="size-8 shrink-0 text-[#010000]/50" />
          )}
          {(!isLogo || !currentUrl) && (
            <span className="min-w-0 text-sm text-[#010000]/65">
              {loading ? "Subiendo imagen…" : currentUrl ? "Cambiar imagen" : "Subir imagen"}
            </span>
          )}
          {loading && <ArrowPathIcon aria-hidden="true" className="size-5 shrink-0 animate-spin" />}
        </button>
        {currentUrl && !loading && onRemove && (
          <button
            type="button"
            aria-label={`Quitar ${label}`}
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className={`${myWebIconButtonClassName} absolute -right-2 -top-2 bg-[#d8e4d6]`}
          >
            <XMarkIcon aria-hidden="true" className="size-5" />
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        aria-label={`Archivo para ${label}`}
        accept={accept}
        disabled={loading}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
};
