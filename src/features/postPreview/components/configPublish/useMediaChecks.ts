import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PreviewProjectDataProps } from "@/types";
import {
  failureKind,
  forgetMeasurement,
  loadCorsImage,
  measureImage,
  publishedImages,
  type ImageMeasurement,
  type MeasureFailureKind,
} from "../../helpers/publicationImages";
import { clampInstagramRatio, renderVariant } from "../../helpers/imageVariants";
import {
  evaluateCarousel,
  SOCIAL_MEDIA_VARIANTS_ENABLED,
  type ImageFacts,
  type ImageIssue,
  type SocialNetwork,
} from "../../helpers/socialMediaRules";
import { publishedText, textStats, type TextStats } from "../../helpers/socialText";
import {
  listPublicationMediaVariants,
  removePublicationMediaVariant,
  savePublicationMediaVariant,
  type PublicationMediaVariant,
} from "../../services/publicationMediaVariants";

export const MEDIA_NETWORKS: SocialNetwork[] = ["instagram", "linkedin"];

const CROP_CODES = new Set(["ratio_too_narrow", "ratio_too_wide", "ratio_mismatch"]);
const COLLECTION_CODES = new Set(["too_many_items", "no_images"]);

export const isCropIssue = (issue: ImageIssue) => CROP_CODES.has(issue.code);

export interface MediaRow {
  index: number;
  url: string;
  state: "loading" | "error" | "ok";
  /** Why the measurement failed ("timeout": the image did not load in 15 s); null otherwise. */
  errorKind: MeasureFailureKind | null;
  source: ImageMeasurement | null;
  /** Derivative stored for this network, when one exists (switch on only). */
  variant: PublicationMediaVariant | null;
  /** What the network would receive: the variant, else the original. */
  facts: ImageFacts | null;
  /** Issues of `facts`, per image (carousel mismatch included). */
  issues: ImageIssue[];
  /**
   * Switch on, Instagram: the format or the weight of the original could not be read (HEAD
   * blocked, no extension). Unknown is treated as "needs conversion" so the JPEG copy is generated
   * and Instagram never receives something unverified.
   */
  unknownFacts: boolean;
  /** The JPEG / resized copy is due: convert-only issues or unknownFacts, and no variant yet. */
  needsConversion: boolean;
  converting: boolean;
  conversionFailed: boolean;
}

export type MediaBlockerCode =
  | "variantsLoading"
  | "variantsError"
  | "measuring"
  | "measureError"
  | "tooManyImages"
  | "noImages"
  | "crop"
  | "converting"
  | "conversionFailed";

export interface MediaBlocker {
  code: MediaBlockerCode;
  count?: number;
}

export type ImageStatusKind = "applied" | "pending" | "ok";

export interface ImageStatus {
  kind: ImageStatusKind;
  /** Pending because an applied variant no longer matches the carousel's common ratio. */
  ratioChanged: boolean;
  /** Pending because the ratio does not fit and the image must be cropped. */
  needsCrop: boolean;
}

/**
 * Per-image state shown by the adjuster (S22): "applied" (a valid variant exists), "pending"
 * (needs a crop or a conversion and has no valid variant, or its variant no longer matches the
 * common ratio) or "ok" (nothing to do). The blocking rule uses the same facts.
 */
export function imageStatus(row: MediaRow): ImageStatus {
  const needsCrop = row.issues.some(isCropIssue);
  if (row.variant) {
    return needsCrop
      ? { kind: "pending", ratioChanged: true, needsCrop }
      : { kind: "applied", ratioChanged: false, needsCrop };
  }
  if (needsCrop || row.needsConversion || row.converting || row.conversionFailed) {
    return { kind: "pending", ratioChanged: false, needsCrop };
  }
  return { kind: "ok", ratioChanged: false, needsCrop };
}

export interface NetworkMedia {
  network: SocialNetwork;
  rows: MediaRow[];
  /**
   * Instagram with 2+ images: the one ratio every item of the carousel is cropped to (the user's
   * choice, else the first image's ratio inside 0.8..1.91). null otherwise.
   */
  commonRatio: number | null;
  /** Issues about the whole set of images (too many, none). */
  collectionIssues: ImageIssue[];
  /** Why this network cannot be published yet; null with the switch off or when it is ready. */
  blocker: MediaBlocker | null;
}

type MeasureState =
  | { status: "ok"; measurement: ImageMeasurement }
  | { status: "error"; kind: MeasureFailureKind };
type VariantsState = "off" | "loading" | "ready" | "error";

const factsOf = (
  measurement: ImageMeasurement | null,
  variant: PublicationMediaVariant | null,
): ImageFacts | null => {
  if (variant) {
    return { width: variant.width, height: variant.height, bytes: variant.bytes, mime: "image/jpeg" };
  }
  if (!measurement) return null;
  return {
    width: measurement.width,
    height: measurement.height,
    bytes: measurement.bytes,
    mime: measurement.mime,
  };
};

