import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../../../redux/hooks";
import { RootState } from "../../../redux/store";
import { useProjectsData } from "../../../hooks/useProjectsData";
import { supabase } from "../../../helpers/supabase";
import { Button } from "../../../components/shared/ui/Button";
import { ProjectDataProps } from "../../../types";

type Period = "today" | "yesterday" | "7days" | "30days" | "90days" | "custom";

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
  { value: "today", labelKey: "analytics.today" },
  { value: "yesterday", labelKey: "analytics.yesterday" },
  { value: "7days", labelKey: "analytics.lastWeek" },
  { value: "30days", labelKey: "analytics.lastMonth" },
  { value: "90days", labelKey: "analytics.last3Months" },
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
  switch (period) {
    case "today":
      return { startDate: formatDate(today), endDate: formatDate(today) };
    case "yesterday": {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      return { startDate: formatDate(d), endDate: formatDate(d) };
    }
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
    case "90days": {
      const d = new Date(today);
      d.setDate(d.getDate() - 89);
      return { startDate: formatDate(d), endDate: formatDate(today) };
    }
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

  const visibleProjects: ProjectDataProps[] = useMemo(() => {
    if (user?.role === "admin") {
      return projects.filter((p) => p.showMap === true);
    }
    return projects;
  }, [projects, user?.role]);

  const totalPages = Math.ceil(visibleProjects.length / PAGE_SIZE);

  const pagedProjects = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return visibleProjects.slice(start, start + PAGE_SIZE);
  }, [visibleProjects, currentPage]);

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
    <div className="container mx-auto p-4">
      <div className="mb-1">
        <h3 className="text-base/7 font-semibold text-gray-900">
          {t("analytics.title")}
        </h3>
      </div>
      <div className="flex justify-between items-center mb-4">
        <p className="mt-1 max-w-7xl text-sm/6 text-gray-500">
          {t("analytics.description")}
        </p>
      </div>

      <div className="mb-6">
        <Button
          title={t("analytics.back")}
          onClick={() => navigate("/projects")}
          secondary
        />
      </div>

      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            {t("analytics.period")}:
          </span>
          {PERIOD_OPTIONS.map(({ value, labelKey }) => (
            <button
              key={value}
              onClick={() => handlePeriodChange(value)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                period === value
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
            <span className="text-sm text-gray-400">—</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
            <Button title={t("analytics.apply")} onClick={handleApplyCustomRange} />
          </div>
        )}
      </div>

      {!isTableLoading && visibleProjects.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
            {t("analytics.totalsSectionLabel")}
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: t("analytics.pageViews"), value: aggregatedTotals.screenPageViews },
              { label: t("analytics.uniqueUsers"), value: aggregatedTotals.activeUsers },
              { label: t("analytics.sessions"), value: aggregatedTotals.sessions },
            ].map(({ label, value }) => (
              <div key={label} className="border border-gray-200 rounded-lg px-5 py-4 bg-white">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  {label}
                </p>
                {allLoading ? (
                  <p className="text-2xl font-semibold text-gray-300">—</p>
                ) : (
                  <p className="text-2xl font-semibold text-gray-900">
                    {value.toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isTableLoading ? (
        <p className="text-sm text-gray-500">{t("analytics.loadingProjects")}</p>
      ) : visibleProjects.length === 0 ? (
        <p className="text-sm text-gray-500">{t("analytics.noProjects")}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("analytics.projectId")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("analytics.projectName")}
                  </th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("projects.createdBy")}
                    </th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("analytics.pageViews")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("analytics.uniqueUsers")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("analytics.sessions")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pagedProjects.map((project) => {
                  const projectId = String(project.id);
                  const entry = analytics[projectId];
                  const isLoading = !entry || entry.loading;
                  const hasError = entry && !entry.loading && !!entry.error;

                  const metricCell = (value: number | undefined) => {
                    if (isLoading) return <span className="text-gray-300">—</span>;
                    if (hasError)
                      return <span className="text-red-400 text-xs">{t("analytics.noData")}</span>;
                    return <span className="font-medium">{(value ?? 0).toLocaleString()}</span>;
                  };

                  const shortId =
                    projectId.length > 8
                      ? `${projectId.substring(0, 8)}…`
                      : projectId;

                  return (
                    <tr key={projectId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">
                        {shortId}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {project.title || "—"}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {getAuthorName(project)}
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {metricCell(entry?.totals?.screenPageViews)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {metricCell(entry?.totals?.activeUsers)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {metricCell(entry?.totals?.sessions)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
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
                  <span className="text-gray-400 ml-2">
                    ({loadedCount} {t("analytics.loaded")})
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  title={t("shared.previous")}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  secondary
                />
                <span className="text-sm text-gray-700">
                  {t("shared.page")} {currentPage} / {totalPages}
                </span>
                <Button
                  title={t("shared.next")}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  secondary
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
