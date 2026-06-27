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

const availableLanguages = Object.keys(resources);
const FALLBACK_LANGUAGES = ['fr', 'en'].filter((language) => availableLanguages.includes(language));

function normalizeLanguage(value = '') {
  const raw = String(value || '').toLowerCase();
  if (availableLanguages.includes(raw)) return raw;
  const base = raw.split('-')[0];
  if (availableLanguages.includes(base)) return base;
  return FALLBACK_LANGUAGES[0] || availableLanguages[0] || 'fr';
}

const storedLanguage = typeof localStorage !== 'undefined'
  ? normalizeLanguage(localStorage.getItem('fiip-language') || localStorage.getItem('i18nextLng') || '')
  : undefined;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: storedLanguage,
    fallbackLng: FALLBACK_LANGUAGES.length ? FALLBACK_LANGUAGES : 'fr',
    supportedLngs: availableLanguages,
    nonExplicitSupportedLngs: true, // Auto fallback "en-US" to "en" si existant
    load: 'languageOnly',
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'fiip-language',
      caches: ['localStorage'],
    },
    returnEmptyString: false,
    interpolation: {
      escapeValue: false // react already safes from xss
    },
    react: {
      useSuspense: false
    }
  });

i18n.on('languageChanged', (language) => {
  const normalized = normalizeLanguage(language);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('fiip-language', normalized);
  }
  if (language !== normalized) {
    i18n.changeLanguage(normalized);
  }
});

export default i18n;
