import { PreviewProjectDataProps } from "../../../../types";
import { getProjectStateInfo, truncateText } from "../../../../helpers";
import { InstagramIcon, LinkedInIcon } from "../../../../components/icons";
import { formatTimeOnly } from "./calendarHelpers";

interface EventChipProps {
  project: PreviewProjectDataProps;
  onClick: () => void;
  maxTitleLength?: number;
}

export const EventChip: React.FC<EventChipProps> = ({
  project,
  onClick,
  maxTitleLength = 16,
}) => {
  const { className } = getProjectStateInfo(project);
  const time = formatTimeOnly(project.publishDate);

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${time ?? ""} ${project.title}`.trim()}
      className={`flex w-full items-center gap-1 truncate rounded-full border border-current/15 px-2 py-1.5 text-left font-['Hanken_Grotesk',system-ui,sans-serif] text-xs transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000] ${className}`}
    >
      {project.checkSocialNetworks?.instagram && (
        <InstagramIcon className="h-3 w-3 shrink-0" />
      )}
      {project.checkSocialNetworks?.linkedln && (
        <LinkedInIcon className="h-3 w-3 shrink-0" />
      )}
      {time && (
        <span className="shrink-0 font-['Geist_Mono',monospace] text-[10px] font-medium">
          {time}
        </span>
      )}
      <span className="truncate">
        {truncateText(project.title, maxTitleLength)}
      </span>
    </button>
  );
};
