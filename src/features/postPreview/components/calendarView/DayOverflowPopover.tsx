import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { PreviewProjectDataProps } from "../../../../types";
import { EventChip } from "./EventChip";

interface DayOverflowPopoverProps {
  dayLabel: string;
  projects: PreviewProjectDataProps[];
  hiddenCount: number;
  onSelectProject: (project: PreviewProjectDataProps) => void;
}

export const DayOverflowPopover: React.FC<DayOverflowPopoverProps> = ({
  dayLabel,
  projects,
  hiddenCount,
  onSelectProject,
}) => {
  return (
    <Popover className="relative">
      <PopoverButton className="text-xs text-gray-500 hover:text-black hover:underline">
        +{hiddenCount} más
      </PopoverButton>
      <PopoverPanel
        anchor="bottom start"
        className="z-20 w-64 max-h-80 overflow-y-auto rounded-lg border border-black bg-white p-2 shadow-lg"
      >
        {({ close }) => (
          <>
            <p className="mb-2 px-1 text-xs font-semibold text-gray-500 capitalize">
              {dayLabel}
            </p>
            <div className="space-y-1">
              {projects.map((project) => (
                <EventChip
                  key={project.id}
                  project={project}
                  maxTitleLength={30}
                  onClick={() => {
                    onSelectProject(project);
                    close();
                  }}
                />
              ))}
            </div>
          </>
        )}
      </PopoverPanel>
    </Popover>
  );
};
