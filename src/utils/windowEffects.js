export const WINDOW_EFFECTS = [
  { id: 'none', label: 'Aucun', platforms: ['windows', 'macos', 'linux', 'unknown'] },
  { id: 'mica', label: 'Mica', platforms: ['windows'] },
  { id: 'acrylic', label: 'Acrylic', platforms: ['windows'] },
  { id: 'blur', label: 'Blur', platforms: ['windows'] },
  { id: 'vibrancy', label: 'Vibrancy', platforms: ['macos'] },
  { id: 'sidebar', label: 'Sidebar', platforms: ['macos'] },
];

export function normalizeOsType(osType) {
  if (osType === 'windows' || osType === 'macos' || osType === 'linux') {return osType;}
  return 'unknown';
}

export function getWindowEffectOptions(osType) {
  const os = normalizeOsType(osType);
  return WINDOW_EFFECTS.map((effect) => ({
    ...effect,
    supported: effect.platforms.includes(os) || effect.id === 'none',
  }));
}

export function coerceWindowEffect(effect, osType) {
  if (normalizeOsType(osType) === 'unknown') {
    return effect || 'none';
  }
  const options = getWindowEffectOptions(osType);
  return options.some((option) => option.id === effect && option.supported) ? effect : 'none';
}
