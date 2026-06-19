import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

// Import all JSON files from locales directory automatically
const locales = import.meta.glob('./locales/*.json', { eager: true });
const resources = {};

for (const path in locales) {
  // Extract locale name from path (e.g. "./locales/fr.json" -> "fr")
  const fileName = path.split('/').pop();
  if (fileName) {
    const locale = fileName.split('.')[0];
    resources[locale] = {
      translation: locales[path].default || locales[path]
    };
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr',
    supportedLngs: Object.keys(resources),
    nonExplicitSupportedLngs: true, // Auto fallback "en-US" to "en" si existant
    load: 'all',
    interpolation: {
      escapeValue: false // react already safes from xss
    },
    react: {
      useSuspense: false
    }
  });

export default i18n;
