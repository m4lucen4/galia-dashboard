import { createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "@/helpers/supabase";
import type { WikiDocument } from "@/features/documentation/types/wiki";

export type WikiDraft = {
  version: number;
  title: string;
  summary: string;
  content: WikiDocument;
  updated_at: string;
  published_version: number | null;
};

export type WikiAdminArticle = {
  id: string;
  subsection_id: string;
  slug: string;
  position: number;
  state: "draft" | "published" | "archived";
  current_revision_id: string | null;
  draft: WikiDraft | null;
};

export type WikiAdminSubsection = {
  id: string;
  title: string;
  slug: string;
  position: number;
  wiki_articles: WikiAdminArticle[];
};

export type WikiAdminSection = {
  id: string;
  title: string;
  slug: string;
  position: number;
  wiki_subsections: WikiAdminSubsection[];
};

export type WikiRevision = {
  id: string;
  version: number;
  title: string;
  summary: string;
  published_at: string;
};

export type WikiMedia = {
  id: string;
  object_path: string;
  mime_type: string;
  byte_size: number;
  status: "pending" | "ready" | "delete_reserved";
  created_at: string;
};

export type WikiAdminFailure = { message: string; code?: string };
type Failure = WikiAdminFailure;
type RawDraft = WikiDraft | WikiDraft[] | null;
type RawArticle = Omit<WikiAdminArticle, "draft"> & { wiki_article_drafts: RawDraft };
type RawSubsection = Omit<WikiAdminSubsection, "wiki_articles"> & { wiki_articles: RawArticle[] | null };
type RawSection = Omit<WikiAdminSection, "wiki_subsections"> & { wiki_subsections: RawSubsection[] | null };

const fail = (message: string, code?: string): WikiAdminFailure => {
  if (code === "40001") return { code, message: "El borrador cambió en otra sesión. Compara o recarga la versión del servidor antes de continuar." };
  if (/referenced or missing wiki media cannot be deleted/i.test(message)) {
    return { message: "No se puede eliminar la imagen porque está referenciada, no existe o no se puede reservar." };
  }
  if (/wiki media deletion is not complete/i.test(message)) {
    return { message: "La eliminación no se ha completado. Compruebe el archivo e inténtelo de nuevo." };
  }
  if (/wiki media object is missing or not pending/i.test(message)) {
    return { message: "No se puede confirmar la imagen porque el archivo no está disponible o ya no está pendiente." };
  }
  if (/duplicate key|unique constraint/i.test(message)) {
    return { code, message: "Ese slug ya existe en este nivel. Elija uno distinto." };
  }
  if (/foreign key|violates.*constraint/i.test(message)) {
    return { message: "No se puede eliminar porque todavía contiene elementos. Eliminá o mové su contenido primero." };
  }
  return { code, message: `No se ha podido completar la operación: ${message}` };
};

const byPosition = <T extends { position: number }>(left: T, right: T) => left.position - right.position;

const normalizeDraft = (value: RawDraft): WikiDraft | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
};

const normalizeStructure = (data: RawSection[]): WikiAdminSection[] => data
  .map((section) => ({
    ...section,
    wiki_subsections: (section.wiki_subsections ?? [])
      .map((subsection) => ({
        ...subsection,
        wiki_articles: (subsection.wiki_articles ?? [])
          .map((article) => ({
            id: article.id,
            subsection_id: article.subsection_id,
            slug: article.slug,
            position: article.position,
            state: article.state,
            current_revision_id: article.current_revision_id,
            draft: normalizeDraft(article.wiki_article_drafts),
          }))
          .sort(byPosition),
      }))
      .sort(byPosition),
  }))
  .sort(byPosition);

export const fetchWikiAdminStructure = createAsyncThunk<WikiAdminSection[], void, { rejectValue: WikiAdminFailure }>(
  "wikiAdmin/structure",
  async (_, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from("wiki_sections")
      .select("id,title,slug,position,wiki_subsections(id,title,slug,position,wiki_articles(id,subsection_id,slug,position,state,current_revision_id,wiki_article_drafts(version,title,summary,content,updated_at,published_version)))")
      .order("position");

    if (error) return rejectWithValue(fail(error.message, error.code));
    return normalizeStructure((data ?? []) as RawSection[]);
  },
);

export const fetchWikiHistory = createAsyncThunk<WikiRevision[], string, { rejectValue: WikiAdminFailure }>(
  "wikiAdmin/history",
  async (articleId, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from("wiki_article_revisions")
      .select("id,version,title,summary,published_at")
      .eq("article_id", articleId)
      .order("version", { ascending: false });

    if (error) return rejectWithValue(fail(error.message, error.code));
    return (data ?? []) as WikiRevision[];
  },
);

