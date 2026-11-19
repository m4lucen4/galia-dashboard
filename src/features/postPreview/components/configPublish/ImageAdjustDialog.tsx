import React, { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import Cropper, { type Area, type Point } from "react-easy-crop";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { PillButton } from "@/components/shared/ui/PillButton";
import {
  centeredCrop,
  clampInstagramRatio,
  clampRatio,
  renderVariant,
} from "../../helpers/imageVariants";
import {
  ADJUSTMENT_RANGES,
  adjustmentValue,
  colorMatrix,
  correctedCanvas,
  hasTone,
  normalizeAdjustments,
  rotatedSize,
  sameAdjustments,
  svgMatrixValues,
  TONE_KEYS,
  type AdjustmentKey,
  type ImageAdjustments,
} from "../../helpers/imageAdjustments";
import { loadCorsImage } from "../../helpers/publicationImages";
import {
  aspectKeyFor,
  ASPECT_VALUES,
  INSTAGRAM_MEDIA,
  ratioLabel,
  type SocialNetwork,
} from "../../helpers/socialMediaRules";
import {
  savePublicationMediaVariant,
  type PublicationMediaVariant,
} from "../../services/publicationMediaVariants";
import { imageStatus, type MediaRow } from "./useMediaChecks";

const PREFIX = "previewProjects.mediaChecks";
const DIALOG = `${PREFIX}.dialog`;
const ADJUST = `${DIALOG}.adjustments`;

// S22: the same five choices on every network.
type RatioChoice = "1:1" | "4:5" | "1.91:1" | "original" | "free";
const CHOICES: RatioChoice[] = ["1:1", "4:5", "1.91:1", "original", "free"];

/** Range of the "Libre" slider: Instagram's accepted range; LinkedIn and Facebook are more permissive. */
const FREE_RANGE: Record<SocialNetwork, { min: number; max: number }> = {
  instagram: { min: INSTAGRAM_MEDIA.minRatio, max: INSTAGRAM_MEDIA.maxRatio },
  linkedin: { min: 0.5, max: 2.5 },
  facebook: { min: 0.5, max: 2.5 },
};

/** Longest side of the perspective-corrected copy shown in the cropper. */
const PREVIEW_MAX_SIDE = 1600;
const GEOMETRY_KEYS: AdjustmentKey[] = ["rotation", "vertical"];

type ErrorKey = "load" | "render" | "save" | "remove";
type Action = "apply" | "revert";

interface ImageAdjustDialogProps {
  network: SocialNetwork;
  previewId: string;
  rows: MediaRow[];
  /** Instagram carousel (2+ images): the common ratio in force; null otherwise. */
  commonRatio: number | null;
  onCommonRatioChange: (ratio: number) => void;
  onSaved: (variant: PublicationMediaVariant) => void;
  onRemoveVariant: (variant: PublicationMediaVariant) => Promise<void>;
  onClose: () => void;
}

/** State of the editor of the selected image. */
interface Editor {
  /** Remounts the cropper when the image or the ratio changes. */
  key: number;
  choice: RatioChoice;
  freeRatio: number;
  crop: Point;
  zoom: number;
  /** Current crop rectangle in pixels of the original, as the cropper reports it. */
  area: Area | null;
  /** Applied crop to restore when the editor opens on an image that already has a variant. */
  initialArea: Area | undefined;
  /** Tone, straighten and vertical correction (image-adjustments S2). */
  adjustments: ImageAdjustments;
  /** What was last applied (or the initial state): edits are measured against it. */
  baseline: { choice: RatioChoice; freeRatio: number; area: Area | null; adjustments: ImageAdjustments };
}

/** Perspective-corrected copy of the selected image shown in the cropper (vertical != 0). */
interface PreviewSource {
  url: string;
  vertical: number;
  /** Size of the copy relative to the original natural size. */
  scale: number;
}

const scaleArea = (area: Area, factor: number): Area =>
  factor === 1
    ? area
    : { x: area.x * factor, y: area.y * factor, width: area.width * factor, height: area.height * factor };

let editorSeq = 0;

const rowRatio = (row: MediaRow | undefined) =>
  row?.source ? row.source.width / row.source.height : 1;

/** Instagram accepts 0.8..1.91 compared at two decimals, as the database CHECK. */
const inInstagramRange = (ratio: number) => {
  const hundredths = Math.round(ratio * 100);
  return hundredths >= Math.round(INSTAGRAM_MEDIA.minRatio * 100) &&
    hundredths <= Math.round(INSTAGRAM_MEDIA.maxRatio * 100);
};

const aspectOf = (choice: RatioChoice, natural: number, free: number) => {
  if (choice === "original") return natural;
  if (choice === "free") return free;
  return ASPECT_VALUES[choice];
};

const AREA_TOLERANCE = 3;
/** `scale`: size of the image shown in the cropper relative to the original (one shown pixel = 1/scale). */
const areaDiffers = (a: Area | null, b: Area | null, scale = 1) => {
  const tolerance = AREA_TOLERANCE / scale;
  return (
    a !== null &&
    b !== null &&
    (Math.abs(a.x - b.x) > tolerance ||
      Math.abs(a.y - b.y) > tolerance ||
      Math.abs(a.width - b.width) > tolerance ||
      Math.abs(a.height - b.height) > tolerance)
  );
};

/** Editor of an image: restored from its applied variant, else the natural starting point. */
function initialEditor(
  row: MediaRow | undefined,
  network: SocialNetwork,
  carouselAspect: number | null,
  useVariant: boolean,
): Editor {
  const natural = rowRatio(row);
  const range = FREE_RANGE[network];
  let freeRatio = clampRatio(natural, range.min, range.max);
  let choice: RatioChoice;
  const stored = useVariant ? (row?.variant?.crop ?? null) : null;
  const adjustments = (useVariant ? normalizeAdjustments(row?.variant?.adjustments) : null) ?? {};
  if (stored) {
    const storedRatio = stored.width / stored.height;
    if (stored.aspect !== "original") {
      choice = stored.aspect;
    } else if (
      Math.abs(storedRatio - natural) < 0.01 &&
      (network !== "instagram" || inInstagramRange(natural))
    ) {
      choice = "original";
    } else {
      choice = "free";
      freeRatio = clampRatio(storedRatio, range.min, range.max);
    }
  } else if (network === "instagram" && !inInstagramRange(natural)) {
    choice = natural < INSTAGRAM_MEDIA.minRatio ? "4:5" : "1.91:1";
  } else {
    choice = "original";
  }
  const aspect = carouselAspect ?? aspectOf(choice, natural, freeRatio);
  const restore =
    stored && Math.abs(stored.width / stored.height - aspect) < 0.02
      ? { x: stored.x, y: stored.y, width: stored.width, height: stored.height }
      : undefined;
  editorSeq += 1;
  return {
    key: editorSeq,
    choice,
    freeRatio,
    crop: { x: 0, y: 0 },
    zoom: 1,
    area: null,
    initialArea: restore,
    adjustments,
    baseline: { choice, freeRatio, area: restore ?? null, adjustments },
  };
}

/** The common-ratio selector starts on the choice that matches the ratio in force. */
function initialCommon(commonRatio: number | null, firstNatural: number) {
  const ratio = commonRatio ?? clampInstagramRatio(firstNatural);
  const preset = aspectKeyFor(ratio);
  if (preset !== "original") return { choice: preset as RatioChoice, free: ratio };
  if (inInstagramRange(firstNatural) && Math.abs(firstNatural - ratio) < 0.01) {
    return { choice: "original" as RatioChoice, free: ratio };
  }
  return { choice: "free" as RatioChoice, free: ratio };
}

interface RatioPickerProps {
  label: string;
  value: RatioChoice;
  freeValue: number;
  freeLabel: string;
  freeRange: { min: number; max: number };
  originalLabel: string;
  originalDisabledReason: string | null;
  disabled: boolean;
  locale: string;
  t: TFunction;
  onChoose: (choice: RatioChoice) => void;
  onFreeChange: (value: number) => void;
  /** Called when the slider is released (or blurred): the moment to commit a free ratio. */
  onFreeCommit?: (value: number) => void;
}

const RatioPicker: React.FC<RatioPickerProps> = ({
  label,
  value,
  freeValue,
  freeLabel,
  freeRange,
  originalLabel,
  originalDisabledReason,
  disabled,
  locale,
  t,
  onChoose,
  onFreeChange,
  onFreeCommit,
}) => {
  const choiceLabel = (id: RatioChoice) => {
    if (id === "original") return originalLabel;
    if (id === "free") return t(`${DIALOG}.free`);
    return id === "1.91:1" ? `${new Intl.NumberFormat(locale).format(1.91)}:1` : id;
  };
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="mb-1 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {CHOICES.map((id) => {
          const unavailable = id === "original" && originalDisabledReason !== null;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={value === id}
              disabled={unavailable}
              onClick={() => onChoose(id)}
              className={`rounded-full border-[1.5px] border-[#010000] px-4 py-2 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000] disabled:cursor-not-allowed disabled:opacity-40 ${
                value === id
                  ? "bg-[#010000] text-[#d8e4d6]"
                  : "bg-transparent text-[#010000] hover:bg-[#010000]/10"
              }`}
            >
              {choiceLabel(id)}
            </button>
          );
        })}
      </div>
      {originalDisabledReason && (
        <p className="text-xs text-amber-800">{originalDisabledReason}</p>
      )}
      {value === "free" && (
        <label className="block space-y-1 text-xs">
          <span className="font-medium">{freeLabel}</span>
          <input
            type="range"
            min={freeRange.min}
            max={freeRange.max}
            step={0.01}
            value={freeValue}
            aria-label={freeLabel}
            onChange={(event) => onFreeChange(Number(event.target.value))}
            onPointerUp={(event) => onFreeCommit?.(Number(event.currentTarget.value))}
            onKeyUp={(event) => onFreeCommit?.(Number(event.currentTarget.value))}
            onBlur={(event) => onFreeCommit?.(Number(event.currentTarget.value))}
            className="w-full accent-[#010000]"
          />
        </label>
      )}
    </fieldset>
  );
};

