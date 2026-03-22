import { createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "../../helpers/supabase";
import type { FotoTag } from "../../features/projects/hooks/usePhotoProcessor";

function ratingToNumber(rating: string): number | null {
  if (rating === "heroica") return 10.0;
  if (rating === "principal") return 7.0;
  return null;
}

export const deleteProjectPhoto = createAsyncThunk(
  "projectPhotos/delete",
  async (
    { projectId, filename }: { projectId: string; filename: string },
    { rejectWithValue },
  ) => {
    const { error } = await supabase
      .from("project_photos")
      .delete()
      .eq("project_id", projectId)
      .eq("filename", filename);

    if (error) {
      return rejectWithValue({ message: error.message });
    }

    return filename;
  },
);

export const addProjectPhotos = createAsyncThunk(
  "projectPhotos/add",
  async (
    {
      projectId,
      fotoTags,
      nasBasePath,
    }: { projectId: string; fotoTags: FotoTag[]; nasBasePath?: string },
    { rejectWithValue },
  ) => {
    const rows = fotoTags.map((ft) => ({
      project_id: projectId,
      filename: ft.filename,
      description: ft.descripcion_corta,
      iluminacion: ft.iluminacion,
      tipo_plano: ft.tipo_plano,
      atmosfera_mood: ft.atmosfera_mood,
      materiales_visibles: ft.materiales_visibles,
      elementos_arquitectonicos: ft.elementos_arquitectonicos,
      rating: ratingToNumber(ft.rating),
      nas_base_path: nasBasePath ?? null,
    }));

    const { error } = await supabase.from("project_photos").insert(rows);

    if (error) {
      return rejectWithValue({ message: error.message });
    }

    return rows.length;
  },
);
