import { useEffect, useState } from "react";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import {
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import type { ArchivePhoto } from "../../../redux/actions/ArchiveActions";
import { mediumUrl } from "./ArchiveCard";

interface ArchiveLightboxProps {
  photo: ArchivePhoto | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

function TagChip({ tag }: { tag: string }) {
  return (
    <span className="inline-block bg-white/10 text-gray-200 text-xs px-2 py-0.5 rounded-full">
      {tag}
    </span>
  );
}

export function ArchiveLightbox({
  photo,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: ArchiveLightboxProps) {
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    setImgLoaded(false);
  }, [photo?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && hasPrev) onPrev();
      if (e.key === "ArrowRight" && hasNext) onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasPrev, hasNext, onPrev, onNext]);

  return (
    <Dialog open={!!photo} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/95" />

      <div className="fixed inset-0 flex">
        <DialogPanel className="flex w-full h-full">
          {/* Image area */}
          <div className="relative flex-1 flex items-center justify-center min-w-0">
            {/* Prev */}
            <button
              type="button"
              onClick={onPrev}
              disabled={!hasPrev}
              className="absolute left-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-20 transition"
            >
              <ChevronLeftIcon className="h-6 w-6" />
            </button>

            {/* Image */}
            {photo && (
              <>
                {!imgLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}
                <img
                  src={mediumUrl(photo)}
                  alt={photo.filename}
                  onLoad={() => setImgLoaded(true)}
                  className={`max-h-full max-w-full object-contain transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
                />
              </>
            )}

            {/* Next */}
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext}
              className="absolute right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-20 transition"
            >
              <ChevronRightIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Metadata panel */}
          {photo && (
            <div className="w-80 shrink-0 bg-gray-950 border-l border-white/10 flex flex-col overflow-y-auto">
              {/* Close */}
              <div className="flex justify-end p-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="px-6 pb-8 space-y-6">
                {/* Rating */}
                {photo.rating === 10 && (
                  <span className="inline-block bg-amber-400 text-amber-900 text-xs font-bold px-2.5 py-1 rounded uppercase tracking-wider">
                    Heroica
                  </span>
                )}
                {photo.rating === 7 && (
                  <span className="inline-block bg-white/10 text-gray-300 text-xs font-bold px-2.5 py-1 rounded uppercase tracking-wider">
                    Principal
                  </span>
                )}

                {/* Project */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                    Proyecto
                  </p>
                  <p className="text-white text-lg font-semibold leading-snug">
                    {photo.project_title}
                  </p>
                </div>

                {/* Author */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                    Autor
                  </p>
                  <p className="text-gray-200 text-sm">
                    {photo.author_first_name} {photo.author_last_name}
                  </p>
                </div>

                {/* Description */}
                {photo.description && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                      Descripción
                    </p>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {photo.description}
                    </p>
                  </div>
                )}

                {/* Meta */}
                <div className="grid grid-cols-2 gap-4">
                  {photo.project_category && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                        Categoría
                      </p>
                      <p className="text-gray-300 text-sm capitalize">
                        {photo.project_category}
                      </p>
                    </div>
                  )}
                  {photo.project_year && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                        Año
                      </p>
                      <p className="text-gray-300 text-sm">
                        {photo.project_year}
                      </p>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {photo.tags.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
                      Etiquetas
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {photo.tags.map((tag) => (
                        <TagChip key={tag} tag={tag} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Filename */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                    Archivo
                  </p>
                  <p className="text-gray-500 text-xs font-mono break-all">
                    {photo.filename}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