interface AdjustmentSliderProps {
  id: AdjustmentKey;
  label: string;
  value: number;
  disabled: boolean;
  locale: string;
  resetLabel: string;
  onChange: (value: number) => void;
}

/** One adjustment: label, signed value and a range; double click (or Enter on the value) resets it. */
const AdjustmentSlider: React.FC<AdjustmentSliderProps> = ({
  id,
  label,
  value,
  disabled,
  locale,
  resetLabel,
  onChange,
}) => {
  const range = ADJUSTMENT_RANGES[id];
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: id === "rotation" ? 1 : 0,
    signDisplay: "exceptZero",
  }).format(value);
  return (
    <label className="block space-y-1 text-xs">
      <span className="flex items-center justify-between gap-2">
        <span className="font-medium">{label}</span>
        <button
          type="button"
          disabled={disabled || value === 0}
          aria-label={resetLabel}
          title={resetLabel}
          onClick={() => onChange(0)}
          className="rounded-full px-2 tabular-nums text-[#010000]/75 hover:bg-[#010000]/10 disabled:hover:bg-transparent"
        >
          {id === "rotation" ? `${formatted}°` : formatted}
        </button>
      </span>
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
        onDoubleClick={() => onChange(0)}
        className="w-full accent-[#010000]"
      />
    </label>
  );
};

