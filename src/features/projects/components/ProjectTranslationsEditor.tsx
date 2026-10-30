import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch } from "@/redux/hooks";
import { SITE_LANGUAGES, type SiteLanguage } from "@/helpers/siteLanguages";
import {
  fetchProjectTranslations, saveProjectOriginalLanguage,
  saveProjectTranslation, deleteProjectTranslation,
} from "@/redux/actions/ProjectTranslationActions";
import { InputField } from "@/components/shared/ui/InputField";
import { KeywordInput } from "@/components/shared/ui/KeywordInput";
import { PillButton } from "@/components/shared/ui/PillButton";
import type { IRequest } from "@/types";
import type { ProjectTranslation, TranslationDraft } from "../utils/projectTranslations";
import {
  readTranslationDraft, rememberTranslationDraft, clearTranslationDraft,
  type ProjectTranslationEditorDraft,
} from "../utils/projectTranslationDrafts";
import { projectControlClassName, projectPanelClassName, projectLegendClassName } from "./projectFormStyles";

export type RegisterTranslationGuard = (guard: (() => boolean) | null) => void;
const emptyDraft = (): TranslationDraft => ({ title: "", description: "", keywords: "" });
const asDraft = (row?: ProjectTranslation): TranslationDraft => ({
  title: row?.title ?? "", description: row?.description ?? "", keywords: row?.keywords ?? "",
});

