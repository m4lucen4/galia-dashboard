import { useEffect, useId, useState } from "react";
import { PlayIcon, VideoCameraIcon } from "@heroicons/react/24/outline";
import type { ProjectVideo } from "@/types";
import {
  getProjectVideoPublicUrl,
  listProjectVideos,
} from "@/features/projects/videos/projectVideosService";
import { getVideoErrorMessage } from "@/features/projects/videos/videoErrors";
import {
  formatVideoDuration,
  formatVideoSize,
} from "@/features/projects/videos/videoFormat";
import { projectPanelClassName } from "@/features/projects/components/projectFormStyles";

type PublicationVideoPickerProps = {
  /** Project the publication belongs to; null for legacy publications. */
  projectId: string | null;
  /** Selected video id, or null for "Sin vídeo". */
  value: string | null;
  onChange: (videoId: string | null) => void;
  disabled?: boolean;
};

const optionClassName =
  "min-w-0 rounded-2xl border p-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#010000]";
const playButtonClassName =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-[#010000]/40 px-4 text-xs font-medium hover:bg-[#010000]/5 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#010000] focus-visible:outline-offset-2";

export const PublicationVideoPicker = ({
  projectId,
  value,
  onChange,
  disabled = false,
}: PublicationVideoPickerProps) => {
  const groupName = useId();
  const [result, setResult] = useState<{
    projectId: string;
    videos: ProjectVideo[];
    error: string | null;
  } | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let active = true;
    listProjectVideos(projectId)
      .then((items) => {
        if (active) setResult({ projectId, videos: items, error: null });
      })
      .catch((e: unknown) => {
        if (active)
          setResult({ projectId, videos: [], error: getVideoErrorMessage(e) });
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  const loading = !!projectId && result?.projectId !== projectId;
  const videos = result?.projectId === projectId ? result.videos : [];
  const error = result?.projectId === projectId ? result.error : null;

  const selectedMissing =
    !loading && !error && !!value && !videos.some((v) => v.id === value);

  return (
    <div
      role="radiogroup"
      aria-labelledby={`${groupName}-title`}
      className={projectPanelClassName}
    >
      <h4
        id={`${groupName}-title`}
        className="text-lg font-medium tracking-[-0.03em]"
      >
        Vídeo
      </h4>
      <p className="text-sm leading-relaxed text-[#010000]/60">
        Elige un vídeo del proyecto para esta publicación, o ninguno. La
        publicación conserva sus imágenes.
      </p>

      {!projectId ? (
        <p className="text-sm text-[#010000]/65">
          Esta publicación no está asociada a un proyecto, así que no se puede
          elegir un vídeo.
        </p>
      ) : (
        <div className="min-w-0 space-y-3">
          {loading && (
            <p className="text-sm text-[#010000]/65">Cargando vídeos…</p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-2xl border border-[#010000]/40 p-3 text-sm font-medium"
            >
              {error}
            </p>
          )}
          {selectedMissing && (
            <p
              role="status"
              className="rounded-2xl border border-[#010000]/40 p-3 text-sm font-medium"
            >
              El vídeo elegido ya no está disponible. Elige «Sin vídeo» u otro
              vídeo y guarda.
            </p>
          )}
          {!loading && !error && videos.length === 0 && (
            <p className="text-sm text-[#010000]/65">
              Este proyecto no tiene vídeos. Súbelos desde el proyecto.
            </p>
          )}

          {!loading && !error && (videos.length > 0 || !!value) && (
            <div className="min-w-0 space-y-3">
              <label
                className={`${optionClassName} flex items-center gap-3 ${
                  value === null
                    ? "border-[#010000] bg-white/60"
                    : "border-[#010000]/20"
                } ${disabled ? "" : "cursor-pointer"}`}
              >
                <input
                  type="radio"
                  name={groupName}
                  checked={value === null}
                  disabled={disabled}
                  onChange={() => onChange(null)}
                  className="size-4 accent-[#010000]"
                />
                <span className="text-sm font-medium">Sin vídeo</span>
              </label>

              {videos.map((video) => {
                const selected = value === video.id;
                const posterUrl = video.poster_path
                  ? getProjectVideoPublicUrl(video.poster_path)
                  : null;
                const isPlaying = playingId === video.id;
                return (
                  <div
                    key={video.id}
                    className={`${optionClassName} space-y-3 ${
                      selected
                        ? "border-[#010000] bg-white/60"
                        : "border-[#010000]/20"
                    }`}
                  >
                    <label
                      className={`flex min-w-0 items-start gap-3 ${
                        disabled ? "" : "cursor-pointer"
                      }`}
                    >
                      <input
                        type="radio"
                        name={groupName}
                        checked={selected}
                        disabled={disabled}
                        onChange={() => onChange(video.id)}
                        className="mt-1 size-4 shrink-0 accent-[#010000]"
                      />
                      <span className="relative block h-24 w-16 shrink-0 overflow-hidden rounded-xl border border-[#010000]/20 bg-[#010000]/5 sm:h-28 sm:w-20">
                        {posterUrl ? (
                          <img
                            src={posterUrl}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <VideoCameraIcon
                            aria-hidden="true"
                            className="absolute inset-0 m-auto size-6 text-[#010000]/50"
                          />
                        )}
                      </span>
                      <span className="block min-w-0 flex-1 space-y-1">
                        <span
                          className="block truncate text-sm font-medium"
                          title={video.original_name}
                        >
                          {video.original_name}
                        </span>
                        <span className="block font-mono text-xs text-[#010000]/65">
                          {formatVideoDuration(video.duration_ms)} ·{" "}
                          {formatVideoSize(video.bytes)} · {video.width}×
                          {video.height}
                        </span>
                      </span>
                    </label>

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

                    <button
                      type="button"
                      className={playButtonClassName}
                      onClick={() => setPlayingId(isPlaying ? null : video.id)}
                    >
                      <PlayIcon className="size-4" />
                      {isPlaying ? "Ocultar vídeo" : "Reproducir"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
