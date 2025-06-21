import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";

import translationES from "./locales/es/translation.json";
import translationEN from "./locales/en/translation.json";
import translationCAT from "./locales/cat/translation.json";

const resources = {
  es: {
    translation: translationES,
  },
  en: {
    translation: translationEN,
  },
  cat: {
    translation: translationCAT,
  },
};

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "es",
    debug: false,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
