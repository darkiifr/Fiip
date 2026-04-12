import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import { triggerHaptic } from '../utils/hapticEngine';
import { Platform } from 'react-native';

const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });

export const authenticateBiometric = async (
  promptMessage: string = 'Veuillez vous authentifier pour déverrouiller cette note'
): Promise<boolean> => {
  try {
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();

    if (!available) {
      console.warn('Biometrics not available on this device.');
      // Fallback à true ou gérer l'erreur selon vos politiques de sécurité
      return true; 
    }

    // iOS FaceID / TouchID ou Android Biometric
    const result = await rnBiometrics.simplePrompt({
      promptMessage: promptMessage,
      fallbackPromptMessage: 'Utiliser le code',
      cancelButtonText: 'Annuler',
    });

    if (result.success) {
      triggerHaptic('notificationSuccess');
      return true;
    } else {
      triggerHaptic('notificationError');
      return false;
    }
  } catch (error) {
    console.error('[Biometrics] Error:', error);
    triggerHaptic('notificationError');
    return false;
  }
};
