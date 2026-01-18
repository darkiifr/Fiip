import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import all JSON files from locales directory automatically
const locales = import.meta.glob('./locales/*.json', { eager: true });
const resources = {};

for (const path in locales) {
  // Extract locale name from path (e.g. "./locales/fr.json" -> "fr" or "fr-CA")
  const locale = path.match(/\/([^/]+)\.json$/)[1];
  resources[locale] = {
    translation: locales[path].default || locales[path]
  };
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false // react already safes from xss
    },
    react: {
      useSuspense: false
    }
  });

export default i18n;
