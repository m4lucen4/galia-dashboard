import { createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "../../helpers/supabase";
import { SitePageDataProps } from "../../types";

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
      updates: Partial<Pick<SitePageDataProps, "visible" | "show_in_nav" | "position" | "title" | "content">>;
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
