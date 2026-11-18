import { ProjectVideoError } from "./videoErrors";

const LOAD_TIMEOUT_MS = 20_000;

export const UNREADABLE_VIDEO_MESSAGE =
  "No se pudo leer el vídeo. Comprueba que el archivo no esté dañado y que use un códec compatible (H.264 o HEVC).";

export interface LoadedVideo {
  video: HTMLVideoElement;
  dispose: () => void;
}

/**
 * Loads a File into a detached (hidden) <video> element. Nothing is attached to
 * the DOM; call dispose() to release the object URL.
 */
export const loadVideoElement = (
  file: File,
  preload: "metadata" | "auto",
): Promise<LoadedVideo> =>
  new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    let settled = false;

    const dispose = () => {
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
    };

    const finish = (error?: ProjectVideoError) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      video.onloadedmetadata = null;
      video.onloadeddata = null;
      video.onerror = null;
      if (error) {
        dispose();
        reject(error);
      } else {
        resolve({ video, dispose });
      }
    };

    const timer = window.setTimeout(
      () => finish(new ProjectVideoError(UNREADABLE_VIDEO_MESSAGE)),
      LOAD_TIMEOUT_MS,
    );

    video.muted = true;
    video.playsInline = true;
    video.preload = preload;
    video.onerror = () =>
      finish(new ProjectVideoError(UNREADABLE_VIDEO_MESSAGE));
    // "auto" waits for the first decoded frame so the poster can be drawn.
    if (preload === "auto") {
      video.onloadeddata = () => finish();
    } else {
      video.onloadedmetadata = () => finish();
    }
    video.src = url;
  });
