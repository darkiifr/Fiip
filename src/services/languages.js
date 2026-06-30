export const LANGUAGES = [
  { code: 'ar', label: 'Arabe', nativeLabel: 'العربية', flag: '🇸🇦', flagIcon: 'IconSaudiArabia' },
  { code: 'bg', label: 'Bulgare', nativeLabel: 'Български', flag: '🇧🇬', flagIcon: 'IconBulgaria' },
  { code: 'br', label: 'Breton', nativeLabel: 'Brezhoneg', flag: '🇫🇷', flagIcon: 'IconFrance' },
  { code: 'ca', label: 'Catalan', nativeLabel: 'Català', flag: '🇪🇸', flagIcon: 'IconSpain' },
  { code: 'co', label: 'Corse', nativeLabel: 'Corsu', flag: '🇫🇷', flagIcon: 'IconFrance' },
  { code: 'de', label: 'Allemand', nativeLabel: 'Deutsch', flag: '🇩🇪', flagIcon: 'IconGermany' },
  { code: 'en', label: 'Anglais', nativeLabel: 'English', flag: '🇬🇧', flagIcon: 'IconUnitedKingdom' },
  { code: 'es', label: 'Espagnol', nativeLabel: 'Español', flag: '🇪🇸', flagIcon: 'IconSpain' },
  { code: 'fa', label: 'Persan', nativeLabel: 'فارسی', flag: '🇮🇷', flagIcon: 'IconIran' },
  { code: 'fr', label: 'Français', nativeLabel: 'Français', flag: '🇫🇷', flagIcon: 'IconFrance' },
  { code: 'hr', label: 'Croate', nativeLabel: 'Hrvatski', flag: '🇭🇷', flagIcon: 'IconCroatia' },
  { code: 'hy', label: 'Arménien', nativeLabel: 'Հայերեն', flag: '🇦🇲', flagIcon: 'IconArmenia' },
  { code: 'it', label: 'Italien', nativeLabel: 'Italiano', flag: '🇮🇹', flagIcon: 'IconItaly' },
  { code: 'ja', label: 'Japonais', nativeLabel: '日本語', flag: '🇯🇵', flagIcon: 'IconJapan' },
  { code: 'nl', label: 'Néerlandais', nativeLabel: 'Nederlands', flag: '🇳🇱', flagIcon: 'IconNetherlands' },
  { code: 'pl', label: 'Polonais', nativeLabel: 'Polski', flag: '🇵🇱', flagIcon: 'IconPoland' },
  { code: 'pt', label: 'Portugais', nativeLabel: 'Português', flag: '🇵🇹', flagIcon: 'IconPortugal' },
  { code: 'ru', label: 'Russe', nativeLabel: 'Русский', flag: '🇷🇺', flagIcon: 'IconRussia' },
  { code: 'sl', label: 'Slovène', nativeLabel: 'Slovenščina', flag: '🇸🇮', flagIcon: 'IconSlovenia' },
  { code: 'uk', label: 'Ukrainien', nativeLabel: 'Українська', flag: '🇺🇦', flagIcon: 'IconUkraine' },
];

