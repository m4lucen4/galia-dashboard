import { useEffect, useMemo, useState } from "react";
import type { PreviewProjectDataProps } from "@/types";
import { publishedImages } from "./publicationImages";
import { SOCIAL_MEDIA_VARIANTS_ENABLED, type SocialNetwork } from "./socialMediaRules";
import {
  listPublicationMediaVariants,
  type PublicationMediaVariant,
} from "../services/publicationMediaVariants";

export interface PreviewImage {
  url: string;
  /** Known only for per-network variants. */
  width: number | null;
  height: number | null;
  isVariant: boolean;
}

/**
 * Images the preview of one network should show, in publish order: the network's
 * adjusted copy when one exists (same rule as the publish payload), else the original.
 * Variants are only used while VITE_SOCIAL_MEDIA_VARIANTS is on, because until the
 * cutover n8n publishes the originals.
 */
export function usePreviewImages(
  project: Pick<PreviewProjectDataProps, "id" | "image_data"> | null | undefined,
  network: SocialNetwork,
): PreviewImage[] {
  const previewId = project?.id;
  const key = SOCIAL_MEDIA_VARIANTS_ENABLED && previewId != null ? `${previewId}:${network}` : null;
  // Rows are kept with the key they were loaded for, so a stale answer is never shown.
  const [loaded, setLoaded] = useState<{ key: string; rows: PublicationMediaVariant[] } | null>(null);

  useEffect(() => {
    if (key === null || previewId == null) return;
    let active = true;
    listPublicationMediaVariants(previewId)
      .then((rows) => {
        if (active) setLoaded({ key, rows: rows.filter((row) => row.network === network) });
      })
      .catch(() => {
        // The preview falls back to the originals; the publish configuration reports errors.
        if (active) setLoaded({ key, rows: [] });
      });
    return () => {
      active = false;
    };
  }, [key, previewId, network]);

  return useMemo(() => {
    const variants = key !== null && loaded?.key === key ? loaded.rows : [];
    const bySource = new Map(variants.map((variant) => [variant.source_url, variant]));
    return publishedImages(project).map((image) => {
      const variant = bySource.get(image.url);
      return variant
        ? { url: variant.public_url, width: variant.width, height: variant.height, isVariant: true }
        : { url: image.url, width: null, height: null, isVariant: false };
    });
  }, [project, key, loaded]);
}
