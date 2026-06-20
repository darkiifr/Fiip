import { getMobilePlatformProfile } from './platformProfile';

describe('mobile platform profile', () => {
  it('uses native Liquid Glass and iOS sharing behavior on iOS', () => {
    expect(getMobilePlatformProfile('ios')).toEqual({
      os: 'ios',
      isIOS: true,
      isAndroid: false,
      glassMode: 'native-liquid-glass',
      keyboardAvoidingBehavior: 'padding',
      shareUsesUrlField: true,
      shareMessageIncludesUrl: false,
    });
  });

  it('uses fallback glass and Android sharing behavior on Android', () => {
    expect(getMobilePlatformProfile('android')).toEqual({
      os: 'android',
      isIOS: false,
      isAndroid: true,
      glassMode: 'material-glass-fallback',
      keyboardAvoidingBehavior: 'height',
      shareUsesUrlField: false,
      shareMessageIncludesUrl: true,
    });
  });
});
