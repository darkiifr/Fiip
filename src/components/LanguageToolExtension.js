import { Extension } from '@tiptap/core';
import { grammarPlugin } from 'prosemirror-languagetool';

export const LanguageToolExtension = Extension.create({
  name: 'languageTool',

  addOptions() {
    return {
      language: 'auto',
      apiUrl: 'https://api.languagetoolplus.com/v2/check',
    };
  },

  addProseMirrorPlugins() {
    let aborter = null;

    return [
      grammarPlugin({
        languageToolCheckURL: this.options.apiUrl,
        language: this.options.language,
        languageToolCheck: async (text, language) => {
          if (aborter) {
            aborter.abort();
          }
          aborter = new AbortController();

          // Obtenir les langues du navigateur (ex: fr-FR, en-US)
          let userLangs = ['fr-FR', 'en-US'];
          if (typeof window !== 'undefined' && navigator && navigator.languages) {
            userLangs = Array.from(navigator.languages);
          }

          // Ajouter les variantes de langue standard
          // LanguageTool a besoin d'une variante précise (ex: 'fr-FR' et non 'fr')
          // pour inclure la vérification orthographique avec language='auto'
          const standardVariants = [
            'fr-FR', 'fr-CA', 'en-US', 'en-GB', 'es-ES', 'de-DE',
            'it-IT', 'pt-PT', 'pt-BR', 'nl-NL', 'pl-PL', 'ru-RU', 'ja-JP' // Liste large de langues
          ];

          // Eviter les duplicatas
          const preferredVariants = Array.from(new Set([...userLangs, ...standardVariants]))
            .filter(lang => lang.includes('-')) // On s'assure d'avoir la variante locale
            .join(',');

          const params = new URLSearchParams({
            text,
            language: language || 'auto',
            preferredVariants
          });

          const response = await fetch(this.options.apiUrl, {
            method: 'POST',
            body: params,
            headers: {
              'Accept': 'application/json'
            },
            signal: aborter.signal
          });

          if (!response.ok) {
            throw new Error(`LanguageTool API HTTP Error: ${response.status}`);
          }

          return await response.json();
        }
      }),
    ];
  },
});
