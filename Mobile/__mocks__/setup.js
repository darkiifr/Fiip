/* global jest */
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

jest.mock('react-native-shared-group-preferences', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  getAll: jest.fn(() => Promise.resolve({})),
}));

jest.mock('react-native-share', () => ({
  open: jest.fn(() => Promise.resolve()),
  shareSingle: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-blob-util', () => ({
  fs: {
    dirs: { DocumentDir: '/mock/DocumentDirectoryPath' },
    writeFile: jest.fn(() => Promise.resolve()),
    readFile: jest.fn(() => Promise.resolve('')),
    exists: jest.fn(() => Promise.resolve(false)),
  },
}));

jest.mock('react-native-html-to-pdf', () => ({
  convert: jest.fn(() => Promise.resolve({ filePath: '/mock/document.pdf' })),
}));

jest.mock('react-native-pdf', () => 'Pdf');

jest.mock('react-native-document-picker', () => ({
  pick: jest.fn(() => Promise.resolve([])),
  types: {},
}));

jest.mock('react-native-audio-recorder-player', () => jest.fn().mockImplementation(() => ({
  startRecorder: jest.fn(() => Promise.resolve()),
  stopRecorder: jest.fn(() => Promise.resolve()),
  addRecordBackListener: jest.fn(),
  removeRecordBackListener: jest.fn(),
  startPlayer: jest.fn(() => Promise.resolve()),
  stopPlayer: jest.fn(() => Promise.resolve()),
})));
