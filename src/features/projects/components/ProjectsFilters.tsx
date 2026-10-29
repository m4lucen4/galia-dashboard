import { useTranslation } from "react-i18next";

type OwnerOption = {
  id: string;
  label: string;
};

type ProjectsFiltersProps = {
  isAdmin: boolean;
  titleFilter: string;
  stateFilter: string;
  ownerFilter: string;
  uniqueStates: string[];
  ownerOptions: OwnerOption[];
  onTitleFilterChange: (value: string) => void;
  onStateFilterChange: (value: string) => void;
  onOwnerFilterChange: (value: string) => void;
  onClearFilters: () => void;
};

const getStateLabel = (state: string): string => {
  const stateLabels: Record<string, string> = {
    draft: "Draft",
    preview: "Preview",
    inProgress: "In progress",
    launched: "Launched",
  };

  return stateLabels[state] ?? state;
};

export const ProjectsFilters = ({
  isAdmin,
  titleFilter,
  stateFilter,
  ownerFilter,
  uniqueStates,
  ownerOptions,
  onTitleFilterChange,
  onStateFilterChange,
  onOwnerFilterChange,
  onClearFilters,
}: ProjectsFiltersProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3 rounded-[28px] border border-[#010000]/20 p-5 sm:p-6 md:flex-row md:flex-wrap md:items-center">
      {isAdmin && (
        <select
          value={ownerFilter}
          onChange={(event) => onOwnerFilterChange(event.target.value)}
          aria-label={t("projects.allOwners")}
          className="min-h-11 w-full shrink-0 rounded-full border border-[#010000]/30 bg-transparent px-4 py-2.5 text-sm text-[#010000] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000] md:w-56"
        >
          <option value="">{t("projects.allOwners")}</option>
          {ownerOptions.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.label}
            </option>
          ))}
        </select>
      )}
      <select
        value={stateFilter}
        onChange={(event) => onStateFilterChange(event.target.value)}
        aria-label={t("projects.allStates")}
        className="min-h-11 w-full shrink-0 rounded-full border border-[#010000]/30 bg-transparent px-4 py-2.5 text-sm text-[#010000] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000] md:w-44"
      >
        <option value="">{t("projects.allStates")}</option>
        {uniqueStates.map((state) => (
          <option key={state} value={state}>
            {getStateLabel(state)}
          </option>
        ))}
      </select>
      <input
        type="search"
        value={titleFilter}
        onChange={(event) => onTitleFilterChange(event.target.value)}
        placeholder={t("projects.searchByTitle")}
        aria-label={t("projects.searchByTitle")}
        className="min-h-11 w-full min-w-0 rounded-full border border-[#010000]/30 bg-transparent px-5 py-2.5 text-sm text-[#010000] placeholder:text-[#010000]/55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000] md:min-w-64 md:flex-1"
      />
      <div className="shrink-0 self-end md:ml-auto">
        <button
          type="button"
          onClick={onClearFilters}
          className="min-h-11 rounded-full px-3 py-2 text-sm text-[#010000]/65 underline decoration-[#010000]/30 underline-offset-4 hover:text-[#010000] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000]"
        >
          {t("projects.cleanFilters")}
        </button>
      </div>
    </div>
  );
};
