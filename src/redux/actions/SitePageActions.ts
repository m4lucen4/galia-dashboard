import { createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "../../helpers/supabase";
import { SitePageDataProps } from "../../types";

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
      updates: Partial<Pick<SitePageDataProps, "visible" | "show_in_nav" | "position" | "title" | "slug" | "content">>;
    },
    { rejectWithValue },
  ) => {
    try {
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
    { siteId, title, slug }: { siteId: string; title: string; slug: string },
    { rejectWithValue },
  ) => {
    try {
      if (PROTECTED_SLUGS.includes(slug)) {
        return rejectWithValue("Ese slug está reservado por el sistema");
      }

      const { data: existing } = await supabase
        .from("site_pages")
        .select("id")
        .eq("site_id", siteId)
        .eq("slug", slug);

      if (existing && existing.length > 0) {
        return rejectWithValue("Ya existe una página con ese slug");
      }

      const { data: allPages } = await supabase
        .from("site_pages")
        .select("position")
        .eq("site_id", siteId)
        .order("position", { ascending: false })
        .limit(1);

      const nextPosition = allPages?.[0]?.position == null ? 1 : allPages[0].position + 1;

      const { data, error } = await supabase
        .from("site_pages")
        .insert({
          site_id: siteId,
          title,
          slug,
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
