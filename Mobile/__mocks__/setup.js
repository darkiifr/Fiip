/* global jest */
/* eslint-env jest */
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

jest.mock('react-native-sfsymbols', () => ({
  SFSymbol: 'SFSymbol',
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('react-native-device-info', () => ({
  getUniqueId: jest.fn(() => Promise.resolve('mock-uuid-1234')),
}));

jest.mock('@callstack/liquid-glass', () => {
  const { View } = require('react-native');
  return {
    LiquidGlassView: View,
  };
});

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

jest.mock('react-native-localize', () => ({
  findBestLanguageTag: () => ({ languageTag: 'en', isRTL: false }),
}));

jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/DocumentDirectoryPath',
  downloadFile: jest.fn(),
}));
