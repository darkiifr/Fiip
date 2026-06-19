import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { getFiipTheme } from '../theme/fiipDesign';

export function useAppTheme() {
  const systemColorScheme = useColorScheme();
  const themeMode = useSettingsStore((state) => state.themeMode);

  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';

  const theme = getFiipTheme(isDark);

  return {
    isDark,
    colors: {
      background: theme.background,
      card: theme.card,
      text: theme.text,
      textSecondary: theme.textSecondary,
      border: theme.border,
      primary: theme.blue,
      danger: theme.danger,
      warning: theme.accent,
      success: theme.success,
      accent: theme.accent,
      backgroundAlt: theme.backgroundAlt,
    },
  };
}
