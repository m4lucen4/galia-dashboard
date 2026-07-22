import { PreviewProjectDataProps } from "../../../../types";
import {
  CalendarDayCell,
  WEEKDAY_LABELS_ES,
  formatDayLabelEs,
} from "./calendarHelpers";
import { EventChip } from "./EventChip";
import { DayOverflowPopover } from "./DayOverflowPopover";

interface MonthViewProps {
  weeks: CalendarDayCell[][];
  grouped: Map<string, PreviewProjectDataProps[]>;
  onSelectProject: (project: PreviewProjectDataProps) => void;
}

const MAX_VISIBLE_CHIPS = 2;

export const MonthView: React.FC<MonthViewProps> = ({
  weeks,
  grouped,
  onSelectProject,
}) => {
  return (
    <div className="overflow-hidden rounded-lg border border-black">
      <div className="grid grid-cols-7 bg-gray-50">
        {WEEKDAY_LABELS_ES.map((label) => (
          <div
            key={label}
            className="py-2 text-center text-xs font-medium text-gray-500"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {weeks.flat().map((cell) => {
          const dayProjects = grouped.get(cell.dayKey) ?? [];
          const visibleProjects = dayProjects.slice(0, MAX_VISIBLE_CHIPS);
          const hiddenCount = dayProjects.length - visibleProjects.length;

          return (
            <div
              key={cell.dayKey}
              className={`min-h-27.5 p-1.5 ${
                cell.isCurrentMonth ? "bg-white" : "bg-gray-50/50"
              }`}
            >
              <div className="mb-1 flex justify-end">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium ${
                    cell.isToday
                      ? "bg-black text-white"
                      : cell.isCurrentMonth
                        ? "text-gray-800"
                        : "text-gray-400"
                  }`}
                >
                  {cell.date.getDate()}
                </span>
              </div>
              <div className="space-y-0.5">
                {visibleProjects.map((project) => (
                  <EventChip
                    key={project.id}
                    project={project}
                    onClick={() => onSelectProject(project)}
                  />
                ))}
                {hiddenCount > 0 && (
                  <DayOverflowPopover
                    dayLabel={formatDayLabelEs(cell.date)}
                    projects={dayProjects}
                    hiddenCount={hiddenCount}
                    onSelectProject={onSelectProject}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
