import { useTranslation } from "react-i18next";
import { Button } from "../../../components/shared/ui/Button";

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
    <div className="mb-4 flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
      {isAdmin && (
        <select
          value={ownerFilter}
          onChange={(event) => onOwnerFilterChange(event.target.value)}
          aria-label={t("projects.allOwners")}
          className="w-full shrink-0 rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 md:w-56"
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
        className="w-full shrink-0 rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 md:w-44"
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
        className="w-full min-w-0 rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 md:min-w-64 md:flex-1"
      />
      <div className="shrink-0 self-end md:ml-auto">
        <Button
          title={t("projects.cleanFilters")}
          onClick={onClearFilters}
          secondary
        />
      </div>
    </div>
  );
};
