import { useTranslation } from "react-i18next";
import { PreviewProjectDataProps, PublicationTarget } from "../../../../types";
import { getProjectStateInfo, truncateText } from "../../../../helpers";
import { SOCIAL_PUBLISHING_EDGE_ENABLED } from "../../../../helpers/publishDate";
import { FacebookIcon, InstagramIcon, LinkedInIcon } from "../../../../components/icons";
import { NETWORK_ICONS } from "../networkIcons";
import { formatTimeOnly } from "./calendarHelpers";
import { targetPhase, visibleTargets } from "../../helpers/publicationTargets";
import { PHASE_STYLES } from "../../helpers/targetPhaseStyles";

interface EventChipProps {
  project: PreviewProjectDataProps;
  onClick: () => void;
  maxTitleLength?: number;
  /** Edge pipeline only: current targets of this publication. */
  targets?: PublicationTarget[];
}

export const EventChip: React.FC<EventChipProps> = ({
  project,
  onClick,
  maxTitleLength = 16,
  targets,
}) => {
  const { t } = useTranslation();
  const { className } = getProjectStateInfo(project, targets);
  const time = formatTimeOnly(project.publishDate);
  const shown = SOCIAL_PUBLISHING_EDGE_ENABLED ? visibleTargets(targets) : [];
  // One entry per network with its phase, e.g. "Instagram: Publicado".
  const statuses = shown.map((target) => {
    const phase = targetPhase(target)!;
    return {
      target,
      phase,
      text: `${t(`previewProjects.publication.networks.${target.network}`)}: ${t(
        `previewProjects.publication.status.${phase}Short`,
      )}`,
    };
  });
  const title = [`${time ?? ""} ${project.title}`.trim(), ...statuses.map((s) => s.text)].join(
    " · ",
  );

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex w-full items-center gap-1 truncate rounded-full border border-current/15 px-2 py-1.5 text-left font-['Hanken_Grotesk',system-ui,sans-serif] text-xs transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000] ${className}`}
    >
      {statuses.length > 0
        ? statuses.map(({ target, phase, text }) => {
            const NetworkIcon = NETWORK_ICONS[target.network];
            return (
              <span key={target.id} className="relative shrink-0" role="img" aria-label={text}>
                <NetworkIcon className="h-3 w-3" />
                <span
                  aria-hidden="true"
                  className={`absolute -right-0.5 -bottom-0.5 h-1.5 w-1.5 rounded-full ring-1 ring-white ${PHASE_STYLES[phase].dot}`}
                />
              </span>
            );
          })
        : (
          <>
            {project.checkSocialNetworks?.instagram && (
              <InstagramIcon className="h-3 w-3 shrink-0" />
            )}
            {project.checkSocialNetworks?.linkedln && (
              <LinkedInIcon className="h-3 w-3 shrink-0" />
            )}
            {project.checkSocialNetworks?.facebook && (
              <FacebookIcon className="h-3 w-3 shrink-0" />
            )}
          </>
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
