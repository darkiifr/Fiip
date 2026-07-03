import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { AiChatScreen } from '../AiChatScreen';

const mockNavigate = jest.fn();
const mockUpdateNote = jest.fn();
const mockGenerateText = jest.fn();
const mockSubscribeToAIUsage = jest.fn(() => jest.fn());
const mockUseNotesStore = jest.fn((selector: any) => selector({
  notes: {
    'note-1': {
      id: 'note-1',
      title: 'Note active',
      content: 'Texte original',
      updated_at: '2026-06-29T10:00:00Z',
      deleted_at: null,
    },
  },
  updateNote: mockUpdateNote,
}));

jest.mock('../../hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: {
      background: '#ffffff',
      text: '#111827',
      textSecondary: '#6b7280',
      border: '#e5e7eb',
      primary: '#2563eb',
      primaryContainer: '#dbeafe',
      onPrimaryContainer: '#1e3a8a',
      outlineVariant: '#d1d5db',
    },
  }),
}));

jest.mock('../../store/notesStore', () => ({
  useNotesStore: (selector: any) => mockUseNotesStore(selector),
}));

jest.mock('../../services/ai', () => ({
  FREE_MODEL_ROUTER: 'openrouter/free',
  generateText: (...args: any[]) => mockGenerateText(...args),
  getLastAIUsageStats: jest.fn(() => null),
  subscribeToAIUsage: (...args: any[]) => mockSubscribeToAIUsage(...args),
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
    Icon: ({ mdIcon }: any) => <Text>{mdIcon}</Text>,
  };
});

jest.mock('../../utils/hapticEngine', () => ({
  triggerHaptic: jest.fn(),
}));

describe('AiChatScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without exposing technical free model wording', () => {
    const { queryByText, getByText } = render(<AiChatScreen navigation={{ navigate: mockNavigate, goBack: jest.fn() }} />);

    expect(getByText('Assistant')).toBeTruthy();
    expect(queryByText(/gratuit/i)).toBeNull();
    expect(queryByText(/OpenRouter/i)).toBeNull();
    expect(queryByText(/openrouter\/free/i)).toBeNull();
  });

  it('renders Android-valid quick action icons', () => {
    const { getByText } = render(<AiChatScreen navigation={{ navigate: mockNavigate, goBack: jest.fn() }} />);

    expect(getByText('text-box-search-outline')).toBeTruthy();
    expect(getByText('text-box-edit-outline')).toBeTruthy();
    expect(getByText('format-list-bulleted')).toBeTruthy();
  });

  it('blocks Dexter on a locked note', async () => {
    mockUseNotesStore.mockImplementationOnce((selector: any) => selector({
      notes: {
        'note-1': {
          id: 'note-1',
          title: 'Note active',
          content: 'Texte original',
          is_locked: true,
          updated_at: '2026-06-29T10:00:00Z',
          deleted_at: null,
        },
      },
      updateNote: mockUpdateNote,
    }));

    const { getByText } = render(<AiChatScreen navigation={{ navigate: mockNavigate, goBack: jest.fn() }} />);

    fireEvent.press(getByText('Résumer'));

    await waitFor(() => {
      expect(getByText(/Cette note est protégée/)).toBeTruthy();
    });
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('shows a friendly assistant error when generation fails', async () => {
    mockGenerateText.mockRejectedValueOnce(new Error('Erreur OpenRouter (429): rate limit'));
    const { getByPlaceholderText, getByLabelText, getByText } = render(<AiChatScreen navigation={{ navigate: mockNavigate, goBack: jest.fn() }} />);

    fireEvent.changeText(getByPlaceholderText('Demander à Dexter...'), 'Continue');
    fireEvent.press(getByLabelText('Envoyer'));

    await waitFor(() => {
      expect(getByText('Erreur OpenRouter (429): rate limit')).toBeTruthy();
    });
  });

  it('replaces the active note with the assistant answer', async () => {
    mockGenerateText.mockResolvedValueOnce('Réponse améliorée');
    const { getByPlaceholderText, getByLabelText, getByText } = render(<AiChatScreen navigation={{ navigate: mockNavigate, goBack: jest.fn() }} />);

    fireEvent.changeText(getByPlaceholderText('Demander à Dexter...'), 'Améliore');
    fireEvent.press(getByLabelText('Envoyer'));

    await waitFor(() => {
      expect(getByText('Réponse améliorée')).toBeTruthy();
    });

    fireEvent.press(getByText('Remplacer la note'));

    expect(mockUpdateNote).toHaveBeenCalledWith('note-1', { content: 'Réponse améliorée' });
    expect(mockNavigate).toHaveBeenCalledWith('NoteEditor', expect.objectContaining({
      noteToEdit: expect.objectContaining({ content: 'Réponse améliorée' }),
    }));
  });
});
