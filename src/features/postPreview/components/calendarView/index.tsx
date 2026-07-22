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
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100"
            title="Anterior"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            onClick={handleNext}
            className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100"
            title="Siguiente"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
          <button
            onClick={handleToday}
            className="rounded-md bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300"
          >
            {t("previewProjects.calendar.today", "Hoy")}
          </button>
          <span className="ml-2 text-base font-semibold text-gray-900 capitalize">
            {label}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setCalendarMode("month")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              calendarMode === "month"
                ? "bg-black text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {t("previewProjects.calendar.month", "Mes")}
          </button>
          <button
            onClick={() => setCalendarMode("week")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              calendarMode === "week"
                ? "bg-black text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
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
        <div className="py-8 text-center text-gray-500">
          {t(
            "previewProjects.calendar.noScheduledPosts",
            "No hay publicaciones programadas ni publicadas para mostrar en el calendario.",
          )}
        </div>
      )}
    </div>
  );
};