const withoutKey = <T,>(record: Record<string, T>, key: string): Record<string, T> =>
  Object.fromEntries(Object.entries(record).filter(([name]) => name !== key));

const isConvertOnly = (issues: ImageIssue[]) =>
  issues.length > 0 && !issues.some(isCropIssue);

export function useMediaChecks(
  project: PreviewProjectDataProps | null,
  active: Record<SocialNetwork, boolean>,
) {
  const enabled = SOCIAL_MEDIA_VARIANTS_ENABLED;
  const previewId = project ? String(project.id) : null;
  const images = useMemo(() => publishedImages(project), [project]);
  const urls = useMemo(() => images.map((image) => image.url), [images]);

  // Images are measured only for networks that are checked and connected (D2): with no active
  // network no HEAD / image load happens at all.
  const anyActive = MEDIA_NETWORKS.some((network) => active[network]);
  const [measures, setMeasures] = useState<Record<string, MeasureState>>({});
  const [retryTick, setRetryTick] = useState(0);
  const requested = useRef(new Set<string>());

  useEffect(() => {
    if (!anyActive) return;
    for (const url of urls) {
      if (requested.current.has(url)) continue;
      requested.current.add(url);
      // Concurrency (3) and the 15 s timeout live in measureImage. A failure stays failed (also
      // across reopenings of this window) until the user presses "Reintentar".
      measureImage(url).then(
        (measurement) =>
          setMeasures((previous) => ({ ...previous, [url]: { status: "ok", measurement } })),
        (error: unknown) =>
          setMeasures((previous) => ({
            ...previous,
            [url]: { status: "error", kind: failureKind(error) },
          })),
      );
    }
  }, [urls, anyActive, retryTick]);

  // The Instagram carousel's common ratio chosen in the adjuster. It belongs to the current set of
  // images: when the selection changes it stops applying (derived, no effect needed).
  const urlsKey = urls.join("\n");
  const [carouselChoice, setCarouselChoice] = useState<{ key: string; ratio: number } | null>(null);
  const chosenRatio = carouselChoice && carouselChoice.key === urlsKey ? carouselChoice.ratio : null;
  const setCarouselRatio = useCallback(
    (ratio: number) => setCarouselChoice({ key: urlsKey, ratio }),
    [urlsKey],
  );

  const [variants, setVariants] = useState<PublicationMediaVariant[]>([]);
  const [variantsState, setVariantsState] = useState<VariantsState>(enabled ? "loading" : "off");

  useEffect(() => {
    if (!enabled || !previewId) return;
    let cancelled = false;
    listPublicationMediaVariants(previewId).then(
      (list) => {
        if (cancelled) return;
        setVariants(list);
        setVariantsState("ready");
      },
      () => {
        if (!cancelled) setVariantsState("error");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [enabled, previewId]);

  // Conversion bookkeeping: `attempted` keeps an image from being converted twice per session.
  const attempted = useRef(new Set<string>());
  const [conversions, setConversions] = useState<Record<string, "running" | "failed">>({});

  const applyVariant = useCallback((variant: PublicationMediaVariant) => {
    setVariants((previous) => [
      ...previous.filter(
        (item) => !(item.network === variant.network && item.source_url === variant.source_url),
      ),
      variant,
    ]);
  }, []);

  const removeVariant = useCallback(async (variant: PublicationMediaVariant) => {
    await removePublicationMediaVariant(variant);
    setVariants((previous) => previous.filter((item) => item.id !== variant.id));
    // Allow the automatic conversion to produce it again if it is still needed.
    attempted.current.delete(`${variant.network}|${variant.source_url}`);
  }, []);

  const networks = useMemo(() => {
    const build = (network: SocialNetwork): NetworkMedia => {
      const rows: MediaRow[] = images.map((image, index) => {
        const measured = measures[image.url];
        const source = measured?.status === "ok" ? measured.measurement : null;
        const variant =
          enabled && previewId
            ? (variants.find(
                (item) =>
                  item.network === network &&
                  item.source_url === image.url &&
                  String(item.preview_id) === previewId,
              ) ?? null)
            : null;
        const key = `${network}|${image.url}`;
        return {
          index,
          url: image.url,
          state: measured ? (measured.status === "ok" ? "ok" : "error") : "loading",
          errorKind: measured?.status === "error" ? measured.kind : null,
          source,
          variant,
          facts: factsOf(source, variant),
          issues: [],
          unknownFacts: false,
          needsConversion: false,
          converting: conversions[key] === "running",
          conversionFailed: conversions[key] === "failed",
        };
      });

      // Instagram carousel: every item is compared against one common ratio, the chosen one or the
      // first image's (clamped into the accepted range).
      const firstFacts = rows[0]?.facts ?? null;
      const commonRatio =
        network === "instagram" && rows.length > 1
          ? (chosenRatio ??
            (firstFacts ? clampInstagramRatio(firstFacts.width / firstFacts.height) : null))
          : null;
      const evaluation = evaluateCarousel(
        network,
        rows.map((row) => row.facts),
        commonRatio !== null ? { referenceRatio: commonRatio } : undefined,
      );
      for (const row of rows) {
        row.issues = evaluation.issues.filter(
          (issue) => issue.index === row.index && !COLLECTION_CODES.has(issue.code),
        );
      }
      for (const row of rows) {
        row.unknownFacts =
          enabled &&
          network === "instagram" &&
          !row.variant &&
          row.source !== null &&
          (row.facts?.mime == null || row.facts?.bytes == null) &&
          !row.issues.some(isCropIssue);
        row.needsConversion =
          enabled && !row.variant && row.source !== null && (isConvertOnly(row.issues) || row.unknownFacts);
      }
      const collectionIssues = evaluation.issues.filter((issue) => COLLECTION_CODES.has(issue.code));

      return {
        network,
        rows,
        commonRatio,
        collectionIssues,
        blocker: enabled && active[network] ? blockerFor(rows, collectionIssues, variantsState) : null,
      };
    };
    return { instagram: build("instagram"), linkedin: build("linkedin") };
  }, [images, measures, variants, variantsState, conversions, enabled, previewId, active, chosenRatio]);

  // Automatic conversion (S19): the ratio fits but format / weight / pixels / width do not.
  useEffect(() => {
    if (!enabled || variantsState !== "ready" || !previewId) return;
    for (const network of MEDIA_NETWORKS) {
      if (!active[network]) continue;
      networks[network].rows.forEach((row) => {
        if (row.state !== "ok" || !row.source || !row.needsConversion) return;
        const key = `${network}|${row.url}`;
        if (attempted.current.has(key)) return;
        attempted.current.add(key);
        setConversions((previous) => ({ ...previous, [key]: "running" }));
        const source = row.source;
        void (async () => {
          try {
            if (!source.corsOk) throw new Error("cors");
            const image = await loadCorsImage(row.url);
            const area = { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
            const rendered = await renderVariant(image, network, area, area.width / area.height);
            const saved = await savePublicationMediaVariant({
              previewId,
              network,
              sourceUrl: row.url,
              position: row.index,
              ...rendered,
            });
            applyVariant(saved);
            setConversions((previous) => withoutKey(previous, key));
          } catch {
            setConversions((previous) => ({ ...previous, [key]: "failed" }));
          }
        })();
      });
    }
  }, [enabled, variantsState, previewId, networks, active, applyVariant]);

  // "Reintentar" for one image: runs the conversion again and, when the measurement failed (or
  // the browser could not draw the image, corsOk false), forgets the cached result and measures
  // again (D2/D3).
  const retryRow = useCallback(
    (network: SocialNetwork, url: string) => {
      const key = `${network}|${url}`;
      attempted.current.delete(key);
      setConversions((previous) => withoutKey(previous, key));
      const state = measures[url];
      if (state?.status === "error" || (state?.status === "ok" && !state.measurement.corsOk)) {
        forgetMeasurement(url);
        requested.current.delete(url);
        setMeasures((previous) => withoutKey(previous, url));
        setRetryTick((tick) => tick + 1);
      }
    },
    [measures],
  );

  const text = useMemo(() => publishedText(project), [project]);
  const stats: TextStats = useMemo(() => textStats(text), [text]);

  return {
    enabled,
    previewId,
    networks,
    text,
    stats,
    variantsState,
    applyVariant,
    removeVariant,
    setCarouselRatio,
    retryRow,
  };
}

function blockerFor(
  rows: MediaRow[],
  collectionIssues: ImageIssue[],
  variantsState: VariantsState,
): MediaBlocker | null {
  if (variantsState === "loading") return { code: "variantsLoading" };
  if (variantsState === "error") return { code: "variantsError" };
  if (rows.some((row) => row.state === "loading")) return { code: "measuring" };
  const unmeasured = rows.filter((row) => row.state === "error").length;
  if (unmeasured > 0) return { code: "measureError", count: unmeasured };
  if (collectionIssues.some((issue) => issue.code === "too_many_items")) {
    return { code: "tooManyImages" };
  }
  if (collectionIssues.some((issue) => issue.code === "no_images")) return { code: "noImages" };
  const crop = rows.filter((row) => row.issues.some(isCropIssue)).length;
  if (crop > 0) return { code: "crop", count: crop };
  const pending = rows.filter((row) => row.needsConversion);
  if (pending.some((row) => row.conversionFailed || (row.source && !row.source.corsOk))) {
    return { code: "conversionFailed", count: pending.length };
  }
  if (pending.length > 0) return { code: "converting", count: pending.length };
  return null;
}