export function ProjectTranslationsEditor({ projectId, draftOwnerId, registerGuard, disabled = false }: {
  projectId?: string;
  draftOwnerId: string;
  registerGuard: RegisterTranslationGuard;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [original, setOriginal] = useState<SiteLanguage | null>(null);
  const [originalDraft, setOriginalDraft] = useState<SiteLanguage | "">("");
  const [rows, setRows] = useState<ProjectTranslation[]>([]);
  const [language, setLanguage] = useState<SiteLanguage>("en");
  const [draft, setDraft] = useState<TranslationDraft>(emptyDraft);
  const [loaded, setLoaded] = useState(false);
  const pendingDraft = useRef<ProjectTranslationEditorDraft | null | undefined>(undefined);
  const [reload, setReload] = useState(0);
  const [request, setRequest] = useState<IRequest>({ inProgress: false, messages: "", ok: false });
  const saved = asDraft(rows.find((row) => row.language === language));
  const translationDirty = (["title", "description", "keywords"] as const)
    .some((field) => draft[field] !== saved[field]);
  const dirty = originalDraft !== (original ?? "") || translationDirty;
  const busy = request.inProgress || disabled || (!!projectId && !loaded);
  const text = (key: string) => t(`projects.translations.${key}`);
  const localeLabel = (locale: SiteLanguage) => `${locale === "ca" ? "CAT" : locale.toUpperCase()} — ${text(locale)}`;

  useLayoutEffect(() => {
    pendingDraft.current = !loaded ? undefined : dirty
      ? { originalLanguage: originalDraft, language, fields: { ...draft } }
      : null;
  });

  useEffect(() => () => {
    if (!projectId || pendingDraft.current === undefined) return;
    if (pendingDraft.current) rememberTranslationDraft(draftOwnerId, projectId, pendingDraft.current);
    else clearTranslationDraft(draftOwnerId, projectId);
  }, [draftOwnerId, projectId]);

  useEffect(() => {
    if (!projectId) return;
    let active = true;
    const task = dispatch(fetchProjectTranslations(projectId));
    task.unwrap().then((data) => {
      if (!active) return;
      const recovered = readTranslationDraft(draftOwnerId, projectId);
      setOriginal(data.originalLanguage);
      setOriginalDraft(recovered?.originalLanguage ?? data.originalLanguage ?? "");
      setRows(data.translations);
      const selected = recovered?.language ?? SITE_LANGUAGES.find((code) => code !== data.originalLanguage)!;
      setLanguage(selected);
      setDraft(recovered?.fields ?? asDraft(data.translations.find((row) => row.language === selected)));
      setLoaded(true);
      setRequest({ inProgress: false, messages: recovered ? "restored" : "", ok: !!recovered });
    }).catch(() => {
      if (active) setRequest({ inProgress: false, messages: "loadError", ok: false });
    });
    return () => { active = false; task.abort(); };
  }, [dispatch, draftOwnerId, projectId, reload]);

  useEffect(() => {
    registerGuard(() => {
      if (request.inProgress) return false;
      if (!dirty) return true;
      if (!window.confirm(t("projects.translations.discard"))) return false;
      // Explicit discard must not be restored by the route-unmount cache.
      pendingDraft.current = null;
      if (projectId) clearTranslationDraft(draftOwnerId, projectId);
      setOriginalDraft(original ?? "");
      setDraft(asDraft(rows.find((row) => row.language === language)));
      return true;
    });
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty || request.inProgress) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => { registerGuard(null); window.removeEventListener("beforeunload", beforeUnload); };
  }, [dirty, request.inProgress, registerGuard, t, projectId, draftOwnerId, original, rows, language]);

  const chooseLanguage = (next: SiteLanguage) => {
    if (dirty && !window.confirm(text("discard"))) return;
    setOriginalDraft(original ?? "");
    setLanguage(next);
    setDraft(asDraft(rows.find((row) => row.language === next)));
    setRequest({ inProgress: false, messages: "", ok: false });
  };

  const saveOriginal = async () => {
    if (!projectId || !originalDraft || busy) return;
    setRequest({ inProgress: true, messages: "", ok: false });
    try {
      const next = await dispatch(saveProjectOriginalLanguage({ projectId, language: originalDraft })).unwrap();
      setOriginal(next);
      setRows((current) => current.map((row) => ({ ...row, original_language: next })));
      if (language === next) {
        const selected = SITE_LANGUAGES.find((code) => code !== next)!;
        setLanguage(selected);
        setDraft(asDraft(rows.find((row) => row.language === selected)));
      }
      setRequest({ inProgress: false, messages: "originalSaved", ok: true });
    } catch {
      setRequest({ inProgress: false, messages: "originalError", ok: false });
    }
  };

  const saveVersion = async () => {
    if (!projectId || !original || busy) return;
    setRequest({ inProgress: true, messages: "", ok: false });
    try {
      const row = await dispatch(saveProjectTranslation({ projectId, language, originalLanguage: original, draft })).unwrap();
      setRows((current) => [...current.filter((item) => item.language !== language), row]);
      setDraft(asDraft(row));
      setRequest({ inProgress: false, messages: "saved", ok: true });
    } catch {
      setRequest({ inProgress: false, messages: "saveError", ok: false });
    }
  };

  const removeVersion = async () => {
    if (!projectId || busy || !window.confirm(text("deleteConfirm"))) return;
    setRequest({ inProgress: true, messages: "", ok: false });
    try {
      await dispatch(deleteProjectTranslation({ projectId, language })).unwrap();
      setRows((current) => current.filter((row) => row.language !== language));
      setDraft(emptyDraft());
      setRequest({ inProgress: false, messages: "deleted", ok: true });
    } catch {
      setRequest({ inProgress: false, messages: "deleteError", ok: false });
    }
  };

  return (
    <fieldset className={projectPanelClassName} onKeyDown={(event) => {
      // Enter in translation inputs must never submit the original project form.
      if (event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault();
    }}>
      <legend className={projectLegendClassName}>{text("heading")}</legend>
      <p className="mb-4 text-sm text-[#010000]/70">{text(projectId ? "help" : "createFirst")}</p>
      {projectId && <>
        {!loaded && !request.messages && <p role="status">{text("loading")}</p>}
        {request.messages && <p role={request.ok ? "status" : "alert"} className="mb-4 text-sm">{text(request.messages)}</p>}
        {!loaded && request.messages && <PillButton type="button" onClick={() => setReload((value) => value + 1)}>{text("retry")}</PillButton>}
        {loaded && <div className="space-y-4">
          <label className="block" htmlFor="project-original-language">
            {text("originalLanguage")}
            <select id="project-original-language" className={projectControlClassName} value={originalDraft}
              disabled={busy || translationDirty} onChange={(event) => setOriginalDraft(event.target.value as SiteLanguage)}>
              <option value="" disabled>{text("chooseOriginal")}</option>
              {SITE_LANGUAGES.map((code) => <option key={code} value={code}
                disabled={rows.some((row) => row.language === code)}>{localeLabel(code)}</option>)}
            </select>
          </label>
          <p className="text-sm text-[#010000]/70">{text("originalHelp")}</p>
          <PillButton type="button" disabled={busy || !originalDraft || originalDraft === original} onClick={saveOriginal}>
            {text("saveOriginal")}
          </PillButton>
          {original && <fieldset disabled={busy || originalDraft !== original} className="space-y-4">
            <label className="block" htmlFor="project-translation-language">
              {text("language")}
              <select id="project-translation-language" className={projectControlClassName} value={language}
                onChange={(event) => chooseLanguage(event.target.value as SiteLanguage)}>
                {SITE_LANGUAGES.filter((code) => code !== original).map((code) => <option key={code} value={code}>
                  {localeLabel(code)} — {text(rows.some((row) => row.language === code) ? "existing" : "new")}
                </option>)}
              </select>
            </label>
            <p className="text-sm text-[#010000]/70">{text("fallback")}</p>
            <InputField id="translation-title" label={t("projects.projectTitle")} type="text" className={projectControlClassName}
              value={draft.title ?? ""} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
            <InputField id="translation-description" label={t("projects.projectDescription")} type="textarea" className={projectControlClassName}
              value={draft.description ?? ""} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
            <div className="[&_input]:bg-transparent [&>div>div]:bg-transparent [&>div>div]:rounded-2xl [&>div>div]:border-[#010000]/40">
              <KeywordInput key={`${projectId}-${language}-${request.ok}`} id="translation-keywords" label={t("projects.keywords")}
                value={draft.keywords ?? ""} onChange={(value) => setDraft({ ...draft, keywords: value })} />
            </div>
            <div className="flex flex-wrap gap-3">
              <PillButton type="button" disabled={!Object.values(draft).some((value) => value?.trim())} onClick={saveVersion}>
                {text("saveVersion")}
              </PillButton>
              {rows.some((row) => row.language === language) && <PillButton type="button" onClick={removeVersion}>{text("deleteVersion")}</PillButton>}
            </div>
          </fieldset>}
          {request.inProgress && <p role="status">{text("saving")}</p>}
        </div>}
      </>}
    </fieldset>
  );
}
