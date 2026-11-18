import { supabase } from "@/helpers/supabase";
import type { ProjectVideo } from "@/types";
import { PROJECT_VIDEOS_BUCKET } from "./videoConstants";
import {
  isCancelledError,
  ProjectVideoError,
  VideoUploadCancelledError,
} from "./videoErrors";
import { detectFaststart } from "./mp4Faststart";
import { capturePoster } from "./videoPoster";
import { uploadWithTus } from "./tusUpload";
import { validateVideoFile } from "./videoValidation";

export type VideoUploadStage = "validating" | "uploading" | "saving";

export interface UploadProjectVideoOptions {
  projectId: string;
  file: File;
  onStage?: (stage: VideoUploadStage) => void;
  /** Progress of the video file, 0-100. */
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

const PROJECT_ID_PATTERN = /^[1-9][0-9]{0,17}$/;
const LIST_PAGE_SIZE = 100;
const REMOVE_BATCH_SIZE = 100;

const assertProjectId = (projectId: string) => {
  if (!PROJECT_ID_PATTERN.test(projectId)) {
    throw new ProjectVideoError("Proyecto no válido.");
  }
};

export const getProjectVideoPublicUrl = (path: string): string =>
  supabase.storage.from(PROJECT_VIDEOS_BUCKET).getPublicUrl(path).data
    .publicUrl;

export const listProjectVideos = async (
  projectId: string,
): Promise<ProjectVideo[]> => {
  assertProjectId(projectId);
  const { data, error } = await supabase
    .from("project_videos")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    throw new ProjectVideoError(
      "No se pudieron cargar los vídeos del proyecto.",
    );
  }
  return (data ?? []) as ProjectVideo[];
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Poster public URLs of the given videos (publication cards), one query.
 * Videos without a poster, or that the caller cannot read, are absent.
 */
export const getVideoPosterUrls = async (
  videoIds: string[],
): Promise<Record<string, string>> => {
  const ids = [...new Set(videoIds)].filter((id) => UUID_PATTERN.test(id));
  if (ids.length === 0) return {};
  const { data, error } = await supabase
    .from("project_videos")
    .select("id,poster_path")
    .in("id", ids);
  if (error) {
    throw new ProjectVideoError(
      "No se pudieron cargar las miniaturas de los vídeos.",
    );
  }
  const urls: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.poster_path) urls[row.id] = getProjectVideoPublicUrl(row.poster_path);
  }
  return urls;
};

/**
 * Removes objects and confirms they are gone. Storage silently skips paths the
 * policies filter out, so every path missing from the response is looked up:
 * an object that still exists means the delete was refused.
 */
const removeObjects = async (paths: string[]): Promise<void> => {
  if (paths.length === 0) return;
  const bucket = supabase.storage.from(PROJECT_VIDEOS_BUCKET);
  const { data, error } = await bucket.remove(paths);
  if (error) throw error;
  const removed = new Set((data ?? []).map((object) => object.name));
  for (const path of paths) {
    if (removed.has(path)) continue;
    const slash = path.lastIndexOf("/");
    const folder = path.slice(0, slash);
    const name = path.slice(slash + 1);
    const { data: found, error: listError } = await bucket.list(folder, {
      search: name,
      limit: 100,
    });
    if (listError) throw listError;
    if ((found ?? []).some((object) => object.name === name)) {
      throw new ProjectVideoError(
        "No se pudieron borrar los archivos del vídeo.",
      );
    }
  }
};

/** Best-effort cleanup used after failed or cancelled uploads. */
const removeObjectsQuietly = async (paths: string[]): Promise<void> => {
  try {
    await removeObjects(paths);
  } catch (error) {
    console.error("Error removing uploaded video objects:", error);
  }
};