export const createWikiSection = createAsyncThunk<string, { title: string; slug: string; position: number }, { rejectValue: Failure }>(
  "wikiAdmin/createSection",
  async (input, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from("wiki_sections")
      .insert(input)
      .select("id")
      .single();

    if (error) return rejectWithValue(fail(error.message));
    return data.id;
  },
);

export const updateWikiSection = createAsyncThunk<void, { id: string; title: string; slug: string }, { rejectValue: Failure }>(
  "wikiAdmin/updateSection",
  async (input, { rejectWithValue }) => {
    const { error } = await supabase
      .from("wiki_sections")
      .update({ title: input.title, slug: input.slug, updated_at: new Date().toISOString() })
      .eq("id", input.id);

    if (error) return rejectWithValue(fail(error.message));
  },
);

export const deleteWikiSection = createAsyncThunk<void, string, { rejectValue: Failure }>(
  "wikiAdmin/deleteSection",
  async (id, { rejectWithValue }) => {
    const { error } = await supabase.from("wiki_sections").delete().eq("id", id);
    if (error) return rejectWithValue(fail(error.message));
  },
);

export const createWikiSubsection = createAsyncThunk<string, { sectionId: string; title: string; slug: string; position: number }, { rejectValue: Failure }>(
  "wikiAdmin/createSubsection",
  async (input, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from("wiki_subsections")
      .insert({ section_id: input.sectionId, title: input.title, slug: input.slug, position: input.position })
      .select("id")
      .single();

    if (error) return rejectWithValue(fail(error.message));
    return data.id;
  },
);

export const updateWikiSubsection = createAsyncThunk<void, { id: string; title: string; slug: string }, { rejectValue: Failure }>(
  "wikiAdmin/updateSubsection",
  async (input, { rejectWithValue }) => {
    const { error } = await supabase
      .from("wiki_subsections")
      .update({ title: input.title, slug: input.slug, updated_at: new Date().toISOString() })
      .eq("id", input.id);

    if (error) return rejectWithValue(fail(error.message));
  },
);

export const deleteWikiSubsection = createAsyncThunk<void, string, { rejectValue: Failure }>(
  "wikiAdmin/deleteSubsection",
  async (id, { rejectWithValue }) => {
    const { error } = await supabase.from("wiki_subsections").delete().eq("id", id);
    if (error) return rejectWithValue(fail(error.message));
  },
);

export const createWikiArticle = createAsyncThunk<string, { subsectionId: string; slug: string; position: number; title: string }, { rejectValue: Failure }>(
  "wikiAdmin/createArticle",
  async (input, { rejectWithValue }) => {
    const { data, error } = await supabase.rpc("wiki_create_article", {
      p_subsection_id: input.subsectionId,
      p_slug: input.slug,
      p_position: input.position,
      p_title: input.title,
      p_summary: "",
      p_content: { type: "doc", content: [] },
    });

    if (error) return rejectWithValue(fail(error.message));
    return (data as Array<{ article_id: string }>)[0].article_id;
  },
);

export const moveWikiArticle = createAsyncThunk<void, { articleId: string; subsectionId: string; slug: string; position: number }, { rejectValue: Failure }>(
  "wikiAdmin/moveArticle",
  async (input, { rejectWithValue }) => {
    const { error } = await supabase.rpc("wiki_move_article", {
      p_article_id: input.articleId,
      p_subsection_id: input.subsectionId,
      p_slug: input.slug,
      p_position: input.position,
    });

    if (error) return rejectWithValue(fail(error.message));
  },
);

export const saveWikiDraft = createAsyncThunk<number, { articleId: string; version: number; title: string; summary: string; content: WikiDocument }, { rejectValue: WikiAdminFailure }>(
  "wikiAdmin/saveDraft",
  async (input, { rejectWithValue }) => {
    const { data, error } = await supabase.rpc("wiki_save_draft", {
      p_article_id: input.articleId,
      p_expected_version: input.version,
      p_title: input.title,
      p_summary: input.summary,
      p_content: input.content,
    });

    if (error) return rejectWithValue(fail(error.message, error.code));
    return (data as Array<{ version: number }>)[0].version;
  },
);

export const publishWikiArticle = createAsyncThunk<string, { articleId: string; version: number }, { rejectValue: WikiAdminFailure }>(
  "wikiAdmin/publish",
  async (input, { rejectWithValue }) => {
    const { data, error } = await supabase.rpc("wiki_publish_article", {
      p_article_id: input.articleId,
      p_expected_draft_version: input.version,
    });

    if (error) return rejectWithValue(fail(error.message, error.code));
    return (data as Array<{ revision_id: string }>)[0].revision_id;
  },
);

