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
import { ProjectDataProps } from "../../../../types";
import { LoadingSpinner } from "../../../../components/shared/ui/LoadingSpinner";
import { useAppDispatch } from "../../../../redux/hooks";
import { Button } from "../../../../components/shared/ui/Button";
import { Badge } from "../../../../components/shared/ui/Badge";
import { fetchProjectById } from "../../../../redux/actions/ProjectActions";
import { useTranslation } from "react-i18next";
import { Pagination } from "../../../../components/shared/ui/Pagination";
import {
  RecoverIcon,
  LaunchIcon,
  DeleteIcon,
  PencilIcon,
  AssignedTo,
} from "../../../../components/icons";

type ProjectsTableProps = {
  projects: ProjectDataProps[];
  isLoading: boolean;
  currentUserId: string;
  onEditProject: () => void;
  onLaunchProject: (projectId: string) => void;
  onRecoveryProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onAssignProject: (projectId: string) => void;
};

export const ProjectsTable = ({
  projects,
  isLoading,
  currentUserId,
  onEditProject,
  onLaunchProject,
  onRecoveryProject,
  onDeleteProject,
  onAssignProject,
}: ProjectsTableProps) => {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const dispatch = useAppDispatch();

  const handleEditClick = (project: ProjectDataProps) => {
    dispatch(fetchProjectById(project.id));
    onEditProject();
  };

  const columnHelper = createColumnHelper<ProjectDataProps>();

  const columns = [
    columnHelper.accessor("id", {
      header: "ID",
      cell: (info) => `${info.getValue()}`,
      size: 50,
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
        const isProjectOwner = project.user === currentUserId;

        if (project.state !== "draft") {
          return (
            <div className="flex space-x-2">
              <Button
                icon={<RecoverIcon />}
                secondary
                onClick={() => onRecoveryProject(project.id)}
                tooltip={t("projects.recoveryProject")}
              />
              <Button
                icon={<PencilIcon />}
                secondary
                onClick={() => handleEditClick(project)}
                tooltip={t("projects.editProject")}
              />
              {isProjectOwner && (
                <Button
                  icon={<AssignedTo />}
                  secondary
                  onClick={() => onAssignProject(project.id)}
                  tooltip={t("projects.assignProject")}
                />
              )}
              <Button
                icon={<DeleteIcon />}
                secondary
                onClick={() => onDeleteProject(project.id)}
                tooltip={t("projects.deleteProject")}
              />
            </div>
          );
        }

        return (
          <div className="flex space-x-2">
            <Button
              icon={<LaunchIcon />}
              secondary
              onClick={() => onLaunchProject(project.id)}
              tooltip={t("projects.launchProject")}
            />
            <Button
              icon={<PencilIcon />}
              secondary
              onClick={() => handleEditClick(project)}
              tooltip={t("projects.editProject")}
            />
            {isProjectOwner && (
              <Button
                icon={<AssignedTo />}
                secondary
                onClick={() => onAssignProject(project.id)}
                tooltip={t("projects.assignProject")}
              />
            )}
            <Button
              icon={<DeleteIcon />}
              secondary
              onClick={() => onDeleteProject(project.id)}
              tooltip={t("projects.deleteProject")}
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
        pageSize: 5,
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
      <div className="overflow-x-auto">
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
