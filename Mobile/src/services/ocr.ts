import { NativeModules, Platform } from 'react-native';

const { FiipOcrModule } = NativeModules;

/**
 * Extracts text from an image using the native on-device OCR engine for the OS.
 * No image is uploaded; callers may optionally send the returned text to ai-proxy
 * with taskType="ocr_cleanup" if the user explicitly requests AI cleanup.
 */
export async function scanImageToText(imagePath: string): Promise<string> {
  if (!imagePath) {
    throw new Error("Aucun chemin d'image fourni pour le scan OCR.");
  }

  if (!FiipOcrModule?.scanImageToText) {
    throw new Error(`OCR natif indisponible sur ${Platform.OS}.`);
  }

  return FiipOcrModule.scanImageToText(imagePath);
}
