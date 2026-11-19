// Spanish UI texts of the video formats (VITE_SOCIAL_VIDEO, task social-video-publishing T4).
// Kept next to the logic like the texts of src/features/projects/videos; the error texts are looked
// up through i18next with these as default values, so a locale file can override them later.
import { FASTSTART_WARNING } from "@/features/projects/videos/videoConstants";
import type { PublicationFormat } from "@/types";
import type { SocialNetwork } from "./socialMediaRules";

export const NETWORK_NAMES: Record<SocialNetwork, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
};

export const formatLabel = (network: SocialNetwork, format: PublicationFormat): string => {
  switch (format) {
    case "image":
      return network === "instagram" ? "Post" : "Imagen(es)";
    case "story_image":
      return "Historia (imagen)";
    case "reel":
      return "Reel";
    case "story_video":
      return "Historia (vídeo)";
    case "video":
      return "Vídeo";
  }
};

export const SELECTOR_TEXTS = {
  title: (network: SocialNetwork) => `Formato en ${NETWORK_NAMES[network]}`,
  noPhotos: "No hay fotos seleccionadas",
  videoLoading: "Cargando el vídeo…",
  videoError: "No se pudo cargar el vídeo",
  videoMissing: "El vídeo ya no está disponible",
  storyTooLong: "El vídeo dura más de 60 s",
  storyTooHeavy: "El vídeo pesa más de 100 MB",
};

export const PANEL_TEXTS = {
  videoLoading: "Vídeo: cargando información…",
  videoError: "Vídeo: no se pudo cargar su información.",
  videoMissing: "El vídeo de esta publicación ya no existe. Elige otro vídeo o publica con fotos.",
  videoInfo: (duration: string, size: string, resolution: string) =>
    `Vídeo: ${duration} · ${size} · ${resolution}`,
  faststart: FASTSTART_WARNING,
  notVertical: (ratio: string) =>
    `El vídeo no es 9:16 (es ${ratio}). Instagram puede recortarlo.`,
  storyTooLong: (duration: string) =>
    `Las historias de Instagram admiten vídeos de hasta 60 s: este dura ${duration}.`,
  storyTooHeavy: (size: string) =>
    `Las historias de Instagram admiten vídeos de hasta 100 MB: este pesa ${size}.`,
  storyNoCaption: "Las historias no llevan texto.",
  storyImageInfo: "La historia usa la primera imagen original, sin recorte.",
  storyImageNotJpeg: (format: string) =>
    `Instagram solo garantiza imágenes JPEG en historias; esta es ${format}.`,
  linkedinVideoInfo: "LinkedIn publica el vídeo con el texto de la publicación.",
};

export const BLOCKED_TEXTS = {
  videoLoading: "Cargando la información del vídeo…",
  videoError: (network: string) =>
    `No se pudo cargar el vídeo de la publicación para ${network}. Cierra la configuración y vuelve a intentarlo.`,
  videoMissing: (network: string) =>
    `El vídeo de esta publicación ya no existe, así que no se puede publicar en ${network}. Elige otro vídeo o publica con fotos.`,
  storyVideoLimits: "Las historias de Instagram admiten vídeos de hasta 60 s y 100 MB.",
};

export const PREVIEW_TEXTS = {
  formatTabs: "Formato de la vista preliminar",
  play: "Reproducir vídeo",
  videoUnavailable: "Esta publicación no tiene vídeo.",
  noImage: "Esta publicación no tiene imágenes.",
  storyHint: "Las historias no llevan texto.",
};

type ErrorText = { reason: string; fix: string };

/** Reason and fix of the target error codes added with the video formats ({network} is replaced). */
export const VIDEO_TARGET_ERROR_TEXTS: Record<string, ErrorText> = {
  video_missing: {
    reason: "El vídeo de esta publicación ya no existe.",
    fix: "Elige otro vídeo o publica con fotos.",
  },
  media_processing_timeout: {
    reason: "La red tardó demasiado en procesar el vídeo.",
    fix: "Vuelve a intentarlo.",
  },
  format_unsupported: {
    reason: "{{network}} no admite el formato elegido.",
    fix: "Vuelve a programar la publicación con otro formato.",
  },
  video_required: {
    reason: "La publicación no tiene vídeo para el formato elegido.",
    fix: "Elige un vídeo en la publicación o publica con fotos.",
  },
  video_limits: {
    reason: "El vídeo no cumple los límites del formato elegido.",
    fix: "Elige un vídeo más corto o más ligero, o publica con fotos.",
  },
};

/** Messages of the publish request errors added with the video formats. */
export const VIDEO_REQUEST_ERROR_TEXTS: Record<string, string> = {
  video_required: "Elige un vídeo de la publicación antes de programarla en este formato.",
  video_limits:
    "El vídeo no cumple los límites de este formato (las historias admiten hasta 60 s y 100 MB).",
};
