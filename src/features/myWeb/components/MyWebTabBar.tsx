import React, { useState } from "react";
import { useHomeAnchors } from "@/hooks/useHomeAnchors";
import { PlusIcon, CheckIcon, XMarkIcon, LinkIcon } from "@heroicons/react/24/outline";
import { SitePageDataProps } from "@/types";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  createSitePage,
  deleteSitePage,
  updateSitePage,
  reorderSitePages,
} from "@/redux/actions/SitePageActions";
import { clearPageErrors } from "@/redux/slices/SitePageSlice";
import { Alert } from "@/components/shared/ui/Alert";
import { PillButton } from "@/components/shared/ui/PillButton";
import { CreatePageForm } from "@/features/myWeb/components/pages/CreatePageForm";
import { PageTabMenu } from "@/features/myWeb/components/pages/PageTabMenu";
import {
  myWebControlClassName,
  myWebIconButtonClassName,
  myWebLabelClassName,
  myWebMutedClassName,
} from "@/features/myWeb/components/myWebStyles";

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
  const { createRequest, saveRequest, deleteRequest } = useAppSelector((state) => state.sitePage);
  const { anchors, request: anchorRequest, refresh } = useHomeAnchors(siteId);
  const [newPageType, setNewPageType] = useState<"page" | "home_anchor">("page");
  const [newTarget, setNewTarget] = useState("");

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
  const canManagePage = (page: SitePageDataProps) =>
    isCustom(page) || page.slug === "proyectos";

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
    if (!isCreateFormValid) return;
    const result = await dispatch(
      createSitePage(newPageType === "home_anchor"
        ? { siteId, title: newTitle.trim(), page_type: "home_anchor", target_component_id: newTarget }
        : { siteId, title: newTitle.trim(), slug: newSlug.trim() })
    );
    if (createSitePage.fulfilled.match(result)) {
      const { page } = result.payload;
      setNewTitle("");
      setNewSlug("");
      setNewTarget("");
      setNewPageType("page");
      setShowCreateForm(false);
      onPageCreated?.(page.id);
    }
  };

  const handleCancelCreate = () => {
    setNewTitle("");
    setNewSlug("");
    setSlugError("");
    setNewTarget("");
    setNewPageType("page");
    setShowCreateForm(false);
    dispatch(clearPageErrors());
  };

  const isCreateFormValid =
    newTitle.trim() !== "" && (newPageType === "home_anchor"
      ? !anchorRequest.inProgress && anchors.some((anchor) => anchor.id === newTarget)
      : newSlug.trim() !== "" && SLUG_REGEX.test(newSlug));

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
    if (page.page_type !== "home_anchor" && editSlug.trim() !== page.slug) {
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
  const handleDelete = async () => {
    if (!deleteTarget || deleteRequest.inProgress) return;
    const result = await dispatch(deleteSitePage(deleteTarget));
    if (deleteSitePage.fulfilled.match(result)) {
      if (activeTabId === deleteTarget) onTabChange("config");
      setDeleteTarget(null);
    }
  };

  return (
    <div className="min-w-0 space-y-4 text-[#010000]">
      <div className="min-w-0 rounded-[28px] border border-[#010000]/20 p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium">Páginas y navegación</h2>
            <p className={myWebMutedClassName}>Organiza tus páginas y los enlaces a secciones de Inicio.</p>
          </div>
          <PillButton variant="outline" onClick={() => setShowCreateForm(true)}>
            <PlusIcon aria-hidden="true" className="size-5" />Nueva página
          </PillButton>
        </div>
        <nav aria-label="Páginas de tu web" className="flex min-w-0 items-center gap-2 overflow-x-auto p-1 pb-3">
          <PillButton variant={activeTabId === "config" ? "solid" : "outline"} onClick={() => onTabChange("config")} aria-current={activeTabId === "config" ? "page" : undefined} className="shrink-0">
            Configuración
          </PillButton>
          {pages.map((page, index) => (
            <div key={page.id} className="flex shrink-0 items-center gap-1">
              {renamingId === page.id ? (
                <div className="flex items-center gap-2 rounded-2xl border border-[#010000]/20 p-3">
                  <div className="w-48 space-y-2">
                    <label className={myWebLabelClassName}>
                      Título
                      <input autoFocus value={editTitle} onChange={(event) => setEditTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") handleCancelRename(); }} className={myWebControlClassName} />
                    </label>
                    {page.page_type !== "home_anchor" && (
                      <label className={myWebLabelClassName}>
                        Slug
                        <input value={editSlug} onChange={(event) => handleEditSlugChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") handleCancelRename(); }} className={myWebControlClassName} aria-invalid={!!editSlugError} aria-describedby={editSlugError ? `rename-error-${page.id}` : undefined} />
                        {editSlugError && <span id={`rename-error-${page.id}`} className="block text-xs text-red-700">{editSlugError}</span>}
                      </label>
                    )}
                  </div>
                  <button onClick={() => handleSaveRename(page)} disabled={!editTitle.trim() || !editSlug.trim() || !!editSlugError || saveRequest.inProgress} className={myWebIconButtonClassName} aria-label={`Guardar nombre de ${page.title}`}>
                    <CheckIcon aria-hidden="true" className="size-5" />
                  </button>
                  <button onClick={handleCancelRename} className={myWebIconButtonClassName} aria-label={`Cancelar cambio de nombre de ${page.title}`}>
                    <XMarkIcon aria-hidden="true" className="size-5" />
                  </button>
                </div>
              ) : (
                <>
                  <PillButton variant={activeTabId === page.id ? "solid" : "outline"} onClick={() => onTabChange(page.id)} aria-current={activeTabId === page.id ? "page" : undefined}>
                    {page.page_type === "home_anchor" && <LinkIcon aria-hidden="true" className="size-4" />}
                    <span className="whitespace-nowrap">{page.title}</span>
                    {page.page_type === "home_anchor" && <span className="whitespace-nowrap text-xs opacity-65">Enlace a Inicio</span>}
                    {!page.visible && <span className="text-xs opacity-65">(oculta)</span>}
                  </PillButton>
                  {canManagePage(page) && (
                    <PageTabMenu page={page} custom={isCustom(page)} first={index === 0} last={index >= pages.length - 1}
                      onRename={() => handleStartRename(page)} onToggleNav={() => handleToggleNav(page)}
                      onToggleVisible={() => handleToggleVisible(page)} onMoveUp={() => handleMoveUp(index)}
                      onMoveDown={() => handleMoveDown(index)} onDelete={() => setDeleteTarget(page.id)} />
                  )}
                </>
              )}
            </div>
          ))}
        </nav>
      </div>
      {showCreateForm && (
        <CreatePageForm pageType={newPageType} title={newTitle} slug={newSlug} slugError={slugError} target={newTarget}
          anchors={anchors} anchorsLoading={anchorRequest.inProgress} anchorMessage={anchorRequest.messages}
          creating={createRequest.inProgress} error={createRequest.messages && !createRequest.ok ? createRequest.messages : ""}
          valid={isCreateFormValid} onTypeChange={setNewPageType} onTitleChange={setNewTitle} onSlugChange={handleSlugChange}
          onTargetChange={setNewTarget} onRefresh={refresh} onCreate={handleCreate} onCancel={handleCancelCreate} />
      )}
      {saveRequest.messages && !saveRequest.ok && <p role="alert" className="text-sm text-red-700">{saveRequest.messages}</p>}
      {deleteTarget && (
        <Alert
          title="Eliminar página"
          disabledConfirmButton={deleteRequest.inProgress}
          description={`¿Estás seguro de que deseas eliminar esta página? Se eliminarán también todos sus componentes. Esta acción no se puede deshacer.${deleteRequest.messages && !deleteRequest.ok ? ` ${deleteRequest.messages}` : ""}`}
          onAccept={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
