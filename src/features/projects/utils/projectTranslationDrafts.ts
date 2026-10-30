import type { SiteLanguage } from "@/helpers/siteLanguages";
import type { TranslationDraft } from "./projectTranslations";

export type ProjectTranslationEditorDraft = {
  originalLanguage: SiteLanguage | "";
  language: SiteLanguage;
  fields: TranslationDraft;
};

// Same-document navigation does not fire beforeunload. Keep drafts only in this
// running app, scoped to the authenticated editor and project (never disk).
const drafts = new Map<string, ProjectTranslationEditorDraft>();
const key = (ownerId: string, projectId: string) => JSON.stringify([ownerId, projectId]);
const copy = (draft: ProjectTranslationEditorDraft): ProjectTranslationEditorDraft =>
  ({ ...draft, fields: { ...draft.fields } });

export function readTranslationDraft(ownerId: string, projectId: string) {
  const draft = drafts.get(key(ownerId, projectId));
  return draft ? copy(draft) : undefined;
}

export function rememberTranslationDraft(
  ownerId: string, projectId: string, draft: ProjectTranslationEditorDraft,
) {
  if (ownerId && projectId) drafts.set(key(ownerId, projectId), copy(draft));
}

export function clearTranslationDraft(ownerId: string, projectId: string) {
  drafts.delete(key(ownerId, projectId));
}
