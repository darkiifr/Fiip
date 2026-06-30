import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..');
const settingsView = fs.readFileSync(path.join(root, 'src/components/SettingsView.jsx'), 'utf8');
const unifiedSidebar = fs.readFileSync(path.join(root, 'src/components/UnifiedSidebar.jsx'), 'utf8');
const indexCss = fs.readFileSync(path.join(root, 'src/index.css'), 'utf8');

describe('desktop translated and readable surfaces', () => {
  it('keeps reported settings labels routed through i18n instead of hardcoded French UI text', () => {
    [
      'Gérez la langue et les préférences système de base.',
      "Configurez la langue de l'interface.",
      'Activer les sons lors des clics et transitions.',
      "Jouer un son lors de la réception d'un message de Dexter.",
      'Verrouillage biométrique',
      'Disponible sur cet appareil.',
      'Indisponible dans cette WebView ou sur cet appareil.',
      'Verrouiller maintenant',
      "Personnalisez le style visuel de l'application.",
      'Ajustez les options de rédaction.',
      'Cache local',
      "Retrouvez l'état de l'application",
    ].forEach((text) => {
      expect(settingsView).not.toContain(text);
    });
  });

  it('keeps reported sidebar labels routed through i18n instead of hardcoded French UI text', () => {
    [
      'Carnets',
      'Nouveau carnet',
      'Toutes les notes',
      'Notes Supprimées',
      "Aujourd'hui",
      'Hier',
      'Plus tôt',
      'Aucun résultat',
      'Aucune note',
      'Créer une note',
      'Créer une note dans ce carnet',
      'Connexion',
      'Déconnexion',
      'Retirer des favoris',
      'Ajouter aux favoris',
      'Supprimer définitivement',
    ].forEach((text) => {
      expect(unifiedSidebar).not.toContain(text);
    });
  });

  it('forces the editor floating bar and icons to readable contrast in both themes', () => {
    expect(indexCss).toContain('html:not(.dark) .fiip-light-editor-actionbar > div');
    expect(indexCss).toContain('html:not(.dark) .fiip-light-editor-actionbar .fiip-light-editor-action');
    expect(indexCss).toContain('.dark .fiip-light-editor-actionbar .fiip-light-editor-action');
    expect(indexCss).toContain('color: #f8fafc !important');
  });
});
