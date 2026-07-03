/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: any) => children,
  DefaultTheme: {},
  DarkTheme: {},
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: () => null,
  }),
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: () => null,
  }),
}));

jest.mock('../src/store/settingsStore', () => ({
  useSettingsStore: () => ({
    globalLockEnabled: false,
    themeMode: 'dark',
    lang: 'fr',
  }),
}));

jest.mock('../src/services/updater', () => ({
  checkForUpdatesAndInstall: jest.fn(() => Promise.resolve()),
}));

jest.mock('../src/services/keyauth', () => ({
  keyAuthService: {
    init: jest.fn(() => Promise.resolve({ message: 'Initialized' })),
  },
}));

jest.mock('../src/services/biometrics', () => ({
  authenticateBiometric: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');

jest.mock('../src/i18n', () => ({
  changeLanguage: jest.fn(),
  use: jest.fn(() => ({ init: jest.fn() })),
}));

import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<App />);
  });
});
