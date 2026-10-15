import { createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "../../helpers/supabase";
import { SitePageDataProps } from "../../types";
import { normalizeAnchor } from "../../helpers/siteAnchors";

async function validateTarget(siteId: string, componentId: string): Promise<string | null> {
  if (!componentId || typeof componentId !== "string") return "Selecciona un ancla de Inicio";
  const { data: component, error } = await supabase.from("site_components")
    .select("page_id,anchor_id").eq("id", componentId).single();
  if (error || !component?.anchor_id) return "El destino debe ser un componente de Inicio con un ancla";
  try { if (!normalizeAnchor(component.anchor_id)) return "El destino no tiene un ancla válida"; }
  catch { return "El destino no tiene un ancla válida"; }
  const { data: home, error: pageError } = await supabase.from("site_pages")
    .select("site_id,slug,page_type").eq("id", component.page_id).single();
  if (pageError || home?.site_id !== siteId || home?.slug !== "home" || home?.page_type === "home_anchor") {
    return "El destino debe pertenecer a Inicio de este sitio";
  }
  return null;
}

type CreatePageInput = { siteId: string; title: string } & (
  { slug: string; page_type?: "page"; target_component_id?: never } |
  { page_type: "home_anchor"; target_component_id: string; slug?: never }
);

const PROTECTED_SLUGS = ["home", "proyectos", "aviso-legal", "politica-cookies"];

const DEFAULT_PAGES: {
  title: string;
  slug: string;
  position: number;
  visible: boolean;
  show_in_nav: boolean;
}[] = [
  { title: "Inicio", slug: "home", position: 1, visible: true, show_in_nav: true },
  { title: "Proyectos", slug: "proyectos", position: 2, visible: true, show_in_nav: true },
  { title: "Aviso Legal y Política de Privacidad", slug: "aviso-legal", position: 3, visible: true, show_in_nav: false },
  { title: "Política de Cookies", slug: "politica-cookies", position: 4, visible: true, show_in_nav: false },
];

export const fetchSitePages = createAsyncThunk(
  "sitePages/fetchSitePages",
  async (siteId: string, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from("site_pages")
        .select("*")
        .eq("site_id", siteId)
        .order("position", { ascending: true });

      if (error) {
        return rejectWithValue({
          message: `Error al cargar páginas: ${error.message}`,
          status: error.code,
        });
      }

      return { pages: data as SitePageDataProps[] };
    } catch (error) {
      return rejectWithValue("Error inesperado al cargar páginas");
    }
  },
);

export const initDefaultPages = createAsyncThunk(
  "sitePages/initDefaultPages",
  async (siteId: string, { rejectWithValue }) => {
    try {
      // Fetch all existing pages for this site
      const { data: existing, error: fetchError } = await supabase
        .from("site_pages")
        .select("*")
        .eq("site_id", siteId)
        .order("position", { ascending: true });

      if (fetchError) {
        return rejectWithValue({
          message: `Error al cargar páginas: ${fetchError.message}`,
          status: fetchError.code,
        });
      }

      const existingPages = (existing ?? []) as SitePageDataProps[];
      const existingSlugs = new Set(existingPages.map((p) => p.slug));
      const missingPages = DEFAULT_PAGES.filter((p) => !existingSlugs.has(p.slug));

      if (missingPages.length === 0) {
        return { pages: existingPages };
      }

      // Append missing pages after the current last position
      const maxPosition = existingPages.reduce((max, p) => Math.max(max, p.position), 0);

      const pagesToInsert = missingPages.map((p, i) => ({
        ...p,
        site_id: siteId,
        position: existingPages.length === 0 ? p.position : maxPosition + i + 1,
      }));

      const { error: insertError } = await supabase
        .from("site_pages")
        .insert(pagesToInsert);

      if (insertError) {
        return rejectWithValue({
          message: `Error al crear páginas predefinidas: ${insertError.message}`,
          status: insertError.code,
        });
      }

      // Re-fetch to get the final ordered list with generated IDs
      const { data: allPages, error: refetchError } = await supabase
        .from("site_pages")
        .select("*")
        .eq("site_id", siteId)
        .order("position", { ascending: true });

      if (refetchError) {
        return rejectWithValue({
          message: `Error al recargar páginas: ${refetchError.message}`,
          status: refetchError.code,
        });
      }

      return { pages: allPages as SitePageDataProps[] };
    } catch (error) {
      return rejectWithValue("Error inesperado al inicializar páginas");
    }
  },
);

