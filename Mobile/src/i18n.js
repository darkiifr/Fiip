import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';

import en from './locales/en-US.json';
import fr from './locales/fr.json';
// ... Add other languages dynamically if we wish, or statically like desktop.

const resources = {
  en: { translation: en },
  fr: { translation: fr },
};

const languageDetector = {
  type: 'languageDetector',
  async: true,
  detect: (callback) => {
    const bestLanguage = RNLocalize.findBestLanguageTag(Object.keys(resources));
    callback(bestLanguage?.languageTag || 'en');
  },
  init: () => {},
  cacheUserLanguage: () => {},
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, 
    },
    compatibilityJSON: 'v3',
  });

export default i18n;