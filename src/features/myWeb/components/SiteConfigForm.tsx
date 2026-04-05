import React, {
  useState,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import { SiteDataProps } from "../../../types";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { updateSite, uploadSiteImage } from "../../../redux/actions/SiteActions";
import { InputField } from "../../../components/shared/ui/InputField";
import { ImageUploader } from "./ImageUploader";
import { ColorPicker } from "./ColorPicker";
import { FontSelector } from "./FontSelector";
import { NavbarTypeSelector } from "./NavbarTypeSelector";

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
    font: site.font || "Inter",
    navbar_type: site.navbar_type ?? 1,
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
      font: site.font || "Inter",
      navbar_type: site.navbar_type ?? 1,
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

    dispatch(
      updateSite({
        siteId: site.id,
        updates: {
          studio_name: form.studio_name,
          slug: form.slug,
          primary_color: form.primary_color,
          secondary_color: form.secondary_color,
          font: form.font,
          navbar_type: form.navbar_type,
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
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-black">Configuración general</h2>

      {/* Nombre + slug */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          label="Nombre del estudio"
          id="studio_name"
          type="text"
          value={form.studio_name}
          onChange={handleChange}
          required
          placeholder="Mi Estudio"
        />
        <InputField
          label="Slug"
          id="slug"
          type="text"
          value={form.slug}
          onChange={handleChange}
          required
          error={slugError}
          helperText="Se usa en la URL de tu web"
          placeholder="mi-estudio"
        />
      </div>

      {/* Logo + Favicon */}
      <div className="grid grid-cols-2 gap-4">
        <ImageUploader
          label="Logo"
          currentUrl={site.logo_url}
          onUpload={(file) => handleImageUpload("logo_url", "logo.webp", file)}
          loading={uploadRequest.inProgress}
          variant="logo"
        />
        <ImageUploader
          label="Favicon (opcional)"
          currentUrl={site.favicon_url}
          onUpload={(file) =>
            handleImageUpload("favicon_url", "favicon.webp", file)
          }
          loading={uploadRequest.inProgress}
          variant="logo"
        />
      </div>

      {/* Colores + fuente */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ColorPicker
          label="Color primario"
          value={form.primary_color}
          onChange={(color) =>
            setForm((prev) => ({ ...prev, primary_color: color }))
          }
        />
        <ColorPicker
          label="Color secundario"
          value={form.secondary_color}
          onChange={(color) =>
            setForm((prev) => ({ ...prev, secondary_color: color }))
          }
        />
        <FontSelector
          value={form.font}
          onChange={(font) => setForm((prev) => ({ ...prev, font }))}
        />
      </div>

      {/* Tipo de navegación */}
      <NavbarTypeSelector
        value={form.navbar_type}
        onChange={(navbar_type) =>
          setForm((prev) => ({ ...prev, navbar_type }))
        }
      />

      {/* Redes sociales */}
      <div>
        <p className="text-sm font-medium text-black mb-3">Redes sociales</p>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 shrink-0">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </span>
            <div className="flex-1">
              <InputField
                label="Instagram"
                id="instagram_url"
                type="text"
                value={form.instagram_url}
                onChange={handleChange}
                placeholder="https://instagram.com/tu-perfil"
                error={urlErrors.instagram_url}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400 shrink-0">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </span>
            <div className="flex-1">
              <InputField
                label="Facebook"
                id="facebook_url"
                type="text"
                value={form.facebook_url}
                onChange={handleChange}
                placeholder="https://facebook.com/tu-perfil"
                error={urlErrors.facebook_url}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400 shrink-0">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </span>
            <div className="flex-1">
              <InputField
                label="LinkedIn"
                id="linkedin_url"
                type="text"
                value={form.linkedin_url}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/tu-perfil"
                error={urlErrors.linkedin_url}
              />
            </div>
          </div>
        </div>
      </div>

      {/* SEO */}
      <InputField
        label="Descripción SEO (opcional)"
        id="meta_description"
        type="textarea"
        value={form.meta_description}
        onChange={handleChange}
        placeholder="Descripción de tu estudio para motores de búsqueda..."
      />

      {/* Feedback */}
      {saveRequest.inProgress && (
        <span className="text-sm text-gray-500">Guardando...</span>
      )}
      {saved && (
        <span className="text-sm text-green-600">Guardado correctamente</span>
      )}
      {saveRequest.messages && !saveRequest.ok && (
        <span className="text-sm text-red-600">{saveRequest.messages}</span>
      )}
    </div>
  );
});