export const updateSitePage = createAsyncThunk(
  "sitePages/updateSitePage",
  async (
    {
      pageId,
      updates,
    }: {
      pageId: string;
      updates: Partial<Pick<SitePageDataProps, "visible" | "show_in_nav" | "position" | "title" | "slug" | "content" | "target_component_id">>;
    },
    { rejectWithValue },
  ) => {
    try {
      if ("page_type" in updates) return rejectWithValue("No se puede convertir una página en un enlace");
      if ("slug" in updates || "target_component_id" in updates || "content" in updates) {
        const { data: page, error: pageError } = await supabase.from("site_pages")
          .select("site_id,slug,page_type").eq("id", pageId).single();
        if (pageError) return rejectWithValue("No se pudo comprobar la página");
        if ("slug" in updates && (PROTECTED_SLUGS.includes(page.slug) || PROTECTED_SLUGS.includes(updates.slug ?? "") || page.page_type === "home_anchor")) {
          return rejectWithValue("No se puede cambiar ese slug reservado por el sistema");
        }
        if ("content" in updates && page.page_type === "home_anchor") return rejectWithValue("Los enlaces a Inicio no admiten contenido");
        if ("target_component_id" in updates) {
          if (page.page_type !== "home_anchor") return rejectWithValue("Solo los enlaces a Inicio admiten un destino");
          const targetError = await validateTarget(page.site_id, updates.target_component_id ?? "");
          if (targetError) return rejectWithValue(targetError);
        }
      }
      const { data, error } = await supabase
        .from("site_pages")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", pageId)
        .select()
        .single();

      if (error) {
        return rejectWithValue({
          message: `Error al actualizar página: ${error.message}`,
          status: error.code,
        });
      }

      return { page: data as SitePageDataProps };
    } catch (error) {
      return rejectWithValue("Error inesperado al actualizar página");
    }
  },
);

export const createSitePage = createAsyncThunk(
  "sitePages/createSitePage",
  async (
    input: CreatePageInput,
    { rejectWithValue },
  ) => {
    try {
      const { siteId, title } = input;
      if (input.page_type != null && input.page_type !== "page" && input.page_type !== "home_anchor") return rejectWithValue("Tipo de página no válido");
      const isAnchor = input.page_type === "home_anchor";
      if (!isAnchor && "target_component_id" in input) return rejectWithValue("Solo los enlaces a Inicio admiten un destino");
      if (isAnchor) {
        if (input.slug != null) return rejectWithValue("El slug del enlace se genera automáticamente");
        if (!title.trim()) return rejectWithValue("Indica un título para el enlace");
        const targetError = await validateTarget(siteId, input.target_component_id);
        if (targetError) return rejectWithValue(targetError);
      }
      const slug = isAnchor ? `home-anchor-${crypto.randomUUID()}` : input.slug;
      if (!slug || !/^[a-z0-9-]+$/.test(slug)) return rejectWithValue("Slug no válido");
      if (PROTECTED_SLUGS.includes(slug)) {
        return rejectWithValue("Ese slug está reservado por el sistema");
      }

      const { data: existing, error: existingError } = await supabase
        .from("site_pages")
        .select("id")
        .eq("site_id", siteId)
        .eq("slug", slug);

      if (existingError) return rejectWithValue("No se pudo comprobar si la página ya existe");
      if (existing && existing.length > 0) {
        return rejectWithValue("Ya existe una página con ese slug");
      }

      const { data: allPages, error: positionError } = await supabase
        .from("site_pages")
        .select("position")
        .eq("site_id", siteId)
        .order("position", { ascending: false })
        .limit(1);

      if (positionError) return rejectWithValue("No se pudo calcular la posición de la página");
      const nextPosition = allPages?.[0]?.position == null ? 1 : allPages[0].position + 1;

      const { data, error } = await supabase
        .from("site_pages")
        .insert({
          site_id: siteId,
          title,
          slug,
          ...(isAnchor ? { page_type: "home_anchor", target_component_id: input.target_component_id } : {}),
          position: nextPosition,
          visible: true,
          show_in_nav: true,
        })
        .select()
        .single();

      if (error) {
        return rejectWithValue({
          message: `Error al crear página: ${error.message}`,
          status: error.code,
        });
      }

      return { page: data as SitePageDataProps };
    } catch {
      return rejectWithValue("Error inesperado al crear página");
    }
  },
);

export const deleteSitePage = createAsyncThunk(
  "sitePages/deleteSitePage",
  async (pageId: string, { rejectWithValue }) => {
    try {
      const { error: compError } = await supabase
        .from("site_components")
        .delete()
        .eq("page_id", pageId);

      if (compError) {
        return rejectWithValue({
          message: `Error al eliminar componentes: ${compError.message}`,
          status: compError.code,
        });
      }

      const { error } = await supabase
        .from("site_pages")
        .delete()
        .eq("id", pageId);

      if (error) {
        return rejectWithValue({
          message: `Error al eliminar página: ${error.message}`,
          status: error.code,
        });
      }

      return { pageId };
    } catch {
      return rejectWithValue("Error inesperado al eliminar página");
    }
  },
);

export const reorderSitePages = createAsyncThunk(
  "sitePages/reorderSitePages",
  async (pages: { id: string; position: number }[], { rejectWithValue }) => {
    try {
      for (const page of pages) {
        const { error } = await supabase
          .from("site_pages")
          .update({ position: page.position })
          .eq("id", page.id);

        if (error) {
          return rejectWithValue({
            message: `Error al reordenar: ${error.message}`,
            status: error.code,
          });
        }
      }

      return { pages };
    } catch (error) {
      return rejectWithValue("Error inesperado al reordenar páginas");
    }
  },
);
