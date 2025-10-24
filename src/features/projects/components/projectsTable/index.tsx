import { useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
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
}: ProjectsTableProps) => {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  console.log("Current User in ProjectsTable:", projects);

  const handleToggleMenu = (projectId: string) => {
    if (openMenuId === projectId) {
      setOpenMenuId(null);
    } else {
      setOpenMenuId(projectId);
    }
  };

  // Wrapper functions para que coincidan los tipos
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

  const columns = [
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

        if (!userData || !userData.first_name || !userData.last_name) {
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
            <span>{info.getValue()}</span>
            {hasGoogleMaps && (
              <Badge
                title={
                  project.showMap
                    ? t("projects.extraInfoPublished")
                    : t("projects.extraInfoPending")
                }
                primaryColor={project.showMap ? "green" : "yellow"}
                url={
                  project.showMap
                    ? `https://guiadearquitectura.com/project/${project.id}`
                    : undefined
                }
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

        return stateFormatMap[state] || state;
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

  const table = useReactTable({
    data: projects,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: "onChange",
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  if (isLoading) {
    return <LoadingSpinner fullPage />;
  }

  if (!projects.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        {t("projects.noProjects")}
      </div>
    );
  }

  return (
    <div className="bg-white my-6 overflow-hidden rounded-lg shadow">
      <div className="overflow-x-auto pb-28">
        <table className="min-w-full divide-y divide-gray-200 table-fixed">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer bg-gray-100"
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ width: `${header.column.getSize()}px` }}
                  >
                    <div className="flex items-center">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {{
                        asc: " 🔼",
                        desc: " 🔽",
                      }[header.column.getIsSorted() as string] || null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-6 py-4"
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
      <Pagination table={table} />
    </div>
  );
};
