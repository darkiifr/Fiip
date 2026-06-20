import React from 'react';
import { Share } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { FIIP_PUBLIC_SITE_URL, buildPublicNoteUrl } from '../config/links';
import { ShareModal } from './ShareModal';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (value: string) => value,
  }),
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('../hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    isDark: true,
    colors: {
      primary: '#f59e0b',
      text: '#ffffff',
      textSecondary: '#a1a1aa',
    },
  }),
}));

jest.mock('../utils/hapticEngine', () => ({
  triggerHaptic: jest.fn(),
}));

jest.mock('../services/supabaseSync', () => ({
  publishNote: jest.fn(),
  unpublishNote: jest.fn(),
}));

describe('Mobile ShareModal public links', () => {
  beforeEach(() => {
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shares the production public site when the note is not public yet', async () => {
    const { getByText } = render(
      <ShareModal
        visible
        onClose={jest.fn()}
        noteId="note-1"
        publicSlug={null}
        onUpdatePublicStatus={jest.fn()}
      />,
    );

    fireEvent.press(getByText('Envoyer cette note'));

    await waitFor(() => {
      expect(JSON.stringify((Share.share as jest.Mock).mock.calls[0][0])).toContain(FIIP_PUBLIC_SITE_URL);
    });
  });

  it('shares public notes on the production public site', async () => {
    const { getByText } = render(
      <ShareModal
        visible
        onClose={jest.fn()}
        noteId="note-1"
        publicSlug="mobile-public"
        onUpdatePublicStatus={jest.fn()}
      />,
    );

    fireEvent.press(getByText('Envoyer cette note'));

    await waitFor(() => {
      expect(JSON.stringify((Share.share as jest.Mock).mock.calls[0][0])).toContain(buildPublicNoteUrl('mobile-public'));
    });
  });
});
