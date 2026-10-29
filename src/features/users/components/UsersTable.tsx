import { useEffect, useRef, useState } from "react";
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { UserDataProps } from "../../../types";
import { LoadingSpinner } from "../../../components/shared/ui/LoadingSpinner";
import { useAppDispatch } from "../../../redux/hooks";
import { fetchUserByUid } from "../../../redux/actions/UserActions";
import { PillButton } from "@/components/shared/ui/PillButton";
import { useTranslation } from "react-i18next";
import { Table } from "../../../components/shared/ui/Table";
import { OdooIcon } from "../../../components/icons/OdooIcon";
import { WebIcon } from "../../../components/icons/WebIcon";

type UsersTableProps = {
  users: UserDataProps[];
  searchQuery?: string;
  pageResetKey?: number;
  emptyMessage?: string;
  isLoading: boolean;
  onEditUser: () => void;
};

export const UsersTable = ({
  users,
  searchQuery = "",
  pageResetKey = 0,
  emptyMessage,
  isLoading,
  onEditUser,
}: UsersTableProps) => {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const previousResetInputs = useRef({ searchQuery, sorting, pageResetKey });
  const dispatch = useAppDispatch();

  const handleEditClick = async (user: UserDataProps) => {
    await dispatch(fetchUserByUid(user.uid)).unwrap();
    onEditUser();
  };

  const columnHelper = createColumnHelper<UserDataProps>();

  const columns = [
    columnHelper.accessor("first_name", {
      header: t("users.firstName"),
      cell: (info) => (
        <div className="flex items-center gap-1.5">
          {info.row.original.odoo_id && <OdooIcon size={18} />}
          {info.row.original.has_web && <WebIcon size={18} />}
          <span>{`${info.getValue()} ${info.row.original.last_name}`}</span>
        </div>
      ),
    }),
    columnHelper.accessor("email", {
      header: t("users.email"),
    }),
    columnHelper.accessor("company", {
      header: t("users.company"),
      cell: (info) => {
        const company = info.getValue();
        if (!company) return "-";
        return company;
      },
    }),
    columnHelper.accessor("role", {
      header: t("users.role"),
      cell: (info) => {
        const role = info.getValue();
        switch (role) {
          case "admin":
            return t("users.admin");
          case "customer":
            return t("users.customer");
          case "publisher":
            return t("users.publisher");
          case "photographer":
            return t("users.photographer");
          default:
            return role;
        }
      },
    }),

    columnHelper.display({
      id: "actions",
      header: t("users.actions"),
      cell: (props) => (
        <div className="flex space-x-2">
          <PillButton variant="outline" onClick={() => handleEditClick(props.row.original)}>
            {t("users.edit")}
          </PillButton>
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
    autoResetPageIndex: false,
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

  useEffect(() => {
    const previous = previousResetInputs.current;
    previousResetInputs.current = { searchQuery, sorting, pageResetKey };

    if (
      previous.searchQuery !== searchQuery ||
      previous.sorting !== sorting ||
      previous.pageResetKey !== pageResetKey
    ) {
      table.resetPageIndex();
      return;
    }

    const lastPageIndex = Math.max(0, table.getPageCount() - 1);
    if (table.getState().pagination.pageIndex > lastPageIndex) {
      table.setPageIndex(lastPageIndex);
    }
  }, [searchQuery, sorting, pageResetKey, users, table]);

  return (
    <Table
      table={table}
      variant="dashboard"
      isLoading={isLoading}
      emptyMessage={emptyMessage ?? t("users.empty")}
      LoadingComponent={LoadingSpinner}
      getRowClassName={(user) => (user.active ? "" : "bg-[#ff522a]/10")}
    />
  );
};
