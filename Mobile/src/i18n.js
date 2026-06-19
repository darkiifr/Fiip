import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';

import ar from './locales/ar.json';
import bg from './locales/bg.json';
import br from './locales/br.json';
import ca from './locales/ca.json';
import co from './locales/co.json';
import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fa from './locales/fa.json';
import fr from './locales/fr.json';
import hr from './locales/hr.json';
import hy from './locales/hy.json';
import it from './locales/it.json';
import ja from './locales/ja.json';
import nl from './locales/nl.json';
import pl from './locales/pl.json';
import pt from './locales/pt.json';
import ru from './locales/ru.json';
import sl from './locales/sl.json';
import uk from './locales/uk.json';

const resources = {
  ar: { translation: ar },
  bg: { translation: bg },
  br: { translation: br },
  ca: { translation: ca },
  co: { translation: co },
  de: { translation: de },
  en: { translation: en },
  es: { translation: es },
  fa: { translation: fa },
  fr: { translation: fr },
  hr: { translation: hr },
  hy: { translation: hy },
  it: { translation: it },
  ja: { translation: ja },
  nl: { translation: nl },
  pl: { translation: pl },
  pt: { translation: pt },
  ru: { translation: ru },
  sl: { translation: sl },
  uk: { translation: uk },
};

const languageDetector = {
  type: 'languageDetector',
  async: true,
  detect: (callback) => {
    const bestLanguage = RNLocalize.findBestLanguageTag(Object.keys(resources));
    callback(bestLanguage?.languageTag || 'fr');
  },
  init: () => {},
  cacheUserLanguage: () => {},
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false, 
    },
    compatibilityJSON: 'v3',
  });

export default i18n;