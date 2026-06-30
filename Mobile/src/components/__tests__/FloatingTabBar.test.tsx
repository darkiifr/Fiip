import React from 'react';
import { Platform } from 'react-native';
import { render } from '@testing-library/react-native';

import { FloatingTabBar } from '../FloatingTabBar';

const iconCalls: Array<{ sfSymbol: string; mdIcon: string }> = [];

jest.mock('../../hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    isDark: false,
    colors: {
      surfaceContainer: '#ffffff',
      outlineVariant: '#e5e7eb',
      primaryContainer: '#dbeafe',
      onPrimaryContainer: '#1e3a8a',
      textSecondary: '#6b7280',
      primary: '#2563eb',
    },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('../ui/Icon', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Icon: (props: any) => {
      iconCalls.push({ sfSymbol: props.sfSymbol, mdIcon: props.mdIcon });
      return <Text>{props.mdIcon}</Text>;
    },
  };
});

jest.mock('../../utils/hapticEngine', () => ({
  triggerHaptic: jest.fn(),
}));

describe('FloatingTabBar', () => {
  beforeEach(() => {
    iconCalls.length = 0;
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses a reliable Android assistant icon', () => {
    render(
      <FloatingTabBar
        state={{
          index: 1,
          routes: [
            { key: 'home', name: 'Home' },
            { key: 'assistant', name: 'Assistant' },
          ],
        }}
        descriptors={{
          home: { options: { title: 'Accueil' } },
          assistant: { options: { title: 'Assistant' } },
        }}
        navigation={{ emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() }}
      />,
    );

    expect(iconCalls).toContainEqual(expect.objectContaining({ mdIcon: 'robot-outline' }));
  });
});
