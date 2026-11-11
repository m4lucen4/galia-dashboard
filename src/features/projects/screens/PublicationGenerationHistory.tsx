import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { usePublicationGeneration } from "@/hooks/usePublicationGeneration";
import { CardsPagination } from "@/components/shared/ui/CardsPagination";
import { PillButton } from "@/components/shared/ui/PillButton";
import { PublicationGenerationDetails } from "../components/PublicationGenerationDetails";
import { PublicationGenerationStatus } from "../components/PublicationGenerationStatus";
import { isActive, readGenerationHistory, safeGenerationIssue } from "../services/publicationGeneration";
import type { GenerationHistoryPage, GenerationIssue } from "../types/publicationGeneration";

type HistoryView = { actor: string; page: number; revision: number; data?: GenerationHistoryPage; error?: GenerationIssue };

export function PublicationGenerationHistory() {
  const { t, i18n } = useTranslation();
  const actor = useAppSelector((state) => state.auth.user?.uid) ?? "";
  const navigate = useNavigate();
  const location = useLocation();
  const [pagination, setPagination] = useState({ actor, page: 1 });
  const page = pagination.actor === actor ? pagination.page : 1;
  const setPage = useCallback((page: number) => setPagination({ actor, page }), [actor]);
  const [revision, setRevision] = useState(0);
  const [view, setView] = useState<HistoryView>({ actor: "", page: 1, revision: -1 });
  const dispatch = useAppDispatch();
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  const generation = usePublicationGeneration(reload);
  const language = i18n.resolvedLanguage ?? i18n.language ?? "es";
  const locale = language.startsWith("en") ? "en" : language.startsWith("ca") ? "ca" : "es";
  // The link carries transient errors, not jobs or permission claims. Receipts
  // are restored by the existing actor-scoped hook, including off-page projects.
  const inherited = location.state?.actor === actor ? location.state.issues : {};
  const issues = { ...inherited, ...generation.issues };

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    const current = () => alive && dispatch((_, getState) => getState().auth.user?.uid) === actor;
    if (actor) void readGenerationHistory(actor, page, controller.signal).then((data) => {
      if (!current()) return;
      const lastPage = Math.max(1, Math.ceil(data.totalCount / data.pageSize));
      if (page > lastPage) { setPage(lastPage); return; }
      setView({ actor, page, revision, data });
    }).catch((error: unknown) => {
      if (current()) setView({ actor, page, revision, error: safeGenerationIssue(error) });
    });
    return () => { alive = false; controller.abort(); };
  }, [actor, page, revision, dispatch, setPage]);

  const current = view.actor === actor && view.page === page && view.revision === revision ? view : undefined;
  const data = current?.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / 10)) : 1;
  const message = (code: string) => t(`publicationGeneration.errors.${safeGenerationIssue({ code }).code}`);
  const refresh = () => { reload(); generation.refresh(); };
  return (
    <div className="min-w-0 space-y-8 font-['Hanken_Grotesk',system-ui,sans-serif] text-[#010000]">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-[#010000]/15 pb-8">
        <div className="min-w-0 space-y-3">
          <Link to="/projects" className="inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">
            {t("publicationGeneration.history.back")}
          </Link>
          <h1 className="text-4xl font-medium tracking-[-0.04em] sm:text-5xl">{t("publicationGeneration.history.title")}</h1>
          <p className="text-[#010000]/75">{t("publicationGeneration.history.description")}</p>
        </div>
        <PillButton variant="outline" onClick={refresh}>{t("publicationGeneration.refresh")}</PillButton>
      </header>
      <PublicationGenerationStatus recoveryOnly generation={{ ...generation, issues }} projects={[]}
        onConfigure={() => navigate("/projects")} />
      {!data && !current?.error && <output>{t("publicationGeneration.history.loading")}</output>}
      {current?.error && (
        <output className="space-y-3">
          <p>{t("publicationGeneration.readError")} {message(current.error.code)}</p>
          {page > 1 && <PillButton variant="outline" onClick={() => setPage(1)}>{t("publicationGeneration.history.firstPage")}</PillButton>}
        </output>
      )}
      {data && (
        <section aria-label={t("publicationGeneration.history.title")} className="space-y-5">
          <output>{t("publicationGeneration.history.page", { page, total: totalPages, count: data.totalCount })}</output>
          {data.jobs.length === 0 ? <p>{t("publicationGeneration.history.empty")}</p> : (
            <ul className="divide-y divide-[#010000]/15 rounded-2xl border border-[#010000]/20">
              {data.jobs.map((job) => {
                const pending = generation.requests.some((request) => request.projectId === job.projectId);
                const active = generation.jobs.some((entry) => entry.projectId === job.projectId && isActive(entry));
                const failure = issues[job.projectId];
                const disabled = generation.loading || generation.busy.includes(job.projectId)
                  || generation.readIssue?.code === "unauthorized" || Boolean(issues.storage)
                  || failure?.code === "unauthorized" || failure?.code === "storage" || (!pending && active);
                return (
                  <li key={job.jobId} className="space-y-4 p-5">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="min-w-0 space-y-1">
                        <h2 className="wrap-break-word text-lg font-medium">{t("publicationGeneration.project", { id: job.projectId })}</h2>
                        <time className="text-sm" dateTime={job.createdAt}>{new Date(job.createdAt).toLocaleString(locale)}</time>
                      </div>
                      <div className="space-y-1">
                        <p>{t(`publicationGeneration.status.${job.consistent ? job.status : "syncing"}`)}</p>
                        {job.consistent && <p className="text-sm">{t("publicationGeneration.progress", { completed: job.succeeded + job.failed, total: job.total })}</p>}
                      </div>
                      <div className="flex flex-wrap items-start gap-3">
                        {(pending || job.canRetry) && (
                          <PillButton variant="outline" disabled={disabled} onClick={() => void generation.start(job.projectId, job)}>
                            {t(pending ? "publicationGeneration.replay" : "publicationGeneration.retryFailed")}
                            <span className="sr-only">: {t("publicationGeneration.project", { id: job.projectId })}</span>
                          </PillButton>
                        )}
                        {job.consistent && job.succeeded > 0 && <Link to="/preview-projects" className="inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">{t("publicationGeneration.viewPreviews")}</Link>}
                      </div>
                    </div>
                    {!pending && active && job.canRetry && <p className="text-sm">{t("publicationGeneration.history.active")}</p>}
                    <PublicationGenerationDetails job={job} />
                    {!isActive(job) && job.failed > 0 && !job.canRetry && <p className="text-sm">{t("publicationGeneration.noRetry")}</p>}
                  </li>
                );
              })}
            </ul>
          )}
          <CardsPagination currentPage={page} totalPages={totalPages} totalItems={data.totalCount} itemsPerPage={10}
            onPageChange={(next) => { if (Number.isInteger(next) && next >= 1 && next <= totalPages) setPage(next); }} />
        </section>
      )}
    </div>
  );
}
