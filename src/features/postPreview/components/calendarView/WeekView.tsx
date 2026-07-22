import { PreviewProjectDataProps } from "../../../../types";
import { CalendarDayCell, WEEKDAY_LABELS_ES, formatDayLabelEs } from "./calendarHelpers";
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
    <div className="overflow-hidden rounded-lg border border-black">
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {days.map((cell, index) => (
          <div
            key={cell.dayKey}
            className={`flex min-h-100 flex-col p-1.5 ${
              cell.isCurrentMonth ? "bg-white" : "bg-gray-50/50"
            }`}
          >
            <div className="mb-2 flex flex-col items-center">
              <span className="text-xs font-medium text-gray-500">
                {WEEKDAY_LABELS_ES[index]}
              </span>
              <span
                className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium ${
                  cell.isToday ? "bg-black text-white" : "text-gray-800"
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
