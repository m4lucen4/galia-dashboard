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
      className: "bg-gray-100 text-gray-800 hover:bg-gray-200",
    },
    {
      key: "preview",
      label: t("previewProjects.filters.preview", "Vista previa"),
      count: getProjectCount("preview"),
      className: "bg-slate-100 text-slate-800 hover:bg-slate-200",
    },
    {
      key: "scheduled",
      label: t("previewProjects.filters.scheduled", "Programados"),
      count: getProjectCount("scheduled"),
      className: "bg-blue-100 text-blue-800 hover:bg-blue-200",
    },
    {
      key: "published",
      label: t("previewProjects.filters.published", "Publicados"),
      count: getProjectCount("published"),
      className: "bg-green-100 text-green-800 hover:bg-green-200",
    },
  ];

  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => onFilterChange(filter.key)}
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
              transition-all duration-200 ease-in-out
              ${
                selectedFilter === filter.key
                  ? `${filter.className} ring-2 ring-offset-2 ${
                      filter.key === "all"
                        ? "ring-gray-300"
                        : filter.key === "preview"
                          ? "ring-slate-300"
                          : filter.key === "scheduled"
                            ? "ring-blue-300"
                            : "ring-green-300"
                    } shadow-sm`
                  : `${filter.className} opacity-70 hover:opacity-100`
              }
            `}
          >
            <span>{filter.label}</span>
            <span
              className={`
                inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full
                ${
                  selectedFilter === filter.key
                    ? "bg-white/80 text-gray-700"
                    : "bg-white/60 text-gray-600"
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
