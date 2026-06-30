import { describe, expect, it } from 'vitest';

import { getLanguageOption, getLocalizedLanguageLabel, LANGUAGES } from './languages';

describe('language labels', () => {
  it('keeps every offered language locally translatable', () => {
    for (const language of LANGUAGES) {
      expect(getLocalizedLanguageLabel(language, 'fr')).toBeTruthy();
      expect(getLocalizedLanguageLabel(language, 'en')).toBeTruthy();
      expect(getLocalizedLanguageLabel(language, 'de')).toBeTruthy();
      expect(getLocalizedLanguageLabel(language, 'es')).toBeTruthy();
      expect(getLocalizedLanguageLabel(language, 'ru')).toBeTruthy();
      expect(getLocalizedLanguageLabel(language, 'ja')).toBeTruthy();
    }
  });

  it('uses the active UI language for visible language names', () => {
    expect(getLocalizedLanguageLabel(getLanguageOption('de'), 'en')).toBe('German');
    expect(getLocalizedLanguageLabel(getLanguageOption('en'), 'de')).toBe('Englisch');
    expect(getLocalizedLanguageLabel(getLanguageOption('es'), 'ja')).toBe('スペイン語');
    expect(getLocalizedLanguageLabel(getLanguageOption('ru'), 'pt')).toBe('Russo');
  });
});
