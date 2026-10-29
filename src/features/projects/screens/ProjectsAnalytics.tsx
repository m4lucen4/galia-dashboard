import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../../../redux/hooks";
import { RootState } from "../../../redux/store";
import { useProjectsData } from "../../../hooks/useProjectsData";
import { supabase } from "../../../helpers/supabase";
import { PillButton } from "@/components/shared/ui/PillButton";
import { ProjectDataProps } from "../../../types";

type Period = "7days" | "30days" | "sem1" | "sem2" | "custom";

interface AnalyticsTotals {
  screenPageViews: number;
  activeUsers: number;
  sessions: number;
}

interface ProjectAnalyticsEntry {
  loading: boolean;
  error: string | null;
  totals: AnalyticsTotals | null;
}

const PAGE_SIZE = 10;

const PERIOD_OPTIONS: { value: Period; labelKey: string }[] = [
  { value: "7days", labelKey: "analytics.lastWeek" },
  { value: "30days", labelKey: "analytics.lastMonth" },
  { value: "sem1", labelKey: "analytics.firstSemester" },
  { value: "sem2", labelKey: "analytics.secondSemester" },
  { value: "custom", labelKey: "analytics.customRange" },
];

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getPeriodDates(
  period: Period,
  customStart: string,
  customEnd: string,
): { startDate: string; endDate: string } {
  const today = new Date();
  const year = today.getFullYear();
  switch (period) {
    case "7days": {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      return { startDate: formatDate(d), endDate: formatDate(today) };
    }
    case "30days": {
      const d = new Date(today);
      d.setDate(d.getDate() - 29);
      return { startDate: formatDate(d), endDate: formatDate(today) };
    }
    case "sem1":
      return { startDate: `${year}-01-01`, endDate: `${year}-06-30` };
    case "sem2":
      return { startDate: `${year}-07-01`, endDate: `${year}-12-31` };
    case "custom":
      return { startDate: customStart, endDate: customEnd };
  }
}

function getAuthorName(project: ProjectDataProps): string {
  const ud = project.userData;
  if (!ud?.first_name || !ud?.last_name) return "—";
  return `${ud.last_name}, ${ud.first_name}`;
}

