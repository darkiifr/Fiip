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

const mockCleanupGoogleAuth = jest.fn();
jest.mock('../src/services/googleAuth', () => ({
  installGoogleAuthLifecycle: jest.fn(() => mockCleanupGoogleAuth),
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');

jest.mock('../src/i18n', () => ({
  changeLanguage: jest.fn(),
  use: jest.fn(() => ({ init: jest.fn() })),
}));

import App, { NewNoteTabScreen } from '../App';
import { installGoogleAuthLifecycle } from '../src/services/googleAuth';

test('renders correctly', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  expect(installGoogleAuthLifecycle).toHaveBeenCalledTimes(1);
  await ReactTestRenderer.act(async () => { renderer.unmount(); });
});

test('cleans up the root OAuth callback lifecycle on unmount', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<App />); });
  await ReactTestRenderer.act(async () => { renderer.unmount(); });
  expect(mockCleanupGoogleAuth).toHaveBeenCalled();
});

test('opens the editor instead of rendering an empty New tab', async () => {
  const parentNavigation = { navigate: jest.fn() };
  const navigation = {
    getParent: jest.fn(() => parentNavigation),
    navigate: jest.fn(),
  };
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<NewNoteTabScreen navigation={navigation} />);
  });

  expect(navigation.navigate).toHaveBeenCalledWith('Home');
  expect(parentNavigation.navigate).toHaveBeenCalledWith('NoteEditor');
  await ReactTestRenderer.act(async () => { renderer.unmount(); });
});
