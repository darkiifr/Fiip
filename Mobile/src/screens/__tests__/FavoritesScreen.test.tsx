import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import FavoritesScreen from '../FavoritesScreen';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    isDark: false,
    colors: {
      background: '#ffffff',
      text: '#111827',
      textSecondary: '#6b7280',
      primary: '#2563eb',
    },
  }),
}));

jest.mock('../../store/notesStore', () => ({
  useNotesStore: (selector: any) => selector({
    notes: {
      'note-1': {
        id: 'note-1',
        title: 'Note claire',
        content: 'Contenu searchable',
        badges: ['Note'],
        updated_at: '2026-06-29T10:00:00Z',
      },
    },
  }),
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

describe('FavoritesScreen mobile search', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('does not render desktop Command-K affordances', () => {
    const { queryByText } = render(<FavoritesScreen />);

    expect(queryByText('⌘K')).toBeNull();
  });

  it('opens the cloud account from the profile avatar', () => {
    const { getByLabelText } = render(<FavoritesScreen />);

    fireEvent.press(getByLabelText('Compte cloud'));

    expect(mockNavigate).toHaveBeenCalledWith('Auth');
  });
});
