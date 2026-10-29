import type { ChangeEvent } from "react";
import { InputField } from "@/components/shared/ui/InputField";
import {
  SettingsSection,
  type SiteSettingsDraft,
} from "@/features/myWeb/components/settings/SettingsSection";

interface SiteDiscoverySectionProps {
  draft: SiteSettingsDraft;
  urlErrors: { instagram_url: string; facebook_url: string; linkedin_url: string };
  onInputChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export function SiteDiscoverySection({ draft, urlErrors, onInputChange }: SiteDiscoverySectionProps) {
  return (
    <SettingsSection
      title="Redes sociales y buscadores"
      description="Ayuda a tus visitantes a encontrar tu estudio. Las direcciones de redes sociales deben empezar por https://."
    >
      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <InputField
          label="Instagram"
          id="instagram_url"
          type="text"
          value={draft.instagram_url}
          onChange={onInputChange}
          placeholder="https://instagram.com/tu-perfil"
          error={urlErrors.instagram_url}
        />
        <InputField
          label="Facebook"
          id="facebook_url"
          type="text"
          value={draft.facebook_url}
          onChange={onInputChange}
          placeholder="https://facebook.com/tu-perfil"
          error={urlErrors.facebook_url}
        />
        <InputField
          label="LinkedIn"
          id="linkedin_url"
          type="text"
          value={draft.linkedin_url}
          onChange={onInputChange}
          placeholder="https://linkedin.com/in/tu-perfil"
          error={urlErrors.linkedin_url}
        />
      </div>
      <InputField
        label="Descripción SEO (opcional)"
        id="meta_description"
        type="textarea"
        value={draft.meta_description}
        onChange={onInputChange}
        placeholder="Descripción de tu estudio para motores de búsqueda..."
      />
    </SettingsSection>
  );
}
