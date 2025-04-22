import { useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
} from "@tanstack/react-table";
import { ProjectDataProps } from "../../types";
import { LoadingSpinner } from "../shared/ui/LoadingSpinner";
import { useAppDispatch } from "../../redux/hooks";
import { Button } from "../shared/ui/Button";
import { fetchProjectById } from "../../redux/actions/ProjectActions";

type ProjectsTableProps = {
  projects: ProjectDataProps[];
  isLoading: boolean;
  onEditProject: () => void;
  onLaunchProject: (projectId: string) => void;
};

export const ProjectsTable = ({
  projects,
  isLoading,
  onEditProject,
  onLaunchProject,
}: ProjectsTableProps) => {
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
      header: "Title",
    }),
    columnHelper.accessor("state", {
      header: "State",
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
      header: "Keywords",
      cell: (info) => info.getValue() || "-",
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (props) => {
        if (props.row.original.state !== "draft") {
          return (
            <span className="text-gray-400 italic text-sm">
              No actions available
            </span>
          );
        }

        return (
          <div className="flex space-x-2">
            <Button
              title="Edit"
              secondary
              onClick={() => handleEditClick(props.row.original)}
            />
            <Button
              title="Launch"
              onClick={() => onLaunchProject(props.row.original.id)}
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
  });

  if (isLoading) {
    return <LoadingSpinner fullPage />;
  }

  if (!projects.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        No registered projects
      </div>
    );
  }

  return (
    <div className="bg-white my-6 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer bg-gray-100"
                    onClick={header.column.getToggleSortingHandler()}
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
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
