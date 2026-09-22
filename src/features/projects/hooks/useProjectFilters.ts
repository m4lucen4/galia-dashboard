import { useMemo, useState } from "react";
import type { ProjectDataProps, UserDataProps } from "../../../types";

type UseProjectFiltersProps = {
  projects: ProjectDataProps[];
  users: UserDataProps[];
};

export const useProjectFilters = ({
  projects,
  users,
}: UseProjectFiltersProps) => {
  const [titleFilter, setTitleFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [filterChangeVersion, setFilterChangeVersion] = useState(0);

  const uniqueStates = useMemo(
    () =>
      Array.from(new Set(projects.map((project) => project.state))).filter(
        (state): state is string => Boolean(state),
      ),
    [projects],
  );

  const ownerOptions = useMemo(() => {
    const ownerIds = Array.from(new Set(projects.map((project) => project.user)));

    return ownerIds
      .map((ownerId) => {
        const projectOwner = projects.find(
          (project) => project.user === ownerId,
        )?.userData;
        const loadedOwner = users.find((loadedUser) => loadedUser.uid === ownerId);
        const owner = projectOwner ?? loadedOwner;
        const fullName = [owner?.first_name, owner?.last_name]
          .filter(Boolean)
          .join(" ");

        return {
          id: ownerId,
          label: fullName || owner?.email || ownerId,
        };
      })
      .sort((firstOwner, secondOwner) =>
        firstOwner.label.localeCompare(secondOwner.label),
      );
  }, [projects, users]);

  const filteredProjects = useMemo(
    () =>
      projects.filter((project) => {
        const matchesTitle = project.title
          .toLocaleLowerCase()
          .includes(titleFilter.toLocaleLowerCase());
        const matchesState = !stateFilter || project.state === stateFilter;
        const matchesOwner = !ownerFilter || project.user === ownerFilter;

        return matchesTitle && matchesState && matchesOwner;
      }),
    [ownerFilter, projects, stateFilter, titleFilter],
  );

  const markFilterChange = () => {
    setFilterChangeVersion((version) => version + 1);
  };

  const clearFilters = () => {
    setTitleFilter("");
    setStateFilter("");
    setOwnerFilter("");
    markFilterChange();
  };

  const handleTitleFilterChange = (value: string) => {
    setTitleFilter(value);
    markFilterChange();
  };

  const handleStateFilterChange = (value: string) => {
    setStateFilter(value);
    markFilterChange();
  };

  const handleOwnerFilterChange = (value: string) => {
    setOwnerFilter(value);
    markFilterChange();
  };

  return {
    titleFilter,
    stateFilter,
    ownerFilter,
    uniqueStates,
    ownerOptions,
    filteredProjects,
    filterChangeVersion,
    clearFilters,
    handleTitleFilterChange,
    handleStateFilterChange,
    handleOwnerFilterChange,
  };
};
