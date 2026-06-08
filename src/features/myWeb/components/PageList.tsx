import React, { useState } from "react";
import { SitePageDataProps } from "../../../types";
import { PageEditor } from "./PageEditor";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import {
  updateSitePage,
  reorderSitePages,
  createSitePage,
  deleteSitePage,
} from "../../../redux/actions/SitePageActions";
import { clearPageErrors } from "../../../redux/slices/SitePageSlice";
import { Button } from "../../../components/shared/ui/Button";
import { Alert } from "../../../components/shared/ui/Alert";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeSlashIcon,
  Bars3Icon,
  TrashIcon,
  PlusIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface PageListProps {
  pages: SitePageDataProps[];
  siteId: string;
}

const PROTECTED_SLUGS = ["home", "proyectos", "aviso-legal", "politica-cookies"];
const SLUG_REGEX = /^[a-z0-9-]+$/;

export const PageList: React.FC<PageListProps> = ({ pages, siteId }) => {
  const dispatch = useAppDispatch();
  const { createRequest, deleteRequest, saveRequest } = useAppSelector((state) => state.sitePage);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [slugError, setSlugError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editSlugError, setEditSlugError] = useState("");

  const handleToggleVisible = (page: SitePageDataProps) => {
    if (page.slug === "home") return;
    dispatch(updateSitePage({ pageId: page.id, updates: { visible: !page.visible } }));
  };

  const handleToggleNav = (page: SitePageDataProps) => {
    dispatch(updateSitePage({ pageId: page.id, updates: { show_in_nav: !page.show_in_nav } }));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updates = [
      { id: pages[index].id, position: index },
      { id: pages[index - 1].id, position: index + 1 },
    ];
    dispatch(reorderSitePages(updates));
  };

  const handleMoveDown = (index: number) => {
    if (index >= pages.length - 1) return;
    const updates = [
      { id: pages[index].id, position: index + 2 },
      { id: pages[index + 1].id, position: index + 1 },
    ];
    dispatch(reorderSitePages(updates));
  };

  const handleSlugChange = (value: string) => {
    setNewSlug(value);
    if (value && !SLUG_REGEX.test(value)) {
      setSlugError("Solo letras minúsculas, números y guiones (ej: sobre-nosotros)");
    } else {
      setSlugError("");
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newSlug.trim()) return;
    if (!SLUG_REGEX.test(newSlug)) return;

    const result = await dispatch(createSitePage({ siteId, title: newTitle.trim(), slug: newSlug.trim() }));
    if (createSitePage.fulfilled.match(result)) {
      setNewTitle("");
      setNewSlug("");
      setShowCreateForm(false);
    }
  };

  const handleCancelCreate = () => {
    setNewTitle("");
    setNewSlug("");
    setSlugError("");
    setShowCreateForm(false);
    dispatch(clearPageErrors());
  };

  const handleStartEdit = (page: SitePageDataProps) => {
    setEditingId(page.id);
    setEditTitle(page.title);
    setEditSlug(page.slug);
    setEditSlugError("");
  };

  const handleEditSlugChange = (value: string) => {
    setEditSlug(value);
    if (value && !SLUG_REGEX.test(value)) {
      setEditSlugError("Solo letras minúsculas, números y guiones");
    } else if (PROTECTED_SLUGS.includes(value)) {
      setEditSlugError("Ese slug está reservado por el sistema");
    } else {
      setEditSlugError("");
    }
  };

  const handleSaveTitle = async (page: SitePageDataProps) => {
    if (!editTitle.trim() || !editSlug.trim() || editSlugError) return;
    const updates: { title: string; slug?: string } = { title: editTitle.trim() };
    if (editSlug.trim() !== page.slug) {
      if (PROTECTED_SLUGS.includes(editSlug.trim())) return;
      updates.slug = editSlug.trim();
    }
    const result = await dispatch(updateSitePage({ pageId: page.id, updates }));
    if (updateSitePage.fulfilled.match(result)) {
      setEditingId(null);
      setEditTitle("");
      setEditSlug("");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditSlug("");
    setEditSlugError("");
  };

  const handleDelete = () => {
    if (deleteTarget) {
      dispatch(deleteSitePage(deleteTarget));
      if (expandedId === deleteTarget) setExpandedId(null);
      setDeleteTarget(null);
    }
  };

  const isFormValid = newTitle.trim() !== "" && newSlug.trim() !== "" && SLUG_REGEX.test(newSlug);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-black">Páginas</h2>
        <Button
          title="Nueva página"
          icon={<PlusIcon className="h-4 w-4" />}
          onClick={() => setShowCreateForm(true)}
          secondary
        />
      </div>

      {showCreateForm && (
        <div className="border border-gray-200 rounded-md bg-gray-50 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Nueva página</p>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Título</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ej: Sobre nosotros"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
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
              className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black ${
                slugError ? "border-red-400" : "border-gray-300"
              }`}
            />
            {slugError && <p className="text-xs text-red-500 mt-1">{slugError}</p>}
            {createRequest.messages && !createRequest.ok && (
              <p className="text-xs text-red-500 mt-1">{createRequest.messages}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              title="Crear"
              onClick={handleCreate}
              disabled={!isFormValid || createRequest.inProgress}
            />
            <Button
              title="Cancelar"
              onClick={handleCancelCreate}
              secondary
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        {pages.map((page, index) => (
          <div
            key={page.id}
            className="border border-gray-200 rounded-md bg-white"
          >
            <div className="flex items-center justify-between px-4 py-3">
              {editingId === page.id ? (
                <div className="flex flex-col gap-2 flex-1 mr-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Escape") handleCancelEdit(); }}
                    autoFocus
                    placeholder="Título"
                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  />
                  <div>
                    <input
                      type="text"
                      value={editSlug}
                      onChange={(e) => handleEditSlugChange(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Escape") handleCancelEdit(); }}
                      placeholder="slug-url"
                      className={`w-full border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black ${
                        editSlugError ? "border-red-400" : "border-gray-300"
                      }`}
                    />
                    {editSlugError && <p className="text-xs text-red-500 mt-1">{editSlugError}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleSaveTitle(page)}
                      disabled={!editTitle.trim() || !editSlug.trim() || !!editSlugError || saveRequest.inProgress}
                      className="p-1 text-green-600 hover:text-green-700 disabled:opacity-30"
                      title="Guardar"
                    >
                      <CheckIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Cancelar"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="flex items-center gap-2 flex-1 text-left"
                  onClick={() => setExpandedId(expandedId === page.id ? null : page.id)}
                >
                  <ChevronRightIcon
                    className={`h-4 w-4 text-gray-500 transition-transform ${
                      expandedId === page.id ? "rotate-90" : ""
                    }`}
                  />
                  <span className="text-sm font-medium text-gray-900">{page.title}</span>
                  {!page.visible && (
                    <span className="text-xs text-gray-400 ml-1">(oculta)</span>
                  )}
                </button>
              )}

              {editingId !== page.id && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    title="Subir"
                  >
                    <ChevronUpIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index >= pages.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    title="Bajar"
                  >
                    <ChevronDownIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleToggleNav(page)}
                    className={`p-1 ${
                      page.show_in_nav ? "text-gray-600" : "text-gray-300"
                    } hover:text-gray-600`}
                    title={page.show_in_nav ? "Visible en el menú" : "Oculta del menú"}
                  >
                    <Bars3Icon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleToggleVisible(page)}
                    disabled={page.slug === "home"}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    title={page.visible ? "Ocultar página" : "Mostrar página"}
                  >
                    {page.visible ? (
                      <EyeIcon className="h-4 w-4" />
                    ) : (
                      <EyeSlashIcon className="h-4 w-4" />
                    )}
                  </button>
                  {!PROTECTED_SLUGS.includes(page.slug) && (
                    <>
                      <button
                        onClick={() => handleStartEdit(page)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Renombrar página"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(page.id)}
                        className="p-1 text-red-400 hover:text-red-600"
                        title="Eliminar página"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {expandedId === page.id && (
              <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                <PageEditor page={page} />
              </div>
            )}
          </div>
        ))}
      </div>

      {deleteTarget && (
        <Alert
          title="Eliminar página"
          description="¿Estás seguro de que deseas eliminar esta página? Se eliminarán también todos sus componentes. Esta acción no se puede deshacer."
          onAccept={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {deleteRequest.messages && !deleteRequest.ok && (
        <p className="text-sm text-red-500">{deleteRequest.messages}</p>
      )}
    </div>
  );
};
