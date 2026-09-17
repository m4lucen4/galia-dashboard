import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Alert } from "@/components/shared/ui/Alert";
import { useAppDispatch } from "@/redux/hooks";
import { invalidateWikiPublicCache } from "@/redux/slices/WikiSlice";
import {
  archiveWikiArticle,
  createWikiArticle,
  createWikiSection,
  createWikiSubsection,
  deleteWikiSection,
  deleteWikiSubsection,
  fetchWikiAdminStructure,
  moveWikiArticle,
  reorderWiki,
  restoreArchivedWikiArticle,
  updateWikiSection,
  updateWikiSubsection,
  type WikiAdminArticle,
  type WikiAdminSection,
  type WikiAdminSubsection,
} from "@/redux/actions/WikiAdminActions";
import type { IRequest } from "@/types";

type FormTarget =
  | { kind: "section"; item?: WikiAdminSection }
  | { kind: "subsection"; section: WikiAdminSection; item?: WikiAdminSubsection }
  | { kind: "article"; subsection: WikiAdminSubsection }
  | { kind: "articleSlug"; article: WikiAdminArticle }
  | { kind: "moveArticle"; article: WikiAdminArticle; subsection: WikiAdminSubsection };

type Props = {
  structure: WikiAdminSection[];
  selectedArticleId: string | null;
  request: IRequest;
  onSelectArticle: (id: string) => void;
  onNavigate: (href: string) => void;
  disabled?: boolean;
};

const slugify = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "");

const appendPosition = (items: Array<{ position: number }>) => (
  Math.max(-1, ...items.map((item) => item.position)) + 1
);

const stateLabel = (state: WikiAdminArticle["state"]) => {
  if (state === "published") return "Publicado";
  if (state === "archived") return "Archivado";
  return "Borrador";
};

const nextOrder = (ids: string[], id: string, direction: -1 | 1) => {
  const index = ids.indexOf(id);
  const destination = index + direction;
  if (index < 0 || destination < 0 || destination >= ids.length) return ids;

  return ids.map((item, itemIndex) => {
    if (itemIndex === index) return ids[destination];
    if (itemIndex === destination) return ids[index];
    return item;
  });
};

