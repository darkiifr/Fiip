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

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

jest.mock('@clerk/expo/token-cache', () => ({
  tokenCache: {
    getToken: jest.fn(() => Promise.resolve(null)),
    saveToken: jest.fn(() => Promise.resolve()),
    clearToken: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('@clerk/expo', () => ({
  ClerkProvider: ({ children }) => children,
  useAuth: () => ({
    getToken: jest.fn(() => Promise.resolve('mock-clerk-token')),
    isLoaded: true,
    isSignedIn: false,
    signOut: jest.fn(() => Promise.resolve()),
  }),
  useUser: () => ({ user: null }),
  useSignIn: () => ({
    signIn: {
      password: jest.fn(() => Promise.resolve({ error: null })),
      status: 'complete',
      finalize: jest.fn(() => Promise.resolve()),
    },
    fetchStatus: 'idle',
  }),
  useSignUp: () => ({
    signUp: {
      password: jest.fn(() => Promise.resolve({ error: null })),
      status: 'complete',
      unverifiedFields: [],
      verifications: {
        sendEmailCode: jest.fn(() => Promise.resolve({ error: null })),
        verifyEmailCode: jest.fn(() => Promise.resolve({ error: null })),
      },
      finalize: jest.fn(() => Promise.resolve()),
    },
    fetchStatus: 'idle',
  }),
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
  CachesDirectoryPath: '/mock/cache',
  DocumentDirectoryPath: '/mock/DocumentDirectoryPath',
  copyFile: jest.fn(() => Promise.resolve()),
  downloadFile: jest.fn(),
  exists: jest.fn(() => Promise.resolve(false)),
  mkdir: jest.fn(() => Promise.resolve()),
  readFile: jest.fn(() => Promise.resolve('')),
  stat: jest.fn(() => Promise.resolve({ size: 0 })),
  unlink: jest.fn(() => Promise.resolve()),
  writeFile: jest.fn(() => Promise.resolve()),
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
  config: jest.fn(() => ({ fetch: jest.fn() })),
  fetch: jest.fn(),
  fs: {
    dirs: { DocumentDir: '/mock/DocumentDirectoryPath' },
    writeFile: jest.fn(() => Promise.resolve()),
    readFile: jest.fn(() => Promise.resolve('')),
    exists: jest.fn(() => Promise.resolve(false)),
  },
  wrap: jest.fn((path) => path),
}));

jest.mock('react-native-html-to-pdf', () => ({
  convert: jest.fn(() => Promise.resolve({ filePath: '/mock/document.pdf' })),
}));

jest.mock('react-native-pdf', () => 'Pdf');
