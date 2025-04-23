import { useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
} from "@tanstack/react-table";
import { UserDataProps } from "../../types";
import { LoadingSpinner } from "../shared/ui/LoadingSpinner";
import { useAppDispatch } from "../../redux/hooks";
import { fetchUserByUid } from "../../redux/actions/UserActions";
import { Button } from "../shared/ui/Button";

type UsersTableProps = {
  users: UserDataProps[];
  isLoading: boolean;
  onEditUser: () => void;
};

export const UsersTable = ({
  users,
  isLoading,
  onEditUser,
}: UsersTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const dispatch = useAppDispatch();

  const handleEditClick = (user: UserDataProps) => {
    dispatch(fetchUserByUid(user.uid));
    onEditUser();
  };

  const columnHelper = createColumnHelper<UserDataProps>();

  const columns = [
    columnHelper.accessor("first_name", {
      header: "First Name",
      cell: (info) => `${info.getValue()} ${info.row.original.last_name}`,
    }),
    columnHelper.accessor("email", {
      header: "Email",
    }),
    columnHelper.accessor("company", {
      header: "Company",
      cell: (info) => info.getValue() || "-",
    }),
    columnHelper.accessor("role", {
      header: "Role",
      cell: (info) =>
        info.getValue() === "admin" ? "Administrador" : "Usuario",
    }),
    columnHelper.accessor("active", {
      header: "State",
      cell: (info) => (
        <span
          className={`px-2 py-1 text-xs font-semibold rounded-full ${
            info.getValue()
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {info.getValue() ? "Active" : "Inactive"}
        </span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (props) => (
        <div className="flex space-x-2">
          <Button
            title="Edit"
            onClick={() => handleEditClick(props.row.original)}
          />
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data: users,
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

  if (!users.length) {
    return (
      <div className="text-center py-8 text-gray-500">No registered users</div>
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
