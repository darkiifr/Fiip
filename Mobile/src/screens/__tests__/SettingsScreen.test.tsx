import React from 'react';
import { render } from '@testing-library/react-native';

import SettingsScreen from '../SettingsScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('../../hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: {
      background: '#ffffff',
      text: '#111827',
      textSecondary: '#6b7280',
      primary: '#2563eb',
      primaryContainer: '#dbeafe',
      onPrimaryContainer: '#1e3a8a',
      border: '#e5e7eb',
      outlineVariant: '#d1d5db',
      surfaceContainerHighest: '#f3f4f6',
      backgroundAlt: '#ffffff',
      success: '#10b981',
      danger: '#ef4444',
    },
  }),
}));

jest.mock('../../store/settingsStore', () => ({
  useSettingsStore: () => ({
    themeMode: 'light',
    setThemeMode: jest.fn(),
    fontSize: 'moyenne',
    setFontSize: jest.fn(),
    autoSave: true,
    setAutoSave: jest.fn(),
    showWordCount: true,
    setShowWordCount: jest.fn(),
    showReadingTime: true,
    setShowReadingTime: jest.fn(),
    syncEnabled: true,
    setSyncEnabled: jest.fn(),
    globalLockEnabled: false,
    setGlobalLockEnabled: jest.fn(),
  }),
}));

jest.mock('../../services/supabase', () => ({
  authService: {
    signOut: jest.fn(),
    requestAccountDeletion: jest.fn(),
  },
}));

jest.mock('../../components/ui/GlassCard', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    GlassCard: ({ children, style }: any) => <View style={style}>{children}</View>,
  };
});

jest.mock('../../components/ui/Icon', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Icon: () => <Text>icon</Text>,
  };
});

jest.mock('../../utils/hapticEngine', () => ({
  triggerHaptic: jest.fn(),
}));

describe('SettingsScreen copy', () => {
  it('hides provider and key details from the mobile UI', () => {
    const { queryByText, getByText } = render(<SettingsScreen />);

    expect(getByText('Synchronisation cloud')).toBeTruthy();
    expect(queryByText(/IA sans clé personnalisée/i)).toBeNull();
    expect(queryByText(/Supabase/i)).toBeNull();
    expect(queryByText(/OpenRouter/i)).toBeNull();
    expect(queryByText(/clé personnalisée/i)).toBeNull();
  });
});
