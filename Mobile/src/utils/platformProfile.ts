export type MobilePlatformOS = 'ios' | 'android' | string;

export function getMobilePlatformProfile(os: MobilePlatformOS) {
  const isIOS = os === 'ios';
  const isAndroid = os === 'android';

  return {
    os,
    isIOS,
    isAndroid,
    glassMode: isIOS ? 'native-liquid-glass' : 'material-glass-fallback',
    keyboardAvoidingBehavior: isIOS ? 'padding' : 'height',
    shareUsesUrlField: isIOS,
    shareMessageIncludesUrl: isAndroid,
  };
}
