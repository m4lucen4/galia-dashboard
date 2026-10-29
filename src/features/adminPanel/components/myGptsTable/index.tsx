import { useEffect, useRef, useState } from "react";
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
import { PillButton } from "@/components/shared/ui/PillButton";
import { EllipsisVerticalIcon, PlusIcon } from "@heroicons/react/24/outline";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useTranslation } from "react-i18next";
import {
  fetchPrompts,
  deletePrompt,
  updatePrompt,
  addPrompt,
  fetchPromptsByUser,
} from "../../../../redux/actions/AdminActions";
import { Drawer } from "../../../../components/shared/ui/Drawer";
import { Alert } from "@/components/shared/ui/Alert";
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
    deletePromptRequest,
  } = useAppSelector((state) => state.admin);

  const user = useAppSelector((state: RootState) => state.auth.user);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pendingDeletePrompt, setPendingDeletePrompt] = useState<PromptsProps | null>(null);
  const deleteConfirmationConsumed = useRef(true);
  const [editingPrompt, setEditingPrompt] = useState<PromptsProps | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    user: "",
    isPrivate: false,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { id, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [id]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const promptData = {
        title: formData.title,
        description: formData.description,
        user: user?.uid || "",
        isPrivate: formData.isPrivate,
      };

      if (editingPrompt) {
        await dispatch(
          updatePrompt({
            id: editingPrompt.id,
            ...promptData,
          }),
        ).unwrap();
      } else {
        await dispatch(addPrompt(promptData)).unwrap();
      }

      if (user?.role === "admin") {
        dispatch(fetchPrompts());
      } else if (user?.uid) {
        dispatch(
          fetchPromptsByUser({ userUid: user.uid, includePublic: false }),
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

  const handleDeletePrompt = (prompt: PromptsProps) => {
    if (deletePromptRequest.inProgress) return;
    deleteConfirmationConsumed.current = false;
    setPendingDeletePrompt(prompt);
  };

  const handleCancelDelete = () => {
    deleteConfirmationConsumed.current = true;
    setPendingDeletePrompt(null);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeletePrompt || deleteConfirmationConsumed.current || deletePromptRequest.inProgress) return;
    deleteConfirmationConsumed.current = true;

    try {
      await dispatch(deletePrompt(pendingDeletePrompt.id)).unwrap();
      if (user?.role === "admin") {
        dispatch(fetchPrompts());
      } else if (user?.uid) {
        dispatch(
          fetchPromptsByUser({ userUid: user.uid, includePublic: false }),
        );
      }
    } catch (error) {
      console.error("Error al eliminar prompt:", error);
    } finally {
      setPendingDeletePrompt(null);
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
    columnHelper.accessor("isPrivate", {
      header: t("admin.visibility"),
      cell: (info) => {
        const isPrivate = info.getValue();
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isPrivate
                ? "border border-[#010000]/25 text-[#010000]/65"
                : "bg-[#010000]/10 text-[#010000]"
            }`}
          >
            {isPrivate ? t("admin.private") : t("admin.public")}
          </span>
        );
      },
      size: 100,
    }),
    columnHelper.display({
      id: "actions",
      header: t("admin.actions"),
      cell: (props) => {
        const prompt = props.row.original;
        return (
          <Menu>
            <MenuButton
              type="button"
              aria-label={t("admin.actions")}
              className="inline-flex size-11 items-center justify-center rounded-full border border-[#010000]/25 text-[#010000] hover:bg-[#FBEA71] data-open:bg-[#FBEA71] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000]"
            >
              <EllipsisVerticalIcon className="size-5" aria-hidden="true" />
            </MenuButton>
            <MenuItems
              anchor="bottom end"
              portal
              className="z-50 w-48 rounded-2xl border border-[#010000]/15 bg-[#F4F7F3] p-1.5 font-['Hanken_Grotesk',system-ui,sans-serif] text-sm text-[#010000] shadow-lg [--anchor-gap:8px] focus:outline-none"
            >
              <MenuItem>
                <button
                  type="button"
                  className="block w-full rounded-xl px-4 py-2 text-left data-focus:bg-[#FBEA71]"
                  onClick={() => handleEditPrompt(prompt)}
                >
                  {t("admin.editPrompt")}
                </button>
              </MenuItem>
              <MenuItem>
                <button
                  type="button"
                  className="block w-full rounded-xl px-4 py-2 text-left text-red-600 data-focus:bg-[#FBEA71]"
                  onClick={() => handleDeletePrompt(prompt)}
                >
                  {t("admin.deletePrompt")}
                </button>
              </MenuItem>
            </MenuItems>
          </Menu>
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
    <div className="min-w-0 space-y-10">
      {pendingDeletePrompt && (
        <Alert
          title={t("admin.deletePrompt")}
          description={t("admin.confirmDeletePrompt")}
          onAccept={handleConfirmDelete}
          onCancel={handleCancelDelete}
          disabledConfirmButton={deletePromptRequest.inProgress}
        >
          <p className="wrap-break-word text-sm font-medium">{pendingDeletePrompt.title}</p>
        </Alert>
      )}
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-[#010000]/15 pb-8">
        <div className="min-w-0 space-y-3">
          <h1 className="text-4xl leading-[1.05] font-medium tracking-[-0.04em] sm:text-5xl">
            {t("admin.title")}
          </h1>
          <p className="text-base leading-relaxed text-[#010000]/65">
            {t("admin.description")}
          </p>
        </div>
        <PillButton onClick={handleAddNew} className="shrink-0">
          <PlusIcon className="size-4 shrink-0" aria-hidden="true" />
          {t("admin.addPrompt")}
        </PillButton>
      </header>

      <div className="min-w-0 overflow-x-auto rounded-[28px] border border-[#010000]/20 bg-[#F4F7F3]">
        <Drawer
          variant="dashboard"
          closeLabel={t("admin.closeForm")}
          title={
            editingPrompt ? t("admin.editPrompt") : t("admin.createPrompt")
          }
          isOpen={drawerOpen}
          onClose={handleCloseDrawer}
        >
          <form onSubmit={handleSubmit} className="min-w-0 space-y-6 [&_label]:font-medium [&_label]:text-[#010000] [&_label_span]:text-[#010000]">
            <div className="col-span-2">
              <div className="mb-2">
                <InputField
                  id="title"
                  className="min-h-12 w-full rounded-full border-[1.5px] border-[#010000]/40 bg-transparent px-4 py-3 text-base focus-visible:outline-2 focus-visible:outline-[#010000] focus-visible:outline-offset-2"
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
                  className="w-full rounded-3xl border-[1.5px] border-[#010000]/40 bg-transparent px-4 py-3 text-base focus-visible:outline-2 focus-visible:outline-[#010000] focus-visible:outline-offset-2"
                  label={t("admin.promptDescription")}
                  type="textarea"
                  value={formData.description}
                  onChange={handleChange}
                  required
                />
              </div>
              {user?.role === "admin" && (
                <div className="mb-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      id="isPrivate"
                      type="checkbox"
                      checked={formData.isPrivate}
                      onChange={handleChange}
                      className="size-4 rounded border-[#010000]/40 accent-[#010000] focus-visible:outline-2 focus-visible:outline-[#010000] focus-visible:outline-offset-2"
                    />
                    <span className="text-sm font-medium">
                      {t("admin.isPrivate")}
                    </span>
                  </label>
                </div>
              )}
            </div>

            <div className="mt-6">
              <PillButton
                className="w-full"
                disabled={
                  addPromptRequest.inProgress || updatePromptRequest.inProgress
                }
                type="submit"
              >
                {editingPrompt ? t("admin.editPrompt") : t("admin.createPrompt")}
              </PillButton>
            </div>
          </form>
        </Drawer>

        {!prompts.length ? (
          <div className="px-6 py-12 text-center text-[#010000]/65">
            {t("admin.noPrompts")}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-[#010000]/15 table-fixed">
            <thead className="bg-[#8C8ABC]">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-6 py-5 text-left text-sm font-medium text-[#010000] cursor-pointer"
                      onClick={header.column.getToggleSortingHandler()}
                      style={{ width: `${header.column.getSize()}px` }}
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
            <tbody className="divide-y divide-[#010000]/10">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-[#FBEA71]/25">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-6 py-5 text-sm"
                      style={{ width: `${cell.column.getSize()}px` }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
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
