export const SITE_LANGUAGES = ["es", "en", "ca"] as const;
export type SiteLanguage = (typeof SITE_LANGUAGES)[number];

export interface SiteLanguageSettings {
  enabled_languages: SiteLanguage[];
  default_language: SiteLanguage;
  multilanguage: boolean;
}

interface LanguageInput {
  enabled_languages?: unknown;
  default_language?: unknown;
  multilanguage?: unknown;
}

export function isSiteLanguage(value: unknown): value is SiteLanguage {
  return SITE_LANGUAGES.some((language) => language === value);
}

function isValidList(value: unknown): value is SiteLanguage[] {
  return Array.isArray(value) && value.length > 0 &&
    value.every(isSiteLanguage) && new Set(value).size === value.length;
}

function canonicalOrder(languages: SiteLanguage[]): SiteLanguage[] {
  return SITE_LANGUAGES.filter((language) => languages.includes(language));
}

// Reads preserve legacy ES/EN behavior; malformed explicit lists do not opt in CA.
export function resolveSiteLanguages(input: LanguageInput): SiteLanguageSettings {
  const enabled = canonicalOrder(isValidList(input.enabled_languages)
    ? input.enabled_languages
    : input.multilanguage === true
      ? ["es", "en"]
      : [isSiteLanguage(input.default_language) ? input.default_language : "en"]);
  const defaultLanguage = isSiteLanguage(input.default_language) &&
    enabled.includes(input.default_language)
    ? input.default_language
    : enabled.includes("en") ? "en" : enabled[0];
  return {
    enabled_languages: enabled,
    default_language: defaultLanguage,
    multilanguage: enabled.length > 1,
  };
}

// Writes require the full tuple: never repair invalid persisted user input silently.
export function validateSiteLanguages(input: LanguageInput): SiteLanguageSettings {
  if (!isValidList(input.enabled_languages) ||
      !isSiteLanguage(input.default_language) ||
      !input.enabled_languages.includes(input.default_language) ||
      typeof input.multilanguage !== "boolean") {
    throw new Error("Selecciona al menos un idioma válido y un idioma por defecto habilitado.");
  }
  return {
    enabled_languages: canonicalOrder(input.enabled_languages),
    default_language: input.default_language,
    multilanguage: input.enabled_languages.length > 1,
  };
}

export function toggleSiteLanguage(
  settings: SiteLanguageSettings,
  language: SiteLanguage,
): SiteLanguageSettings {
  const selected = settings.enabled_languages.includes(language);
  if (selected && settings.enabled_languages.length === 1) return settings;
  const enabled = canonicalOrder(selected
    ? settings.enabled_languages.filter((value) => value !== language)
    : [...settings.enabled_languages, language]);
  return {
    enabled_languages: enabled,
    default_language: enabled.includes(settings.default_language)
      ? settings.default_language : enabled[0],
    multilanguage: enabled.length > 1,
  };
}
