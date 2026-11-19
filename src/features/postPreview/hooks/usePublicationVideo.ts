import { useEffect, useMemo, useState } from "react";
import type { PreviewProjectDataProps, ProjectVideo } from "@/types";
import {
  getProjectVideoPublicUrl,
  listProjectVideos,
} from "@/features/projects/videos/projectVideosService";
import { SOCIAL_VIDEO_ENABLED, type PublicationVideoState } from "../helpers/socialVideo";

type Loaded =
  | { requestId: string; video: ProjectVideo | null }
  | { requestId: string; failed: true };

/**
 * Metadata and public URLs of the video a publication references (projectsPreview.video_id), read
 * from the videos of its project. Does nothing (state "none") with VITE_SOCIAL_VIDEO off or when
 * the publication has no video. Never throws: a failure is the "error" state.
 */
export function usePublicationVideo(
  project: Pick<PreviewProjectDataProps, "video_id" | "project_id"> | null | undefined,
): PublicationVideoState {
  const videoId = SOCIAL_VIDEO_ENABLED ? (project?.video_id ?? null) : null;
  const projectId = project?.project_id != null ? String(project.project_id) : null;
  const requestId = videoId ? `${projectId ?? ""}:${videoId}` : null;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!requestId || !videoId || !projectId) return;
    let active = true;
    listProjectVideos(projectId)
      .then((videos) => {
        if (active) {
          setLoaded({ requestId, video: videos.find((video) => video.id === videoId) ?? null });
        }
      })
      .catch(() => {
        if (active) setLoaded({ requestId, failed: true });
      });
    return () => {
      active = false;
    };
  }, [requestId, videoId, projectId]);

  // Stable between renders so it can be a dependency of memos and effects.
  return useMemo((): PublicationVideoState => {
    if (!requestId || !videoId) return { status: "none" };
    // A publication with a video always has a project (database guard); without one it cannot load.
    if (!projectId) return { status: "missing" };
    // Results are kept with the request they answer, so a stale answer is never shown.
    if (!loaded || loaded.requestId !== requestId) return { status: "loading" };
    if ("failed" in loaded) return { status: "error" };
    if (!loaded.video) return { status: "missing" };
    return {
      status: "ready",
      video: loaded.video,
      videoUrl: getProjectVideoPublicUrl(loaded.video.storage_path),
      posterUrl: loaded.video.poster_path
        ? getProjectVideoPublicUrl(loaded.video.poster_path)
        : null,
    };
  }, [requestId, videoId, projectId, loaded]);
}
