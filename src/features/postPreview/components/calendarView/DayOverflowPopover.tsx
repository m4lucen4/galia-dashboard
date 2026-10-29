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
      <PopoverButton className="rounded-full px-2 py-1 font-['Hanken_Grotesk',system-ui,sans-serif] text-xs font-medium text-[#010000]/65 transition-colors hover:bg-[#010000]/5 hover:text-[#010000] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000]">
        +{hiddenCount} más
      </PopoverButton>
      <PopoverPanel
        anchor="bottom start"
        className="z-20 max-h-80 w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-[28px] border border-[#010000]/40 bg-[#e8eee5] p-4 font-['Hanken_Grotesk',system-ui,sans-serif] text-[#010000] shadow-lg [--anchor-gap:8px] [--anchor-padding:16px]"
      >
        {({ close }) => (
          <>
            <p className="mb-3 border-b border-[#010000]/15 px-1 pb-3 text-sm font-medium capitalize">
              {dayLabel}
            </p>
            <div className="space-y-1.5">
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
