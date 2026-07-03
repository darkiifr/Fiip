import { Linking } from 'react-native';

/**
 * Service de gestion d'AltStore pour Fiip
 * Fournit des méthodes pour l'installation, les mises à jour et la résolution des problèmes communs.
 */

const ALTSTORE_SCHEME = 'altstore://';
export const ALTSTORE_SOURCE_URL = 'https://github.com/darkiifr/Fiip/releases/latest/download/altstore.json';
export const ALTSTORE_IPA_URL = 'https://github.com/darkiifr/Fiip/releases/latest/download/FiipMobile-Unsigned.ipa';
export const ALTSTORE_SOURCE_SCHEME_URL = `${ALTSTORE_SCHEME}source?url=${encodeURIComponent(ALTSTORE_SOURCE_URL)}`;
export const ALTSTORE_INSTALL_URL = `${ALTSTORE_SCHEME}install?url=${encodeURIComponent(ALTSTORE_IPA_URL)}`;

export type AltStoreStatus = 'not_installed' | 'installed' | 'error';

export const AltStoreService = {
  /**
   * Vérifie si AltStore est installé en tentant d'ouvrir son schéma
   */
  async checkAltStoreInstalled(): Promise<boolean> {
    try {
      return await Linking.canOpenURL(ALTSTORE_SCHEME);
    } catch (e) {
      console.error('[AltStoreService] Error checking AltStore:', e);
      return false;
    }
  },

  /**
   * Ajoute la source Fiip à AltStore
   */
  async addSource(): Promise<{ success: boolean; error?: string }> {
    try {
      const canOpen = await Linking.canOpenURL(ALTSTORE_SOURCE_SCHEME_URL);
      if (canOpen) {
        await Linking.openURL(ALTSTORE_SOURCE_SCHEME_URL);
        return { success: true };
      }
      return { success: false, error: 'ALTSTORE_NOT_FOUND' };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  /**
   * Tente d'installer ou de mettre à jour Fiip via AltStore
   */
  async installApp(): Promise<{ success: boolean; error?: string }> {
    try {
      const canOpen = await Linking.canOpenURL(ALTSTORE_INSTALL_URL);
      if (canOpen) {
        await Linking.openURL(ALTSTORE_INSTALL_URL);
        return { success: true };
      }
      return { success: false, error: 'ALTSTORE_NOT_FOUND' };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  /**
   * Gère les erreurs courantes liées aux App IDs et apps offloadées
   */
  getErrorMessage(error: string): string {
    switch (error) {
      case 'ALTSTORE_NOT_FOUND':
        return 'AltStore n\'est pas installé sur cet appareil.';
      case 'APP_ID_LIMIT':
        return 'Vous avez atteint la limite d\'App IDs sur votre compte gratuit (3 max). Supprimez-en un dans AltStore.';
      case 'OFFLOADED_APP':
        return 'L\'application semble être déchargée (offloaded). Veuillez la réinstaller manuellement depuis AltStore.';
      default:
        return `Une erreur est survenue lors de la communication avec AltStore : ${error}`;
    }
  }
};
