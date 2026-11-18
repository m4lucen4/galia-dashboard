import React, { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Cropper, { type Area, type Point } from "react-easy-crop";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { PillButton } from "@/components/shared/ui/PillButton";
import { centeredCrop, clampInstagramRatio, renderVariant } from "../../helpers/imageVariants";
import { loadCorsImage } from "../../helpers/publicationImages";
import {
  aspectKeyFor,
  ASPECT_VALUES,
  ratioLabel,
  type SocialNetwork,
} from "../../helpers/socialMediaRules";
import {
  savePublicationMediaVariant,
  type PublicationMediaVariant,
} from "../../services/publicationMediaVariants";
import type { MediaRow } from "./useMediaChecks";

const PREFIX = "previewProjects.mediaChecks";

type AspectOption = "first" | "original" | "free" | "1:1" | "4:5" | "1.91:1";

interface ImageAdjustDialogProps {
  network: SocialNetwork;
  previewId: string;
  rows: MediaRow[];
  onSaved: (variant: PublicationMediaVariant) => void;
  onRemoveVariant: (variant: PublicationMediaVariant) => Promise<void>;
  onClose: () => void;
}

const rowRatio = (row: MediaRow) =>
  row.source ? row.source.width / row.source.height : 1;

export const ImageAdjustDialog: React.FC<ImageAdjustDialogProps> = ({
  network,
  previewId,
  rows,
  onSaved,
  onRemoveVariant,
  onClose,
}) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const isInstagram = network === "instagram";

  // Instagram: one ratio for the whole carousel, default = first image ratio clamped into range.
  const firstRatio = clampInstagramRatio(rows.length > 0 ? rowRatio(rows[0]) : 1);
  const firstIsPreset = aspectKeyFor(firstRatio) !== "original";
  const options: AspectOption[] = isInstagram
    ? [...(firstIsPreset ? [] : (["first"] as const)), "1:1", "4:5", "1.91:1"]
    : ["original", "1:1", "4:5", "1.91:1", "free"];
  const defaultOption: AspectOption = isInstagram
    ? firstIsPreset
      ? (aspectKeyFor(firstRatio) as AspectOption)
      : "first"
    : "original";

  const [option, setOption] = useState<AspectOption>(defaultOption);
  const [freeRatio, setFreeRatio] = useState(() => (rows.length > 0 ? rowRatio(rows[0]) : 1));
  const [activeIndex, setActiveIndex] = useState(0);
  const [positions, setPositions] = useState<Record<string, { crop: Point; zoom: number }>>({});
  const areas = useRef<Record<string, Area>>({});
  const [progress, setProgress] = useState<number | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const saving = progress !== null;
  const blocked = rows.some((row) => !row.source?.corsOk);
  const active = rows[Math.min(activeIndex, rows.length - 1)];

  const aspectFor = (row: MediaRow): number => {
    if (option === "original") return rowRatio(row);
    if (option === "free") return freeRatio;
    if (option === "first") return firstRatio;
    return ASPECT_VALUES[option];
  };

  const optionLabel = (id: AspectOption) => {
    if (id === "first") return t(`${PREFIX}.dialog.firstRatio`, { ratio: ratioLabel(firstRatio, locale) });
    if (id === "original") return t(`${PREFIX}.dialog.original`);
    if (id === "free") return t(`${PREFIX}.dialog.free`);
    return id === "1.91:1" ? `${new Intl.NumberFormat(locale).format(1.91)}:1` : id;
  };

  const changeOption = (next: AspectOption) => {
    setOption(next);
    // Crop areas depend on the aspect: start over.
    areas.current = {};
    setPositions({});
  };

  const changeFreeRatio = (value: number) => {
    setFreeRatio(value);
    areas.current = {};
    setPositions({});
  };

  const position = active ? (positions[active.url] ?? { crop: { x: 0, y: 0 }, zoom: 1 }) : null;
  const setPosition = (patch: Partial<{ crop: Point; zoom: number }>) => {
    if (!active) return;
    setPositions((previous) => ({
      ...previous,
      [active.url]: { ...(previous[active.url] ?? { crop: { x: 0, y: 0 }, zoom: 1 }), ...patch },
    }));
  };

  const save = async () => {
    setErrorKey(null);
    try {
      for (let i = 0; i < rows.length; i += 1) {
        setProgress(i + 1);
        const row = rows[i];
        const aspect = aspectFor(row);
        const image = await loadCorsImage(row.url).catch(() => {
          throw new Error("load");
        });
        const area =
          areas.current[row.url] ?? centeredCrop(image.naturalWidth, image.naturalHeight, aspect);
        const rendered = await renderVariant(image, network, area, aspect).catch(() => {
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
      }
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setErrorKey(message === "load" || message === "render" ? message : "save");
      setProgress(null);
    }
  };

  const revert = async () => {
    if (!active?.variant) return;
    setRemoving(true);
    setErrorKey(null);
    try {
      await onRemoveVariant(active.variant);
    } catch {
      setErrorKey("remove");
    } finally {
      setRemoving(false);
    }
  };

  const networkName = t(`${PREFIX}.networks.${network}`);
  const thumbnails = useMemo(() => rows.map((row) => row.url), [rows]);

  return (
    <Dialog
      open
      onClose={() => {
        if (!saving) onClose();
      }}
      className="relative z-70 font-['Hanken_Grotesk',system-ui,sans-serif] text-[#010000]"
    >
      <DialogBackdrop className="fixed inset-0 bg-[#010000]/55" />
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
          <DialogPanel className="relative w-full max-w-4xl rounded-[28px] border border-[#010000]/15 bg-[#d8e4d6] p-6 shadow-xl sm:p-8">
            <DialogTitle as="h3" className="text-2xl leading-tight font-medium tracking-[-0.03em]">
              {t(`${PREFIX}.dialog.title`, { network: networkName })}
            </DialogTitle>
            <p className="mt-2 text-sm leading-relaxed text-[#010000]/75">
              {t(`${PREFIX}.dialog.description.${network}`)}
            </p>

            <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="space-y-3">
                <div className="relative h-80 overflow-hidden rounded-2xl bg-[#010000] sm:h-96">
                  {active && position && (
                    <Cropper
                      key={`${active.url}|${option}`}
                      image={active.url}
                      crop={position.crop}
                      zoom={position.zoom}
                      aspect={aspectFor(active)}
                      onCropChange={(crop) => setPosition({ crop })}
                      onZoomChange={(zoom) => setPosition({ zoom })}
                      onCropAreaChange={(_percent, pixels) => {
                        areas.current[active.url] = pixels;
                      }}
                    />
                  )}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {thumbnails.map((url, index) => (
                    <button
                      key={url}
                      type="button"
                      disabled={saving}
                      onClick={() => setActiveIndex(index)}
                      aria-label={t(`${PREFIX}.imageLabel`, { index: index + 1 })}
                      aria-current={index === activeIndex}
                      className={`relative size-14 shrink-0 overflow-hidden rounded-xl border-2 ${
                        index === activeIndex ? "border-[#010000]" : "border-transparent"
                      }`}
                    >
                      <img src={url} alt="" className="size-full object-cover" />
                      {rows[index].variant && (
                        <CheckCircleIcon className="absolute right-0.5 bottom-0.5 size-4 rounded-full bg-white text-emerald-700" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-5 text-sm">
                <fieldset className="space-y-2" disabled={saving}>
                  <legend className="mb-1 font-medium">
                    {t(`${PREFIX}.dialog.ratio`)}
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {options.map((id) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={option === id}
                        onClick={() => changeOption(id)}
                        className={`rounded-full border-[1.5px] border-[#010000] px-4 py-2 text-xs font-medium ${
                          option === id
                            ? "bg-[#010000] text-[#d8e4d6]"
                            : "bg-transparent text-[#010000] hover:bg-[#010000]/10"
                        }`}
                      >
                        {optionLabel(id)}
                      </button>
                    ))}
                  </div>
                  {isInstagram && (
                    <p className="text-xs text-[#010000]/65">{t(`${PREFIX}.dialog.carouselNote`)}</p>
                  )}
                </fieldset>

                {option === "free" && (
                  <label className="block space-y-1 text-xs">
                    <span className="font-medium">
                      {t(`${PREFIX}.dialog.freeRatio`, { ratio: ratioLabel(freeRatio, locale) })}
                    </span>
                    <input
                      type="range"
                      min={0.5}
                      max={2.5}
                      step={0.01}
                      value={freeRatio}
                      disabled={saving}
                      onChange={(event) => changeFreeRatio(Number(event.target.value))}
                      className="w-full accent-[#010000]"
                    />
                  </label>
                )}

                <label className="block space-y-1 text-xs">
                  <span className="font-medium">{t(`${PREFIX}.dialog.zoom`)}</span>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={position?.zoom ?? 1}
                    disabled={saving}
                    onChange={(event) => setPosition({ zoom: Number(event.target.value) })}
                    className="w-full accent-[#010000]"
                  />
                </label>

                {active?.variant && (
                  <PillButton
                    variant="outline"
                    className="min-h-9 px-4 py-2 text-xs"
                    disabled={saving || removing}
                    onClick={revert}
                  >
                    {t(`${PREFIX}.dialog.revert`)}
                  </PillButton>
                )}

                {blocked && (
                  <p role="alert" className="text-xs text-amber-800">
                    {t(`${PREFIX}.corsBlocked`)}
                  </p>
                )}
                {errorKey && (
                  <p role="alert" className="text-xs text-red-800">
                    {t(`${PREFIX}.dialog.errors.${errorKey}`)}
                  </p>
                )}
                {saving && (
                  <p role="status" className="text-xs text-[#010000]/75">
                    {t(`${PREFIX}.dialog.saving`, { current: progress, total: rows.length })}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <PillButton
                className="w-full sm:w-auto sm:min-w-32"
                disabled={saving || blocked || rows.length === 0}
                onClick={save}
              >
                {t(`${PREFIX}.dialog.save`)}
              </PillButton>
              <PillButton
                variant="outline"
                className="w-full sm:w-auto sm:min-w-32"
                disabled={saving}
                onClick={onClose}
              >
                {t("shared.cancel")}
              </PillButton>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};
