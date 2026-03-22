import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { supabase } from "../../../helpers/supabase";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { AppDispatch, RootState } from "../../../redux/store";
import { useAppSelector } from "../../../redux/hooks";
import {
  fetchArchivePhotos,
  fetchArchiveTagCategories,
  fetchArchiveAuthors,
  PAGE_SIZE,
} from "../../../redux/actions/ArchiveActions";
import type { ArchivePhoto } from "../../../redux/actions/ArchiveActions";
import { setFilters } from "../../../redux/slices/ArchiveSlice";
import { ArchiveCard } from "../components/ArchiveCard";
import { ArchiveFilters } from "../components/ArchiveFilters";
import { ArchiveLightbox } from "../components/ArchiveLightbox";

export function Archive() {
  const dispatch = useDispatch<AppDispatch>();
  const { photos, hasMore, page, loading, tagCategories, allAuthors, filters } =
    useAppSelector((state: RootState) => state.archive);

  const [lightboxPhoto, setLightboxPhoto] = useState<ArchivePhoto | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchArchiveTagCategories());
    dispatch(fetchArchiveAuthors());
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null);
    });
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchArchivePhotos({ filters, page: 0 }));
    window.scrollTo({ top: 0 });
  }, [dispatch, filters]);

  function goToPage(p: number) {
    dispatch(fetchArchivePhotos({ filters, page: p }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openLightbox(photo: ArchivePhoto, index: number) {
    setLightboxPhoto(photo);
    setLightboxIndex(index);
  }

  function closeLightbox() {
    setLightboxPhoto(null);
    setLightboxIndex(-1);
  }

  function prevPhoto() {
    if (lightboxIndex > 0) {
      const idx = lightboxIndex - 1;
      setLightboxIndex(idx);
      setLightboxPhoto(photos[idx]);
    }
  }

  function nextPhoto() {
    if (lightboxIndex < photos.length - 1) {
      const idx = lightboxIndex + 1;
      setLightboxIndex(idx);
      setLightboxPhoto(photos[idx]);
    }
  }

  const hasPrev = page > 0;
  const currentPage = page + 1; // display as 1-based

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-gray-200 bg-white sticky top-0 h-screen overflow-y-auto py-8 px-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-5">
          Filtros
        </p>
        <ArchiveFilters
          filters={filters}
          tagCategories={tagCategories}
          allAuthors={allAuthors}
          onChange={(f) => dispatch(setFilters(f))}
        />
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
            Explorar Archivo
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed max-w-xl">
            Colección completa de fotografías de arquitectura. Encuentra imágenes
            por proyecto, categoría, año o etiquetas.
          </p>
        </div>

        {/* Grid */}
        {loading || token === null ? (
          <div className="flex items-center justify-center py-40">
            <div className="w-7 h-7 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 text-gray-400">
            <p className="text-base">Sin resultados para los filtros seleccionados</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {photos.map((photo, index) => (
                <ArchiveCard
                  key={photo.id}
                  photo={photo}
                  token={token!}
                  onClick={() => openLightbox(photo, index)}
                />
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={!hasPrev}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg bg-white shadow-sm hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4" />
                Anterior
              </button>

              <span className="text-sm text-gray-400">
                Página{" "}
                <span className="font-medium text-gray-700">{currentPage}</span>
                {" "}· {PAGE_SIZE} fotos por página
              </span>

              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={!hasMore}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg bg-white shadow-sm hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </main>

      {/* Lightbox */}
      <ArchiveLightbox
        photo={lightboxPhoto}
        token={token ?? ""}
        onClose={closeLightbox}
        onPrev={prevPhoto}
        onNext={nextPhoto}
        hasPrev={lightboxIndex > 0}
        hasNext={lightboxIndex < photos.length - 1}
      />
    </div>
  );
}
