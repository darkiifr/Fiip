import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { act } from 'react-test-renderer';

import { SupabaseAuthScreen } from '../SupabaseAuthScreen';

const mockStartSSOFlow = jest.fn();
const mockSetActive = jest.fn();
const mockSyncWithCloud = jest.fn().mockResolvedValue(null);
const mockFetchProfile = jest.fn().mockResolvedValue(null);
const mockSignIn = {
  status: 'complete',
  password: jest.fn(),
  passkey: jest.fn().mockResolvedValue({ error: null }),
  finalize: jest.fn().mockResolvedValue(null),
};

jest.mock('@clerk/expo', () => ({
  useSignIn: () => ({ signIn: mockSignIn, fetchStatus: 'idle' }),
  useSignUp: () => ({ signUp: { password: jest.fn(), verifications: {} }, fetchStatus: 'idle' }),
  useSSO: () => ({ startSSOFlow: mockStartSSOFlow }),
}));
jest.mock('../../providers/ClerkSupabaseProvider', () => ({ isMobileClerkConfigured: () => true, isMobilePasskeyConfigured: () => true }));
jest.mock('../../services/googleAuth', () => ({
  startGoogleOAuth: jest.fn(),
  subscribeGoogleOAuthResults: jest.fn(() => jest.fn()),
}));
jest.mock('../../services/supabase', () => ({ dataService: { fetchProfile: mockFetchProfile }, supabase: { auth: {} } }));
jest.mock('../../store/notesStore', () => ({ useNotesStore: (selector: any) => selector({ syncWithCloud: mockSyncWithCloud }) }));
jest.mock('../../hooks/useAppTheme', () => ({ useAppTheme: () => ({ colors: { primary: 'blue', text: 'white', textSecondary: 'gray' }, isDark: true }) }));
jest.mock('../../components/ui/GlassModal', () => ({ GlassModal: ({ children }: any) => children }));
jest.mock('../../components/ui/GlassInput', () => ({ GlassInput: () => null }));
jest.mock('../../components/ui/Icon', () => ({ Icon: () => null }));
jest.mock('../../utils/hapticEngine', () => ({ triggerHaptic: jest.fn() }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (value: string) => value }) }));

beforeEach(() => {
  jest.clearAllMocks();
  mockStartSSOFlow.mockResolvedValue({ createdSessionId: 'sess_prod', setActive: mockSetActive });
});

it('uses Clerk SSO for Google and activates the created session', async () => {
  const onClose = jest.fn();
  const view = render(<SupabaseAuthScreen onClose={onClose} />);

  await act(async () => {
    fireEvent.press(view.getByLabelText('Continuer avec Google'));
  });

  expect(mockStartSSOFlow).toHaveBeenCalledWith({ strategy: 'oauth_google' });
  expect(mockSetActive).toHaveBeenCalledWith({ session: 'sess_prod' });
});

it('does not close the modal when the Google flow is cancelled', async () => {
  mockStartSSOFlow.mockResolvedValueOnce({ createdSessionId: null, setActive: mockSetActive });
  const onClose = jest.fn();
  const view = render(<SupabaseAuthScreen onClose={onClose} />);

  fireEvent.press(view.getByLabelText('Continuer avec Google'));

  await waitFor(() => expect(mockStartSSOFlow).toHaveBeenCalled());
  expect(mockSetActive).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});

it('uses Clerk for passkey authentication when the production flag is enabled', async () => {
  const view = render(<SupabaseAuthScreen onClose={jest.fn()} />);

  await act(async () => {
    fireEvent.press(view.getByLabelText('Se connecter avec une passkey'));
  });

  expect(mockSignIn.passkey).toHaveBeenCalled();
  expect(mockSignIn.finalize).toHaveBeenCalled();
});