const LANGUAGE_LABELS = {
  ar: { ar: 'العربية', bg: 'Арабски', br: 'Arabeg', ca: 'Àrab', co: 'Arabu', de: 'Arabisch', en: 'Arabic', es: 'Árabe', fa: 'عربی', fr: 'Arabe', hr: 'Arapski', hy: 'Արաբերեն', it: 'Arabo', ja: 'アラビア語', nl: 'Arabisch', pl: 'Arabski', pt: 'Árabe', ru: 'Арабский', sl: 'Arabščina', uk: 'Арабська' },
  bg: { ar: 'البلغارية', bg: 'Български', br: 'Bulgareg', ca: 'Búlgar', co: 'Bulgaru', de: 'Bulgarisch', en: 'Bulgarian', es: 'Búlgaro', fa: 'بلغاری', fr: 'Bulgare', hr: 'Bugarski', hy: 'Բուլղարերեն', it: 'Bulgaro', ja: 'ブルガリア語', nl: 'Bulgaars', pl: 'Bułgarski', pt: 'Búlgaro', ru: 'Болгарский', sl: 'Bolgarščina', uk: 'Болгарська' },
  br: { ar: 'البريتونية', bg: 'Бретонски', br: 'Brezhoneg', ca: 'Bretó', co: 'Brittone', de: 'Bretonisch', en: 'Breton', es: 'Bretón', fa: 'برتونی', fr: 'Breton', hr: 'Bretonski', hy: 'Բրետոներեն', it: 'Bretone', ja: 'ブルトン語', nl: 'Bretons', pl: 'Bretoński', pt: 'Bretão', ru: 'Бретонский', sl: 'Bretonščina', uk: 'Бретонська' },
  ca: { ar: 'الكتالانية', bg: 'Каталонски', br: 'Katalaneg', ca: 'Català', co: 'Catalanu', de: 'Katalanisch', en: 'Catalan', es: 'Catalán', fa: 'کاتالان', fr: 'Catalan', hr: 'Katalonski', hy: 'Կատալոներեն', it: 'Catalano', ja: 'カタルーニャ語', nl: 'Catalaans', pl: 'Kataloński', pt: 'Catalão', ru: 'Каталанский', sl: 'Katalonščina', uk: 'Каталанська' },
  co: { ar: 'الكورسيكية', bg: 'Корсикански', br: 'Korseg', ca: 'Cors', co: 'Corsu', de: 'Korsisch', en: 'Corsican', es: 'Corso', fa: 'کرسی', fr: 'Corse', hr: 'Korzički', hy: 'Կորսիկերեն', it: 'Corso', ja: 'コルシカ語', nl: 'Corsicaans', pl: 'Korsykański', pt: 'Corso', ru: 'Корсиканский', sl: 'Korziščina', uk: 'Корсиканська' },
  de: { ar: 'الألمانية', bg: 'Немски', br: 'Alamaneg', ca: 'Alemany', co: 'Tedescu', de: 'Deutsch', en: 'German', es: 'Alemán', fa: 'آلمانی', fr: 'Allemand', hr: 'Njemački', hy: 'Գերմաներեն', it: 'Tedesco', ja: 'ドイツ語', nl: 'Duits', pl: 'Niemiecki', pt: 'Alemão', ru: 'Немецкий', sl: 'Nemščina', uk: 'Німецька' },
  en: { ar: 'الإنجليزية', bg: 'Английски', br: 'Saozneg', ca: 'Anglès', co: 'Inglese', de: 'Englisch', en: 'English', es: 'Inglés', fa: 'انگلیسی', fr: 'Anglais', hr: 'Engleski', hy: 'Անգլերեն', it: 'Inglese', ja: '英語', nl: 'Engels', pl: 'Angielski', pt: 'Inglês', ru: 'Английский', sl: 'Angleščina', uk: 'Англійська' },
  es: { ar: 'الإسبانية', bg: 'Испански', br: 'Spagnoleg', ca: 'Espanyol', co: 'Spagnolu', de: 'Spanisch', en: 'Spanish', es: 'Español', fa: 'اسپانیایی', fr: 'Espagnol', hr: 'Španjolski', hy: 'Իսպաներեն', it: 'Spagnolo', ja: 'スペイン語', nl: 'Spaans', pl: 'Hiszpański', pt: 'Espanhol', ru: 'Испанский', sl: 'Španščina', uk: 'Іспанська' },
  fa: { ar: 'الفارسية', bg: 'Персийски', br: 'Perseg', ca: 'Persa', co: 'Persianu', de: 'Persisch', en: 'Persian', es: 'Persa', fa: 'فارسی', fr: 'Persan', hr: 'Perzijski', hy: 'Պարսկերեն', it: 'Persiano', ja: 'ペルシア語', nl: 'Perzisch', pl: 'Perski', pt: 'Persa', ru: 'Персидский', sl: 'Perzijščina', uk: 'Перська' },
  fr: { ar: 'الفرنسية', bg: 'Френски', br: 'Galleg', ca: 'Francès', co: 'Francese', de: 'Französisch', en: 'French', es: 'Francés', fa: 'فرانسوی', fr: 'Français', hr: 'Francuski', hy: 'Ֆրանսերեն', it: 'Francese', ja: 'フランス語', nl: 'Frans', pl: 'Francuski', pt: 'Francês', ru: 'Французский', sl: 'Francoščina', uk: 'Французька' },
  hr: { ar: 'الكرواتية', bg: 'Хърватски', br: 'Kroateg', ca: 'Croat', co: 'Cruatu', de: 'Kroatisch', en: 'Croatian', es: 'Croata', fa: 'کرواتی', fr: 'Croate', hr: 'Hrvatski', hy: 'Խորվաթերեն', it: 'Croato', ja: 'クロアチア語', nl: 'Kroatisch', pl: 'Chorwacki', pt: 'Croata', ru: 'Хорватский', sl: 'Hrvaščina', uk: 'Хорватська' },
  hy: { ar: 'الأرمينية', bg: 'Арменски', br: 'Armenieg', ca: 'Armeni', co: 'Armenu', de: 'Armenisch', en: 'Armenian', es: 'Armenio', fa: 'ارمنی', fr: 'Arménien', hr: 'Armenski', hy: 'Հայերեն', it: 'Armeno', ja: 'アルメニア語', nl: 'Armeens', pl: 'Ormiański', pt: 'Armênio', ru: 'Армянский', sl: 'Armenščina', uk: 'Вірменська' },
  it: { ar: 'الإيطالية', bg: 'Италиански', br: 'Italianeg', ca: 'Italià', co: 'Talianu', de: 'Italienisch', en: 'Italian', es: 'Italiano', fa: 'ایتالیایی', fr: 'Italien', hr: 'Talijanski', hy: 'Իտալերեն', it: 'Italiano', ja: 'イタリア語', nl: 'Italiaans', pl: 'Włoski', pt: 'Italiano', ru: 'Итальянский', sl: 'Italijanščina', uk: 'Італійська' },
  ja: { ar: 'اليابانية', bg: 'Японски', br: 'Japaneg', ca: 'Japonès', co: 'Ghjappunese', de: 'Japanisch', en: 'Japanese', es: 'Japonés', fa: 'ژاپنی', fr: 'Japonais', hr: 'Japanski', hy: 'Ճապոներեն', it: 'Giapponese', ja: '日本語', nl: 'Japans', pl: 'Japoński', pt: 'Japonês', ru: 'Японский', sl: 'Japonščina', uk: 'Японська' },
  nl: { ar: 'الهولندية', bg: 'Нидерландски', br: 'Nederlandeg', ca: 'Neerlandès', co: 'Olandese', de: 'Niederländisch', en: 'Dutch', es: 'Neerlandés', fa: 'هلندی', fr: 'Néerlandais', hr: 'Nizozemski', hy: 'Նիդերլանդերեն', it: 'Olandese', ja: 'オランダ語', nl: 'Nederlands', pl: 'Niderlandzki', pt: 'Neerlandês', ru: 'Нидерландский', sl: 'Nizozemščina', uk: 'Нідерландська' },
  pl: { ar: 'البولندية', bg: 'Полски', br: 'Poloneg', ca: 'Polonès', co: 'Pulaccu', de: 'Polnisch', en: 'Polish', es: 'Polaco', fa: 'لهستانی', fr: 'Polonais', hr: 'Poljski', hy: 'Լեհերեն', it: 'Polacco', ja: 'ポーランド語', nl: 'Pools', pl: 'Polski', pt: 'Polonês', ru: 'Польский', sl: 'Poljščina', uk: 'Польська' },
  pt: { ar: 'البرتغالية', bg: 'Португалски', br: 'Portugaleg', ca: 'Portuguès', co: 'Purtughese', de: 'Portugiesisch', en: 'Portuguese', es: 'Portugués', fa: 'پرتغالی', fr: 'Portugais', hr: 'Portugalski', hy: 'Պորտուգալերեն', it: 'Portoghese', ja: 'ポルトガル語', nl: 'Portugees', pl: 'Portugalski', pt: 'Português', ru: 'Португальский', sl: 'Portugalščina', uk: 'Португальська' },
  ru: { ar: 'الروسية', bg: 'Руски', br: 'Rusianeg', ca: 'Rus', co: 'Russu', de: 'Russisch', en: 'Russian', es: 'Ruso', fa: 'روسی', fr: 'Russe', hr: 'Ruski', hy: 'Ռուսերեն', it: 'Russo', ja: 'ロシア語', nl: 'Russisch', pl: 'Rosyjski', pt: 'Russo', ru: 'Русский', sl: 'Ruščina', uk: 'Російська' },
  sl: { ar: 'السلوفينية', bg: 'Словенски', br: 'Sloveneg', ca: 'Eslovè', co: 'Sluvenu', de: 'Slowenisch', en: 'Slovenian', es: 'Esloveno', fa: 'اسلوونیایی', fr: 'Slovène', hr: 'Slovenski', hy: 'Սլովեներեն', it: 'Sloveno', ja: 'スロベニア語', nl: 'Sloveens', pl: 'Słoweński', pt: 'Esloveno', ru: 'Словенский', sl: 'Slovenščina', uk: 'Словенська' },
  uk: { ar: 'الأوكرانية', bg: 'Украински', br: 'Ukraineg', ca: 'Ucraïnès', co: 'Ucrainu', de: 'Ukrainisch', en: 'Ukrainian', es: 'Ucraniano', fa: 'اوکراینی', fr: 'Ukrainien', hr: 'Ukrajinski', hy: 'Ուկրաիներեն', it: 'Ucraino', ja: 'ウクライナ語', nl: 'Oekraïens', pl: 'Ukraiński', pt: 'Ucraniano', ru: 'Украинский', sl: 'Ukrajinščina', uk: 'Українська' },
};

export function getLanguageOption(code, fallback = 'fr') {
  return LANGUAGES.find((language) => language.code === code)
    || LANGUAGES.find((language) => language.code === fallback)
    || LANGUAGES[0];
}

export function getLocalizedLanguageLabel(languageOrCode, uiLanguage = 'fr') {
  const code = typeof languageOrCode === 'string' ? languageOrCode : languageOrCode?.code;
  const language = typeof languageOrCode === 'string' ? getLanguageOption(code) : languageOrCode;
  const uiCode = `${uiLanguage || 'fr'}`.split('-')[0];
  return LANGUAGE_LABELS[code]?.[uiCode]
    || LANGUAGE_LABELS[code]?.fr
    || language?.label
    || code;
}
