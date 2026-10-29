import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { PreviewProjectDataProps } from "../../../../types";
import {
  addMonths,
  addWeeks,
  buildMonthGrid,
  buildWeekGrid,
  formatMonthYearLabelEs,
  formatWeekRangeLabelEs,
  groupProjectsByDay,
} from "./calendarHelpers";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";

interface CalendarViewProps {
  projects: PreviewProjectDataProps[];
  onSelectProject: (project: PreviewProjectDataProps) => void;
}

type CalendarMode = "month" | "week";

export const CalendarView: React.FC<CalendarViewProps> = ({
  projects,
  onSelectProject,
}) => {
  const { t } = useTranslation();
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("month");
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());

  const grouped = useMemo(() => groupProjectsByDay(projects), [projects]);
  const hasAnyEvents = grouped.size > 0;

  const weeks = useMemo(() => buildMonthGrid(referenceDate), [referenceDate]);
  const weekDays = useMemo(() => buildWeekGrid(referenceDate), [referenceDate]);

  const label =
    calendarMode === "month"
      ? formatMonthYearLabelEs(referenceDate)
      : formatWeekRangeLabelEs(weekDays);

  const handlePrev = () => {
    setReferenceDate((prev) =>
      calendarMode === "month" ? addMonths(prev, -1) : addWeeks(prev, -1),
    );
  };

  const handleNext = () => {
    setReferenceDate((prev) =>
      calendarMode === "month" ? addMonths(prev, 1) : addWeeks(prev, 1),
    );
  };

  const handleToday = () => setReferenceDate(new Date());

  return (
    <div className="min-w-0 space-y-5 font-['Hanken_Grotesk',system-ui,sans-serif] text-[#010000] [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-2 [&_button]:focus-visible:outline-[#010000]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <button
            onClick={handlePrev}
            className="rounded-full border border-[#010000]/25 p-2.5 transition-colors hover:bg-[#010000] hover:text-[#d8e4d6]"
            title="Anterior"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            onClick={handleNext}
            className="rounded-full border border-[#010000]/25 p-2.5 transition-colors hover:bg-[#010000] hover:text-[#d8e4d6]"
            title="Siguiente"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
          <button
            onClick={handleToday}
            className="rounded-full border border-[#010000] px-4 py-2 text-sm font-medium transition-colors hover:bg-[#010000] hover:text-[#d8e4d6]"
          >
            {t("previewProjects.calendar.today", "Hoy")}
          </button>
          <span className="w-full pt-2 text-xl font-medium capitalize tracking-tight sm:ml-3 sm:w-auto sm:pt-0 sm:text-2xl">
            {label}
          </span>
        </div>

        <div className="flex gap-1 rounded-full border border-[#010000]/25 p-1">
          <button
            onClick={() => setCalendarMode("month")}
            aria-pressed={calendarMode === "month"}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
              calendarMode === "month"
                ? "bg-[#010000] text-[#d8e4d6]"
                : "hover:bg-[#010000]/5"
            }`}
          >
            {t("previewProjects.calendar.month", "Mes")}
          </button>
          <button
            onClick={() => setCalendarMode("week")}
            aria-pressed={calendarMode === "week"}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
              calendarMode === "week"
                ? "bg-[#010000] text-[#d8e4d6]"
                : "hover:bg-[#010000]/5"
            }`}
          >
            {t("previewProjects.calendar.week", "Semana")}
          </button>
        </div>
      </div>

      {hasAnyEvents ? (
        calendarMode === "month" ? (
          <MonthView
            weeks={weeks}
            grouped={grouped}
            onSelectProject={onSelectProject}
          />
        ) : (
          <WeekView
            days={weekDays}
            grouped={grouped}
            onSelectProject={onSelectProject}
          />
        )
      ) : (
        <div className="rounded-[28px] border border-[#010000]/30 bg-[#d8e4d6] px-6 py-16 text-center text-sm text-[#010000]/60">
          {t(
            "previewProjects.calendar.noScheduledPosts",
            "No hay publicaciones programadas ni publicadas para mostrar en el calendario.",
          )}
        </div>
      )}
    </div>
  );
};
