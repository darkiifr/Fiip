import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..');
const indexCss = fs.readFileSync(path.join(root, 'src/index.css'), 'utf8');
const appCss = fs.readFileSync(path.join(root, 'src/App.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'src/App.jsx'), 'utf8');
const editor = fs.readFileSync(path.join(root, 'src/components/Editor.jsx'), 'utf8');
const editorActionBar = fs.readFileSync(path.join(root, 'src/components/EditorActionBar.jsx'), 'utf8');
const homeDashboard = fs.readFileSync(path.join(root, 'src/components/HomeDashboard.jsx'), 'utf8');
const settingsView = fs.readFileSync(path.join(root, 'src/components/SettingsView.jsx'), 'utf8');
const shareModal = fs.readFileSync(path.join(root, 'src/components/ShareModal.jsx'), 'utf8');
const unifiedSidebar = fs.readFileSync(path.join(root, 'src/components/UnifiedSidebar.jsx'), 'utf8');
const userProfileModal = fs.readFileSync(path.join(root, 'src/components/UserProfileModal.jsx'), 'utf8');

describe('desktop light theme contrast guards', () => {
  it('forces legacy dark-only text utility classes to readable light-theme tokens', () => {
    expect(indexCss).toContain('html:not(.dark) .text-white');
    expect(indexCss).toContain('html:not(.dark) .text-white\\/70');
    expect(indexCss).toContain('html:not(.dark) .text-gray-400');
    expect(indexCss).toContain('html:not(.dark) .text-zinc-100');
    expect(indexCss).toContain('html:not(.dark) .placeholder\\:text-white\\/20::placeholder');
  });

  it('keeps foreground text white only on deliberate strong action backgrounds', () => {
    expect(indexCss).toContain('html:not(.dark) .bg-zinc-950.text-white');
    expect(indexCss).toContain('html:not(.dark) .bg-\\[\\#151515\\]');
    expect(indexCss).toContain('html:not(.dark) .fiip-lock-unlock-button');
    expect(indexCss).toContain('html:not(.dark) .bg-blue-600');
    expect(indexCss).toContain('html:not(.dark) .bg-red-500');
  });

  it('uses readable select option colors in the light desktop theme', () => {
    expect(appCss).toContain('html:not(.dark) select option');
    expect(appCss).toContain('color: var(--text-primary)');
  });

  it('protects the reported desktop light-theme text surfaces from white text regressions', () => {
    [
      'fiip-light-editor-view',
      'fiip-light-editor-title',
      'fiip-light-nav-item',
      'fiip-light-nav-item-active',
      'fiip-light-note-title',
      'fiip-light-home-note-title',
      'fiip-light-user-name',
      'fiip-light-profile-heading',
    ].forEach((className) => {
      expect(indexCss).toContain(`html:not(.dark) .${className}`);
    });

    expect(editor).toContain('fiip-light-editor-view');
    expect(editor).toContain('fiip-light-editor-title');
    expect(homeDashboard).toContain('fiip-light-home-note-title');
    expect(unifiedSidebar).toContain('fiip-light-nav-item');
    expect(unifiedSidebar).toContain('fiip-light-nav-item-active');
    expect(unifiedSidebar).toContain('fiip-light-note-title');
    expect(unifiedSidebar).toContain('fiip-light-user-name');
    expect(userProfileModal).toContain('fiip-light-profile-heading');
  });

  it('keeps the biometric lock action readable in the light desktop theme', () => {
    expect(app).toContain('fiip-light-lock-screen');
    expect(app).toContain('fiip-lock-unlock-button');
    expect(app).toContain('getBiometricUserMessage(error)');
    expect(indexCss).toContain('html:not(.dark) .fiip-lock-unlock-button *');
    expect(indexCss).toContain('background-color: #111827 !important');
  });

  it('keeps share, editor action bar, and settings navigation readable in the light desktop theme', () => {
    [
      'fiip-light-share-modal',
      'fiip-light-share-action',
      'fiip-light-editor-actionbar',
      'fiip-light-editor-action',
      'fiip-light-editor-share-button',
      'fiip-light-settings-heading',
      'fiip-light-settings-tab',
      'fiip-light-settings-tab-active',
      'fiip-light-settings-tab-icon',
      'fiip-light-settings-view',
      'fiip-light-settings-update-button',
    ].forEach((className) => {
      expect(indexCss).toContain(`html:not(.dark) .${className}`);
    });

    expect(shareModal).toContain('fiip-light-share-modal');
    expect(shareModal).toContain('fiip-light-share-action');
    expect(editorActionBar).toContain('fiip-light-editor-actionbar');
    expect(editorActionBar).toContain('fiip-light-editor-action');
    expect(editor).toContain('fiip-light-editor-share-button');
    expect(settingsView).toContain('fiip-light-settings-heading');
    expect(settingsView).toContain('fiip-light-settings-tab');
    expect(settingsView).toContain('fiip-light-settings-tab-active');
    expect(settingsView).toContain('fiip-light-settings-tab-icon');
    expect(settingsView).toContain('fiip-light-settings-view');
    expect(settingsView).toContain('fiip-light-settings-update-button');
  });
});
