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
    <div
      role="region"
      aria-label="Calendario mensual"
      tabIndex={0}
      className="overflow-x-auto rounded-[28px] border border-[#010000]/40 bg-[#d8e4d6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000]"
    >
      <div className="grid min-w-[840px] grid-cols-7 border-b border-[#010000]/20">
        {WEEKDAY_LABELS_ES.map((label) => (
          <div
            key={label}
            className="py-4 text-center text-xs font-medium uppercase tracking-[0.12em] text-[#010000]/60"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid min-w-[840px] grid-cols-7 gap-px bg-[#010000]/15">
        {weeks.flat().map((cell) => {
          const dayProjects = grouped.get(cell.dayKey) ?? [];
          const visibleProjects = dayProjects.slice(0, MAX_VISIBLE_CHIPS);
          const hiddenCount = dayProjects.length - visibleProjects.length;

          return (
            <div
              key={cell.dayKey}
              className={`min-h-36 p-2 ${
                cell.isCurrentMonth ? "bg-[#e8eee5]" : "bg-[#d8e4d6]"
              }`}
            >
              <div className="mb-2 flex justify-end">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full font-['Geist_Mono',monospace] text-xs ${
                    cell.isToday
                      ? "bg-[#010000] text-[#d8e4d6]"
                      : cell.isCurrentMonth
                        ? "text-[#010000]"
                        : "text-[#010000]/40"
                  }`}
                >
                  {cell.date.getDate()}
                </span>
              </div>
              <div className="space-y-1">
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
