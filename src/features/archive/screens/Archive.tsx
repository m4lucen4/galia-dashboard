import { useEffect, useRef, useCallback, useState } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch, RootState } from "../../../redux/store";
import { useAppSelector } from "../../../redux/hooks";
import {
  fetchArchivePhotos,
  fetchMoreArchivePhotos,
  fetchArchiveTags,
  fetchArchiveAuthors,
} from "../../../redux/actions/ArchiveActions";
import type { ArchivePhoto } from "../../../redux/actions/ArchiveActions";
import { setFilters } from "../../../redux/slices/ArchiveSlice";
import { ArchiveCard } from "../components/ArchiveCard";
import { ArchiveFilters } from "../components/ArchiveFilters";
import { ArchiveLightbox } from "../components/ArchiveLightbox";

export function Archive() {
  const dispatch = useDispatch<AppDispatch>();
  const { photos, hasMore, page, loading, loadingMore, allTags, allAuthors, filters } =
    useAppSelector((state: RootState) => state.archive);

  const [lightboxPhoto, setLightboxPhoto] = useState<ArchivePhoto | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(fetchArchiveTags());
    dispatch(fetchArchiveAuthors());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchArchivePhotos(filters));
  }, [dispatch, filters]);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
        dispatch(fetchMoreArchivePhotos({ filters, page }));
      }
    },
    [dispatch, filters, hasMore, loadingMore, loading, page],
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-gray-200 bg-white sticky top-0 h-screen overflow-y-auto py-8 px-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-5">
          Filtros
        </p>
        <ArchiveFilters
          filters={filters}
          allTags={allTags}
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
        {loading && photos.length === 0 ? (
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
                  onClick={() => openLightbox(photo, index)}
                />
              ))}
            </div>

            <div
              ref={sentinelRef}
              className="h-16 flex items-center justify-center mt-4"
            >
              {loadingMore && (
                <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
              )}
            </div>

            {!hasMore && photos.length > 0 && (
              <p className="text-center text-gray-300 text-xs py-2">
                {photos.length} fotos
              </p>
            )}
          </>
        )}
      </main>

      {/* Lightbox */}
      <ArchiveLightbox
        photo={lightboxPhoto}
        onClose={closeLightbox}
        onPrev={prevPhoto}
        onNext={nextPhoto}
        hasPrev={lightboxIndex > 0}
        hasNext={lightboxIndex < photos.length - 1}
      />
    </div>
  );
}
