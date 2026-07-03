import { Platform } from 'react-native';
import { getFiipTheme } from '../theme/fiipDesign';

export function useAppTheme() {
  const isDark = true;

  const theme = getFiipTheme(isDark, Platform.OS);

  return {
    isDark,
    platform: Platform.OS,
    theme,
    colors: {
      background: theme.background,
      card: theme.card,
      text: theme.text,
      textSecondary: theme.textSecondary,
      border: theme.border,
      primary: theme.primary ?? theme.blue,
      onPrimary: theme.onPrimary,
      primaryContainer: theme.primaryContainer,
      onPrimaryContainer: theme.onPrimaryContainer,
      danger: theme.danger,
      warning: theme.accent,
      success: theme.success,
      accent: theme.accent,
      backgroundAlt: theme.backgroundAlt,
      surface: theme.surface,
      surfaceContainerLowest: theme.surfaceContainerLowest,
      surfaceContainerLow: theme.surfaceContainerLow,
      surfaceContainer: theme.surfaceContainer,
      surfaceContainerHigh: theme.surfaceContainerHigh,
      surfaceContainerHighest: theme.surfaceContainerHighest,
      outline: theme.outline,
      outlineVariant: theme.outlineVariant,
      stateLayer: theme.stateLayer,
    },
  };
}
