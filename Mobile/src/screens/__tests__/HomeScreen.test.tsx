import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import HomeScreen from '../HomeScreen';

const mockNavigate = jest.fn();
const mockNotes = {
  'note-1': {
    id: 'note-1',
    title: 'Note de test',
    content: 'Un contenu mobile utile',
    is_favorite: true,
    updated_at: '2026-06-18T10:00:00Z',
    created_at: '2026-06-18T10:00:00Z',
  },
  'note-2': {
    id: 'note-2',
    title: 'Deuxième note',
    content: 'Autre contenu',
    is_favorite: false,
    updated_at: '2026-06-17T10:00:00Z',
    created_at: '2026-06-17T10:00:00Z',
  },
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    isDark: false,
    colors: {
      background: '#f8fafc',
      backgroundAlt: '#ffffff',
      text: '#111827',
      textSecondary: '#6b7280',
      border: '#e5e7eb',
      primary: '#111827',
      onPrimary: '#ffffff',
      primaryContainer: '#eaddff',
      onPrimaryContainer: '#21005d',
      accent: '#2563eb',
      success: '#10b981',
      surfaceContainerLow: '#f7f2fa',
      surfaceContainerHigh: '#ece6f0',
      surfaceContainerHighest: '#e6e0e9',
      outlineVariant: '#cac4d0',
      stateLayer: 'rgba(103,80,164,0.12)',
    },
  }),
}));

jest.mock('../../store/notesStore', () => ({
  useNotesStore: (selector: any) => selector({ notes: mockNotes }),
}));

jest.mock('../../store/settingsStore', () => ({
  useSettingsStore: (selector: any) => selector({ syncEnabled: true }),
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

describe('HomeScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders the mobile dashboard with note metrics', () => {
    const { getByText } = render(<HomeScreen />);

    expect(getByText('Fiip')).toBeTruthy();
    expect(getByText('Accueil')).toBeTruthy();
    expect(getByText('Notes récentes')).toBeTruthy();
  });

  it('opens the editor when creating a note', () => {
    const { getByLabelText } = render(<HomeScreen />);

    fireEvent.press(getByLabelText('Créer une note'));

    expect(mockNavigate).toHaveBeenCalledWith('NoteEditor', undefined);
  });
});
