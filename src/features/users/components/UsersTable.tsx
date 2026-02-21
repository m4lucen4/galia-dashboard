import { useState } from "react";
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
import { Button } from "../../../components/shared/ui/Button";
import { useTranslation } from "react-i18next";
import { Table } from "../../../components/shared/ui/Table";

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
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const dispatch = useAppDispatch();

  const handleEditClick = async (user: UserDataProps) => {
    await dispatch(fetchUserByUid(user.uid)).unwrap();
    onEditUser();
  };

  const columnHelper = createColumnHelper<UserDataProps>();

  const columns = [
    columnHelper.accessor("first_name", {
      header: t("users.firstName"),
      cell: (info) => `${info.getValue()} ${info.row.original.last_name}`,
    }),
    columnHelper.accessor("email", {
      header: t("users.email"),
    }),
    columnHelper.accessor("company", {
      header: t("users.company"),
      cell: (info) => {
        const company = info.getValue();
        if (!company) return "-";
        return company.length > 15 ? `${company.substring(0, 15)}...` : company;
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
          <Button
            title={t("users.edit")}
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
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: "onChange",
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <Table
      table={table}
      isLoading={isLoading}
      emptyMessage="No registered users"
      LoadingComponent={LoadingSpinner}
      getRowClassName={(user) => (user.active ? "" : "bg-red-100")}
    />
  );
};
