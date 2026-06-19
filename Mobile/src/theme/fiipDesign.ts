export const fiipPalette = {
  ink: '#141312',
  paper: '#F7F5F1',
  paperSoft: '#ECE7DF',
  graphite: '#2D2A27',
  muted: '#7D756C',
  copper: '#A56F4A',
  blue: '#0A84FF',
  green: '#34C759',
  red: '#FF453A',
  violet: '#8E7CFF',
  glassLight: 'rgba(255,255,255,0.72)',
  glassDark: 'rgba(24,24,27,0.58)',
};

export const fiipRadius = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
};

export const fiipType = {
  display: 'System',
  body: 'System',
};

export function getFiipTheme(isDark: boolean) {
  return {
    isDark,
    background: isDark ? '#080808' : fiipPalette.paper,
    backgroundAlt: isDark ? '#111113' : '#FFFDF9',
    card: isDark ? fiipPalette.glassDark : fiipPalette.glassLight,
    text: isDark ? '#F8F6F2' : fiipPalette.ink,
    textSecondary: isDark ? 'rgba(248,246,242,0.68)' : 'rgba(45,42,39,0.64)',
    border: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(75,64,54,0.10)',
    accent: fiipPalette.copper,
    blue: fiipPalette.blue,
    success: fiipPalette.green,
    danger: fiipPalette.red,
  };
}
