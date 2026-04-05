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
  async (siteId: string, { rejectWithValue, dispatch }) => {
    try {
      // Check if pages already exist
      const { data: existing } = await supabase
        .from("site_pages")
        .select("id")
        .eq("site_id", siteId)
        .limit(1);

      if (existing && existing.length > 0) {
        // Pages already exist, just fetch them
        const result = await dispatch(fetchSitePages(siteId)).unwrap();
        return result;
      }

      // Create default pages
      const pagesToInsert = DEFAULT_PAGES.map((p) => ({
        ...p,
        site_id: siteId,
      }));

      const { data, error } = await supabase
        .from("site_pages")
        .insert(pagesToInsert)
        .select();

      if (error) {
        return rejectWithValue({
          message: `Error al crear páginas predefinidas: ${error.message}`,
          status: error.code,
        });
      }

      return { pages: data as SitePageDataProps[] };
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
      updates: Partial<Pick<SitePageDataProps, "visible" | "show_in_nav" | "position" | "title">>;
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
