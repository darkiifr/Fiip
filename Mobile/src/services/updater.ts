import { Platform, Alert, Linking } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import RNFS from 'react-native-fs';

const GITHUB_REPO = 'vinsSoftware/Fiip';
const API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

export const checkForUpdatesAndInstall = async () => {
  try {
    const currentVersion = DeviceInfo.getVersion();
    
    // Fetch latest release from GitHub
    const res = await fetch(API_URL);
    if (!res.ok) return;

    const data = await res.json();
    const latestVersion = data.tag_name.replace('v', '');

    if (latestVersion > currentVersion) {
      Alert.alert(
        'Nouvelle mise à jour disponible',
        `La version ${latestVersion} de Fiip est disponible. Voulez-vous la télécharger ?`,
        [
          { text: 'Plus tard', style: 'cancel' },
          { 
            text: 'Mettre à jour', 
            onPress: () => {
              // Find the right asset (.apk for Android, etc)
              // For iOS, usually it redirects to TestFlight or AppStore, or an OTA package if using Expo/CodePush
              // Since react-native-auto-updater is requested, we link to the release page or direct download
              Linking.openURL(data.html_url);
            } 
          }
        ]
      );
    }
  } catch (error) {
    console.error('Failed to check for updates:', error);
  }
};
