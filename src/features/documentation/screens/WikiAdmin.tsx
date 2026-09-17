import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { TableKit } from "@tiptap/extension-table";
import { useNavigate } from "react-router-dom";
import { Alert } from "@/components/shared/ui/Alert";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { invalidateWikiPublicCache } from "@/redux/slices/WikiSlice";
import { fetchWikiAdminStructure, fetchWikiHistory, publishWikiArticle, restoreWikiRevision, saveWikiDraft, unpublishWikiArticle, type WikiRevision } from "@/redux/actions/WikiAdminActions";
import { selectWikiAdminArticle } from "@/redux/slices/WikiAdminSlice";
import { WikiStructureManager } from "../components/WikiStructureManager";
import { WikiEditorToolbar } from "../components/WikiEditorToolbar";
import { WikiMediaLibrary } from "../components/WikiMediaLibrary";
import { Callout, WikiMediaImage } from "../components/WikiMediaImage";
import { WikiContent } from "../components/WikiContent";
import type { WikiDocument, WikiNode } from "../types/wiki";

const emptyDoc: WikiDocument = { type: "doc", content: [] };
const safeHref = (href: string) => /^(https?:\/\/[^\s]+|mailto:[^\s]+|\/[^\s]*|#[^\s]*)$/.test(href);
type Snapshot = { articleId: string; version: number; title: string; summary: string; content: WikiDocument };
const snapshotKey = (snapshot: Snapshot) => JSON.stringify({ articleId: snapshot.articleId, title: snapshot.title, summary: snapshot.summary, content: snapshot.content });
const isWikiNode = (value: unknown): value is WikiNode => Boolean(value) && typeof value === "object" && typeof (value as { type?: unknown }).type === "string";
const toWikiDocument = (value: unknown): WikiDocument | null => {
  if (!value || typeof value !== "object") return null;
  const document = value as { type?: unknown; content?: unknown };
  if (document.type !== "doc" || !Array.isArray(document.content) || !document.content.every(isWikiNode)) return null;
  return { type: "doc", content: document.content };
};

export const WikiAdmin = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { structure, history, selectedArticleId, structureRequest, structureActionRequest, editorRequest, media, mediaRequest } = useAppSelector((state) => state.wikiAdmin);
  const selected = useMemo(() => structure.flatMap((section) => section.wiki_subsections).flatMap((subsection) => subsection.wiki_articles).find((article) => article.id === selectedArticleId), [structure, selectedArticleId]);
  const draft = selected?.draft ?? null;
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [version, setVersion] = useState(1);
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pendingArticleId, setPendingArticleId] = useState<string | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const [revisionToRestore, setRevisionToRestore] = useState<WikiRevision | null>(null);
  const [contentError, setContentError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [operation, setOperation] = useState<"publish" | "unpublish" | "restore" | null>(null);
  const loadedArticleId = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const savingRef = useRef<Promise<number | null> | null>(null);
  const rescheduleRef = useRef<() => void>(() => undefined);
  const loadingRef = useRef(false);
  const titleRef = useRef(title);
  const summaryRef = useRef(summary);
  const versionRef = useRef(version);
  const ackRef = useRef("");
  const dirtyRef = useRef(false);
  const selectedArticleRef = useRef<string | null>(null);
  const editorSessionRef = useRef(0);

  const setDirtyState = (value: boolean) => {
    dirtyRef.current = value;
    setDirty(value);
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ link: false }), Link.configure({ openOnClick: false, protocols: ["mailto"], isAllowedUri: safeHref }), TableKit, Callout, WikiMediaImage],
    content: emptyDoc,
    onUpdate: () => { if (!loadingRef.current) { setDirtyState(true); rescheduleRef.current(); } },
    editorProps: { handlePaste: (_view, event) => {
      const hasImage = Array.from(event.clipboardData?.items ?? []).some((item) => item.type.startsWith("image/"));
      const hasImageMarkup = event.clipboardData?.getData("text/html").includes("<img") ?? false;
      if (!hasImage && !hasImageMarkup) return false;
      event.preventDefault(); setContentError("Las imágenes externas no se pueden pegar. Súbalas o reutilícelas desde la biblioteca."); return true;
    } },
  });

  const currentSnapshot = (): Snapshot | null => {
    if (!selected || !editor) return null;
    const content = toWikiDocument(editor.getJSON());
    if (!content) { setContentError("El contenido del artículo no es válido."); return null; }
    return { articleId: selected.id, version: versionRef.current, title: titleRef.current.trim(), summary: summaryRef.current.trim(), content };
  };
  const scheduleSave = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => { timerRef.current = null; void flushSave(); }, 900);
  };
  rescheduleRef.current = scheduleSave;
  const flushSave = async (): Promise<number | null> => {
    if (savingRef.current) return savingRef.current;
    const snapshot = currentSnapshot();
    if (!snapshot || conflict || selected?.state === "archived") return null;
    const key = snapshotKey(snapshot);
    if (!snapshot.title) { setContentError("El título es obligatorio antes de guardar."); return null; }
    if (key === ackRef.current) { setDirtyState(false); return snapshot.version; }
    const session = editorSessionRef.current;
    const request = (async () => {
      const action = await dispatch(saveWikiDraft(snapshot));
      if (!saveWikiDraft.fulfilled.match(action)) {
        if (action.payload?.code === "40001" && editorSessionRef.current === session) setConflict(true);
        return null;
      }
      if (editorSessionRef.current !== session || selectedArticleRef.current !== snapshot.articleId) return null;
      const acknowledged = { ...snapshot, version: action.payload };
      ackRef.current = snapshotKey(acknowledged);
      versionRef.current = action.payload;
      setVersion(action.payload);
      const latest = currentSnapshot();
      const remainsDirty = !latest || snapshotKey(latest) !== ackRef.current;
      setDirtyState(remainsDirty);
      if (remainsDirty) scheduleSave();
      return action.payload;
    })();
    savingRef.current = request;
    try { return await request; } finally { savingRef.current = null; }
  };

  useEffect(() => { void dispatch(fetchWikiAdminStructure()); }, [dispatch]);
  useEffect(() => { selectedArticleRef.current = selectedArticleId; }, [selectedArticleId]);
  useEffect(() => {
    if (!draft || !selected || !editor || loadedArticleId.current === selected.id) return;
    loadingRef.current = true;
    editor.commands.setContent(draft.content);
    loadedArticleId.current = selected.id;
    titleRef.current = draft.title; summaryRef.current = draft.summary; versionRef.current = draft.version;
    ackRef.current = snapshotKey({ articleId: selected.id, version: draft.version, title: draft.title, summary: draft.summary, content: draft.content });
    setTitle(draft.title); setSummary(draft.summary); setVersion(draft.version); setDirtyState(false); setConflict(false);
    queueMicrotask(() => { loadingRef.current = false; });
    void dispatch(fetchWikiHistory(selected.id));
  }, [dispatch, draft, editor, selected]);
  useEffect(() => {
    if (!dirty || conflict || operation || selected?.state === "archived") return;
    rescheduleRef.current();
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [dirty, conflict, operation, selected?.state]);
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => { if (dirtyRef.current || savingRef.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", handleBeforeUnload); return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    const handleDocumentNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target || anchor.hasAttribute("download") || !(dirtyRef.current || savingRef.current)) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.href === window.location.href) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingNavigation(() => () => { window.location.assign(destination.href); });
    };

    document.addEventListener("click", handleDocumentNavigation, true);
    return () => document.removeEventListener("click", handleDocumentNavigation, true);
  }, []);

  const discardPendingChanges = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    editorSessionRef.current += 1;
    ackRef.current = "";
    setDirtyState(false);
  };
  const requestNavigation = (href: string) => {
    if (dirtyRef.current || savingRef.current) {
      setPendingNavigation(() => () => navigate(href));
      return;
    }
    navigate(href);
  };
  const updateTitle = (value: string) => { titleRef.current = value; setTitle(value); setDirtyState(true); scheduleSave(); };
  const updateSummary = (value: string) => { summaryRef.current = value; setSummary(value); setDirtyState(true); scheduleSave(); };
  const isLocked = Boolean(operation || editorRequest.inProgress || savingRef.current);
  const refreshStructure = async (articleId = selectedArticleId) => { await dispatch(fetchWikiAdminStructure()); if (articleId) void dispatch(fetchWikiHistory(articleId)); };
  const publish = async () => {
    if (!selected || isLocked) return;
    setOperation("publish");
    try {
      const savedVersion = await flushSave();
      if (savedVersion === null || conflict) return;
      const action = await dispatch(publishWikiArticle({ articleId: selected.id, version: savedVersion }));
      if (publishWikiArticle.fulfilled.match(action)) { dispatch(invalidateWikiPublicCache()); await refreshStructure(selected.id); }
      else if (action.payload?.code === "40001") setConflict(true);
    } finally { setOperation(null); }
  };
  const unpublish = async () => {
    if (!selected?.current_revision_id || isLocked) return;
    setOperation("unpublish");
    try {
      const action = await dispatch(unpublishWikiArticle({ articleId: selected.id, revisionId: selected.current_revision_id }));
      if (unpublishWikiArticle.fulfilled.match(action)) { dispatch(invalidateWikiPublicCache()); await refreshStructure(selected.id); }
      else if (action.payload?.code === "40001") setConflict(true);
    } finally { setOperation(null); }
  };
  const restoreRevision = async () => {
    if (!selected || !revisionToRestore || isLocked) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setOperation("restore");
    try {
      const action = await dispatch(restoreWikiRevision({ articleId: selected.id, revisionId: revisionToRestore.id, version: versionRef.current }));
      if (!restoreWikiRevision.fulfilled.match(action)) { if (action.payload?.code === "40001") setConflict(true); return; }
      loadedArticleId.current = null; ackRef.current = ""; setDirtyState(false); setRevisionToRestore(null);
      await refreshStructure(selected.id);
    } finally { setOperation(null); }
  };
  const selectArticle = (articleId: string) => {
    if (isLocked || (dirty && articleId !== selectedArticleId)) { if (!isLocked) setPendingArticleId(articleId); return; }
    loadedArticleId.current = null; dispatch(selectWikiAdminArticle(articleId));
  };
  const reloadServer = () => {
    if (!selected || !window.confirm("Se descartarán los cambios locales sin guardar. ¿Desea cargar la versión del servidor?")) return;
    discardPendingChanges();
    loadedArticleId.current = null; setConflict(false); void refreshStructure(selected.id);
  };
  const insertMedia = (media: { id: string }, altText: string, captionText: string) => editor?.chain().focus().insertContent({ type: "image", attrs: { mediaId: media.id, alt: altText, caption: captionText } }).run();
  const draftChangedSincePublication = Boolean(draft && draft.published_version !== draft.version);
  const canPublish = selected?.state !== "archived" && (dirty || draftChangedSincePublication);

  return <main className="min-h-screen bg-gray-50 p-4 sm:p-8"><div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
    <WikiStructureManager structure={structure} selectedArticleId={selectedArticleId} request={isLocked || dirty ? { ...editorRequest, inProgress: true } : structureActionRequest.inProgress ? structureActionRequest : structureRequest} onSelectArticle={selectArticle} onNavigate={requestNavigation} disabled={isLocked} />
    <section className="rounded-xl bg-white p-5 shadow-sm">{!selected || !draft ? <div className="py-20 text-center text-gray-600">Seleccione o cree un artículo para editarlo.</div> : <>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-gray-500">{selected.state === "archived" ? "Archivado" : dirty ? "Cambios sin guardar" : selected.state === "published" ? "Publicado" : "Borrador"}</p>{editorRequest.messages && <p className={`text-sm ${editorRequest.ok ? "text-green-700" : "text-red-700"}`}>{editorRequest.messages}</p>}</div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void flushSave()} disabled={isLocked || selected.state === "archived" || !dirty} className="rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-50">Guardar borrador</button>
      <button type="button" onClick={() => void publish()} disabled={isLocked || !canPublish} className="rounded bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50">{selected.state === "published" ? "Publicar cambios" : "Publicar"}</button>
      {selected.current_revision_id && <button type="button" onClick={() => void unpublish()} disabled={isLocked} className="rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-50">Despublicar</button>}
      <button type="button" onClick={() => setPreview((value) => !value)} disabled={isLocked} className="rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-50">{preview ? "Editar" : "Vista previa"}</button></div></div>
      {conflict && <div role="alert" className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">El borrador cambió en otra sesión. Sus cambios locales se conservan, pero no se guardarán ni publicarán automáticamente.<button type="button" className="ml-2 underline" onClick={reloadServer}>Cargar versión del servidor</button></div>}
      {preview ? <article className="prose mt-6 max-w-none"><h1>{title}</h1><p>{summary}</p><WikiContent nodes={toWikiDocument(editor?.getJSON())?.content ?? emptyDoc.content} /></article> : <div className="mt-6 space-y-4"><label className="block text-sm font-medium text-gray-700" htmlFor="wiki-title">Título<input id="wiki-title" value={title} disabled={isLocked || selected.state === "archived"} onChange={(event) => updateTitle(event.target.value)} maxLength={180} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 disabled:opacity-50" /></label><label className="block text-sm font-medium text-gray-700" htmlFor="wiki-summary">Resumen<textarea id="wiki-summary" value={summary} disabled={isLocked || selected.state === "archived"} onChange={(event) => updateSummary(event.target.value)} maxLength={500} rows={3} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 disabled:opacity-50" /></label><WikiEditorToolbar editor={editor} disabled={isLocked || selected.state === "archived"} onError={setContentError} />{contentError && <p role="alert" className="text-sm text-red-700">{contentError}</p>}<EditorContent editor={editor} className="min-h-80 rounded border border-gray-300 p-4 [&_.ProseMirror]:min-h-72 [&_.ProseMirror]:outline-none" /><WikiMediaLibrary media={media} request={mediaRequest} onInsert={insertMedia} /></div>}
      <section className="mt-8 border-t border-gray-200 pt-5"><h2 className="text-base font-semibold">Historial de publicaciones</h2>{history.length === 0 ? <p className="mt-2 text-sm text-gray-500">Todavía no hay publicaciones.</p> : <ul className="mt-3 space-y-2">{history.map((revision) => <li key={revision.id} className="flex flex-wrap items-center justify-between gap-3 rounded bg-gray-50 p-3 text-sm"><span>v{revision.version} · {revision.title} · {new Date(revision.published_at).toLocaleString("es-ES")}{revision.id === selected.current_revision_id ? " · Actual" : ""}</span><button type="button" onClick={() => setRevisionToRestore(revision)} disabled={isLocked || selected.state === "archived"} className="underline disabled:opacity-50">Restaurar como borrador</button></li>)}</ul>}</section>
    </>}</section></div>
    {pendingArticleId && <Alert title="Cambios sin guardar" description="Si cambia de artículo, se descartarán los cambios que todavía no se han guardado." onAccept={() => { discardPendingChanges(); loadedArticleId.current = null; dispatch(selectWikiAdminArticle(pendingArticleId)); setPendingArticleId(null); }} onCancel={() => setPendingArticleId(null)} />}
    {pendingNavigation && <Alert title="Cambios sin guardar" description="Si sale de este editor, se descartarán los cambios que todavía no se han guardado." onAccept={() => { const navigateAway = pendingNavigation; discardPendingChanges(); setPendingNavigation(null); navigateAway(); }} onCancel={() => setPendingNavigation(null)} />}
    {revisionToRestore && <Alert title="Restaurar revisión" description="La revisión elegida reemplazará el borrador actual. Podrá revisarla antes de volver a publicarla." onAccept={() => void restoreRevision()} onCancel={() => setRevisionToRestore(null)} disabledConfirmButton={isLocked} />}
  </main>;
};
