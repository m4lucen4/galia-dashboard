import React, { useState } from "react";
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import {
  PlusIcon,
  EllipsisHorizontalIcon,
  PencilIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  EyeIcon,
  EyeSlashIcon,
  Bars3Icon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { SitePageDataProps } from "../../../types";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import {
  createSitePage,
  deleteSitePage,
  updateSitePage,
  reorderSitePages,
} from "../../../redux/actions/SitePageActions";
import { clearPageErrors } from "../../../redux/slices/SitePageSlice";
import { Alert } from "../../../components/shared/ui/Alert";
import { Button } from "../../../components/shared/ui/Button";

interface MyWebTabBarProps {
  pages: SitePageDataProps[];
  siteId: string;
  activeTabId: string;
  onTabChange: (id: string) => void;
  onPageCreated?: (pageId: string) => void;
}

const PROTECTED_SLUGS = ["home", "proyectos", "aviso-legal", "politica-cookies"];
const SLUG_REGEX = /^[a-z0-9-]+$/;

export const MyWebTabBar: React.FC<MyWebTabBarProps> = ({
  pages,
  siteId,
  activeTabId,
  onTabChange,
  onPageCreated,
}) => {
  const dispatch = useAppDispatch();
  const { createRequest, saveRequest } = useAppSelector((state) => state.sitePage);

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [slugError, setSlugError] = useState("");

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editSlugError, setEditSlugError] = useState("");

  const isCustom = (page: SitePageDataProps) => !PROTECTED_SLUGS.includes(page.slug);

  // ---- Create ----
  const handleSlugChange = (value: string) => {
    setNewSlug(value);
    if (value && !SLUG_REGEX.test(value)) {
      setSlugError("Solo letras minúsculas, números y guiones");
    } else {
      setSlugError("");
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newSlug.trim() || !SLUG_REGEX.test(newSlug)) return;
    const result = await dispatch(
      createSitePage({ siteId, title: newTitle.trim(), slug: newSlug.trim() })
    );
    if (createSitePage.fulfilled.match(result)) {
      const { page } = result.payload;
      setNewTitle("");
      setNewSlug("");
      setShowCreateForm(false);
      onPageCreated?.(page.id);
    }
  };

  const handleCancelCreate = () => {
    setNewTitle("");
    setNewSlug("");
    setSlugError("");
    setShowCreateForm(false);
    dispatch(clearPageErrors());
  };

  const isCreateFormValid =
    newTitle.trim() !== "" && newSlug.trim() !== "" && SLUG_REGEX.test(newSlug);

  // ---- Rename ----
  const handleStartRename = (page: SitePageDataProps) => {
    setRenamingId(page.id);
    setEditTitle(page.title);
    setEditSlug(page.slug);
    setEditSlugError("");
  };

  const handleEditSlugChange = (value: string) => {
    setEditSlug(value);
    if (value && !SLUG_REGEX.test(value)) {
      setEditSlugError("Solo letras minúsculas, números y guiones");
    } else if (PROTECTED_SLUGS.includes(value.trim())) {
      setEditSlugError("Ese slug está reservado por el sistema");
    } else {
      setEditSlugError("");
    }
  };

  const handleSaveRename = async (page: SitePageDataProps) => {
    if (!editTitle.trim() || !editSlug.trim() || editSlugError) return;
    const updates: { title: string; slug?: string } = { title: editTitle.trim() };
    if (editSlug.trim() !== page.slug) {
      if (PROTECTED_SLUGS.includes(editSlug.trim())) return;
      updates.slug = editSlug.trim();
    }
    const result = await dispatch(updateSitePage({ pageId: page.id, updates }));
    if (updateSitePage.fulfilled.match(result)) {
      setRenamingId(null);
    }
  };

  const handleCancelRename = () => {
    setRenamingId(null);
    setEditTitle("");
    setEditSlug("");
    setEditSlugError("");
  };

  // ---- Visibility / Nav ----
  const handleToggleVisible = (page: SitePageDataProps) => {
    if (page.slug === "home") return;
    dispatch(updateSitePage({ pageId: page.id, updates: { visible: !page.visible } }));
  };

  const handleToggleNav = (page: SitePageDataProps) => {
    dispatch(updateSitePage({ pageId: page.id, updates: { show_in_nav: !page.show_in_nav } }));
  };

  // ---- Reorder ----
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    dispatch(
      reorderSitePages([
        { id: pages[index].id, position: index },
        { id: pages[index - 1].id, position: index + 1 },
      ])
    );
  };

  const handleMoveDown = (index: number) => {
    if (index >= pages.length - 1) return;
    dispatch(
      reorderSitePages([
        { id: pages[index].id, position: index + 2 },
        { id: pages[index + 1].id, position: index + 1 },
      ])
    );
  };

  // ---- Delete ----
  const handleDelete = () => {
    if (!deleteTarget) return;
    dispatch(deleteSitePage(deleteTarget));
    if (activeTabId === deleteTarget) onTabChange("config");
    setDeleteTarget(null);
  };

  return (
    <>
      <div className="border-b border-gray-200 bg-white">
        <div className="flex items-center overflow-x-auto scrollbar-hide px-4 gap-1">
          {/* Config tab */}
          <button
            onClick={() => onTabChange("config")}
            className={`shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTabId === "config"
                ? "border-black text-black"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Configuración
          </button>

          {/* Page tabs */}
          {pages.map((page, index) => (
            <div key={page.id} className="shrink-0 flex items-center">
              {renamingId === page.id ? (
                <div className="flex items-center gap-1 px-2 py-2">
                  <div className="flex flex-col gap-1">
                    <input
                      autoFocus
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Escape") handleCancelRename(); }}
                      placeholder="Título"
                      className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-black w-28"
                    />
                    <div>
                      <input
                        type="text"
                        value={editSlug}
                        onChange={(e) => handleEditSlugChange(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Escape") handleCancelRename(); }}
                        placeholder="slug"
                        className={`border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-black w-28 ${
                          editSlugError ? "border-red-400" : "border-gray-300"
                        }`}
                      />
                      {editSlugError && (
                        <p className="text-xs text-red-500 mt-0.5">{editSlugError}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleSaveRename(page)}
                    disabled={!editTitle.trim() || !editSlug.trim() || !!editSlugError || saveRequest.inProgress}
                    className="p-1 text-green-600 hover:text-green-700 disabled:opacity-30"
                    title="Guardar"
                  >
                    <CheckIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleCancelRename}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Cancelar"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className={`flex items-center border-b-2 transition-colors ${
                  activeTabId === page.id
                    ? "border-black"
                    : "border-transparent"
                }`}>
                  <button
                    onClick={() => onTabChange(page.id)}
                    className={`px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                      activeTabId === page.id
                        ? "text-black"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {page.title}
                    {!page.visible && (
                      <span className="ml-1 text-xs text-gray-400">(oculta)</span>
                    )}
                  </button>

                  {/* Dropdown menu for custom pages */}
                  {isCustom(page) && (
                    <Menu as="div" className="relative">
                      <MenuButton
                        className={`p-1 mr-1 rounded transition-colors ${
                          activeTabId === page.id
                            ? "text-gray-600 hover:text-black hover:bg-gray-100"
                            : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        }`}
                        title="Opciones de página"
                      >
                        <EllipsisHorizontalIcon className="h-4 w-4" />
                      </MenuButton>

                      <MenuItems
                        anchor="bottom start"
                        className="z-50 mt-1 w-48 rounded-md bg-white border border-gray-200 shadow-lg py-1 focus:outline-none"
                      >
                        <MenuItem>
                          {({ focus }) => (
                            <button
                              onClick={() => handleStartRename(page)}
                              className={`flex w-full items-center gap-2 px-3 py-2 text-sm ${
                                focus ? "bg-gray-50 text-gray-900" : "text-gray-700"
                              }`}
                            >
                              <PencilIcon className="h-4 w-4" />
                              Renombrar
                            </button>
                          )}
                        </MenuItem>

                        <MenuItem>
                          {({ focus }) => (
                            <button
                              onClick={() => handleToggleNav(page)}
                              className={`flex w-full items-center gap-2 px-3 py-2 text-sm ${
                                focus ? "bg-gray-50 text-gray-900" : "text-gray-700"
                              }`}
                            >
                              <Bars3Icon className="h-4 w-4" />
                              {page.show_in_nav ? "Ocultar del menú" : "Mostrar en menú"}
                            </button>
                          )}
                        </MenuItem>

                        <MenuItem>
                          {({ focus }) => (
                            <button
                              onClick={() => handleToggleVisible(page)}
                              className={`flex w-full items-center gap-2 px-3 py-2 text-sm ${
                                focus ? "bg-gray-50 text-gray-900" : "text-gray-700"
                              }`}
                            >
                              {page.visible ? (
                                <EyeSlashIcon className="h-4 w-4" />
                              ) : (
                                <EyeIcon className="h-4 w-4" />
                              )}
                              {page.visible ? "Ocultar página" : "Mostrar página"}
                            </button>
                          )}
                        </MenuItem>

                        <div className="border-t border-gray-100 my-1" />

                        <MenuItem>
                          {({ focus }) => (
                            <button
                              onClick={() => handleMoveUp(index)}
                              disabled={index === 0}
                              className={`flex w-full items-center gap-2 px-3 py-2 text-sm disabled:opacity-40 ${
                                focus ? "bg-gray-50 text-gray-900" : "text-gray-700"
                              }`}
                            >
                              <ChevronUpIcon className="h-4 w-4" />
                              Mover arriba
                            </button>
                          )}
                        </MenuItem>

                        <MenuItem>
                          {({ focus }) => (
                            <button
                              onClick={() => handleMoveDown(index)}
                              disabled={index >= pages.length - 1}
                              className={`flex w-full items-center gap-2 px-3 py-2 text-sm disabled:opacity-40 ${
                                focus ? "bg-gray-50 text-gray-900" : "text-gray-700"
                              }`}
                            >
                              <ChevronDownIcon className="h-4 w-4" />
                              Mover abajo
                            </button>
                          )}
                        </MenuItem>

                        <div className="border-t border-gray-100 my-1" />

                        <MenuItem>
                          {({ focus }) => (
                            <button
                              onClick={() => setDeleteTarget(page.id)}
                              className={`flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 ${
                                focus ? "bg-red-50" : ""
                              }`}
                            >
                              <TrashIcon className="h-4 w-4" />
                              Eliminar
                            </button>
                          )}
                        </MenuItem>
                      </MenuItems>
                    </Menu>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Add new page button */}
          <button
            onClick={() => setShowCreateForm(true)}
            className="shrink-0 flex items-center gap-1 px-3 py-3 text-sm text-gray-500 hover:text-gray-700 whitespace-nowrap border-b-2 border-transparent"
            title="Nueva página"
          >
            <PlusIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Nueva página</span>
          </button>
        </div>

        {/* Inline create form */}
        {showCreateForm && (
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Nueva página</p>
            <div className="flex flex-wrap items-start gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Título</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: Sobre nosotros"
                  autoFocus
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black w-48"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Slug <span className="text-gray-400">(aparece en la URL)</span>
                </label>
                <input
                  type="text"
                  value={newSlug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="Ej: sobre-nosotros"
                  className={`border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black w-48 ${
                    slugError ? "border-red-400" : "border-gray-300"
                  }`}
                />
                {slugError && <p className="text-xs text-red-500 mt-1">{slugError}</p>}
              </div>
              <div className="flex items-end gap-2 pt-5">
                <Button
                  title={createRequest.inProgress ? "Creando..." : "Crear"}
                  onClick={handleCreate}
                  disabled={!isCreateFormValid || createRequest.inProgress}
                />
                <Button title="Cancelar" onClick={handleCancelCreate} secondary />
              </div>
            </div>
            {createRequest.messages && !createRequest.ok && (
              <p className="text-xs text-red-500 mt-2">{createRequest.messages}</p>
            )}
          </div>
        )}
      </div>

      {deleteTarget && (
        <Alert
          title="Eliminar página"
          description="¿Estás seguro de que deseas eliminar esta página? Se eliminarán también todos sus componentes. Esta acción no se puede deshacer."
          onAccept={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
};
