import { createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "../../helpers/supabase";
import {
  SiteComponentDataProps,
  SiteComponentType,
  HeaderSlideConfig,
  ProjectListConfig,
  ProjectListLayout,
  CTAConfig,
  BodyConfig,
  ContentConfig,
  ContactConfig,
} from "../../types";
import type { RootState } from "../store";

export const fetchSiteComponents = createAsyncThunk(
  "siteComponents/fetchSiteComponents",
  async (pageId: string, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from("site_components")
        .select("*")
        .eq("page_id", pageId)
        .order("position", { ascending: true });

      if (error) {
        return rejectWithValue({
          message: `Error al cargar componentes: ${error.message}`,
          status: error.code,
        });
      }

      return { components: data as SiteComponentDataProps[] };
    } catch (error) {
      return rejectWithValue("Error inesperado al cargar componentes");
    }
  },
);

function getDefaultConfig(
  type: SiteComponentType,
  options?: { layout?: ProjectListLayout },
): HeaderSlideConfig[] | ProjectListConfig | CTAConfig | BodyConfig | ContentConfig | ContactConfig {
  if (type === "project_list") {
    return { layout: options?.layout ?? "grid-4" };
  }
  if (type === "cta") {
    return {
      type: 1,
      title: "",
      description: "",
      subtitle: "",
      text_primary_button: "",
      url_primary_button: "",
      text_secondary_button: "",
      url_secondary_button: "",
      split_color: "#2D3436",
    };
  }
  if (type === "body") {
    return {
      description: "",
      image_1: "",
      image_2: "",
      image_3: "",
      type: 1,
    };
  }
  if (type === "content") {
    return {
      antetitulo: "",
      titulo: "",
      image: "",
      textoIzquierda: "",
      textoDerecha: "",
      dato1: undefined,
      leyenda1: "",
      dato2: undefined,
      leyenda2: "",
      dato3: undefined,
      leyenda3: "",
      dato4: undefined,
      leyenda4: "",
      type: 1,
    };
  }
  if (type === "contact") {
    return {
      type: 1,
      antetitulo: "",
      titulo: "",
      descripcion: "",
      direccion1: "",
      direccion2: "",
      form_bg_color: "#FFFFFF",
      form_email: "",
    };
  }
  return [
    {
      image_url: "",
      title: "",
      description: "",
      type: 1,
      text_button: "",
      url_button: "",
    },
  ];
}

export const addSiteComponent = createAsyncThunk(
  "siteComponents/addSiteComponent",
  async (
    {
      pageId,
      type,
      position,
      options,
    }: {
      pageId: string;
      type: SiteComponentType;
      position: number;
      options?: { layout?: ProjectListLayout };
    },
    { rejectWithValue },
  ) => {
    try {
      const defaultConfig = getDefaultConfig(type, options);

      const { data, error } = await supabase
        .from("site_components")
        .insert({
          page_id: pageId,
          type,
          position,
          visible: true,
          config: defaultConfig,
        })
        .select()
        .single();

      if (error) {
        return rejectWithValue({
          message: `Error al añadir componente: ${error.message}`,
          status: error.code,
        });
      }

      return { component: data as SiteComponentDataProps };
    } catch (error) {
      return rejectWithValue("Error inesperado al añadir componente");
    }
  },
);

export const updateSiteComponent = createAsyncThunk(
  "siteComponents/updateSiteComponent",
  async (
    {
      componentId,
      updates,
    }: {
      componentId: string;
      updates: Partial<
        Pick<SiteComponentDataProps, "config" | "visible" | "position">
      >;
    },
    { rejectWithValue },
  ) => {
    try {
      const { data, error } = await supabase
        .from("site_components")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", componentId)
        .select()
        .single();

      if (error) {
        return rejectWithValue({
          message: `Error al actualizar componente: ${error.message}`,
          status: error.code,
        });
      }

      return { component: data as SiteComponentDataProps };
    } catch (error) {
      return rejectWithValue("Error inesperado al actualizar componente");
    }
  },
);

export const deleteSiteComponent = createAsyncThunk(
  "siteComponents/deleteSiteComponent",
  async (componentId: string, { rejectWithValue }) => {
    try {
      const { error } = await supabase
        .from("site_components")
        .delete()
        .eq("id", componentId);

      if (error) {
        return rejectWithValue({
          message: `Error al eliminar componente: ${error.message}`,
          status: error.code,
        });
      }

      return { componentId };
    } catch (error) {
      return rejectWithValue("Error inesperado al eliminar componente");
    }
  },
);

