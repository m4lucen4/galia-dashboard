import type { ReactNode } from "react";
import { Table } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";

type PaginationProps<TData> = {
  table: Table<TData>;
  variant?: "default" | "dashboard";
  summaryExtra?: ReactNode;
};

export const Pagination = <TData,>({ table, variant = "default", summaryExtra }: PaginationProps<TData>) => {
  const { t } = useTranslation();
  const dashboard = variant === "dashboard";
  const dashboardButton = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[#010000]/30 px-3 py-2 text-sm font-medium text-[#010000] hover:bg-[#010000] hover:text-[#d8e4d6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000] disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className={dashboard ? "flex items-center justify-between border-t border-[#010000]/15 px-5 py-5 sm:px-6" : "bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6"}>
      <div className="flex-1 flex justify-between sm:hidden">
        <button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className={dashboard ? dashboardButton : "relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"}
        >
          {t("shared.previous")}
        </button>
        <button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className={dashboard ? dashboardButton : "ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"}
        >
          {t("shared.next")}
        </button>
      </div>
      <div className={summaryExtra ? "hidden sm:flex-1 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-4" : "hidden sm:flex-1 sm:flex sm:items-center sm:justify-between"}>
        <div className={summaryExtra ? "flex flex-wrap items-center gap-x-5 gap-y-3" : undefined}>
          <p className={dashboard ? "text-sm text-[#010000]/70" : "text-sm text-gray-700"}>
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
          {summaryExtra}
        </div>
        <div>
          <nav
            className={dashboard ? "relative z-0 inline-flex flex-wrap items-center justify-end gap-2" : "relative z-0 inline-flex rounded-md shadow-sm -space-x-px"}
            aria-label="Pagination"
          >
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className={dashboard ? dashboardButton : "relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"}
            >
              {"<<"}
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className={dashboard ? dashboardButton : "relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"}
            >
              {"<"}
            </button>
            <span className={dashboard ? "inline-flex min-h-11 items-center px-2 py-2 text-sm text-[#010000]" : "relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"}>
              {t("shared.page")} {table.getState().pagination.pageIndex + 1}{" "}
              {t("shared.of")} {table.getPageCount()}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className={dashboard ? dashboardButton : "relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"}
            >
              {">"}
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className={dashboard ? dashboardButton : "relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"}
            >
              {">>"}
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};
