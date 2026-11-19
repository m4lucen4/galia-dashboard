import { useRef, useState } from "react";
import {
  ArrowUpTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  TrashIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";
import { PillButton } from "@/components/shared/ui/PillButton";
import { Alert } from "@/components/shared/ui/Alert";
import {
  projectLegendClassName,
  projectPanelClassName,
} from "../components/projectFormStyles";
import type { ProjectVideo } from "@/types";
import { getProjectVideoPublicUrl } from "./projectVideosService";
import { useProjectVideos } from "./useProjectVideos";
import { formatVideoDuration, formatVideoSize } from "./videoFormat";
import { FASTSTART_WARNING } from "./videoConstants";

interface ProjectVideosSectionProps {
  /** Only set for projects that already exist. */
  projectId?: string;
}

const iconButtonClassName =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-[#010000]/40 hover:bg-[#010000]/5 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#010000] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40";

const stageLabels = {
  validating: "Validando vídeo…",
  uploading: "Subiendo vídeo…",
  saving: "Guardando vídeo…",
} as const;

export const ProjectVideosSection = ({ projectId }: ProjectVideosSectionProps) => {
  const {
    videos,
    loading,
    error,
    upload,
    deletingId,
    startUpload,
    cancelUpload,
    removeVideo,
    moveVideo,
  } = useProjectVideos(projectId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProjectVideo | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void startUpload(file);
  };

  return (
    <fieldset className={projectPanelClassName}>
      <legend className={projectLegendClassName}>Vídeos</legend>

      {!projectId ? (
        <p className="text-sm text-[#010000]/65">
          Guarda el proyecto para añadir vídeos
        </p>
      ) : (
        <div className="min-w-0 space-y-5">
          <p className="text-sm text-[#010000]/65">
            Solo MP4, hasta 100 MB y entre 3 segundos y 5 minutos.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,.mp4"
            className="hidden"
            onChange={handleFileChange}
          />

          {upload ? (
            <div className="space-y-3 rounded-2xl border border-[#010000]/20 p-4">
              <p className="truncate text-sm font-medium">{upload.fileName}</p>
              <p className="text-sm text-[#010000]/75" aria-live="polite">
                {stageLabels[upload.stage]}
                {upload.stage === "uploading" && ` ${upload.percent} %`}
              </p>
              <div
                role="progressbar"
                aria-label="Progreso de subida del vídeo"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={upload.stage === "uploading" ? upload.percent : undefined}
                className="h-2 w-full overflow-hidden rounded-full bg-[#010000]/15"
              >
                <div
                  className="h-full rounded-full bg-[#010000] transition-[width] motion-reduce:transition-none"
                  style={{ width: `${upload.stage === "uploading" ? upload.percent : upload.stage === "saving" ? 100 : 0}%` }}
                />
              </div>
              <PillButton variant="outline" onClick={cancelUpload}>
                Cancelar subida
              </PillButton>
            </div>
          ) : (
            <PillButton
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => inputRef.current?.click()}
            >
              <ArrowUpTrayIcon className="h-5 w-5" />
              Subir vídeo
            </PillButton>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-2xl border border-[#010000]/40 p-3 text-sm font-medium"
            >
              {error}
            </p>
          )}

          {loading && (
            <p className="text-sm text-[#010000]/65">Cargando vídeos…</p>
          )}
          {!loading && videos.length === 0 && !upload && (
            <p className="text-sm text-[#010000]/65">
              Este proyecto todavía no tiene vídeos.
            </p>
          )}

          <ul className="min-w-0 space-y-4">
            {videos.map((video, index) => {
              const posterUrl = video.poster_path
                ? getProjectVideoPublicUrl(video.poster_path)
                : null;
              const isPlaying = playingId === video.id;
              return (
                <li
                  key={video.id}
                  className="min-w-0 space-y-3 rounded-2xl border border-[#010000]/20 p-3"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-xl border border-[#010000]/20 bg-[#010000]/5 sm:h-28 sm:w-20">
                      {posterUrl ? (
                        <img
                          src={posterUrl}
                          alt={`Miniatura de ${video.original_name}`}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <VideoCameraIcon
                          aria-hidden="true"
                          className="absolute inset-0 m-auto size-6 text-[#010000]/50"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate text-sm font-medium" title={video.original_name}>
                        {video.original_name}
                      </p>
                      <p className="font-mono text-xs text-[#010000]/65">
                        {formatVideoDuration(video.duration_ms)} ·{" "}
                        {formatVideoSize(video.bytes)} · {video.width}×
                        {video.height}
                      </p>
                      {!video.faststart && (
                        <p className="flex items-start gap-1.5 text-xs font-medium">
                          <ExclamationTriangleIcon
                            aria-hidden="true"
                            className="mt-0.5 size-4 shrink-0"
                          />
                          {FASTSTART_WARNING}
                        </p>
                      )}
                    </div>
                  </div>

                  {isPlaying && (
                    <video
                      src={getProjectVideoPublicUrl(video.storage_path)}
                      poster={posterUrl ?? undefined}
                      preload="none"
                      controls
                      autoPlay
                      playsInline
                      className="max-h-96 w-full rounded-xl bg-[#010000]"
                    />
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className={`${iconButtonClassName} w-auto gap-1.5 px-4 text-xs font-medium`}
                      onClick={() => setPlayingId(isPlaying ? null : video.id)}
                    >
                      <PlayIcon className="size-4" />
                      {isPlaying ? "Ocultar vídeo" : "Reproducir"}
                    </button>
                    <button
                      type="button"
                      className={iconButtonClassName}
                      aria-label={`Subir ${video.original_name} en la lista`}
                      disabled={index === 0 || !!upload || !!deletingId}
                      onClick={() => void moveVideo(video.id, -1)}
                    >
                      <ChevronUpIcon className="size-4" />
                    </button>
                    <button
                      type="button"
                      className={iconButtonClassName}
                      aria-label={`Bajar ${video.original_name} en la lista`}
                      disabled={index === videos.length - 1 || !!upload || !!deletingId}
                      onClick={() => void moveVideo(video.id, 1)}
                    >
                      <ChevronDownIcon className="size-4" />
                    </button>
                    <button
                      type="button"
                      className={`${iconButtonClassName} ml-auto`}
                      aria-label={`Eliminar ${video.original_name}`}
                      disabled={deletingId === video.id}
                      onClick={() => setPendingDelete(video)}
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {pendingDelete && (
        <Alert
          title="Eliminar vídeo"
          description={`Se eliminará «${pendingDelete.original_name}» del proyecto y su archivo se borrará definitivamente. Esta acción no se puede deshacer.`}
          onAccept={() => {
            const video = pendingDelete;
            setPendingDelete(null);
            if (playingId === video.id) setPlayingId(null);
            void removeVideo(video);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </fieldset>
  );
};