export const reorderSiteComponents = createAsyncThunk(
  "siteComponents/reorderSiteComponents",
  async (
    components: { id: string; position: number }[],
    { rejectWithValue },
  ) => {
    try {
      for (const comp of components) {
        const { error } = await supabase
          .from("site_components")
          .update({ position: comp.position })
          .eq("id", comp.id);

        if (error) {
          return rejectWithValue({
            message: `Error al reordenar: ${error.message}`,
            status: error.code,
          });
        }
      }

      return { components };
    } catch (error) {
      return rejectWithValue("Error inesperado al reordenar componentes");
    }
  },
);

export const uploadSlideImage = createAsyncThunk(
  "siteComponents/uploadSlideImage",
  async (
    {
      file,
      componentId,
      slideIndex,
      config,
    }: {
      file: File;
      componentId: string;
      slideIndex: number;
      config: HeaderSlideConfig[];
    },
    { rejectWithValue, getState, dispatch },
  ) => {
    try {
      const state = getState() as RootState;
      const userId = state.auth.user?.uid;
      if (!userId) return rejectWithValue("Usuario no autenticado");

      const filePath = `${userId}/headers/slide-${slideIndex + 1}.webp`;

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

      const newConfig = [...config];
      newConfig[slideIndex] = {
        ...newConfig[slideIndex],
        image_url: urlData.publicUrl,
      };

      await dispatch(
        updateSiteComponent({ componentId, updates: { config: newConfig } }),
      ).unwrap();

      return { slideIndex, url: urlData.publicUrl };
    } catch (error) {
      return rejectWithValue("Error inesperado al subir imagen del slide");
    }
  },
);

/**
 * Upsert a cta component for a given page.
 * Creates it if it doesn't exist, updates it if it does.
 */
export const upsertCTAComponent = createAsyncThunk(
  "siteComponents/upsertCTAComponent",
  async (
    { pageId, config }: { pageId: string; config: CTAConfig },
    { rejectWithValue, getState, dispatch },
  ) => {
    try {
      const state = getState() as RootState;
      const existing = state.siteComponent.components.find(
        (c) => c.page_id === pageId && c.type === "cta",
      );

      if (existing) {
        await dispatch(
          updateSiteComponent({
            componentId: existing.id,
            updates: { config },
          }),
        ).unwrap();
        return { config };
      }

      const position = state.siteComponent.components.filter(
        (c) => c.page_id === pageId,
      ).length;

      const { data, error } = await supabase
        .from("site_components")
        .insert({
          page_id: pageId,
          type: "cta",
          position,
          visible: true,
          config,
        })
        .select()
        .single();

      if (error) {
        return rejectWithValue({
          message: `Error al guardar CTA: ${error.message}`,
          status: error.code,
        });
      }

      return { component: data as SiteComponentDataProps, config };
    } catch (error) {
      return rejectWithValue("Error inesperado al guardar CTA");
    }
  },
);

export const uploadBodyImage = createAsyncThunk(
  "siteComponents/uploadBodyImage",
  async (
    {
      file,
      componentId,
      imageIndex,
      config,
    }: {
      file: File;
      componentId: string;
      imageIndex: 1 | 2 | 3;
      config: BodyConfig;
    },
    { rejectWithValue, getState, dispatch },
  ) => {
    try {
      const state = getState() as RootState;
      const userId = state.auth.user?.uid;
      if (!userId) return rejectWithValue("Usuario no autenticado");

      const filePath = `${userId}/body/image-${imageIndex}.webp`;

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

      const newConfig: BodyConfig = {
        ...config,
        [`image_${imageIndex}`]: urlData.publicUrl,
      };

      await dispatch(
        updateSiteComponent({ componentId, updates: { config: newConfig } }),
      ).unwrap();

      return { imageIndex, url: urlData.publicUrl };
    } catch (error) {
      return rejectWithValue("Error inesperado al subir imagen del body");
    }
  },
);

