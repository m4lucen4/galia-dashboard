import { createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "../../helpers/supabase";
import type { FotoTag } from "../../features/projects/hooks/usePhotoProcessor";

function ratingToNumber(rating: string): number | null {
  if (rating === "heroica") return 10.0;
  if (rating === "principal") return 7.0;
  return null;
}

export const addProjectPhotos = createAsyncThunk(
  "projectPhotos/add",
  async (
    { projectId, fotoTags }: { projectId: string; fotoTags: FotoTag[] },
    { rejectWithValue },
  ) => {
    const rows = fotoTags.map((ft) => ({
      project_id: projectId,
      filename: ft.filename,
      description: ft.descripcion_corta,
      tags: [
        ...ft.iluminacion,
        ...ft.tipo_plano,
        ...ft.atmosfera_mood,
        ...ft.materiales_visibles,
        ...ft.elementos_arquitectonicos,
      ],
      rating: ratingToNumber(ft.rating),
    }));

    const { error } = await supabase.from("project_photos").insert(rows);

    if (error) {
      return rejectWithValue({ message: error.message });
    }

    return rows.length;
  },
);
