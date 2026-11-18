import { useCallback, useEffect, useRef, useState } from "react";
import type { ProjectVideo } from "@/types";
import {
  deleteProjectVideo,
  listProjectVideos,
  reorderProjectVideos,
  uploadProjectVideo,
  type VideoUploadStage,
} from "./projectVideosService";
import { getVideoErrorMessage, isCancelledError } from "./videoErrors";

export interface VideoUploadState {
  fileName: string;
  stage: VideoUploadStage;
  percent: number;
}

export const useProjectVideos = (projectId: string | undefined) => {
  const [videos, setVideos] = useState<ProjectVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upload, setUpload] = useState<VideoUploadState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let active = true;
    setLoading(true);
    listProjectVideos(projectId)
      .then((items) => {
        if (active) setVideos(items);
      })
      .catch((e: unknown) => {
        if (active) setError(getVideoErrorMessage(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  // Leaving the form (or switching project) cancels any upload in flight.
  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const startUpload = useCallback(
    async (file: File) => {
      if (!projectId || abortRef.current) return;
      const controller = new AbortController();
      abortRef.current = controller;
      setError(null);
      setUpload({ fileName: file.name, stage: "validating", percent: 0 });
      try {
        const created = await uploadProjectVideo({
          projectId,
          file,
          signal: controller.signal,
          onStage: (stage) =>
            setUpload((prev) => (prev ? { ...prev, stage } : prev)),
          onProgress: (percent) =>
            setUpload((prev) => (prev ? { ...prev, percent } : prev)),
        });
        setVideos((prev) => [...prev, created]);
      } catch (e) {
        if (!isCancelledError(e)) setError(getVideoErrorMessage(e));
      } finally {
        abortRef.current = null;
        setUpload(null);
      }
    },
    [projectId],
  );

  const cancelUpload = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const removeVideo = useCallback(async (video: ProjectVideo) => {
    setError(null);
    setDeletingId(video.id);
    try {
      await deleteProjectVideo(video);
      setVideos((prev) => prev.filter((item) => item.id !== video.id));
    } catch (e) {
      setError(getVideoErrorMessage(e));
    } finally {
      setDeletingId(null);
    }
  }, []);

  const moveVideo = useCallback(
    async (id: string, direction: -1 | 1) => {
      const index = videos.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= videos.length) return;
      const previous = videos;
      const next = [...videos];
      [next[index], next[target]] = [next[target], next[index]];
      setVideos(next.map((item, position) => ({ ...item, position })));
      setError(null);
      try {
        await reorderProjectVideos(next.map((item) => item.id));
      } catch (e) {
        setVideos(previous);
        setError(getVideoErrorMessage(e));
      }
    },
    [videos],
  );

  return {
    videos,
    loading,
    error,
    upload,
    deletingId,
    startUpload,
    cancelUpload,
    removeVideo,
    moveVideo,
  };
};
