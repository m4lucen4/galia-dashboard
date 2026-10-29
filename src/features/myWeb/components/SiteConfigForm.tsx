import React, {
  useState,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import { SiteDataProps } from "@/types";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { updateSite, uploadSiteImage } from "@/redux/actions/SiteActions";
import { PillButton } from "@/components/shared/ui/PillButton";
import { SiteIdentitySection } from "@/features/myWeb/components/settings/SiteIdentitySection";
import { SiteAppearanceSection } from "@/features/myWeb/components/settings/SiteAppearanceSection";
import { SiteNavigationSection } from "@/features/myWeb/components/settings/SiteNavigationSection";
import { SiteLanguageSection } from "@/features/myWeb/components/settings/SiteLanguageSection";
import { SiteDiscoverySection } from "@/features/myWeb/components/settings/SiteDiscoverySection";
import {
  myWebHeadingClassName,
  myWebLegacyControlsClassName,
  myWebMutedClassName,
} from "@/features/myWeb/components/myWebStyles";
import {
  resolveSiteLanguages,
  toggleSiteLanguage,
  validateSiteLanguages,
} from "@/helpers/siteLanguages";

export interface SiteConfigFormHandle {
  save: () => void;
  canSave: boolean;
}

interface SiteConfigFormProps {
  site: SiteDataProps;
}

function validateUrl(value: string): string {
  if (!value) return "";
  if (!value.startsWith("https://")) return "La URL debe empezar por https://";
  return "";
}

export const SiteConfigForm = forwardRef<
  SiteConfigFormHandle,
  SiteConfigFormProps
>(({ site }, ref) => {
  const dispatch = useAppDispatch();
  const { saveRequest, uploadRequest } = useAppSelector((state) => state.site);

  const [form, setForm] = useState({
    studio_name: site.studio_name || "",
    slug: site.slug || "",
    primary_color: site.primary_color || "#2D3436",
    secondary_color: site.secondary_color || "#636E72",
    background_color: site.background_color || "#FFFFFF",
    tertiary_color: site.tertiary_color || "#F5F5F5",
    font: site.font || "Inter",
    title_font: site.title_font || "Inter",
    navbar_type: site.navbar_type ?? 1,
    navbar_transparent: site.navbar_transparent ?? false,
    navbar_hidden: site.navbar_hidden ?? false,
    footer_hidden: site.footer_hidden ?? false,
    full_width: site.full_width ?? false,
    ...resolveSiteLanguages(site),
    instagram_url: site.instagram_url || "",
    facebook_url: site.facebook_url || "",
    linkedin_url: site.linkedin_url || "",
    meta_description: site.meta_description || "",
  });

  const [slugError, setSlugError] = useState("");
  const [urlErrors, setUrlErrors] = useState({
    instagram_url: "",
    facebook_url: "",
    linkedin_url: "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({
      studio_name: site.studio_name || "",
      slug: site.slug || "",
      primary_color: site.primary_color || "#2D3436",
      secondary_color: site.secondary_color || "#636E72",
      background_color: site.background_color || "#FFFFFF",
      tertiary_color: site.tertiary_color || "#F5F5F5",
      font: site.font || "Inter",
      title_font: site.title_font || "Inter",
      navbar_type: site.navbar_type ?? 1,
      navbar_transparent: site.navbar_transparent ?? false,
      navbar_hidden: site.navbar_hidden ?? false,
      footer_hidden: site.footer_hidden ?? false,
      full_width: site.full_width ?? false,
      ...resolveSiteLanguages(site),
      instagram_url: site.instagram_url || "",
      facebook_url: site.facebook_url || "",
      linkedin_url: site.linkedin_url || "",
      meta_description: site.meta_description || "",
    });
  }, [site]);

  useEffect(() => {
    if (saveRequest.ok && !saveRequest.inProgress) {
      setSaved(true);
      const timer = setTimeout(() => setSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [saveRequest.ok, saveRequest.inProgress]);

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .normalize("NFD")
      .replaceAll(/[\u0300-\u036f]/g, "")
      .replaceAll(/[^a-z0-9\s-]/g, "")
      .replaceAll(/\s+/g, "-")
      .replaceAll(/-+/g, "-")
      .replaceAll(/^-|-$/g, "");

  const validateSlug = (slug: string) =>
    !/^[a-z0-9-]+$/.test(slug)
      ? "Solo letras minúsculas, números y guiones"
      : "";

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "studio_name") {
        updated.slug = generateSlug(value);
        setSlugError("");
      }
      if (name === "slug") setSlugError(validateSlug(value));
      if (name === "instagram_url" || name === "facebook_url" || name === "linkedin_url") {
        setUrlErrors((prev) => ({
          ...prev,
          [name]: validateUrl(value),
        }));
      }
      return updated;
    });
  };

  const hasUrlErrors = Object.values(urlErrors).some(Boolean);

  const handleSave = useCallback(() => {
    if (slugError || hasUrlErrors) return;
    const slugValidation = validateSlug(form.slug);
    if (slugValidation) {
      setSlugError(slugValidation);
      return;
    }

    const languages = validateSiteLanguages(form);
    dispatch(
      updateSite({
        siteId: site.id,
        updates: {
          studio_name: form.studio_name,
          slug: form.slug,
          primary_color: form.primary_color,
          secondary_color: form.secondary_color,
          background_color: form.background_color,
          tertiary_color: form.tertiary_color,
          font: form.font,
          title_font: form.title_font,
          navbar_type: form.navbar_type,
          navbar_transparent: form.navbar_transparent,
          navbar_hidden: form.navbar_hidden,
          footer_hidden: form.footer_hidden,
          full_width: form.full_width,
          enabled_languages: languages.enabled_languages,
          default_language: languages.default_language,
          multilanguage: languages.multilanguage,
          instagram_url: form.instagram_url || null,
          facebook_url: form.facebook_url || null,
          linkedin_url: form.linkedin_url || null,
          meta_description: form.meta_description || null,
        },
      }),
    );
  }, [dispatch, site.id, form, slugError, hasUrlErrors]);

  const canSave =
    !saveRequest.inProgress &&
    !slugError &&
    !hasUrlErrors &&
    !!form.studio_name &&
    !!form.slug;

  useImperativeHandle(
    ref,
    () => ({ save: handleSave, canSave }),
    [handleSave, canSave],
  );

  const handleImageUpload = (
    field: "logo_url" | "favicon_url",
    path: string,
    file: File,
  ) => {
    dispatch(uploadSiteImage({ file, path, siteId: site.id, field }));
  };

  return (
    <div className={`${myWebLegacyControlsClassName} space-y-5 text-[#010000]`}>
      <div className="space-y-1">
        <h2 className={myWebHeadingClassName}>Configuración general</h2>
        <p className={myWebMutedClassName}>Prepara la identidad, la apariencia y los idiomas de tu web. Guarda los ajustes cuando termines.</p>
      </div>
      <SiteIdentitySection
        draft={form}
        slugError={slugError}
        logoUrl={site.logo_url}
        faviconUrl={site.favicon_url}
        uploading={uploadRequest.inProgress}
        onInputChange={handleChange}
        onUpload={handleImageUpload}
        onRemove={(field) => dispatch(updateSite({
          siteId: site.id,
          updates: field === "logo_url" ? { logo_url: "" } : { favicon_url: null },
        }))}
      />
      <SiteAppearanceSection draft={form} onChange={(updates) => setForm((prev) => ({ ...prev, ...updates }))} />
      <SiteNavigationSection draft={form} onChange={(updates) => setForm((prev) => ({ ...prev, ...updates }))} />
      <SiteLanguageSection
        draft={form}
        onToggle={(language) => setForm((prev) => ({ ...prev, ...toggleSiteLanguage(prev, language) }))}
        onDefaultChange={(language) => setForm((prev) => ({ ...prev, default_language: language }))}
      />
      <SiteDiscoverySection draft={form} urlErrors={urlErrors} onInputChange={handleChange} />
      <div className="flex min-w-0 flex-wrap items-center gap-4 rounded-[28px] border border-[#010000]/20 p-5">
        <PillButton disabled={!canSave} onClick={handleSave}>
          {saveRequest.inProgress ? "Guardando…" : "Guardar configuración"}
        </PillButton>
        <div role="status" aria-live="polite" className="text-sm">
          {saveRequest.inProgress && <p>Guardando...</p>}
          {saved && <p>Guardado correctamente</p>}
        </div>
        {saveRequest.messages && !saveRequest.ok && (
          <p role="alert" className="min-w-0 break-words text-sm text-red-700">{saveRequest.messages}</p>
        )}
      </div>
    </div>
  );
});
