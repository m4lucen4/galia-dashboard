import { createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "@/helpers/supabase";
import { isSiteLanguage, type SiteLanguage } from "@/helpers/siteLanguages";
import {
  validateTranslation,
  type ProjectTranslation,
  type TranslationDraft,
} from "@/features/projects/utils/projectTranslations";

export const fetchProjectTranslations = createAsyncThunk(
  "projectTranslations/fetch",
  async (projectId: string) => {
    const [settings, translations] = await Promise.all([
      supabase.from("project_translation_settings").select("original_language")
        .eq("project_id", projectId).maybeSingle(),
      supabase.from("project_translations").select("*").eq("project_id", projectId),
    ]);
    if (settings.error) throw settings.error;
    if (translations.error) throw translations.error;
    return {
      originalLanguage: (settings.data?.original_language ?? null) as SiteLanguage | null,
      translations: (translations.data ?? []) as ProjectTranslation[],
    };
  },
);

export const saveProjectOriginalLanguage = createAsyncThunk(
  "projectTranslations/saveOriginal",
  async ({ projectId, language }: { projectId: string; language: SiteLanguage }) => {
    if (!isSiteLanguage(language)) throw new Error("Invalid original language");
    const { data, error } = await supabase.from("project_translation_settings")
      .upsert({ project_id: projectId, original_language: language }, { onConflict: "project_id" })
      .select("original_language").single();
    if (error) throw error;
    return data.original_language as SiteLanguage;
  },
);

export const saveProjectTranslation = createAsyncThunk(
  "projectTranslations/save",
  async ({ projectId, language, originalLanguage, draft }: {
    projectId: string;
    language: SiteLanguage;
    originalLanguage: SiteLanguage;
    draft: TranslationDraft;
  }) => {
    const normalized = validateTranslation(language, originalLanguage, draft);
    const { data, error } = await supabase.from("project_translations").upsert({
      project_id: projectId, language, original_language: originalLanguage,
      ...normalized, updated_at: new Date().toISOString(),
    }, { onConflict: "project_id,language" }).select("*").single();
    if (error) throw error;
    return data as ProjectTranslation;
  },
);

export const deleteProjectTranslation = createAsyncThunk(
  "projectTranslations/delete",
  async ({ projectId, language }: { projectId: string; language: SiteLanguage }) => {
    if (!isSiteLanguage(language)) throw new Error("Invalid translation language");
    const { data, error } = await supabase.from("project_translations").delete()
      .eq("project_id", projectId).eq("language", language).select("language").single();
    if (error) throw error;
    return data.language as SiteLanguage;
  },
);
