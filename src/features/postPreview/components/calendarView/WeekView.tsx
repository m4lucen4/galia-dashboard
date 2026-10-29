import { PreviewProjectDataProps } from "../../../../types";
import {
  CalendarDayCell,
  WEEKDAY_LABELS_ES,
  formatDayLabelEs,
} from "./calendarHelpers";
import { EventChip } from "./EventChip";
import { DayOverflowPopover } from "./DayOverflowPopover";

interface WeekViewProps {
  days: CalendarDayCell[];
  grouped: Map<string, PreviewProjectDataProps[]>;
  onSelectProject: (project: PreviewProjectDataProps) => void;
}

const MAX_VISIBLE_CHIPS = 5;

export const WeekView: React.FC<WeekViewProps> = ({
  days,
  grouped,
  onSelectProject,
}) => {
  return (
    <div
      role="region"
      aria-label="Calendario semanal"
      tabIndex={0}
      className="overflow-x-auto rounded-[28px] border border-[#010000]/40 bg-[#d8e4d6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000]"
    >
      <div className="grid min-w-[840px] grid-cols-7 gap-px bg-[#010000]/15">
        {days.map((cell, index) => (
          <div
            key={cell.dayKey}
            className={`flex min-h-100 flex-col p-2 ${
              cell.isCurrentMonth ? "bg-[#e8eee5]" : "bg-[#d8e4d6]"
            }`}
          >
            <div className="mb-4 flex flex-col items-center gap-2 border-b border-[#010000]/15 pb-4 pt-2">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-[#010000]/60">
                {WEEKDAY_LABELS_ES[index]}
              </span>
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full font-['Geist_Mono',monospace] text-sm ${
                  cell.isToday
                    ? "bg-[#010000] text-[#d8e4d6]"
                    : "text-[#010000]"
                }`}
              >
                {cell.date.getDate()}
              </span>
            </div>
            {(() => {
              const dayProjects = grouped.get(cell.dayKey) ?? [];
              const visibleProjects = dayProjects.slice(0, MAX_VISIBLE_CHIPS);
              const hiddenCount = dayProjects.length - visibleProjects.length;

              return (
                <div className="flex-1 space-y-1 overflow-y-auto">
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
              );
            })()}
          </div>
        ))}
      </div>
    </div>
  );
};