export const unpublishWikiArticle = createAsyncThunk<void, { articleId: string; revisionId: string }, { rejectValue: WikiAdminFailure }>(
  "wikiAdmin/unpublish",
  async (input, { rejectWithValue }) => {
    const { error } = await supabase.rpc("wiki_unpublish_article", {
      p_article_id: input.articleId,
      p_expected_revision_id: input.revisionId,
    });

    if (error) return rejectWithValue(fail(error.message, error.code));
  },
);

export const restoreWikiRevision = createAsyncThunk<number, { articleId: string; revisionId: string; version: number }, { rejectValue: WikiAdminFailure }>(
  "wikiAdmin/restore",
  async (input, { rejectWithValue }) => {
    const { data, error } = await supabase.rpc("wiki_restore_revision", {
      p_article_id: input.articleId,
      p_revision_id: input.revisionId,
      p_expected_draft_version: input.version,
    });

    if (error) return rejectWithValue(fail(error.message, error.code));
    return (data as Array<{ version: number }>)[0].version;
  },
);

export const archiveWikiArticle = createAsyncThunk<void, string, { rejectValue: Failure }>(
  "wikiAdmin/archive",
  async (id, { rejectWithValue }) => {
    const { error } = await supabase.rpc("wiki_archive_article", { p_article_id: id });
    if (error) return rejectWithValue(fail(error.message));
  },
);

export const restoreArchivedWikiArticle = createAsyncThunk<void, string, { rejectValue: Failure }>(
  "wikiAdmin/restoreArchivedArticle",
  async (id, { rejectWithValue }) => {
    const { error } = await supabase.rpc("wiki_restore_archived_article", { p_article_id: id });
    if (error) return rejectWithValue(fail(error.message));
  },
);

export const reorderWiki = createAsyncThunk<void, { parentId: string | null; ids: string[]; kind: "section" | "subsection" | "article" }, { rejectValue: Failure }>(
  "wikiAdmin/reorder",
  async (input, { rejectWithValue }) => {
    const { error } = await supabase.rpc("wiki_reorder_siblings", {
      p_parent_id: input.parentId,
      p_ordered_ids: input.ids,
      p_kind: input.kind,
    });

    if (error) return rejectWithValue(fail(error.message));
  },
);

export const fetchWikiMedia = createAsyncThunk<WikiMedia[], void, { rejectValue: Failure }>(
  "wikiAdmin/media",
  async (_, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from("wiki_media")
      .select("id,object_path,mime_type,byte_size,status,created_at")
      .order("created_at", { ascending: false });

    if (error) return rejectWithValue(fail(error.message));
    return (data ?? []) as WikiMedia[];
  },
);

export const registerWikiMedia = createAsyncThunk<Pick<WikiMedia, "id" | "object_path">, { mimeType: string; byteSize: number }, { rejectValue: Failure }>(
  "wikiAdmin/registerMedia",
  async (input, { rejectWithValue }) => {
    const { data, error } = await supabase.rpc("wiki_register_media", {
      p_mime_type: input.mimeType,
      p_byte_size: input.byteSize,
    });

    if (error) return rejectWithValue(fail(error.message));
    const result = (data as Array<{ media_id: string; object_path: string }>)[0];
    return { id: result.media_id, object_path: result.object_path };
  },
);

export const markWikiMediaReady = createAsyncThunk<void, string, { rejectValue: Failure }>(
  "wikiAdmin/markMediaReady",
  async (mediaId, { rejectWithValue }) => {
    const { error } = await supabase.rpc("wiki_mark_media_ready", { p_media_id: mediaId });
    if (error) return rejectWithValue(fail(error.message));
  },
);

export const reserveWikiMediaDeletion = createAsyncThunk<string, string, { rejectValue: Failure }>(
  "wikiAdmin/reserveMediaDeletion",
  async (mediaId, { rejectWithValue }) => {
    const { data, error } = await supabase.rpc("wiki_reserve_media_deletion", { p_media_id: mediaId });
    if (error) return rejectWithValue(fail(error.message));
    return data as string;
  },
);

export const finalizeWikiMediaDeletion = createAsyncThunk<void, string, { rejectValue: Failure }>(
  "wikiAdmin/finalizeMediaDeletion",
  async (mediaId, { rejectWithValue }) => {
    const { error } = await supabase.rpc("wiki_finalize_media_deletion", { p_media_id: mediaId });
    if (error) return rejectWithValue(fail(error.message));
  },
);
