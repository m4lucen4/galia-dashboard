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
import { fetchProjectById } from "../../../../redux/actions/ProjectActions";
import { useTranslation } from "react-i18next";
import { Pagination } from "./Pagination";
import {
  RecoverIcon,
  LaunchIcon,
  DeleteIcon,
} from "../../../../components/icons";

type ProjectsTableProps = {
  projects: ProjectDataProps[];
  isLoading: boolean;
  onEditProject: () => void;
  onLaunchProject: (projectId: string) => void;
  onRecoveryProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
};

export const ProjectsTable = ({
  projects,
  isLoading,
  onEditProject,
  onLaunchProject,
  onRecoveryProject,
  onDeleteProject,
}: ProjectsTableProps) => {
  const EditIconInline = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
  );

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
    }),
    columnHelper.accessor("title", {
      header: t("projects.projectTitle"),
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
    }),
    columnHelper.accessor("keywords", {
      header: t("projects.keywords"),
      cell: (info) => info.getValue() || "-",
    }),
    columnHelper.display({
      id: "actions",
      header: t("projects.actions"),
      cell: (props) => {
        if (props.row.original.state !== "draft") {
          return (
            <div className="flex space-x-2">
              <Button
                icon={<RecoverIcon />}
                secondary
                onClick={() => onRecoveryProject(props.row.original.id)}
              />
              <Button
                icon={<DeleteIcon />}
                secondary
                onClick={() => onDeleteProject(props.row.original.id)}
              />
            </div>
          );
        }

        return (
          <div className="flex space-x-2">
            <Button
              icon={<LaunchIcon />}
              secondary
              onClick={() => onLaunchProject(props.row.original.id)}
            />
            <Button
              icon={<EditIconInline />}
              secondary
              onClick={() => handleEditClick(props.row.original)}
            />
            <Button
              icon={<DeleteIcon />}
              secondary
              onClick={() => onDeleteProject(props.row.original.id)}
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
