import { useTranslation } from "react-i18next";
import type { GenerationJob } from "../types/publicationGeneration";
import { diagnosticMetrics } from "../types/publicationGenerationDiagnostics";

export function PublicationGenerationDetails({ job }: Readonly<{ job: GenerationJob }>) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language ?? "es";
  const locale = language.startsWith("en") ? "en" : language.startsWith("ca") ? "ca" : "es";
  const prefix = "publicationGeneration.diagnostics";
  return (
    <details className="rounded-xl border border-[#010000]/15 px-4 text-sm">
      <summary className="min-h-11 cursor-pointer py-3 font-medium focus-visible:outline-2 focus-visible:outline-offset-4">
        {t(`${prefix}.title`)}
      </summary>
      <div className="space-y-4 pb-4">
        <p className="break-all">{t(`${prefix}.job`, { id: job.jobId })}</p>
        <p className="wrap-break-word">{t(`${prefix}.model`, { model: job.requestedModel })}</p>
        <p>{t(`${prefix}.promptVersion`, { version: job.promptVersion })}</p>
        {job.slots.map((slot) => (
          <div key={slot.slot} className="space-y-2 border-t border-[#010000]/10 pt-3">
            <h4 className="font-medium">
              {t("publicationGeneration.variant", { slot: slot.slot })}
              {slot.previewId && ` · ${t(`${prefix}.preview`, { id: slot.previewId })}`}
            </h4>
            {slot.actualModel && <p>{t(`${prefix}.actualModel`, { model: slot.actualModel })}</p>}
            {!slot.attemptDiagnostics?.length && <p>{t(`${prefix}.unavailable`)}</p>}
            <ol className="space-y-3">
              {slot.attemptDiagnostics?.map((entry) => (
                <li key={entry.attempt} className="space-y-1">
                  <p className="font-medium">
                    {t(`${prefix}.attempt`, { attempt: entry.attempt })}{" · "}
                    {t(`${prefix}.${entry.outcome}`)}{" · "}
                    <time dateTime={entry.recordedAt}>{new Date(entry.recordedAt).toLocaleString(locale)}</time>
                  </p>
                  <p>{t(`${prefix}.reasons.${entry.details.reason}`)}</p>
                  {entry.details.responseStatus && <p>{t(`${prefix}.responseStatus`)}: <code>{entry.details.responseStatus}</code></p>}
                  {entry.details.incompleteReason && <p>{t(`${prefix}.incompleteReason`)}: <code>{entry.details.incompleteReason}</code></p>}
                  <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                    {diagnosticMetrics.filter((key) => entry.details[key] !== undefined).map((key) => (
                      <div key={key}>
                        <dt className="inline text-[#010000]/70">{t(`${prefix}.metrics.${key}`)}: </dt>
                        <dd className="inline">{entry.details[key]?.toLocaleString(locale)}</dd>
                      </div>
                    ))}
                  </dl>
                  {entry.details.normalizedLineBreaks && <p>{t(`${prefix}.normalized`)}</p>}
                </li>
              ))}
            </ol>
          </div>
        ))}
        <p className="text-[#010000]/70">{t(`${prefix}.coverage`)}</p>
      </div>
    </details>
  );
}