export const ImageAdjustDialog: React.FC<ImageAdjustDialogProps> = ({
  network,
  previewId,
  rows,
  commonRatio,
  onCommonRatioChange,
  onSaved,
  onRemoveVariant,
  onClose,
}) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const carousel = network === "instagram" && rows.length > 1;
  const firstNatural = rowRatio(rows[0]);
  // Carousel: the one ratio every image uses (the chosen one, else the first image's).
  const carouselAspect = carousel ? (commonRatio ?? clampInstagramRatio(firstNatural)) : null;

  const [activeIndex, setActiveIndex] = useState(0);
  const [focusIndex, setFocusIndex] = useState(0);
  const [editor, setEditor] = useState<Editor>(() =>
    initialEditor(rows[0], network, carouselAspect, true),
  );
  const [common, setCommon] = useState(() => initialCommon(commonRatio, firstNatural));
  const [busy, setBusy] = useState<{ url: string; kind: Action } | null>(null);
  const [errors, setErrors] = useState<Record<string, { action: Action; key: ErrorKey }>>({});
  const [announcement, setAnnouncement] = useState("");
  const [pending, setPending] = useState<{ run: () => void; cancel?: () => void } | null>(null);
  const [preview, setPreview] = useState<(PreviewSource & { source: string }) | null>(null);
  const [previewFailed, setPreviewFailed] = useState<string | null>(null);
  const filterId = `adjust-tone-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const bannerRef = useRef<HTMLDivElement | null>(null);

  const activePosition = Math.min(activeIndex, rows.length - 1);
  const active: MediaRow | undefined = rows[activePosition];
  const natural = rowRatio(active);
  const aspect = carouselAspect ?? aspectOf(editor.choice, natural, editor.freeRatio);
  const range = FREE_RANGE[network];
  const working = busy !== null;
  const corsBlocked = !!active && !active.source?.corsOk;
  const rotation = adjustmentValue(editor.adjustments, "rotation");
  const vertical = adjustmentValue(editor.adjustments, "vertical");
  const tone = hasTone(editor.adjustments);
  const anyAdjustment = normalizeAdjustments(editor.adjustments) !== null;
  // The cropper shows the original, or the perspective-corrected copy once it is ready for this value.
  const previewKey = active ? `${active.url}|${vertical}` : "";
  const previewReady =
    vertical !== 0 && preview && preview.source === active?.url && preview.vertical === vertical
      ? preview
      : null;
  const cropperImage = vertical === 0 ? (active?.url ?? null) : (previewReady?.url ?? null);
  const cropperScale = previewReady?.scale ?? 1;

  // Unapplied edits of the selected image: ratio, crop or zoom moved since the last apply.
  const dirty =
    !!active &&
    ((!carousel &&
      (editor.choice !== editor.baseline.choice ||
        (editor.choice === "free" &&
          Math.abs(editor.freeRatio - editor.baseline.freeRatio) > 0.005))) ||
      areaDiffers(editor.area, editor.baseline.area, cropperScale) ||
      !sameAdjustments(editor.adjustments, editor.baseline.adjustments));

  // Perspective-corrected copy for the cropper, rebuilt (debounced) when the image or the value changes.
  const activeUrl = active?.url;
  useEffect(() => {
    if (!activeUrl || vertical === 0 || corsBlocked) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const image = await loadCorsImage(activeUrl);
        const { canvas, scale } = correctedCanvas(image, vertical, PREVIEW_MAX_SIDE);
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob((result) => (result ? resolve(result) : reject(new Error("encode"))), "image/jpeg", 0.9),
        );
        if (cancelled) return;
        setPreview({ source: activeUrl, vertical, scale, url: URL.createObjectURL(blob) });
      } catch {
        if (!cancelled) setPreviewFailed(`${activeUrl}|${vertical}`);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeUrl, vertical, corsBlocked]);

  // Each replaced (or the last) corrected copy releases its object URL.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview.url);
  }, [preview]);

  useEffect(() => {
    if (pending) bannerRef.current?.querySelector("button")?.focus();
  }, [pending]);

  const focusSelected = () => {
    // Keep the focus inside the dialog, on the list, once a confirmation closes.
    requestAnimationFrame(() => itemRefs.current[activePosition]?.focus());
  };

  /** Runs `run` now, or after confirmation when the selected image has unapplied edits. */
  const request = (run: () => void, cancel?: () => void) => {
    if (dirty) setPending({ run, cancel });
    else run();
  };

  const select = (index: number) => {
    if (working || index === activePosition) return;
    request(() => {
      setActiveIndex(index);
      setFocusIndex(index);
      setEditor(initialEditor(rows[index], network, carouselAspect, true));
    });
  };

  const requestClose = () => {
    if (working) return;
    request(onClose);
  };

  const onListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const count = rows.length;
    let next: number | null = null;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (focusIndex + 1) % count;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      next = (focusIndex - 1 + count) % count;
    } else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;
    if (next === null) return;
    event.preventDefault();
    setFocusIndex(next);
    itemRefs.current[next]?.focus();
  };

  const clearError = (url: string) =>
    setErrors((previous) => Object.fromEntries(Object.entries(previous).filter(([key]) => key !== url)));

  const patchEditor = (patch: Partial<Editor>) => setEditor((previous) => ({ ...previous, ...patch }));

  /** A new vertical value changes the geometry: the framing starts again (centred, zoom 1). */
  const geometryReset = { crop: { x: 0, y: 0 }, zoom: 1, area: null, initialArea: undefined };

  const setAdjustment = (key: AdjustmentKey, value: number) =>
    setEditor((previous) => ({
      ...previous,
      adjustments: { ...previous.adjustments, [key]: value },
      ...(key === "vertical" ? geometryReset : {}),
    }));

  const resetAdjustments = () =>
    setEditor((previous) => ({
      ...previous,
      adjustments: {},
      ...(adjustmentValue(previous.adjustments, "vertical") !== 0 ? geometryReset : {}),
    }));

  const chooseRatio = (choice: RatioChoice) => {
    if (choice === editor.choice) return;
    editorSeq += 1;
    patchEditor({ choice, key: editorSeq, crop: { x: 0, y: 0 }, zoom: 1, area: null, initialArea: undefined });
  };

  // Carousel: one ratio for every image. Already applied images whose variant no longer matches
  // become pending (the hook derives it); nothing is deleted. Unapplied edits are dropped.
  const changeCommon = (choice: RatioChoice, free: number) => {
    const ratio =
      choice === "original"
        ? clampInstagramRatio(firstNatural)
        : choice === "free"
          ? clampRatio(free, range.min, range.max)
          : ASPECT_VALUES[choice];
    if (Math.abs(ratio - (carouselAspect ?? 0)) < 0.005) {
      setCommon({ choice, free: ratio });
      return;
    }
    request(
      () => {
        setCommon({ choice, free: ratio });
        onCommonRatioChange(ratio);
        setEditor(initialEditor(active, network, ratio, true));
      },
      () => setCommon((previous) => ({ ...previous, free: carouselAspect ?? previous.free })),
    );
  };

  const apply = async () => {
    if (!active || working) return;
    const row = active;
    const { choice, freeRatio, area, adjustments } = editor;
    setBusy({ url: row.url, kind: "apply" });
    clearError(row.url);
    try {
      const image = await loadCorsImage(row.url).catch(() => {
        throw new Error("load");
      });
      // An area reported for another ratio is ignored: start from the centred crop (of the rotated box).
      const box = rotatedSize(
        image.naturalWidth,
        image.naturalHeight,
        adjustmentValue(adjustments, "rotation"),
      );
      const usable =
        area && Math.abs(area.width / area.height - aspect) < 0.02
          ? area
          : centeredCrop(Math.round(box.width), Math.round(box.height), aspect);
      const rendered = await renderVariant(image, network, usable, aspect, adjustments).catch(() => {
        throw new Error("render");
      });
      const saved = await savePublicationMediaVariant({
        previewId,
        network,
        sourceUrl: row.url,
        position: row.index,
        ...rendered,
      });
      onSaved(saved);
      setEditor((previous) => ({ ...previous, baseline: { choice, freeRatio, area, adjustments } }));
      setAnnouncement(t(`${DIALOG}.appliedMessage`, { index: row.index + 1 }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setErrors((previous) => ({
        ...previous,
        [row.url]: { action: "apply", key: message === "load" || message === "render" ? message : "save" },
      }));
    } finally {
      setBusy(null);
    }
  };

  const revert = async () => {
    if (!active || working) return;
    const row = active;
    if (!row.variant) {
      // Nothing stored: just start again from the natural state of this image.
      setEditor(initialEditor(row, network, carouselAspect, false));
      clearError(row.url);
      return;
    }
    setBusy({ url: row.url, kind: "revert" });
    clearError(row.url);
    try {
      await onRemoveVariant(row.variant);
      setEditor(initialEditor(row, network, carouselAspect, false));
      setAnnouncement(t(`${DIALOG}.revertedMessage`, { index: row.index + 1 }));
    } catch {
      setErrors((previous) => ({ ...previous, [row.url]: { action: "revert", key: "remove" } }));
    } finally {
      setBusy(null);
    }
  };

  const networkName = t(`${PREFIX}.networks.${network}`);
  const activeStatus = active ? imageStatus(active) : null;
  const activeError = active ? errors[active.url] : undefined;
  const activeBusy = busy && active && busy.url === active.url ? busy.kind : null;

  const outOfRangeReason = (ratio: number) =>
    network === "instagram" && !inInstagramRange(ratio)
      ? t(`${DIALOG}.originalUnavailable`, { ratio: ratioLabel(ratio, locale) })
      : null;

  const rowBadge = (row: MediaRow) => {
    const status = imageStatus(row);
    if (busy?.url === row.url) {
      return { tone: "info", text: t(`${DIALOG}.${busy.kind === "apply" ? "applying" : "reverting"}`) };
    }
    if (status.kind === "applied" && row.variant) {
      return {
        tone: "applied",
        text: t(`${DIALOG}.status.applied`, { width: row.variant.width, height: row.variant.height }),
      };
    }
    if (status.kind === "pending") return { tone: "pending", text: t(`${DIALOG}.status.pending`) };
    return { tone: "ok", text: t(`${DIALOG}.status.ok`) };
  };

  const rowNote = (row: MediaRow) => {
    const failure = errors[row.url];
    if (failure) return { tone: "error", text: t(`${DIALOG}.errors.${failure.key}`) };
    const status = imageStatus(row);
    if (status.ratioChanged) return { tone: "warn", text: t(`${DIALOG}.ratioChanged`) };
    if (status.kind !== "pending") return null;
    if (row.conversionFailed) return { tone: "warn", text: t(`${PREFIX}.conversionFailed`) };
    if (row.converting) return { tone: "info", text: t(`${PREFIX}.converting`) };
    if (status.needsCrop) return { tone: "warn", text: t(`${DIALOG}.reasons.needsCrop`) };
    return { tone: "info", text: t(`${DIALOG}.reasons.willConvert`) };
  };

  const toneClass = (tone: string) =>
    tone === "applied"
      ? "bg-emerald-100 text-emerald-900"
      : tone === "pending"
        ? "bg-amber-100 text-amber-900"
        : tone === "info"
          ? "bg-[#010000]/10 text-[#010000]"
          : "bg-white/70 text-[#010000]/75";

  return (
    <Dialog
      open
      onClose={requestClose}
      className="relative z-70 font-['Hanken_Grotesk',system-ui,sans-serif] text-[#010000]"
    >
      <DialogBackdrop className="fixed inset-0 bg-[#010000]/55" />
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
          <DialogPanel className="relative w-full max-w-5xl rounded-[28px] border border-[#010000]/15 bg-[#d8e4d6] p-6 shadow-xl sm:p-8">
            <DialogTitle as="h3" className="text-2xl leading-tight font-medium tracking-[-0.03em]">
              {t(`${DIALOG}.title`, { network: networkName })}
            </DialogTitle>
            <p className="mt-2 text-sm leading-relaxed text-[#010000]/75">
              {t(`${DIALOG}.description.${network}`)}
            </p>

            <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
              <div className="space-y-4">
                {carousel && (
                  <div className="space-y-2">
                    <RatioPicker
                      label={t(`${DIALOG}.carouselRatio`)}
                      value={common.choice}
                      freeValue={common.free}
                      freeLabel={t(`${DIALOG}.freeRatio`, { ratio: ratioLabel(common.free, locale) })}
                      freeRange={FREE_RANGE.instagram}
                      originalLabel={t(`${DIALOG}.firstRatio`, {
                        ratio: ratioLabel(clampInstagramRatio(firstNatural), locale),
                      })}
                      originalDisabledReason={outOfRangeReason(firstNatural)}
                      disabled={working}
                      locale={locale}
                      t={t}
                      onChoose={(choice) =>
                        changeCommon(choice, choice === "free" ? (carouselAspect ?? common.free) : common.free)
                      }
                      onFreeChange={(free) => setCommon((previous) => ({ ...previous, free }))}
                      onFreeCommit={(free) => changeCommon("free", free)}
                    />
                    <p className="text-xs text-[#010000]/65">{t(`${DIALOG}.carouselNote`)}</p>
                  </div>
                )}

                <div>
                  <p id="adjust-images-label" className="mb-2 text-sm font-medium">
                    {t(`${DIALOG}.images`)}
                  </p>
                  <div
                    role="listbox"
                    aria-labelledby="adjust-images-label"
                    aria-orientation="vertical"
                    onKeyDown={onListKeyDown}
                    className="max-h-72 space-y-2 overflow-y-auto pr-1 md:max-h-[26rem]"
                  >
                    {rows.map((row, index) => {
                      const badge = rowBadge(row);
                      const note = rowNote(row);
                      const selected = index === activePosition;
                      return (
                        <button
                          key={row.url}
                          ref={(element) => {
                            itemRefs.current[index] = element;
                          }}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          aria-disabled={working}
                          tabIndex={index === focusIndex ? 0 : -1}
                          aria-label={`${t(`${PREFIX}.imageLabel`, { index: row.index + 1 })}: ${badge.text}${note ? `. ${note.text}` : ""}`}
                          onFocus={() => setFocusIndex(index)}
                          onClick={() => select(index)}
                          className={`flex w-full items-start gap-3 rounded-2xl border-2 bg-white/50 p-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000] ${
                            selected ? "border-[#010000]" : "border-transparent hover:bg-white/70"
                          }`}
                        >
                          <img
                            src={row.url}
                            alt=""
                            className="size-14 shrink-0 rounded-xl object-cover"
                          />
                          <span className="min-w-0 space-y-1 text-xs">
                            <span className="block font-medium">
                              {t(`${PREFIX}.imageLabel`, { index: row.index + 1 })}
                            </span>
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 font-medium ${toneClass(badge.tone)}`}
                            >
                              {badge.text}
                            </span>
                            {note && (
                              <span
                                className={`block leading-snug ${
                                  note.tone === "error"
                                    ? "text-red-800"
                                    : note.tone === "warn"
                                      ? "text-amber-800"
                                      : "text-[#010000]/65"
                                }`}
                              >
                                {note.text}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="min-w-0 space-y-4 text-sm">
                {pending && (
                  <div
                    ref={bannerRef}
                    role="alert"
                    className="space-y-3 rounded-2xl border border-amber-700/40 bg-amber-50 p-4"
                  >
                    <p className="font-medium text-amber-900">{t(`${DIALOG}.discard.message`)}</p>
                    <div className="flex flex-wrap gap-2">
                      <PillButton
                        variant="outline"
                        className="min-h-9 px-4 py-2 text-xs"
                        onClick={() => {
                          pending.cancel?.();
                          setPending(null);
                          focusSelected();
                        }}
                      >
                        {t(`${DIALOG}.discard.keep`)}
                      </PillButton>
                      <PillButton
                        className="min-h-9 px-4 py-2 text-xs"
                        onClick={() => {
                          const { run } = pending;
                          setPending(null);
                          run();
                          focusSelected();
                        }}
                      >
                        {t(`${DIALOG}.discard.confirm`)}
                      </PillButton>
                    </div>
                  </div>
                )}

                {active && (
                  <>
                    <h4 className="text-base font-medium">
                      {t(`${PREFIX}.imageLabel`, { index: active.index + 1 })}
                    </h4>

                    {carousel ? (
                      <p className="text-xs text-[#010000]/75">
                        {t(`${DIALOG}.carouselRatioLocked`, {
                          ratio: ratioLabel(aspect, locale),
                        })}
                      </p>
                    ) : (
                      <RatioPicker
                        label={t(`${DIALOG}.ratio`)}
                        value={editor.choice}
                        freeValue={editor.freeRatio}
                        freeLabel={t(`${DIALOG}.freeRatio`, {
                          ratio: ratioLabel(editor.freeRatio, locale),
                        })}
                        freeRange={range}
                        originalLabel={t(`${DIALOG}.original`)}
                        originalDisabledReason={outOfRangeReason(natural)}
                        disabled={working}
                        locale={locale}
                        t={t}
                        onChoose={chooseRatio}
                        onFreeChange={(freeRatio) =>
                          patchEditor({ freeRatio, area: null, initialArea: undefined })
                        }
                      />
                    )}

                    <svg aria-hidden="true" width="0" height="0" className="absolute">
                      <filter id={filterId} colorInterpolationFilters="sRGB">
                        <feColorMatrix type="matrix" values={svgMatrixValues(colorMatrix(editor.adjustments))} />
                      </filter>
                    </svg>
                    <div className="relative h-72 overflow-hidden rounded-2xl bg-[#010000] sm:h-80">
                      {cropperImage ? (
                        <Cropper
                          key={`${cropperImage}|${editor.key}`}
                          image={cropperImage}
                          crop={editor.crop}
                          zoom={editor.zoom}
                          rotation={rotation}
                          aspect={aspect}
                          // The editor keeps areas in pixels of the original; the corrected copy is smaller.
                          initialCroppedAreaPixels={
                            editor.initialArea ? scaleArea(editor.initialArea, cropperScale) : undefined
                          }
                          style={{ mediaStyle: tone ? { filter: `url(#${filterId})` } : undefined }}
                          onCropChange={(crop) => patchEditor({ crop })}
                          onZoomChange={(zoom) => patchEditor({ zoom })}
                          onCropAreaChange={(_percent, pixels) => {
                            const area = scaleArea(pixels, 1 / cropperScale);
                            setEditor((previous) => ({
                              ...previous,
                              area,
                              baseline: previous.baseline.area
                                ? previous.baseline
                                : { ...previous.baseline, area },
                            }));
                          }}
                        />
                      ) : (
                        <p role="status" className="flex h-full items-center justify-center p-4 text-center text-xs text-[#d8e4d6]">
                          {corsBlocked
                            ? t(`${PREFIX}.corsBlocked`)
                            : previewFailed === previewKey
                              ? t(`${DIALOG}.errors.load`)
                              : t(`${ADJUST}.preparing`)}
                        </p>
                      )}
                    </div>

                    <label className="block space-y-1 text-xs">
                      <span className="font-medium">{t(`${DIALOG}.zoom`)}</span>
                      <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.01}
                        value={editor.zoom}
                        disabled={working}
                        onChange={(event) => patchEditor({ zoom: Number(event.target.value) })}
                        className="w-full accent-[#010000]"
                      />
                    </label>

                    <section
                      aria-labelledby="adjust-image-heading"
                      className="space-y-3 rounded-2xl bg-white/40 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h5 id="adjust-image-heading" className="text-sm font-medium">
                          {t(`${ADJUST}.title`)}
                        </h5>
                        <button
                          type="button"
                          disabled={working || !anyAdjustment}
                          onClick={resetAdjustments}
                          className="text-xs underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40"
                        >
                          {t(`${ADJUST}.reset`)}
                        </button>
                      </div>
                      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                        {[
                          { legend: "tone", keys: TONE_KEYS },
                          { legend: "geometry", keys: GEOMETRY_KEYS },
                        ].map((group) => (
                          <fieldset key={group.legend} className="space-y-3" disabled={working || corsBlocked}>
                            <legend className="mb-1 text-xs font-medium tracking-wide text-[#010000]/65 uppercase">
                              {t(`${ADJUST}.${group.legend}`)}
                            </legend>
                            {group.keys.map((key) => {
                              const label = t(`${ADJUST}.${key}`);
                              return (
                                <AdjustmentSlider
                                  key={key}
                                  id={key}
                                  label={label}
                                  value={adjustmentValue(editor.adjustments, key)}
                                  disabled={working || corsBlocked}
                                  locale={locale}
                                  resetLabel={t(`${ADJUST}.resetOne`, { label })}
                                  onChange={(value) => setAdjustment(key, value)}
                                />
                              );
                            })}
                            {group.legend === "geometry" && (
                              <p className="text-xs leading-snug text-[#010000]/65">
                                {t(`${ADJUST}.verticalHint`)}
                              </p>
                            )}
                          </fieldset>
                        ))}
                      </div>
                    </section>

                    {corsBlocked && (
                      <p role="alert" className="text-xs text-amber-800">
                        {t(`${PREFIX}.corsBlocked`)}
                      </p>
                    )}
                    {activeStatus?.ratioChanged && !activeError && (
                      <p className="text-xs text-amber-800">{t(`${DIALOG}.ratioChanged`)}</p>
                    )}
                    {dirty && !activeBusy && (
                      <p className="text-xs text-[#010000]/75">{t(`${DIALOG}.unapplied`)}</p>
                    )}
                    {activeBusy && (
                      <p role="status" className="text-xs text-[#010000]/75">
                        {t(`${DIALOG}.${activeBusy === "apply" ? "applying" : "reverting"}`)}
                      </p>
                    )}
                    {activeError && (
                      <p role="alert" className="text-xs text-red-800">
                        {t(`${DIALOG}.errors.${activeError.key}`)}{" "}
                        <button
                          type="button"
                          className="underline"
                          disabled={working}
                          onClick={activeError.action === "apply" ? apply : revert}
                        >
                          {t(`${PREFIX}.retry`)}
                        </button>
                      </p>
                    )}

                    <div className="flex flex-wrap gap-3">
                      <PillButton
                        className="min-h-10 px-5 py-2 text-sm"
                        disabled={
                          working ||
                          corsBlocked ||
                          (activeStatus?.kind === "applied" && !dirty && !activeError)
                        }
                        onClick={apply}
                      >
                        {t(`${DIALOG}.apply`)}
                      </PillButton>
                      <PillButton
                        variant="outline"
                        className="min-h-10 px-5 py-2 text-sm"
                        disabled={working || (!active.variant && !dirty)}
                        onClick={revert}
                      >
                        {t(`${DIALOG}.revert`)}
                      </PillButton>
                    </div>
                  </>
                )}
                <p role="status" className="sr-only">
                  {announcement}
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <PillButton
                className="w-full sm:w-auto sm:min-w-32"
                disabled={working}
                onClick={requestClose}
              >
                {t(`${DIALOG}.close`)}
              </PillButton>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};
