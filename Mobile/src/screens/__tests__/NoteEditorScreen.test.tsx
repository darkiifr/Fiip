import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, act, waitFor } from '@testing-library/react-native';

import { NoteEditorScreen } from '../NoteEditorScreen';

const mockGoBack = jest.fn();
const mockAddNote = jest.fn();
const mockUpdateNote = jest.fn();
const mockDeleteNote = jest.fn();

jest.mock('../../store/notesStore', () => ({
  useNotesStore: (selector: any) => selector({
    notes: {
      '11111111-1111-4111-8111-111111111111': {
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Initial',
        content: 'Body',
        tags: [{ id: 'desk', label: 'Desktop' }],
        badges: ['Desktop'],
        updated_at: '2026-06-29T10:00:00Z',
      },
    },
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

jest.mock('../../components/ShareModal', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    ShareModal: ({ visible, noteId }: any) => visible ? <Text>ShareModal:{noteId}</Text> : null,
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
    mockAddNote.mockResolvedValue('33333333-3333-4333-8333-333333333333');
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

  it('applies editor size settings to title and content styles', () => {
    const note = {
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Initial',
      content: 'Body',
      is_locked: false,
      is_favorite: false,
      tags: [{ id: 'desktop', label: 'Desktop' }],
      badges: ['Desktop'],
    };

    const { getByTestId } = render(
      <NoteEditorScreen
        route={{ params: { noteToEdit: note } }}
        navigation={{ goBack: mockGoBack }}
      />,
    );

    expect(getByTestId('note-title-input').props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ fontSize: 32 }),
    ]));
    expect(getByTestId('note-content-input').props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ fontSize: 18, lineHeight: 28 }),
    ]));
  });

  it('renders desktop-compatible tags and saves them as tags plus legacy badges', () => {
    const note = {
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Initial',
      content: 'Body',
      is_locked: false,
      is_favorite: false,
      tags: [{ id: 'desktop', label: 'Desktop' }],
      badges: [],
    };

    const { getAllByText, getByDisplayValue } = render(
      <NoteEditorScreen
        route={{ params: { noteToEdit: note } }}
        navigation={{ goBack: mockGoBack }}
      />,
    );

    expect(getAllByText('Desktop').length).toBeGreaterThan(0);
    fireEvent.changeText(getByDisplayValue('Body'), 'Body updated');

    act(() => {
      jest.advanceTimersByTime(850);
    });

    expect(mockUpdateNote).toHaveBeenCalledWith(note.id, expect.objectContaining({
      tags: [expect.objectContaining({ id: 'desktop', label: 'Desktop' })],
      badges: ['Desktop'],
    }));
  });

  it('opens sharing from the header button', async () => {
    const note = {
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Initial',
      content: 'Body',
      is_locked: false,
      is_favorite: false,
      badges: [],
    };

    const { getByText, getByLabelText } = render(
      <NoteEditorScreen
        route={{ params: { noteToEdit: note } }}
        navigation={{ goBack: mockGoBack }}
      />,
    );

    await act(async () => {
      fireEvent.press(getByLabelText('Partager'));
    });

    await waitFor(() => {
      expect(getByText(`ShareModal:${note.id}`)).toBeTruthy();
    });
  });

  it('opens the action menu without deleting, then confirms delete from the menu', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons: any) => {
      buttons?.find((button: any) => button.text === 'Supprimer')?.onPress?.();
    });
    const note = {
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Initial',
      content: 'Body',
      is_locked: false,
      is_favorite: false,
      badges: [],
    };

    const { getByText, getByLabelText } = render(
      <NoteEditorScreen
        route={{ params: { noteToEdit: note } }}
        navigation={{ goBack: mockGoBack }}
      />,
    );

    fireEvent.press(getByLabelText("Plus d'actions"));
    expect(getByText('Supprimer')).toBeTruthy();
    expect(mockDeleteNote).not.toHaveBeenCalled();

    fireEvent.press(getByText('Supprimer'));

    expect(mockDeleteNote).toHaveBeenCalledWith(note.id);
    expect(mockGoBack).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('shows 0 min for empty content', () => {
    const note = {
      id: '11111111-1111-4111-8111-111111111111',
      title: '',
      content: '',
      is_locked: false,
      is_favorite: false,
      badges: [],
    };

    const { getByText } = render(
      <NoteEditorScreen
        route={{ params: { noteToEdit: note } }}
        navigation={{ goBack: mockGoBack }}
      />,
    );

    expect(getByText('0 min de lecture')).toBeTruthy();
  });
});
