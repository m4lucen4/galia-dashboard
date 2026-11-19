import { supabase } from "@/helpers/supabase";
import type { SocialNetwork } from "../helpers/socialMediaRules";
import type { ImageAdjustments, VariantCrop } from "../helpers/imageVariants";

// Contract: odd/tasks/social-publishing-migration.md S20 and
// supabase/migrations/20261118000600_publication_media_variants.sql.
export const VARIANTS_BUCKET = "publication-variants";
const TABLE = "publication_media_variants";

export interface PublicationMediaVariant {
  id: string;
  preview_id: number | string;
  network: SocialNetwork;
  /** The original image url as it appears in projectsPreview.image_data[].url */
  source_url: string;
  position: number;
  storage_path: string;
  public_url: string;
  width: number;
  height: number;
  bytes: number;
  crop: VariantCrop | null;
  /** Tone/straighten/perspective values baked into the JPEG (to restore the sliders); null: none. */
  adjustments: ImageAdjustments | null;
}

export type PublicationMediaVariantStep = "list" | "upload" | "save" | "remove";

export class PublicationMediaVariantError extends Error {
  readonly step: PublicationMediaVariantStep;
  constructor(step: PublicationMediaVariantStep, message: string) {
    super(message);
    this.name = "PublicationMediaVariantError";
    this.step = step;
  }
}

export interface SavePublicationMediaVariantInput {
  previewId: string | number;
  network: SocialNetwork;
  sourceUrl: string;
  position: number;
  blob: Blob;
  width: number;
  height: number;
  bytes: number;
  crop: VariantCrop;
  adjustments?: ImageAdjustments | null;
}

const COLUMNS =
  "id, preview_id, network, source_url, position, storage_path, public_url, width, height, bytes, crop, adjustments";

/** Every variant of a publication (all networks), in publication order. */
export async function listPublicationMediaVariants(
  previewId: string | number,
): Promise<PublicationMediaVariant[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(COLUMNS)
    .eq("preview_id", String(previewId))
    .order("position", { ascending: true });
  if (error) throw new PublicationMediaVariantError("list", error.message);
  return (data ?? []) as PublicationMediaVariant[];
}

async function removeObject(path: string): Promise<void> {
  // Best effort: an orphaned object is harmless (public bucket, tiny), a failed save is not.
  await supabase.storage.from(VARIANTS_BUCKET).remove([path]);
}

/**
 * Uploads the derivative to <previewId>/<network>/<uuid>.jpg and upserts the row that maps the
 * original to it. A replaced derivative is deleted afterwards; a failed row write removes the
 * object that was just uploaded.
 */
export async function savePublicationMediaVariant(
  input: SavePublicationMediaVariantInput,
): Promise<PublicationMediaVariant> {
  const previewId = String(input.previewId);

  const { data: previous, error: previousError } = await supabase
    .from(TABLE)
    .select("storage_path")
    .eq("preview_id", previewId)
    .eq("network", input.network)
    .eq("source_url", input.sourceUrl)
    .maybeSingle();
  if (previousError) throw new PublicationMediaVariantError("list", previousError.message);

  const storagePath = `${previewId}/${input.network}/${crypto.randomUUID()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from(VARIANTS_BUCKET)
    .upload(storagePath, input.blob, { contentType: "image/jpeg", upsert: false });
  if (uploadError) throw new PublicationMediaVariantError("upload", uploadError.message);

  const publicUrl = supabase.storage.from(VARIANTS_BUCKET).getPublicUrl(storagePath).data.publicUrl;
  const { data: row, error: saveError } = await supabase
    .from(TABLE)
    .upsert(
      {
        preview_id: previewId,
        network: input.network,
        source_url: input.sourceUrl,
        position: input.position,
        storage_path: storagePath,
        public_url: publicUrl,
        width: input.width,
        height: input.height,
        bytes: input.bytes,
        crop: input.crop,
        adjustments: input.adjustments ?? null,
      },
      { onConflict: "preview_id,network,source_url" },
    )
    .select(COLUMNS)
    .single();
  if (saveError || !row) {
    await removeObject(storagePath);
    throw new PublicationMediaVariantError("save", saveError?.message ?? "no row returned");
  }

  const previousPath = (previous as { storage_path?: string } | null)?.storage_path;
  if (previousPath && previousPath !== storagePath) await removeObject(previousPath);
  return row as PublicationMediaVariant;
}

/** Deletes a variant (row first, then its object): the network falls back to the original. */
export async function removePublicationMediaVariant(
  variant: Pick<PublicationMediaVariant, "id" | "storage_path">,
): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", variant.id);
  if (error) throw new PublicationMediaVariantError("remove", error.message);
  await removeObject(variant.storage_path);
}
