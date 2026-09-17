import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/shared/ui/Alert";
import { optimizeImage } from "@/helpers/imageOptimizer";
import { supabase } from "@/helpers/supabase";
import { useAppDispatch } from "@/redux/hooks";
import {
  fetchWikiMedia,
  finalizeWikiMediaDeletion,
  markWikiMediaReady,
  registerWikiMedia,
  reserveWikiMediaDeletion,
  type WikiMedia,
} from "@/redux/actions/WikiAdminActions";
import type { IRequest } from "@/types";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const maxBytes = 10 * 1024 * 1024;

type UploadFailure = {
  file: File;
  mediaId: string;
  path: string;
  stage: "upload" | "markReady";
};

const MediaThumbnail = ({ media }: { media: WikiMedia }) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    if (media.status !== "ready") return;

    void supabase.storage.from("wiki-media").download(media.object_path).then(({ data }) => {
      if (!active || !data) return;
      objectUrl = URL.createObjectURL(data);
      setUrl(objectUrl);
    });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [media.object_path, media.status]);

  if (media.status !== "ready") return <div className="flex h-24 items-center justify-center rounded bg-gray-100 text-xs text-gray-500">Sin vista previa</div>;
  return url ? <img src={url} alt="" className="h-24 w-full rounded object-cover" /> : <div className="flex h-24 items-center justify-center rounded bg-gray-100 text-xs text-gray-500">Cargando…</div>;
};

