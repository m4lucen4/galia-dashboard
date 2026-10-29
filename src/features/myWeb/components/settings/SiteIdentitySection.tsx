import type { ChangeEvent } from "react";
import { InputField } from "@/components/shared/ui/InputField";
import { myWebFieldGridClassName } from "@/features/myWeb/components/myWebStyles";
import { ImageUploader } from "@/features/myWeb/components/ImageUploader";
import {
  SettingsSection,
  type SiteSettingsDraft,
} from "@/features/myWeb/components/settings/SettingsSection";

interface SiteIdentitySectionProps {
  draft: SiteSettingsDraft;
  slugError: string;
  logoUrl: string;
  faviconUrl?: string | null;
  uploading: boolean;
  onInputChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onUpload: (field: "logo_url" | "favicon_url", path: string, file: File) => void;
  onRemove: (field: "logo_url" | "favicon_url") => void;
}

export function SiteIdentitySection({
  draft,
  slugError,
  logoUrl,
  faviconUrl,
  uploading,
  onInputChange,
  onUpload,
  onRemove,
}: Readonly<SiteIdentitySectionProps>) {
  return (
    <SettingsSection
      title="Identidad del estudio"
      description="Define cómo se presenta tu estudio y la dirección de tu web."
    >
      <div className="grid min-w-0 grid-cols-1 gap-6 @min-[52rem]:grid-cols-2">
        <div className="min-w-0 space-y-4">
          <InputField
            label="Nombre del estudio"
            id="studio_name"
            type="text"
            value={draft.studio_name}
            onChange={onInputChange}
            required
            placeholder="Mi Estudio"
          />
          <InputField
            label="Dirección de la web (slug)"
            id="slug"
            type="text"
            value={draft.slug}
            onChange={onInputChange}
            required
            error={slugError}
            helperText="Se usa en la URL de tu web"
            placeholder="mi-estudio"
          />
        </div>
        <div className={myWebFieldGridClassName}>
          <ImageUploader
            label="Logo"
            currentUrl={logoUrl}
            onUpload={(file) => onUpload("logo_url", "logo.webp", file)}
            onRemove={() => onRemove("logo_url")}
            loading={uploading}
            variant="logo"
          />
          <ImageUploader
            label="Favicon (opcional)"
            currentUrl={faviconUrl}
            onUpload={(file) => onUpload("favicon_url", "favicon.webp", file)}
            onRemove={() => onRemove("favicon_url")}
            loading={uploading}
            variant="logo"
          />
        </div>
      </div>
      <p className="text-sm text-[#010000]/65">
        El logo y el favicon se actualizan al subirlos o eliminarlos.
        El resto de ajustes se aplica al guardar.
      </p>
    </SettingsSection>
  );
}
