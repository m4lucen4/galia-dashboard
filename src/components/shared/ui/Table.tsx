import { Table as TanStackTable, flexRender } from "@tanstack/react-table";
import { Pagination } from "./Pagination";

type TableProps<TData> = {
  table: TanStackTable<TData>;
  isLoading?: boolean;
  emptyMessage?: string;
  LoadingComponent?: React.ComponentType<{ fullPage?: boolean }>;
};

export const Table = <TData,>({
  table,
  isLoading = false,
  emptyMessage = "No data available",
  LoadingComponent,
}: TableProps<TData>) => {
  if (isLoading && LoadingComponent) {
    return <LoadingComponent fullPage />;
  }

  const rows = table.getRowModel().rows;

  if (!rows.length) {
    return <div className="text-center py-8 text-gray-500">{emptyMessage}</div>;
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
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((row) => (
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
      <Pagination table={table} />
    </div>
  );
};