export const uploadContentImage = createAsyncThunk(
  "siteComponents/uploadContentImage",
  async (
    {
      file,
      componentId,
      config,
    }: {
      file: File;
      componentId: string;
      config: ContentConfig;
    },
    { rejectWithValue, getState, dispatch },
  ) => {
    try {
      const state = getState() as RootState;
      const userId = state.auth.user?.uid;
      if (!userId) return rejectWithValue("Usuario no autenticado");

      const filePath = `${userId}/content/image.webp`;

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

      const newConfig: ContentConfig = {
        ...config,
        image: urlData.publicUrl,
      };

      await dispatch(
        updateSiteComponent({ componentId, updates: { config: newConfig } }),
      ).unwrap();

      return { url: urlData.publicUrl };
    } catch (error) {
      return rejectWithValue("Error inesperado al subir imagen del content");
    }
  },
);

/**
 * Upsert a project_list component for a given page.
 * Creates it if it doesn't exist, updates it if it does.
 */
export const upsertProjectListComponent = createAsyncThunk(
  "siteComponents/upsertProjectListComponent",
  async (
    { pageId, layout }: { pageId: string; layout: ProjectListLayout },
    { rejectWithValue, getState, dispatch },
  ) => {
    try {
      const state = getState() as RootState;
      const existing = state.siteComponent.components.find(
        (c) => c.page_id === pageId && c.type === "project_list",
      );

      if (existing) {
        const currentConfig = existing.config as ProjectListConfig;
        await dispatch(
          updateSiteComponent({
            componentId: existing.id,
            updates: { config: { ...currentConfig, layout } },
          }),
        ).unwrap();
        return { layout };
      }

      const position = state.siteComponent.components.filter(
        (c) => c.page_id === pageId,
      ).length;

      await dispatch(
        addSiteComponent({
          pageId,
          type: "project_list",
          position,
          options: { layout },
        }),
      ).unwrap();

      return { layout };
    } catch (error) {
      return rejectWithValue("Error inesperado al guardar layout");
    }
  },
);

export const saveProjectListOrder = createAsyncThunk(
  "siteComponents/saveProjectListOrder",
  async (
    { pageId, project_order }: { pageId: string; project_order: string[] },
    { rejectWithValue, getState, dispatch },
  ) => {
    try {
      const state = getState() as RootState;
      const existing = state.siteComponent.components.find(
        (c) => c.page_id === pageId && c.type === "project_list",
      );

      if (existing) {
        const currentConfig = existing.config as ProjectListConfig;
        await dispatch(
          updateSiteComponent({
            componentId: existing.id,
            updates: { config: { ...currentConfig, project_order } },
          }),
        ).unwrap();
        return { project_order };
      }

      const position = state.siteComponent.components.filter(
        (c) => c.page_id === pageId,
      ).length;

      const { data, error } = await supabase
        .from("site_components")
        .insert({
          page_id: pageId,
          type: "project_list",
          position,
          visible: true,
          config: { layout: "grid-4", project_order },
        })
        .select()
        .single();

      if (error) {
        return rejectWithValue({
          message: `Error al guardar orden: ${error.message}`,
          status: error.code,
        });
      }

      return { component: data as SiteComponentDataProps, project_order };
    } catch (error) {
      return rejectWithValue("Error inesperado al guardar orden");
    }
  },
);

export const saveProjectListHidden = createAsyncThunk(
  "siteComponents/saveProjectListHidden",
  async (
    { pageId, hidden_projects }: { pageId: string; hidden_projects: string[] },
    { rejectWithValue, getState, dispatch },
  ) => {
    try {
      const state = getState() as RootState;
      const existing = state.siteComponent.components.find(
        (c) => c.page_id === pageId && c.type === "project_list",
      );

      if (existing) {
        const currentConfig = existing.config as ProjectListConfig;
        await dispatch(
          updateSiteComponent({
            componentId: existing.id,
            updates: { config: { ...currentConfig, hidden_projects } },
          }),
        ).unwrap();
        return { hidden_projects };
      }

      const position = state.siteComponent.components.filter(
        (c) => c.page_id === pageId,
      ).length;

      const { data, error } = await supabase
        .from("site_components")
        .insert({
          page_id: pageId,
          type: "project_list",
          position,
          visible: true,
          config: { layout: "grid-4", hidden_projects },
        })
        .select()
        .single();

      if (error) {
        return rejectWithValue({
          message: `Error al guardar visibilidad: ${error.message}`,
          status: error.code,
        });
      }

      return { component: data as SiteComponentDataProps, hidden_projects };
    } catch (error) {
      return rejectWithValue("Error inesperado al guardar visibilidad");
    }
  },
);
