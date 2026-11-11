import { PublicationGenerationDetails } from "./PublicationGenerationDetails";
import { selectGenerationJob } from "../utils/publicationGenerationSelection";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PillButton } from "@/components/shared/ui/PillButton";
import { isActive, safeGenerationIssue } from "../services/publicationGeneration";
import type { usePublicationGeneration } from "@/hooks/usePublicationGeneration";

type Props = {
  generation: ReturnType<typeof usePublicationGeneration>;
  projects: { id: string; title: string }[];
  onConfigure: (projectId: string) => void;
  recoveryOnly?: boolean;
};

export function PublicationGenerationStatus({ generation, projects, onConfigure, recoveryOnly = false }: Props) {
  const { t } = useTranslation();
  const { jobs, requests, issues, busy, readIssue, loading, start, refresh } = generation;
  const attentionIds = [...new Set([
    ...requests.map((request) => request.projectId),
    ...Object.keys(issues).filter((key) => key !== "storage" && issues[key].code),
  ])];
  const selected = selectGenerationJob(jobs);
  const projectIds = recoveryOnly ? attentionIds : selected ? [selected.projectId] : [];
  const message = (code: string) => t(`publicationGeneration.errors.${safeGenerationIssue({ code }).code}`);
  if (recoveryOnly && !projectIds.length && !readIssue && !issues.storage && !loading) return null;

  return (
    <section aria-label={t("publicationGeneration.title")} className="space-y-4 border-b border-[#010000]/15 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-medium">{t(recoveryOnly ? "publicationGeneration.history.attention" : "publicationGeneration.title")}</h2>
        {!recoveryOnly && (
          <Link to="/projects/generation-history" state={{ actor: generation.actor, issues }}
            className="inline-flex min-h-11 items-center rounded-full px-3 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">
            {t("publicationGeneration.history.title")}
            {attentionIds.length > 0 && ` · ${t("publicationGeneration.history.attentionCount", { count: attentionIds.length })}`}
          </Link>
        )}
      </div>
      <p className="text-sm text-[#010000]/75">{t("publicationGeneration.navigation")}</p>
      {loading && <p role="status">{t("publicationGeneration.restoring")}</p>}
      {issues.storage && <p role="status">{message("storage")}</p>}
      {readIssue && (
        <div className="space-y-3" role="status">
          <p>{t("publicationGeneration.readError")} {message(readIssue.code)}</p>
          {readIssue.code !== "unauthorized" && (
            <PillButton variant="outline" onClick={refresh}>{t("publicationGeneration.refresh")}</PillButton>
          )}
        </div>
      )}
      <ul className="space-y-5">
        {projectIds.map((projectId) => {
          const job = recoveryOnly ? jobs.find((entry) => entry.projectId === projectId) : selected;
          const request = requests.find((entry) => entry.projectId === projectId);
          const failure = issues[projectId];
          const sending = busy.includes(projectId);
          const title = projects.find((project) => String(project.id) === projectId)?.title
            || t("publicationGeneration.project", { id: projectId });
          const status = job ? job.consistent ? job.status : "syncing" : "unconfirmed";
          const disabled = sending || readIssue?.code === "unauthorized" || Boolean(issues.storage)
            || failure?.code === "unauthorized" || failure?.code === "storage";
          return (
            <li key={projectId} className="space-y-3 rounded-2xl border border-[#010000]/20 p-5">
              <h3 className="break-words text-lg font-medium">{title}</h3>
              <div role="status" aria-live="polite" aria-atomic="true" className="space-y-1">
                <p>{t(`publicationGeneration.status.${status}`)}</p>
                {job?.consistent && (
                  <p className="text-sm">
                    {t("publicationGeneration.progress", { completed: job.succeeded + job.failed, total: job.total })}
                    {" · "}{t("publicationGeneration.counts", { succeeded: job.succeeded, failed: job.failed })}
                  </p>
                )}
                {sending && <p>{t("publicationGeneration.sending")}</p>}
                {failure?.code && <p>{message(failure.code)}</p>}
              </div>
              {job?.slots.some((slot) => slot.state === "failed") && (
                <ul className="space-y-1 text-sm">
                  {job.slots.filter((slot) => slot.state === "failed").map((slot) => (
                    <li key={slot.slot}>
                      {t("publicationGeneration.variant", { slot: slot.slot })}: {message(slot.errorCode ?? "internal_error")}
                    </li>
                  ))}
                </ul>
              )}
              {job && <PublicationGenerationDetails job={job} />}
              <div className="flex flex-wrap items-center gap-3">
                {request ? (
                  <PillButton variant="outline" disabled={disabled} onClick={() => void start(projectId)}>
                    {t("publicationGeneration.replay")}
                  </PillButton>
                ) : job?.canRetry ? (
                  <PillButton variant="outline" disabled={disabled} onClick={() => void start(projectId, job)}>
                    {t("publicationGeneration.retryFailed")}
                  </PillButton>
                ) : !job && failure?.code ? (
                  <PillButton variant="outline" disabled={disabled} onClick={() => onConfigure(projectId)}>
                    {t("publicationGeneration.tryAgain")}
                  </PillButton>
                ) : null}
                {job?.consistent && job.succeeded > 0 && (
                  <Link to="/preview-projects" className="inline-flex min-h-11 items-center rounded-full px-3 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">
                    {t("publicationGeneration.viewPreviews")}
                    <span className="sr-only">: {title}</span>
                  </Link>
                )}
              </div>
              {job && !isActive(job) && job.failed > 0 && !job.canRetry && (
                <p className="text-sm">{t("publicationGeneration.noRetry")}</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
