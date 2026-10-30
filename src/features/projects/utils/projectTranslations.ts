import { isSiteLanguage, type SiteLanguage } from "@/helpers/siteLanguages";

export type ProjectTranslation = {
  project_id: string;
  language: SiteLanguage;
  original_language: SiteLanguage;
  title: string | null;
  description: string | null;
  keywords: string | null;
  created_at?: string;
  updated_at?: string;
};

export type TranslationDraft = Pick<ProjectTranslation, "title" | "description" | "keywords">;

export function validateTranslation(
  language: unknown,
  originalLanguage: unknown,
  draft: TranslationDraft,
): TranslationDraft {
  if (!isSiteLanguage(language) || !isSiteLanguage(originalLanguage) ||
      language === originalLanguage) {
    throw new Error("Invalid translation language");
  }
  const normalized = Object.fromEntries(
    (["title", "description", "keywords"] as const).map((field) => {
      const value = draft[field];
      if (value !== null && typeof value !== "string") {
        throw new Error("Invalid translation content");
      }
      return [field, value?.trim() || null];
    }),
  ) as TranslationDraft;
  if (!Object.values(normalized).some(Boolean)) {
    throw new Error("Empty translation");
  }
  return normalized;
}