export const uploadProjectVideo = async ({
  projectId,
  file,
  onStage,
  onProgress,
  signal,
}: UploadProjectVideoOptions): Promise<ProjectVideo> => {
  assertProjectId(projectId);
  const throwIfCancelled = () => {
    if (signal?.aborted) throw new VideoUploadCancelledError();
  };

  onStage?.("validating");
  const metadata = await validateVideoFile(file);
  throwIfCancelled();
  const faststart = await detectFaststart(file);
  const poster = await capturePoster(file, metadata.durationMs).catch(
    () => null,
  );
  throwIfCancelled();

  const id = crypto.randomUUID();
  const storagePath = `${projectId}/${id}.mp4`;
  const posterPath = `${projectId}/${id}.jpg`;
  const uploaded: string[] = [];

  try {
    onStage?.("uploading");
    // Track the path before starting: an aborted upload may leave a partial object.
    uploaded.push(storagePath);
    await uploadWithTus({
      objectName: storagePath,
      body: file,
      contentType: "video/mp4",
      signal,
      onProgress: (sent, total) =>
        onProgress?.(total > 0 ? Math.round((sent / total) * 100) : 0),
    });

    let storedPosterPath: string | null = null;
    if (poster) {
      try {
        uploaded.push(posterPath);
        await uploadWithTus({
          objectName: posterPath,
          body: poster,
          contentType: "image/jpeg",
          signal,
        });
        storedPosterPath = posterPath;
      } catch (error) {
        if (isCancelledError(error)) throw error;
        // The poster is optional: keep the video without thumbnail.
        await removeObjectsQuietly([posterPath]);
        uploaded.pop();
      }
    }
    throwIfCancelled();

    onStage?.("saving");
    const { data: last } = await supabase
      .from("project_videos")
      .select("position")
      .eq("project_id", projectId)
      .order("position", { ascending: false })
      .limit(1);
    const position = (last?.[0]?.position ?? -1) + 1;

    const { data, error } = await supabase
      .from("project_videos")
      .insert({
        id,
        project_id: Number(projectId),
        storage_path: storagePath,
        poster_path: storedPosterPath,
        original_name: file.name.slice(0, 255),
        bytes: file.size,
        duration_ms: metadata.durationMs,
        width: metadata.width,
        height: metadata.height,
        faststart,
        position,
      })
      .select("*")
      .single();
    if (error || !data) {
      throw new ProjectVideoError(
        "No se pudo guardar el vídeo en el proyecto. Inténtalo de nuevo.",
      );
    }
    return data as ProjectVideo;
  } catch (error) {
    await removeObjectsQuietly(uploaded);
    throw error;
  }
};

export const deleteProjectVideo = async (video: ProjectVideo): Promise<void> => {
  const paths = [video.storage_path];
  if (video.poster_path) paths.push(video.poster_path);

  // Storage objects first: direct SQL deletes on storage.objects are not allowed.
  try {
    await removeObjects(paths);
  } catch {
    throw new ProjectVideoError(
      "No se pudo eliminar el archivo del vídeo. Inténtalo de nuevo.",
    );
  }

  const { data, error } = await supabase
    .from("project_videos")
    .delete()
    .eq("id", video.id)
    .select("id");
  if (error || !data || data.length === 0) {
    throw new ProjectVideoError(
      "No se pudo eliminar el vídeo del proyecto. Inténtalo de nuevo.",
    );
  }
};

export const reorderProjectVideos = async (
  orderedIds: string[],
): Promise<void> => {
  const results = await Promise.all(
    orderedIds.map((id, position) =>
      supabase.from("project_videos").update({ position }).eq("id", id),
    ),
  );
  if (results.some((result) => result.error)) {
    throw new ProjectVideoError(
      "No se pudo guardar el nuevo orden de los vídeos.",
    );
  }
};

/** Removes every object under `<projectId>/` in the bucket (paginated). Throws on storage errors. */
export const removeAllProjectVideoObjects = async (
  projectId: string,
): Promise<void> => {
  assertProjectId(projectId);
  const bucket = supabase.storage.from(PROJECT_VIDEOS_BUCKET);
  const paths: string[] = [];

  for (let offset = 0; ; offset += LIST_PAGE_SIZE) {
    const { data, error } = await bucket.list(projectId, {
      limit: LIST_PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    const page = data ?? [];
    for (const entry of page) paths.push(`${projectId}/${entry.name}`);
    if (page.length < LIST_PAGE_SIZE) break;
  }

  for (let i = 0; i < paths.length; i += REMOVE_BATCH_SIZE) {
    await removeObjects(paths.slice(i, i + REMOVE_BATCH_SIZE));
  }
};
