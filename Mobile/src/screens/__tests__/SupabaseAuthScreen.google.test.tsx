import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { SupabaseAuthScreen } from '../SupabaseAuthScreen';
import { startGoogleOAuth } from '../../services/googleAuth';

const callback = { success: () => {}, error: (_error: Error) => {} };
jest.mock('../../services/googleAuth', () => ({
  startGoogleOAuth: jest.fn(),
  subscribeGoogleOAuthResults: jest.fn((success, error) => { callback.success = success; callback.error = error; return jest.fn(); }),
}));
jest.mock('../../services/supabase', () => ({ dataService: { fetchProfile: jest.fn().mockResolvedValue(null) }, supabase: { auth: {} } }));
jest.mock('../../store/notesStore', () => ({ useNotesStore: (selector: any) => selector({ syncWithCloud: jest.fn().mockResolvedValue(null) }) }));
jest.mock('../../hooks/useAppTheme', () => ({ useAppTheme: () => ({ colors: { primary: 'blue', text: 'white', textSecondary: 'gray' }, isDark: true }) }));
jest.mock('../../components/ui/GlassModal', () => ({ GlassModal: ({ children }: any) => children }));
jest.mock('../../components/ui/GlassInput', () => ({ GlassInput: () => null }));
jest.mock('../../components/ui/Icon', () => ({ Icon: () => null }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (value: string) => value }) }));

it('starts Google login and closes after callback success', async () => {
  (startGoogleOAuth as jest.Mock).mockResolvedValue(undefined);
  const onClose = jest.fn();
  const view = render(<SupabaseAuthScreen onClose={onClose} />);
  fireEvent.press(view.getByLabelText('Continuer avec Google'));
  await waitFor(() => expect(startGoogleOAuth).toHaveBeenCalled());
  act(() => callback.success());
  await waitFor(() => expect(onClose).toHaveBeenCalled());
});
