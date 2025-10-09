import { useEffect, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  SortingState,
} from "@tanstack/react-table";
import { PromptsProps } from "../../../../types";
import { LoadingSpinner } from "../../../../components/shared/ui/LoadingSpinner";
import { useAppDispatch, useAppSelector } from "../../../../redux/hooks";
import { Button } from "../../../../components/shared/ui/Button";
import { useTranslation } from "react-i18next";
import { DeleteIcon, PencilIcon } from "../../../../components/icons";
import {
  fetchPrompts,
  deletePrompt,
  updatePrompt,
  addPrompt,
  fetchPromptsByUser,
} from "../../../../redux/actions/AdminActions";
import { Drawer } from "../../../../components/shared/ui/Drawer";
import { InputField } from "../../../../components/shared/ui/InputField";
import { RootState } from "../../../../redux/store";

interface FormData {
  title: string;
  description: string;
  user: string;
  isPrivate: boolean;
}

export const MyGptsTable = () => {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const dispatch = useAppDispatch();
  const {
    prompts,
    fetchPromptsRequest,
    addPromptRequest,
    updatePromptRequest,
  } = useAppSelector((state) => state.admin);

  const user = useAppSelector((state: RootState) => state.auth.user);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptsProps | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    user: "",
    isPrivate: false,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const isUserAdmin = user?.role === "admin";

      const promptData = {
        title: formData.title,
        description: formData.description,
        user: user?.uid || "",
        isPrivate: !isUserAdmin,
      };

      if (editingPrompt) {
        await dispatch(
          updatePrompt({
            id: editingPrompt.id,
            ...promptData,
          })
        ).unwrap();
      } else {
        await dispatch(addPrompt(promptData)).unwrap();
      }

      if (user?.role === "admin") {
        dispatch(fetchPrompts());
      } else if (user?.uid) {
        dispatch(
          fetchPromptsByUser({ userUid: user.uid, includePublic: false })
        );
      }

      setDrawerOpen(false);
      setEditingPrompt(null);
      setFormData({ title: "", description: "", user: "", isPrivate: false });
    } catch (error) {
      console.error("Error al guardar prompt:", error);
    }
  };

  const handleEditPrompt = (prompt: PromptsProps) => {
    setEditingPrompt(prompt);
    setFormData({
      title: prompt.title,
      description: prompt.description || "",
      user: prompt.user,
      isPrivate: prompt.isPrivate,
    });
    setDrawerOpen(true);
  };

  const handleDeletePrompt = async (prompt: PromptsProps) => {
    if (window.confirm(t("admin.confirmDeletePrompt"))) {
      try {
        await dispatch(deletePrompt(prompt.id)).unwrap();
        if (user?.role === "admin") {
          dispatch(fetchPrompts());
        } else if (user?.uid) {
          dispatch(
            fetchPromptsByUser({ userUid: user.uid, includePublic: false })
          );
        }
      } catch (error) {
        console.error("Error al eliminar prompt:", error);
      }
    }
  };

  const handleAddNew = () => {
    setEditingPrompt(null);
    setFormData({
      title: "",
      description: "",
      user: user?.uid || "",
      isPrivate: user?.role !== "admin",
    });
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setEditingPrompt(null);
    setFormData({ title: "", description: "", user: "", isPrivate: false });
  };

  const columnHelper = createColumnHelper<PromptsProps>();

  const columns = [
    columnHelper.accessor("id", {
      header: "ID",
      cell: (info) => `${info.getValue()}`,
      size: 50,
    }),
    columnHelper.accessor("title", {
      header: t("admin.promptTitle"),
      size: 400,
    }),
    columnHelper.display({
      id: "actions",
      header: t("admin.actions"),
      cell: (props) => {
        const prompt = props.row.original;
        return (
          <div className="flex space-x-2">
            <Button
              icon={<PencilIcon />}
              secondary
              onClick={() => handleEditPrompt(prompt)}
            />
            <Button
              icon={<DeleteIcon />}
              secondary
              onClick={() => handleDeletePrompt(prompt)}
            />
          </div>
        );
      },
    }),
  ];

  useEffect(() => {
    if (user?.role === "admin") {
      dispatch(fetchPrompts());
    } else if (user?.uid) {
      dispatch(fetchPromptsByUser({ userUid: user.uid, includePublic: false }));
    }
  }, [dispatch, user?.role, user?.uid]);

  const table = useReactTable({
    data: prompts,
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

  if (fetchPromptsRequest.inProgress) {
    return <LoadingSpinner fullPage />;
  }

  return (
    <div className="bg-white my-6 overflow-hidden rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            {t("admin.prompts")}
          </h3>
          <Button title={t("admin.addPrompt")} onClick={handleAddNew} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <Drawer
          title={
            editingPrompt ? t("admin.editPrompt") : t("admin.createPrompt")
          }
          isOpen={drawerOpen}
          onClose={handleCloseDrawer}
        >
          <form onSubmit={handleSubmit}>
            <div className="col-span-2">
              <div className="mb-2">
                <InputField
                  id="title"
                  label={t("admin.promptTitle")}
                  type="text"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="mb-2">
                <InputField
                  id="description"
                  label={t("admin.promptDescription")}
                  type="textarea"
                  value={formData.description}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="mt-6">
              <Button
                fullWidth
                title={
                  editingPrompt
                    ? t("admin.editPrompt")
                    : t("admin.createPrompt")
                }
                disabled={
                  addPromptRequest.inProgress || updatePromptRequest.inProgress
                }
                type="submit"
              />
            </div>
          </form>
        </Drawer>

        {!prompts.length ? (
          <div className="text-center py-8 text-gray-500">
            {t("admin.noPrompts")}
          </div>
        ) : (
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
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
