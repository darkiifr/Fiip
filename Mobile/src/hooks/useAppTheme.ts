import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';

export function useAppTheme() {
  const systemColorScheme = useColorScheme();
  const themeMode = useSettingsStore((state) => state.themeMode);

  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';

  return {
    isDark,
    colors: {
      background: isDark ? '#000000' : '#F2F2F7',
      card: isDark ? '#1C1C1E' : '#FFFFFF',
      text: isDark ? '#FFFFFF' : '#000000',
      textSecondary: isDark ? '#EBEBF599' : '#3C3C4399',
      border: isDark ? '#38383A' : '#C6C6C8',
      primary: '#0A84FF',
      danger: '#FF453A',
      warning: '#FF9F0A',
      success: '#32D74B',
    },
  };
}
