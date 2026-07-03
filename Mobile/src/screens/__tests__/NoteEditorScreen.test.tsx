/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports, @typescript-eslint/no-shadow */
import React from 'react';
import { fireEvent, render, act } from '@testing-library/react-native';

import { NoteEditorScreen } from '../NoteEditorScreen';

const mockGoBack = jest.fn();
const mockAddNote = jest.fn();
const mockUpdateNote = jest.fn();
const mockDeleteNote = jest.fn();

jest.mock('../../store/notesStore', () => ({
  useNotesStore: (selector: any) => selector({
    addNote: mockAddNote,
    updateNote: mockUpdateNote,
    deleteNote: mockDeleteNote,
  }),
}));

jest.mock('../../store/settingsStore', () => ({
  useSettingsStore: (selector: any) => selector({
    typography: 'Inter',
    fontSize: 'moyenne',
    showWordCount: true,
    showReadingTime: true,
    autoSave: true,
  }),
}));

jest.mock('../../hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    isDark: false,
    colors: {
      background: '#ffffff',
      text: '#111827',
      textSecondary: '#6b7280',
      border: '#e5e7eb',
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

jest.mock('../../services/biometrics', () => ({
  authenticateBiometric: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('../../utils/hapticEngine', () => ({
  triggerHaptic: jest.fn(),
}));

describe('NoteEditorScreen autosave', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('autosaves edited notes after a short debounce', () => {
    const note = {
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Initial',
      content: 'Body',
      is_locked: false,
      is_favorite: false,
      badges: ['Réflexion'],
    };

    const { getByDisplayValue } = render(
      <NoteEditorScreen
        route={{ params: { noteToEdit: note } }}
        navigation={{ goBack: mockGoBack }}
      />,
    );

    fireEvent.changeText(getByDisplayValue('Body'), 'Body updated');

    act(() => {
      jest.advanceTimersByTime(850);
    });

    expect(mockUpdateNote).toHaveBeenCalledWith(note.id, expect.objectContaining({
      content: 'Body updated',
    }));
  });

  it('saves immediately when leaving the editor', () => {
    const note = {
      id: '22222222-2222-4222-8222-222222222222',
      title: 'Initial',
      content: 'Body',
      is_locked: false,
      is_favorite: false,
      badges: ['Réflexion'],
    };

    const { getByLabelText, getByDisplayValue } = render(
      <NoteEditorScreen
        route={{ params: { noteToEdit: note } }}
        navigation={{ goBack: mockGoBack }}
      />,
    );

    fireEvent.changeText(getByDisplayValue('Body'), 'Leaving content');
    fireEvent.press(getByLabelText('Retour'));

    expect(mockUpdateNote).toHaveBeenCalledWith(note.id, expect.objectContaining({
      content: 'Leaving content',
    }));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
