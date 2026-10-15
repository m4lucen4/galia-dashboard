// Shared with the public renderer and the additive home-anchor migration.
export const PROTECTED_PAGE_SLUGS = ["home", "proyectos", "aviso-legal", "politica-cookies"];
const RESERVED_ANCHORS = new Set([
  "page-content", "mobile-menu", "menu-toggle", "btn-view-grid", "btn-view-list",
  "keyword-select", "active-pills", "view-grid", "view-list",
]);

export function normalizeAnchor(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new Error("El ancla debe ser texto");
  const anchor = value.trim().replace(/^#/, "");
  if (!anchor) return null;
  if (!/^[a-z][a-z0-9-]{0,79}$/.test(anchor)) {
    throw new Error("El ancla debe comenzar con una letra minúscula y usar solo letras minúsculas, números y guiones (máximo 80 caracteres)");
  }
  if (RESERVED_ANCHORS.has(anchor) || /^(cookie-|toggle-|contact-)/.test(anchor)) {
    throw new Error("Ese ancla está reservada por el sistema");
  }
  return anchor;
}

export function anchorError(error: { code?: string; message: string }): string {
  if (error.code === "23503") return "El ancla está enlazada desde el menú. Cambia o elimina esos enlaces antes de borrar el componente o quitar su ancla.";
  if (error.code === "23505") return "Ya existe un ancla con ese nombre en Inicio. Elige otro nombre.";
  return error.message;
}

export type HomeAnchorOption = {
  id: string;
  anchor_id: string;
  type: string;
  visible: boolean;
  position: number;
};
