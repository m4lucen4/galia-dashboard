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
import { ProjectDataProps } from "../../types";
import { LoadingSpinner } from "../shared/ui/LoadingSpinner";
import { useAppDispatch } from "../../redux/hooks";
import { Button } from "../shared/ui/Button";
import { fetchProjectById } from "../../redux/actions/ProjectActions";
import { useTranslation } from "react-i18next";

type ProjectsTableProps = {
  projects: ProjectDataProps[];
  isLoading: boolean;
  onEditProject: () => void;
  onLaunchProject: (projectId: string) => void;
  onRecoveryProject: (projectId: string) => void;
};

export const ProjectsTable = ({
  projects,
  isLoading,
  onEditProject,
  onLaunchProject,
  onRecoveryProject,
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
                title={t("projects.recovery")}
                onClick={() => onRecoveryProject(props.row.original.id)}
              />
            </div>
          );
        }

        return (
          <div className="flex space-x-2">
            <Button
              title={t("projects.launch")}
              onClick={() => onLaunchProject(props.row.original.id)}
            />
            <Button
              title={t("projects.edit")}
              secondary
              onClick={() => handleEditClick(props.row.original)}
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
      {/* Controles de paginación */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("shared.previous")}
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("shared.next")}
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              {t("shared.showing")}{" "}
              <span className="font-medium">
                {table.getState().pagination.pageIndex *
                  table.getState().pagination.pageSize +
                  1}
              </span>{" "}
              {t("shared.to")}{" "}
              <span className="font-medium">
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) *
                    table.getState().pagination.pageSize,
                  table.getFilteredRowModel().rows.length
                )}
              </span>
              {" - "}
              <span className="font-medium">
                {table.getFilteredRowModel().rows.length}
              </span>{" "}
              {t("shared.results")}
            </p>
          </div>
          <div>
            <nav
              className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
              aria-label="Pagination"
            >
              <button
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {"<<"}
              </button>
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {"<"}
              </button>
              <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                {t("shared.page")} {table.getState().pagination.pageIndex + 1}{" "}
                {t("shared.of")} {table.getPageCount()}
              </span>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {">"}
              </button>
              <button
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {">>"}
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};
