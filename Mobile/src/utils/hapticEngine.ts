import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useSettingsStore } from '../store/settingsStore';

const options = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

type HapticType = 
  | 'selection'
  | 'impactLight'
  | 'impactMedium'
  | 'impactHeavy'
  | 'notificationSuccess'
  | 'notificationWarning'
  | 'notificationError';

export const triggerHaptic = (type: HapticType = 'selection') => {
  const { hapticsEnabled } = useSettingsStore.getState();
  
  if (hapticsEnabled) {
    ReactNativeHapticFeedback.trigger(type, options);
  }
};
