import { loadVideoElement } from "./videoElement";

const MAX_POSTER_DIMENSION = 1280;
const POSTER_QUALITY = 0.85;
const SEEK_TIMEOUT_MS = 10_000;

const seek = (video: HTMLVideoElement, time: number): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error("Seek timeout")),
      SEEK_TIMEOUT_MS,
    );
    video.onseeked = () => {
      window.clearTimeout(timer);
      video.onseeked = null;
      resolve();
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("Seek error"));
    };
    video.currentTime = time;
  });

/**
 * Captures a frame (~1 s, or the first frame for shorter videos) as a JPEG blob.
 * Rejects when the browser cannot decode a frame; callers treat that as non-blocking.
 */
export const capturePoster = async (
  file: File,
  durationMs: number,
): Promise<Blob> => {
  const { video, dispose } = await loadVideoElement(file, "auto");
  try {
    if (durationMs >= 1500) await seek(video, 1);

    const { videoWidth, videoHeight } = video;
    if (!videoWidth || !videoHeight) throw new Error("No frame available");

    const scale = Math.min(
      1,
      MAX_POSTER_DIMENSION / Math.max(videoWidth, videoHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(videoWidth * scale));
    canvas.height = Math.max(1, Math.round(videoHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas not available");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Empty poster"))),
        "image/jpeg",
        POSTER_QUALITY,
      );
    });
  } finally {
    dispose();
  }
};