export const WikiMediaLibrary = ({
  media,
  request,
  onInsert,
}: {
  media: WikiMedia[];
  request: IRequest;
  onInsert: (media: WikiMedia, alt: string, caption: string) => void;
}) => {
  const dispatch = useAppDispatch();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadRequest, setUploadRequest] = useState<IRequest>({ inProgress: false, messages: "", ok: false });
  const [failedUpload, setFailedUpload] = useState<UploadFailure | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<WikiMedia | null>(null);
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<WikiMedia | null>(null);
  const [libraryError, setLibraryError] = useState("");

  useEffect(() => {
    void dispatch(fetchWikiMedia());
  }, [dispatch]);

  const refresh = async () => {
    await dispatch(fetchWikiMedia());
  };

  const cleanupPending = async (mediaId: string, path: string) => {
    setLibraryError("");
    const reserve = await dispatch(reserveWikiMediaDeletion(mediaId));
    if (!reserveWikiMediaDeletion.fulfilled.match(reserve)) return;
    const { error } = await supabase.storage.from("wiki-media").remove([path]);
    if (error) { setLibraryError(`No se ha podido limpiar la subida pendiente: ${error.message}`); return; }
    const finalized = await dispatch(finalizeWikiMediaDeletion(mediaId));
    if (!finalizeWikiMediaDeletion.fulfilled.match(finalized)) return;
    await refresh();
  };

  const finishUpload = async (failure: UploadFailure) => {
    setUploadRequest({ inProgress: true, messages: "", ok: false });
    try {
      if (failure.stage === "upload") {
        const { error } = await supabase.storage.from("wiki-media").upload(failure.path, failure.file, {
          contentType: failure.file.type,
          upsert: false,
        });
        if (error) throw new Error(error.message);
        failure = { ...failure, stage: "markReady" };
      }
      const ready = await dispatch(markWikiMediaReady(failure.mediaId));
      if (!markWikiMediaReady.fulfilled.match(ready)) throw new Error("No se ha podido confirmar la imagen subida.");
      setFailedUpload(null);
      setUploadRequest({ inProgress: false, messages: "Imagen disponible en la biblioteca.", ok: true });
      await refresh();
    } catch (error) {
      setFailedUpload(failure);
      setUploadRequest({ inProgress: false, messages: error instanceof Error ? error.message : "No se ha podido subir la imagen.", ok: false });
    }
  };

  const upload = async (file: File) => {
    if (!allowedMimeTypes.has(file.type) || file.size > maxBytes) {
      setUploadRequest({ inProgress: false, messages: "Seleccione una imagen JPEG, PNG, WebP, GIF o AVIF de hasta 10 MB.", ok: false });
      return;
    }

    setUploadRequest({ inProgress: true, messages: "Optimizando imagen…", ok: false });
    try {
      const optimized = await optimizeImage(file, "web");
      if (!allowedMimeTypes.has(optimized.type) || optimized.size > maxBytes) {
        throw new Error("La imagen optimizada no cumple el formato o tamaño permitido.");
      }
      const registered = await dispatch(registerWikiMedia({ mimeType: optimized.type, byteSize: optimized.size }));
      if (!registerWikiMedia.fulfilled.match(registered)) throw new Error("No se ha podido registrar la imagen.");
      const failure = { file: optimized, mediaId: registered.payload.id, path: registered.payload.object_path, stage: "upload" as const };
      setFailedUpload(failure);
      await finishUpload(failure);
    } catch (error) {
      setUploadRequest({ inProgress: false, messages: error instanceof Error ? error.message : "No se ha podido preparar la imagen.", ok: false });
    }
  };

  const deleteMedia = async () => {
    if (!deleteTarget) return;
    setLibraryError("");
    const target = deleteTarget;
    const reserve = target.status === "delete_reserved"
      ? true
      : reserveWikiMediaDeletion.fulfilled.match(await dispatch(reserveWikiMediaDeletion(target.id)));
    if (!reserve) return;

    const { error } = await supabase.storage.from("wiki-media").remove([target.object_path]);
    if (error) {
      setLibraryError(`No se ha podido eliminar el archivo: ${error.message}`);
      return;
    }
    const finalized = await dispatch(finalizeWikiMediaDeletion(target.id));
    if (finalizeWikiMediaDeletion.fulfilled.match(finalized)) {
      setDeleteTarget(null);
      await refresh();
    }
  };

  return (
    <section className="mt-6 border-t border-gray-200 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Biblioteca multimedia</h2>
          <p className="text-sm text-gray-500">Las imágenes se reutilizan sin guardar URLs públicas.</p>
        </div>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploadRequest.inProgress} className="rounded bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50">Subir imagen</button>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }} className="sr-only" aria-label="Subir imagen a la biblioteca" />
      </div>
      {uploadRequest.messages && <p role="alert" className={`mt-3 text-sm ${uploadRequest.ok ? "text-green-700" : "text-red-700"}`}>{uploadRequest.messages}</p>}
      {failedUpload && <div className="mt-3 flex flex-wrap gap-3 text-sm"><button type="button" onClick={() => void finishUpload(failedUpload)} disabled={uploadRequest.inProgress} className="underline">Reintentar subida</button><button type="button" onClick={() => void cleanupPending(failedUpload.mediaId, failedUpload.path)} disabled={uploadRequest.inProgress} className="text-red-700 underline">Limpiar subida pendiente</button></div>}
      {request.messages && !request.ok && <p role="alert" className="mt-3 text-sm text-red-700">{request.messages}</p>}
      {libraryError && <p role="alert" className="mt-3 text-sm text-red-700">{libraryError}</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {media.map((item) => <article key={item.id} className="rounded border border-gray-200 p-3"><MediaThumbnail media={item} /><div className="mt-2 flex items-center justify-between gap-2"><span className="text-xs text-gray-600">{item.status === "ready" ? "Lista" : item.status === "pending" ? "Pendiente" : "Eliminación pendiente"}</span>{item.status === "ready" && <button type="button" onClick={() => { setSelectedMedia(item); setAlt(""); setCaption(""); }} className="text-sm underline">Insertar</button>}</div>{item.status === "pending" ? <button type="button" onClick={() => void cleanupPending(item.id, item.object_path)} disabled={request.inProgress} className="mt-2 text-xs text-red-700 underline disabled:opacity-50">Limpiar pendiente</button> : <button type="button" onClick={() => setDeleteTarget(item)} disabled={request.inProgress} className="mt-2 text-xs text-red-700 underline disabled:opacity-50">{item.status === "delete_reserved" ? "Reintentar eliminación" : "Eliminar"}</button>}</article>)}
      </div>
      {media.length === 0 && !request.inProgress && <p className="mt-4 text-sm text-gray-500">Todavía no hay imágenes en la biblioteca.</p>}
      {selectedMedia && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onSubmit={(event) => { event.preventDefault(); onInsert(selectedMedia, alt.trim(), caption.trim()); setSelectedMedia(null); }}><h3 className="text-lg font-bold">Insertar imagen</h3><label className="mt-4 block text-sm font-medium" htmlFor="wiki-image-alt">Texto alternativo<input id="wiki-image-alt" required maxLength={250} value={alt} onChange={(event) => setAlt(event.target.value)} className="mt-1 w-full rounded border border-gray-300 px-3 py-2" /></label><label className="mt-4 block text-sm font-medium" htmlFor="wiki-image-caption">Pie de foto opcional<input id="wiki-image-caption" maxLength={500} value={caption} onChange={(event) => setCaption(event.target.value)} className="mt-1 w-full rounded border border-gray-300 px-3 py-2" /></label><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setSelectedMedia(null)} className="underline">Cancelar</button><button type="submit" className="rounded bg-gray-900 px-4 py-2 text-sm text-white">Insertar</button></div></form></div>}
      {deleteTarget && <Alert title="Eliminar imagen" description="La eliminación se bloqueará si la imagen sigue referenciada por un borrador o una revisión publicada." onAccept={() => void deleteMedia()} onCancel={() => setDeleteTarget(null)} disabledConfirmButton={request.inProgress} />}
    </section>
  );
};
