import { supabase } from "../../../helpers/supabase";
import type { FotoTag } from "../hooks/usePhotoProcessor";

const NAS_URL = import.meta.env.VITE_NAS_PROXY_URL;
const NAS_KEY = import.meta.env.VITE_NAS_PROXY_API_KEY;
const STORAGE_BUCKET = "user-media";

/**
 * Para fotos heroica/principal: las descarga del NAS y las sube a Supabase Storage.
 * bajaFolderName: "baja" (flujo inicial) o "{projectId}_baja" (proyectos existentes).
 * storageProjectKey: clave usada en la ruta de storage ({userId}/proyectos/{key}/).
 */
export async function enrichFotoTagsWithStorage(
  fotoTags: FotoTag[],
  nasBasePath: string,
  bajaFolderName: string,
  storageProjectKey: string,
  userId: string,
): Promise<FotoTag[]> {
  return Promise.all(
    fotoTags.map(async (ft) => {
      if (ft.rating !== "heroica" && ft.rating !== "principal") return ft;
      try {
        const nasPath = `${nasBasePath}/${bajaFolderName}/${ft.filename}`;
        const res = await fetch(
          `${NAS_URL}/serve?path=${encodeURIComponent(nasPath)}&apikey=${NAS_KEY}`,
        );
        if (!res.ok) return ft;
        const blob = await res.blob();
        const storagePath = `${userId}/proyectos/${storageProjectKey}/${ft.filename}`;
        const { error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, blob, { contentType: "image/jpeg", upsert: true });
        if (error) return ft;
        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(storagePath);
        return { ...ft, supabase_url: urlData.publicUrl };
      } catch {
        return ft;
      }
    }),
  );
}
