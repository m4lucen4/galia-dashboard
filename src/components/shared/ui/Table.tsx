import { Table as TanStackTable, flexRender } from "@tanstack/react-table";
import { Pagination } from "./Pagination";

type TableProps<TData> = {
  table: TanStackTable<TData>;
  variant?: "default" | "dashboard";
  isLoading?: boolean;
  emptyMessage?: string;
  LoadingComponent?: React.ComponentType<{ fullPage?: boolean }>;
  getRowClassName?: (row: TData) => string;
};

export const Table = <TData,>({
  table,
  variant = "default",
  isLoading = false,
  emptyMessage = "No data available",
  LoadingComponent,
  getRowClassName,
}: TableProps<TData>) => {
  if (isLoading && LoadingComponent) {
    return <LoadingComponent fullPage />;
  }

  const dashboard = variant === "dashboard";
  const rows = table.getRowModel().rows;

  if (!rows.length) {
    return <div className={dashboard ? "rounded-[28px] border border-[#010000]/20 bg-[#F4F7F3] px-6 py-12 text-center text-[#010000]/65" : "text-center py-8 text-gray-500"}>{emptyMessage}</div>;
  }

  return (
    <div className={dashboard ? "min-w-0 overflow-hidden rounded-[28px] border border-[#010000]/20 bg-[#F4F7F3]" : "bg-white my-6 overflow-hidden"}>
      <div className="overflow-x-auto">
        <table className={dashboard ? "min-w-full divide-y divide-[#010000]/15" : "min-w-full divide-y divide-gray-200"}>
          <thead className={dashboard ? "bg-[#8C8ABC]" : "bg-gray-50"}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={dashboard ? "px-6 py-5 text-left text-sm font-medium text-[#010000] cursor-pointer" : "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer bg-gray-100"}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
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
          <tbody className={dashboard ? "divide-y divide-[#010000]/10" : "bg-white divide-y divide-gray-200"}>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={getRowClassName?.(row.original) ?? (dashboard ? "hover:bg-[#FBEA71]/25" : "")}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={dashboard ? "px-6 py-5 text-sm whitespace-nowrap" : "px-6 py-4 whitespace-nowrap"}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination table={table} variant={variant} />
    </div>
  );
};