const StructureFormDialog = ({
  target,
  structure,
  request,
  busy,
  onClose,
  onSubmit,
}: {
  target: FormTarget;
  structure: WikiAdminSection[];
  request: IRequest;
  busy: boolean;
  onClose: () => void;
  onSubmit: (values: { title: string; slug: string; subsectionId?: string }) => Promise<void>;
}) => {
  const existingTitle = target.kind === "section" || target.kind === "subsection"
    ? target.item?.title ?? ""
    : target.kind === "articleSlug" || target.kind === "moveArticle"
      ? target.article.draft?.title ?? target.article.slug
      : "";
  const existingSlug = target.kind === "section" || target.kind === "subsection"
    ? target.item?.slug ?? ""
    : target.kind === "articleSlug" || target.kind === "moveArticle"
      ? target.article.slug
      : "";
  const [title, setTitle] = useState(existingTitle);
  const [slug, setSlug] = useState(existingSlug);
  const [slugEdited, setSlugEdited] = useState(Boolean(existingSlug));
  const [subsectionId, setSubsectionId] = useState(
    target.kind === "moveArticle" ? target.subsection.id : "",
  );

  const isMove = target.kind === "moveArticle";
  const isArticleSlug = target.kind === "articleSlug";
  const needsTitle = !isMove && !isArticleSlug;
  const heading = target.kind === "section"
    ? target.item ? "Editar sección" : "Crear sección"
    : target.kind === "subsection"
      ? target.item ? "Editar subsección" : "Crear subsección"
      : target.kind === "article"
        ? "Crear artículo"
        : isMove
          ? "Mover artículo"
          : "Editar slug del artículo";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({ title: title.trim(), slug: slugify(slug), subsectionId });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        aria-labelledby="wiki-structure-dialog-title"
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <h2 id="wiki-structure-dialog-title" className="text-lg font-bold text-gray-900">
          {heading}
        </h2>
        {!request.ok && request.messages && <p role="alert" className="mt-3 text-sm text-red-700">{request.messages}</p>}
        {needsTitle && (
          <label className="mt-4 block text-sm font-medium text-gray-700" htmlFor="wiki-structure-title">
            Título
            <input
              autoFocus
              id="wiki-structure-title"
              maxLength={target.kind === "article" ? 180 : 120}
              required
              value={title}
              onChange={(event) => {
                const nextTitle = event.target.value;
                setTitle(nextTitle);
                if (!slugEdited) setSlug(slugify(nextTitle));
              }}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </label>
        )}
        <label className="mt-4 block text-sm font-medium text-gray-700" htmlFor="wiki-structure-slug">
          Slug
          <input
            autoFocus={!needsTitle}
            id="wiki-structure-slug"
            maxLength={120}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            required
            value={slug}
            onChange={(event) => {
              setSlug(event.target.value);
              setSlugEdited(true);
            }}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
          <span className="mt-1 block text-xs font-normal text-gray-500">
            Solo letras minúsculas, números y guiones. Se normaliza al guardar.
          </span>
        </label>
        {isMove && (
          <label className="mt-4 block text-sm font-medium text-gray-700" htmlFor="wiki-article-subsection">
            Subseción de destino
            <select
              id="wiki-article-subsection"
              value={subsectionId}
              onChange={(event) => setSubsectionId(event.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            >
              {structure.flatMap((section) => section.wiki_subsections.map((subsection) => (
                <option key={subsection.id} value={subsection.id}>
                  {section.title} / {subsection.title}
                </option>
              )))}
            </select>
          </label>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" disabled={busy} onClick={onClose} className="rounded px-4 py-2 text-sm underline">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy || !slugify(slug) || (needsTitle && !title.trim()) || (isMove && !subsectionId)}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
};

export const WikiStructureManager = ({ structure, selectedArticleId, request, onSelectArticle, onNavigate, disabled = false }: Props) => {
  const dispatch = useAppDispatch();
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<WikiAdminArticle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: "section" | "subsection"; id: string } | null>(null);

  const refresh = async () => {
    await dispatch(fetchWikiAdminStructure());
  };

  const busy = request.inProgress || disabled;

  const execute = async (action: Promise<{ meta: { requestStatus: string } }>) => {
    const result = await action;
    if (!result.meta.requestStatus || result.meta.requestStatus === "rejected") return false;
    dispatch(invalidateWikiPublicCache());
    await refresh();
    return true;
  };

  const submitForm = async ({ title, slug, subsectionId }: { title: string; slug: string; subsectionId?: string }) => {
    if (!formTarget) return;

    let completed = false;
    if (formTarget.kind === "section") {
      completed = formTarget.item
        ? await execute(dispatch(updateWikiSection({ id: formTarget.item.id, title, slug })))
        : await execute(dispatch(createWikiSection({ title, slug, position: appendPosition(structure) })));
    }
    if (formTarget.kind === "subsection") {
      completed = formTarget.item
        ? await execute(dispatch(updateWikiSubsection({ id: formTarget.item.id, title, slug })))
        : await execute(dispatch(createWikiSubsection({
          sectionId: formTarget.section.id,
          title,
          slug,
          position: appendPosition(formTarget.section.wiki_subsections),
        })));
    }
    if (formTarget.kind === "article") {
      const result = await dispatch(createWikiArticle({
        subsectionId: formTarget.subsection.id,
        title,
        slug,
        position: appendPosition(formTarget.subsection.wiki_articles),
      }));
      if (createWikiArticle.fulfilled.match(result) && typeof result.payload === "string") {
        completed = true;
        onSelectArticle(result.payload);
        await refresh();
      }
    }
    if (formTarget.kind === "articleSlug") {
      completed = await execute(dispatch(moveWikiArticle({
        articleId: formTarget.article.id,
        subsectionId: formTarget.article.subsection_id,
        slug,
        position: formTarget.article.position,
      })));
    }
    if (formTarget.kind === "moveArticle" && subsectionId) {
      const destination = structure
        .flatMap((section) => section.wiki_subsections)
        .find((subsection) => subsection.id === subsectionId);
      if (destination) {
        completed = await execute(dispatch(moveWikiArticle({
          articleId: formTarget.article.id,
          subsectionId,
          slug,
          position: subsectionId === formTarget.article.subsection_id
            ? formTarget.article.position
            : appendPosition(destination.wiki_articles),
        })));
      }
    }

    if (completed) setFormTarget(null);
  };

  const move = async (parentId: string | null, ids: string[], id: string, direction: -1 | 1, kind: "section" | "subsection" | "article") => {
    const nextIds = nextOrder(ids, id, direction);
    if (nextIds === ids) return;
    await execute(dispatch(reorderWiki({ parentId, ids: nextIds, kind })));
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const completed = deleteTarget.kind === "section"
      ? await execute(dispatch(deleteWikiSection(deleteTarget.id)))
      : await execute(dispatch(deleteWikiSubsection(deleteTarget.id)));
    if (completed) setDeleteTarget(null);
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    const completed = await execute(dispatch(archiveWikiArticle(archiveTarget.id)));
    if (completed) setArchiveTarget(null);
  };

  return (
    <aside className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Gestionar wiki</h1>
          <Link to="/wiki" onClick={(event) => { event.preventDefault(); onNavigate("/wiki"); }} className="mt-1 inline-block text-sm underline">Ver wiki pública</Link>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={request.inProgress} className="text-sm underline disabled:opacity-50">
          Actualizar
        </button>
      </div>
      {request.messages && <p className={`mt-3 text-sm ${request.ok ? "text-green-700" : "text-red-700"}`}>{request.messages}</p>}
      <button type="button" onClick={() => setFormTarget({ kind: "section" })} disabled={busy} className="mt-4 rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        Crear sección
      </button>
      {structure.length === 0 && <p className="mt-4 text-sm text-gray-600">Empezá creando una sección. Después podrás añadir una subsección y su primer artículo.</p>}
      <div className="mt-5 space-y-5">
        {structure.map((section, sectionIndex) => (
          <div key={section.id} className="border-t pt-4 first:border-t-0 first:pt-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{section.title}</p>
              <div className="flex gap-2 text-xs">
                <button type="button" aria-label={`Subir ${section.title}`} disabled={request.inProgress || sectionIndex === 0} onClick={() => void move(null, structure.map((item) => item.id), section.id, -1, "section")} className="underline disabled:opacity-40">↑</button>
                <button type="button" aria-label={`Bajar ${section.title}`} disabled={request.inProgress || sectionIndex === structure.length - 1} onClick={() => void move(null, structure.map((item) => item.id), section.id, 1, "section")} className="underline disabled:opacity-40">↓</button>
                <button type="button" onClick={() => setFormTarget({ kind: "section", item: section })} disabled={request.inProgress} className="underline disabled:opacity-40">Editar</button>
                <button type="button" onClick={() => setDeleteTarget({ kind: "section", id: section.id })} disabled={request.inProgress} className="text-red-700 underline disabled:opacity-40">Eliminar</button>
              </div>
            </div>
            <button type="button" onClick={() => setFormTarget({ kind: "subsection", section })} disabled={request.inProgress} className="mt-2 text-xs underline disabled:opacity-40">Crear subsección</button>
            {section.wiki_subsections.length === 0 && <p className="mt-2 text-xs text-gray-500">Esta sección todavía no tiene subsecciones.</p>}
            <div className="mt-3 space-y-3">
              {section.wiki_subsections.map((subsection, subsectionIndex) => (
                <div key={subsection.id} className="ml-3 border-l border-gray-200 pl-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-gray-700">{subsection.title}</p>
                    <div className="flex gap-2 text-xs">
                      <button type="button" aria-label={`Subir ${subsection.title}`} disabled={request.inProgress || subsectionIndex === 0} onClick={() => void move(section.id, section.wiki_subsections.map((item) => item.id), subsection.id, -1, "subsection")} className="underline disabled:opacity-40">↑</button>
                      <button type="button" aria-label={`Bajar ${subsection.title}`} disabled={request.inProgress || subsectionIndex === section.wiki_subsections.length - 1} onClick={() => void move(section.id, section.wiki_subsections.map((item) => item.id), subsection.id, 1, "subsection")} className="underline disabled:opacity-40">↓</button>
                      <button type="button" onClick={() => setFormTarget({ kind: "subsection", section, item: subsection })} disabled={request.inProgress} className="underline disabled:opacity-40">Editar</button>
                      <button type="button" onClick={() => setDeleteTarget({ kind: "subsection", id: subsection.id })} disabled={request.inProgress} className="text-red-700 underline disabled:opacity-40">Eliminar</button>
                    </div>
                  </div>
                  <button type="button" onClick={() => setFormTarget({ kind: "article", subsection })} disabled={request.inProgress} className="mt-2 text-xs underline disabled:opacity-40">Crear artículo</button>
                  {subsection.wiki_articles.map((article, articleIndex) => (
                    <div key={article.id} className="mt-2 rounded bg-gray-50 p-2">
                        <button type="button" onClick={() => onSelectArticle(article.id)} disabled={disabled} className={`block w-full text-left text-sm disabled:opacity-50 ${article.id === selectedArticleId ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                        {article.draft?.title ?? article.slug} · {stateLabel(article.state)}
                      </button>
                      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs">
                        <button type="button" aria-label={`Subir ${article.draft?.title ?? article.slug}`} disabled={request.inProgress || articleIndex === 0} onClick={() => void move(subsection.id, subsection.wiki_articles.map((item) => item.id), article.id, -1, "article")} className="underline disabled:opacity-40">↑</button>
                        <button type="button" aria-label={`Bajar ${article.draft?.title ?? article.slug}`} disabled={request.inProgress || articleIndex === subsection.wiki_articles.length - 1} onClick={() => void move(subsection.id, subsection.wiki_articles.map((item) => item.id), article.id, 1, "article")} className="underline disabled:opacity-40">↓</button>
                        <button type="button" onClick={() => setFormTarget({ kind: "articleSlug", article })} disabled={request.inProgress || article.state === "archived"} className="underline disabled:opacity-40">Slug</button>
                        <button type="button" onClick={() => setFormTarget({ kind: "moveArticle", article, subsection })} disabled={request.inProgress || article.state === "archived"} className="underline disabled:opacity-40">Mover</button>
                        {article.state === "archived" ? (
                          <button type="button" onClick={() => void execute(dispatch(restoreArchivedWikiArticle(article.id)))} disabled={request.inProgress} className="underline disabled:opacity-40">Restaurar</button>
                        ) : (
                          <button type="button" onClick={() => setArchiveTarget(article)} disabled={request.inProgress} className="text-red-700 underline disabled:opacity-40">Archivar</button>
                        )}
                      </div>
                    </div>
                  ))}
                  {subsection.wiki_articles.length === 0 && <p className="mt-2 text-xs text-gray-500">Creá el primer artículo de esta subsección.</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {formTarget && <StructureFormDialog target={formTarget} structure={structure} request={request} busy={request.inProgress} onClose={() => setFormTarget(null)} onSubmit={submitForm} />}
      {archiveTarget && <Alert title="Archivar artículo" description="El artículo dejará de estar publicado, pero conservará su borrador e historial para poder restaurarlo más adelante." onAccept={() => void confirmArchive()} onCancel={() => setArchiveTarget(null)} disabledConfirmButton={request.inProgress} />}
      {deleteTarget && <Alert title={deleteTarget.kind === "section" ? "Eliminar sección" : "Eliminar subsección"} description="Solo se puede eliminar si está vacía. Si contiene subsecciones o artículos, la base de datos rechazará la acción para proteger el contenido." onAccept={() => void confirmDelete()} onCancel={() => setDeleteTarget(null)} disabledConfirmButton={request.inProgress} />}
    </aside>
  );
};
