import {
  SITE_LANGUAGES,
  type SiteLanguage,
  type SiteLanguageSettings,
} from "@/helpers/siteLanguages";
import { SettingsSection } from "@/features/myWeb/components/settings/SettingsSection";
import { myWebLabelClassName } from "@/features/myWeb/components/myWebStyles";

const LANGUAGE_LABELS = { es: "Español (ES)", en: "Inglés (EN)", ca: "Catalán (CA)" };
const languageChoiceClassName =
  "flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-[#010000]/30 px-4 py-2 text-sm focus-within:outline-2 focus-within:outline-offset-2 has-checked:border-[#010000] has-checked:bg-[#010000]/5 has-disabled:cursor-not-allowed";

interface SiteLanguageSectionProps {
  draft: SiteLanguageSettings;
  onToggle: (language: SiteLanguage) => void;
  onDefaultChange: (language: SiteLanguage) => void;
}

export function SiteLanguageSection({ draft, onToggle, onDefaultChange }: SiteLanguageSectionProps) {
  return (
    <SettingsSection
      title="Idiomas de la web"
      description="Solo se traducen los textos fijos de la interfaz, no tu contenido. El selector público aparece al elegir varios idiomas."
    >
      <fieldset className="min-w-0 space-y-3">
        <legend className={myWebLabelClassName}>
          Idiomas disponibles · selecciona al menos uno
        </legend>
        <div className="flex flex-wrap gap-3">
          {SITE_LANGUAGES.map((language) => (
            <label key={language} className={languageChoiceClassName}>
              <input
                type="checkbox"
                checked={draft.enabled_languages.includes(language)}
                disabled={draft.enabled_languages.length === 1 && draft.enabled_languages.includes(language)}
                onChange={() => onToggle(language)}
                className="size-4 accent-[#010000]"
              />
              {LANGUAGE_LABELS[language]}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="min-w-0 space-y-3">
        <legend className={myWebLabelClassName}>Idioma por defecto de la web</legend>
        <div className="flex flex-wrap gap-3">
          {draft.enabled_languages.map((language) => (
            <label key={language} className={languageChoiceClassName}>
              <input
                type="radio"
                name="default_language"
                value={language}
                checked={draft.default_language === language}
                onChange={() => onDefaultChange(language)}
                className="size-4 accent-[#010000]"
              />
              {LANGUAGE_LABELS[language]}
            </label>
          ))}
        </div>
      </fieldset>
    </SettingsSection>
  );
}
