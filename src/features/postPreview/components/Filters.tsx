import { useTranslation } from "react-i18next";
import { PreviewProjectDataProps } from "../../../types";

interface FilterOption {
  key: string;
  label: string;
  count: number;
  className: string;
}

interface FiltersProps {
  projects: PreviewProjectDataProps[];
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
}

export const Filters: React.FC<FiltersProps> = ({
  projects,
  selectedFilter,
  onFilterChange,
}) => {
  const { t } = useTranslation();

  const getProjectCount = (state: string) => {
    if (state === "all") return projects.length;
    return projects.filter((project) => project.state === state).length;
  };

  const filters: FilterOption[] = [
    {
      key: "all",
      label: t("previewProjects.filters.all", "Todos"),
      count: getProjectCount("all"),
      className: "hover:bg-white/60",
    },
    {
      key: "preview",
      label: t("previewProjects.filters.preview", "Vista previa"),
      count: getProjectCount("preview"),
      className: "hover:bg-white/60",
    },
    {
      key: "scheduled",
      label: t("previewProjects.filters.scheduled", "Programados"),
      count: getProjectCount("scheduled"),
      className: "hover:bg-white/60",
    },
    {
      key: "published",
      label: t("previewProjects.filters.published", "Publicados"),
      count: getProjectCount("published"),
      className: "hover:bg-white/60",
    },
  ];

  return (
    <div className="min-w-0 font-['Hanken_Grotesk',system-ui,sans-serif] text-[#010000]">
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => onFilterChange(filter.key)}
            aria-pressed={selectedFilter === filter.key}
            className={`
              inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium
              transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000]
              ${
                selectedFilter === filter.key
                  ? "border-[#010000] bg-[#010000] text-[#d8e4d6]"
                  : `border-[#010000]/20 bg-transparent text-[#010000]/70 ${filter.className}`
              }
            `}
          >
            <span>{filter.label}</span>
            <span
              className={`
                inline-flex min-h-6 min-w-6 items-center justify-center rounded-full px-1 font-['Geist_Mono',monospace] text-[11px] tabular-nums
                ${
                  selectedFilter === filter.key
                    ? "bg-[#d8e4d6]/15 text-[#d8e4d6]"
                    : "bg-[#010000]/5 text-[#010000]/60"
                }
              `}
            >
              {filter.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
