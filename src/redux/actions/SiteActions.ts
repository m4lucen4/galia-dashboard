import { createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "../../helpers/supabase";
import { SiteDataProps } from "../../types";
import type { RootState } from "../store";

export type CreateSiteProps = {
  studio_name: string;
  slug: string;
};

export type UpdateSiteProps = Partial<
  Omit<SiteDataProps, "id" | "user_id" | "created_at" | "updated_at">
>;

export const fetchSite = createAsyncThunk(
  "site/fetchSite",
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as RootState;
      const userId = state.auth.user?.uid;
      if (!userId) return rejectWithValue("Usuario no autenticado");

      const { data, error } = await supabase
        .from("sites")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        return rejectWithValue({
          message: `Error al cargar el sitio: ${error.message}`,
          status: error.code,
        });
      }

      return { site: data as SiteDataProps | null };
    } catch (error) {
      return rejectWithValue("Error inesperado al cargar el sitio");
    }
  },
);

export const createSite = createAsyncThunk(
  "site/createSite",
  async (siteData: CreateSiteProps, { rejectWithValue, getState }) => {
    try {
      const state = getState() as RootState;
      const userId = state.auth.user?.uid;
      if (!userId) return rejectWithValue("Usuario no autenticado");

      // Check slug uniqueness
      const { data: existing } = await supabase
        .from("sites")
        .select("id")
        .eq("slug", siteData.slug)
        .single();

      if (existing) {
        return rejectWithValue("Este slug ya está en uso");
      }

      const { data, error } = await supabase
        .from("sites")
        .insert({
          user_id: userId,
          studio_name: siteData.studio_name,
          slug: siteData.slug,
        })
        .select()
        .single();

      if (error) {
        return rejectWithValue({
          message: `Error al crear el sitio: ${error.message}`,
          status: error.code,
        });
      }

      return { site: data as SiteDataProps };
    } catch (error) {
      return rejectWithValue("Error inesperado al crear el sitio");
    }
  },
);

export const updateSite = createAsyncThunk(
  "site/updateSite",
  async (
    { siteId, updates }: { siteId: string; updates: UpdateSiteProps },
    { rejectWithValue, getState },
  ) => {
    try {
      const state = getState() as RootState;
      const userId = state.auth.user?.uid;
      if (!userId) return rejectWithValue("Usuario no autenticado");

      // If slug is being updated, check uniqueness
      if (updates.slug) {
        const { data: existing } = await supabase
          .from("sites")
          .select("id")
          .eq("slug", updates.slug)
          .neq("id", siteId)
          .single();

        if (existing) {
          return rejectWithValue("Este slug ya está en uso");
        }
      }

      const { data, error } = await supabase
        .from("sites")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", siteId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        return rejectWithValue({
          message: `Error al actualizar el sitio: ${error.message}`,
          status: error.code,
        });
      }

      return { site: data as SiteDataProps };
    } catch (error) {
      return rejectWithValue("Error inesperado al actualizar el sitio");
    }
  },
);

export const publishSite = createAsyncThunk(
  "site/publishSite",
  async (
    { siteId, published }: { siteId: string; published: boolean },
    { rejectWithValue, getState },
  ) => {
    try {
      const state = getState() as RootState;
      const userId = state.auth.user?.uid;
      if (!userId) return rejectWithValue("Usuario no autenticado");

      const { data, error } = await supabase
        .from("sites")
        .update({
          published,
          updated_at: new Date().toISOString(),
        })
        .eq("id", siteId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        return rejectWithValue({
          message: `Error al cambiar estado de publicación: ${error.message}`,
          status: error.code,
        });
      }

      return { site: data as SiteDataProps };
    } catch (error) {
      return rejectWithValue("Error inesperado");
    }
  },
);

export const uploadSiteImage = createAsyncThunk(
  "site/uploadSiteImage",
  async (
    {
      file,
      path,
      siteId,
      field,
    }: {
      file: File;
      path: string;
      siteId: string;
      field: "logo_url" | "favicon_url";
    },
    { rejectWithValue, getState, dispatch },
  ) => {
    try {
      const state = getState() as RootState;
      const userId = state.auth.user?.uid;
      if (!userId) return rejectWithValue("Usuario no autenticado");

      const filePath = `${userId}/${path}`;

      const { error: uploadError } = await supabase.storage
        .from("sites")
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        return rejectWithValue({
          message: `Error al subir imagen: ${uploadError.message}`,
        });
      }

      const { data: urlData } = supabase.storage
        .from("sites")
        .getPublicUrl(filePath);

      const url = urlData.publicUrl;

      // Update the site with the new image URL
      await dispatch(
        updateSite({ siteId, updates: { [field]: url } }),
      ).unwrap();

      return { field, url };
    } catch (error) {
      return rejectWithValue("Error inesperado al subir imagen");
    }
  },
);
