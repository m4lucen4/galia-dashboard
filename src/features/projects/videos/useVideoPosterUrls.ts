import { useEffect, useState } from "react";
import { getVideoPosterUrls } from "./projectVideosService";

/**
 * Poster URLs by video id for the given ids (publication cards). Failures are
 * not surfaced: a card without poster just keeps its fallback thumbnail.
 */
export const useVideoPosterUrls = (
  videoIds: Array<string | null | undefined>,
): Record<string, string> => {
  const [posters, setPosters] = useState<Record<string, string>>({});
  const key = [...new Set(videoIds.filter((id): id is string => !!id))]
    .sort()
    .join(",");

  useEffect(() => {
    if (!key) return;
    let active = true;
    getVideoPosterUrls(key.split(","))
      .then((urls) => {
        if (active) setPosters((prev) => ({ ...prev, ...urls }));
      })
      .catch((error: unknown) => {
        console.error("Error loading video posters:", error);
      });
    return () => {
      active = false;
    };
  }, [key]);

  return posters;
};
