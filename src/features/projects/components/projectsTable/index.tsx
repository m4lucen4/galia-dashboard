import { useEffect, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  PaginationState,
  useReactTable,
  SortingState,
} from "@tanstack/react-table";
import { ProjectDataProps, UserDataProps } from "../../../../types";
import { LoadingSpinner } from "../../../../components/shared/ui/LoadingSpinner";
import { useAppDispatch } from "../../../../redux/hooks";
import { Badge } from "../../../../components/shared/ui/Badge";
import { fetchProjectById } from "../../../../redux/actions/ProjectActions";
import { useTranslation } from "react-i18next";
import { Pagination } from "../../../../components/shared/ui/Pagination";
import { ActionButtons } from "./ActionButtons";

type ProjectsTableProps = {
  projects: ProjectDataProps[];
  isLoading: boolean;
  currentUser: UserDataProps;
  onEditProject: () => void;
  onLaunchProject: (projectId: string) => void;
  onRecoveryProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onAssignProject: (projectId: string) => void;
  filterChangeVersion: number;
};

export const ProjectsTable = ({
  projects,
  isLoading,
  currentUser,
  onEditProject,
  onLaunchProject,
  onRecoveryProject,
  onDeleteProject,
  onAssignProject,
  filterChangeVersion,
}: ProjectsTableProps) => {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const dispatch = useAppDispatch();

  useEffect(() => {
    setPagination((currentPagination) =>
      currentPagination.pageIndex === 0
        ? currentPagination
        : { ...currentPagination, pageIndex: 0 },
    );
  }, [filterChangeVersion]);

  useEffect(() => {
    if (isLoading) return;

    const lastPageIndex = Math.max(
      0,
      Math.ceil(projects.length / pagination.pageSize) - 1,
    );

    setPagination((currentPagination) => {
      const pageIndex = Math.min(currentPagination.pageIndex, lastPageIndex);

      return pageIndex === currentPagination.pageIndex
        ? currentPagination
        : { ...currentPagination, pageIndex };
    });
  }, [isLoading, pagination.pageSize, projects.length]);

  const handleToggleMenu = (projectId: string) => {
    if (openMenuId === projectId) {
      setOpenMenuId(null);
    } else {
      setOpenMenuId(projectId);
    }
  };

  // Adapt row actions to project identifiers.
  const handleRecoveryProject = (project: ProjectDataProps) => {
    onRecoveryProject(project.id);
    setOpenMenuId(null);
  };

  const handleLaunchProject = (project: ProjectDataProps) => {
    onLaunchProject(project.id);
    setOpenMenuId(null);
  };

  const handleDeleteProject = (project: ProjectDataProps) => {
    onDeleteProject(project.id);
    setOpenMenuId(null);
  };

  const handleAssignProject = (project: ProjectDataProps) => {
    onAssignProject(project.id);
    setOpenMenuId(null);
  };

  const handleEditProject = (project: ProjectDataProps) => {
    dispatch(fetchProjectById(project.id));
    onEditProject();
    setOpenMenuId(null);
  };

  const columnHelper = createColumnHelper<ProjectDataProps>();

  const allColumns = [
    columnHelper.accessor("id", {
      header: "ID",
      cell: (info) => `${info.getValue()}`,
      size: 50,
    }),
    columnHelper.display({
      id: "userName",
      header: t("projects.createdBy"),
      cell: (props) => {
        const project = props.row.original;
        const userData = project.userData;

        if (!userData?.first_name || !userData?.last_name) {
          return "-";
        }

        return `${userData.last_name}, ${userData.first_name}`;
      },
      size: 150,
    }),
    columnHelper.accessor("title", {
      header: t("projects.projectTitle"),
      cell: (info) => {
        const project = info.row.original;
        const hasGoogleMaps =
          project.googleMaps && project.googleMaps.trim() !== "";

        return (
          <div className="flex flex-col gap-2">
            <span className="font-medium">{info.getValue()}</span>
            {hasGoogleMaps && project.showMap && (
              <Badge
                title={t("projects.extraInfoPublished")}
                primaryColor="green"
                url={`https://guiadearquitectura.com/project/${project.id}`}
              />
            )}
          </div>
        );
      },
      size: 500,
    }),
    columnHelper.accessor("state", {
      header: t("projects.state"),
      cell: (info) => {
        const state = info.getValue();
        if (!state) return "-";

        const stateFormatMap: Record<string, string> = {
          draft: "Draft",
          preview: "Preview",
          inProgress: "In progress",
          launched: "Launched",
        };

        return (
          <span className="inline-flex rounded-full border border-[#010000]/20 px-3 py-1 font-mono text-xs">
            {stateFormatMap[state] || state}
          </span>
        );
      },
      size: 100,
    }),
    columnHelper.display({
      id: "actions",
      header: t("projects.actions"),
      cell: (props) => {
        const project = props.row.original;

        return (
          <div className="flex space-x-2">
            <ActionButtons
              currentUser={currentUser}
              project={project}
              isOpen={openMenuId === project.id}
              onToggleMenu={handleToggleMenu}
              onRecoveryProject={handleRecoveryProject}
              onLaunchProject={handleLaunchProject}
              onEditProject={handleEditProject}
              onDeleteProject={handleDeleteProject}
              onAssignProject={handleAssignProject}
            />
          </div>
        );
      },
    }),
  ];

  // Filter columns based on user role - only show userName column for admin users
  const columns =
    currentUser.role === "admin"
      ? allColumns
      : allColumns.filter((col) => col.id !== "userName");

  const table = useReactTable({
    data: projects,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: "onChange",
    autoResetPageIndex: false,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-[28px] border border-[#010000]/20" role="status" aria-label={t("projects.title")}>
        <LoadingSpinner />
      </div>
    );
  }

  if (!projects.length) {
    return (
      <div className="rounded-[28px] border border-dashed border-[#010000]/30 px-6 py-16 text-center text-sm text-[#010000]/65">
        {t("projects.noProjects")}
      </div>
    );
  }

  return (
    <div className="min-w-0 rounded-[28px] border border-[#010000]/20">
      <div className="overflow-x-auto rounded-t-[28px]">
        <table className="min-w-full table-fixed divide-y divide-[#010000]/15 text-sm">
          <thead className="bg-[#010000]/[0.04]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-4 text-left font-mono text-[11px] font-normal uppercase tracking-wider text-[#010000]/60"
                    aria-sort={header.column.getCanSort() ? (header.column.getIsSorted() === "asc" ? "ascending" : header.column.getIsSorted() === "desc" ? "descending" : "none") : undefined}
                    style={{ width: `${header.column.getSize()}px` }}
                  >
                    {header.column.getCanSort() ? (
                      <button
                        type="button"
                        className="flex min-h-11 items-center gap-2 rounded-lg text-left uppercase tracking-wider hover:text-[#010000] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000]"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <span aria-hidden="true">
                          {{ asc: "↑", desc: "↓" }[header.column.getIsSorted() as string] || "↕"}
                        </span>
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-[#010000]/10">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-[#010000]/[0.03]">
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={`px-6 py-5 align-middle ${cell.column.id === "id" ? "font-mono text-xs text-[#010000]/55" : "text-[#010000]/80"}`}
                    style={{ width: `${cell.column.getSize()}px` }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination table={table} variant="dashboard" />
    </div>
  );
};