export const ProjectsAnalytics = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const user = useAppSelector((state: RootState) => state.auth.user);
  const { projects, projectsFetchRequest } = useAppSelector(
    (state: RootState) => state.project,
  );

  const fetchProjectsData = useProjectsData(user);

  const today = formatDate(new Date());
  const [period, setPeriod] = useState<Period>("30days");
  const [customStart, setCustomStart] = useState(today);
  const [customEnd, setCustomEnd] = useState(today);
  const [activeDates, setActiveDates] = useState(() =>
    getPeriodDates("30days", today, today),
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [analytics, setAnalytics] = useState<Record<string, ProjectAnalyticsEntry>>({});

  // Tracks which projectId:startDate:endDate combos have been successfully fetched
  const loadedRef = useRef<Set<string>>(new Set());
  // Incremented on period change to discard in-flight responses from previous period
  const requestVersionRef = useRef(0);

  useEffect(() => {
    fetchProjectsData();
  }, [fetchProjectsData]);

  const visibleProjects: ProjectDataProps[] = useMemo(
    () => projects.filter((p) => p.showMap === true),
    [projects],
  );

  const sortedProjects = useMemo(() => {
    return [...visibleProjects].sort((a, b) => {
      const aViews = analytics[String(a.id)]?.totals?.screenPageViews ?? 0;
      const bViews = analytics[String(b.id)]?.totals?.screenPageViews ?? 0;
      return bViews - aViews;
    });
  }, [visibleProjects, analytics]);

  const totalPages = Math.ceil(sortedProjects.length / PAGE_SIZE);

  const pagedProjects = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedProjects.slice(start, start + PAGE_SIZE);
  }, [sortedProjects, currentPage]);

  // Triggers a full reload: called from handlers, never from effects
  const triggerLoad = useCallback(
    (
      dates: { startDate: string; endDate: string },
      projectsList: ProjectDataProps[],
    ) => {
      if (projectsList.length === 0) return;

      const version = requestVersionRef.current;
      const { startDate, endDate } = dates;

      const toLoad = projectsList.filter(
        (p) => !loadedRef.current.has(`${String(p.id)}:${startDate}:${endDate}`),
      );
      if (toLoad.length === 0) return;

      setAnalytics((prev) => {
        const next = { ...prev };
        toLoad.forEach((p) => {
          next[String(p.id)] = { loading: true, error: null, totals: null };
        });
        return next;
      });

      const batches: ProjectDataProps[][] = [];
      for (let i = 0; i < toLoad.length; i += PAGE_SIZE) {
        batches.push(toLoad.slice(i, i + PAGE_SIZE));
      }

      const processBatch = async (batch: ProjectDataProps[]) => {
        await Promise.all(
          batch.map((project) => {
            const projectId = String(project.id);
            return supabase.functions
              .invoke("project-analytics", { body: { projectId, startDate, endDate } })
              .then(({ data, error }) => {
                if (requestVersionRef.current !== version) return;
                if (!error) loadedRef.current.add(`${projectId}:${startDate}:${endDate}`);
                setAnalytics((prev) => ({
                  ...prev,
                  [projectId]: {
                    loading: false,
                    error: error ? error.message || t("analytics.error") : null,
                    totals: error
                      ? null
                      : (data?.totals ?? { screenPageViews: 0, activeUsers: 0, sessions: 0 }),
                  },
                }));
              })
              .catch(() => {
                if (requestVersionRef.current !== version) return;
                setAnalytics((prev) => ({
                  ...prev,
                  [projectId]: { loading: false, error: t("analytics.error"), totals: null },
                }));
              });
          }),
        );
      };

      (async () => {
        for (const batch of batches) {
          if (requestVersionRef.current !== version) break;
          await processBatch(batch);
        }
      })();
    },
    [t],
  );

  // When projects first load, kick off analytics with the active dates
  useEffect(() => {
    if (projectsFetchRequest.inProgress) return;
    if (visibleProjects.length === 0) return;
    triggerLoad(activeDates, visibleProjects);
  }, [visibleProjects, projectsFetchRequest.inProgress]);

  // Totals for ALL loaded projects across all pages (accumulates as user browses)
  const aggregatedTotals = useMemo(() => {
    const result = { screenPageViews: 0, activeUsers: 0, sessions: 0 };
    visibleProjects.forEach((p) => {
      const entry = analytics[String(p.id)];
      if (entry && !entry.loading && !entry.error && entry.totals) {
        result.screenPageViews += entry.totals.screenPageViews;
        result.activeUsers += entry.totals.activeUsers;
        result.sessions += entry.totals.sessions;
      }
    });
    return result;
  }, [analytics, visibleProjects]);

  const allLoading = visibleProjects.some((p) => {
    const entry = analytics[String(p.id)];
    return !entry || entry.loading;
  });

  const loadedCount = visibleProjects.filter((p) => {
    const entry = analytics[String(p.id)];
    return entry && !entry.loading && !entry.error;
  }).length;

  const applyNewDates = useCallback(
    (newDates: { startDate: string; endDate: string }) => {
      requestVersionRef.current++;
      loadedRef.current.clear();
      setAnalytics({});
      setCurrentPage(1);
      setActiveDates(newDates);
      triggerLoad(newDates, visibleProjects);
    },
    [triggerLoad, visibleProjects],
  );

  const handlePeriodChange = (newPeriod: Period) => {
    setPeriod(newPeriod);
    if (newPeriod !== "custom") {
      applyNewDates(getPeriodDates(newPeriod, customStart, customEnd));
    }
  };

  const handleApplyCustomRange = () => {
    if (customStart && customEnd && customStart <= customEnd) {
      applyNewDates({ startDate: customStart, endDate: customEnd });
    }
  };

  if (!user) return null;

  const isTableLoading = projectsFetchRequest.inProgress;
  const isAdmin = user.role === "admin";

  return (
    <div className="min-w-0 space-y-8 bg-[#d8e4d6] font-[Hanken_Grotesk] text-[#010000] sm:space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-[#010000]/15 pb-8">
        <div className="min-w-0 space-y-3">
          <h1 className="text-4xl leading-[1.05] font-medium tracking-[-0.04em] sm:text-5xl">
            {t("analytics.title")}
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-[#010000]/65">
            {t("analytics.description")}
          </p>
        </div>
        <PillButton
          variant="outline"
          onClick={() => navigate("/projects")}
        >
          {t("analytics.back")}
        </PillButton>
      </header>

      <section
        aria-label={t("analytics.period")}
        className="rounded-[28px] border border-[#010000]/20 p-5 sm:p-7"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-sm font-medium">
            {t("analytics.period")}:
          </span>
          {PERIOD_OPTIONS.map(({ value, labelKey }) => (
            <button
              key={value}
              onClick={() => handlePeriodChange(value)}
              aria-pressed={period === value}
              className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#010000] ${
                period === value
                  ? "border-[#010000] bg-[#010000] text-[#d8e4d6]"
                  : "border-[#010000]/25 bg-transparent text-[#010000] hover:border-[#010000] hover:bg-[#010000]/5"
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[#010000]/15 pt-5">
            <input
              type="date"
              aria-label="Fecha inicial"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="min-h-11 w-full min-w-0 rounded-full border border-[#010000]/30 bg-transparent px-4 py-2 font-mono text-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#010000] sm:w-auto"
            />
            <span className="text-sm text-[#010000]/45" aria-hidden="true">—</span>
            <input
              type="date"
              aria-label="Fecha final"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="min-h-11 w-full min-w-0 rounded-full border border-[#010000]/30 bg-transparent px-4 py-2 font-mono text-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#010000] sm:w-auto"
            />
            <PillButton onClick={handleApplyCustomRange}>
              {t("analytics.apply")}
            </PillButton>
          </div>
        )}
      </section>

      {!isTableLoading && visibleProjects.length > 0 && (
        <section aria-label={t("analytics.totalsSectionLabel")}>
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.14em] text-[#010000]/60">
            {t("analytics.totalsSectionLabel")}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { label: t("analytics.pageViews"), value: aggregatedTotals.screenPageViews },
              { label: t("analytics.uniqueUsers"), value: aggregatedTotals.activeUsers },
              { label: t("analytics.sessions"), value: aggregatedTotals.sessions },
            ].map(({ label, value }) => (
              <div key={label} className="min-w-0 rounded-[28px] border border-[#010000]/20 p-6 sm:p-7">
                <p className="mb-5 text-xs font-medium uppercase tracking-[0.12em] text-[#010000]/60">
                  {label}
                </p>
                {allLoading ? (
                  <p className="font-mono text-4xl tracking-tight text-[#010000]/35">—</p>
                ) : (
                  <p className="break-all font-mono text-4xl tracking-tight tabular-nums sm:text-3xl xl:text-4xl">
                    {value.toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {isTableLoading ? (
        <p role="status" className="rounded-[28px] border border-[#010000]/20 p-8 text-sm text-[#010000]/65">{t("analytics.loadingProjects")}</p>
      ) : visibleProjects.length === 0 ? (
        <p role="status" className="rounded-[28px] border border-[#010000]/20 p-8 text-sm text-[#010000]/65">{t("analytics.noPublishedProjects")}</p>
      ) : (
        <>
          <div
            role="region"
            aria-label={t("analytics.title")}
            tabIndex={0}
            className="overflow-x-auto rounded-[28px] border border-[#010000]/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#010000]"
          >
            <table className="w-full min-w-[680px] divide-y divide-[#010000]/20">
              <thead className="bg-[#010000]/5">
                <tr>
                  <th scope="col" className="px-5 py-5 text-left text-xs font-medium uppercase tracking-wider text-[#010000]/65">
                    {t("analytics.projectId")}
                  </th>
                  <th scope="col" className="px-5 py-5 text-left text-xs font-medium uppercase tracking-wider text-[#010000]/65">
                    {t("analytics.projectName")}
                  </th>
                  {isAdmin && (
                    <th scope="col" className="px-5 py-5 text-left text-xs font-medium uppercase tracking-wider text-[#010000]/65">
                      {t("projects.createdBy")}
                    </th>
                  )}
                  <th scope="col" className="px-5 py-5 text-right text-xs font-medium uppercase tracking-wider text-[#010000]/65">
                    {t("analytics.pageViews")}
                  </th>
                  <th scope="col" className="px-5 py-5 text-right text-xs font-medium uppercase tracking-wider text-[#010000]/65">
                    {t("analytics.uniqueUsers")}
                  </th>
                  <th scope="col" className="px-5 py-5 text-right text-xs font-medium uppercase tracking-wider text-[#010000]/65">
                    {t("analytics.sessions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#010000]/10">
                {pagedProjects.map((project) => {
                  const projectId = String(project.id);
                  const entry = analytics[projectId];
                  const isLoading = !entry || entry.loading;
                  const hasError = entry && !entry.loading && !!entry.error;

                  const metricCell = (value: number | undefined) => {
                    if (isLoading) return <span className="text-[#010000]/35">—</span>;
                    if (hasError)
                      return <span className="font-[Hanken_Grotesk] text-xs text-red-800">{t("analytics.noData")}</span>;
                    return <span className="font-medium">{(value ?? 0).toLocaleString()}</span>;
                  };

                  const shortId =
                    projectId.length > 8
                      ? `${projectId.substring(0, 8)}…`
                      : projectId;

                  return (
                    <tr key={projectId} className="transition-colors hover:bg-[#010000]/5">
                      <td className="whitespace-nowrap px-5 py-5 font-mono text-xs text-[#010000]/60">
                        {shortId}
                      </td>
                      <td className="min-w-48 px-5 py-5 text-sm font-medium">
                        {project.title || "—"}
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-5 text-sm text-[#010000]/70">
                          {getAuthorName(project)}
                        </td>
                      )}
                      <td className="px-5 py-5 text-right font-mono text-sm tabular-nums">
                        {metricCell(entry?.totals?.screenPageViews)}
                      </td>
                      <td className="px-5 py-5 text-right font-mono text-sm tabular-nums">
                        {metricCell(entry?.totals?.activeUsers)}
                      </td>
                      <td className="px-5 py-5 text-right font-mono text-sm tabular-nums">
                        {metricCell(entry?.totals?.sessions)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col gap-5 border-t border-[#010000]/15 pt-6 xl:flex-row xl:items-center xl:justify-between">
              <p className="text-sm text-[#010000]/65">
                {t("shared.showing")}{" "}
                <span className="font-medium">
                  {(currentPage - 1) * PAGE_SIZE + 1}
                </span>{" "}
                {t("shared.to")}{" "}
                <span className="font-medium">
                  {Math.min(currentPage * PAGE_SIZE, visibleProjects.length)}
                </span>{" "}
                {t("shared.of")}{" "}
                <span className="font-medium">{visibleProjects.length}</span>{" "}
                {t("shared.results")}
                {loadedCount < visibleProjects.length && (
                  <span className="ml-2 text-[#010000]/60">
                    ({loadedCount} {t("analytics.loaded")})
                  </span>
                )}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <PillButton
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  {t("shared.previous")}
                </PillButton>
                <span className="font-mono text-xs tabular-nums text-[#010000]/65">
                  {t("shared.page")} {currentPage} / {totalPages}
                </span>
                <PillButton
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  {t("shared.next")}
                </PillButton>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
