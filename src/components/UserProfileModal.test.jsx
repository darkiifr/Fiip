import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import UserProfileModal from './UserProfileModal';

const accountSummaryMock = vi.hoisted(() => vi.fn());

vi.mock('../services/keyauth', () => ({
  keyAuthService: {
    isAuthenticated: true,
    getCurrentSubscriptionName: vi.fn(() => 'Family Pro'),
  },
}));

vi.mock('../services/accountLicenses', () => ({
  getAccountSummary: accountSummaryMock,
}));

vi.mock('../services/supabase', () => ({
  authService: {
    getUser: vi.fn(async () => ({
      id: 'user-admin',
      email: 'admin@fiip.fr',
      user_metadata: { full_name: 'Admin Fiip' },
    })),
  },
  dataService: {
    fetchProfile: vi.fn(async () => ({
      data: {
        nickname: 'Admin Fiip',
        avatar_url: '',
        bio: '',
        accent_color: '#D97706',
        skills: [],
      },
    })),
    saveProfile: vi.fn(async () => ({ error: null })),
    uploadAvatar: vi.fn(async () => ({ url: '', error: null })),
  },
}));

describe('UserProfileModal family tab', () => {
  beforeEach(() => {
    accountSummaryMock.mockResolvedValue({
      license: { tier: 'family_pro', family_slots: 5, keyauth_level: 4 },
      family_group: { id: 'family-1', name: 'Fiip Family', ai_budget_limit_eur: 2 },
      family_members: [
        { id: 'member-admin', role: 'admin', status: 'active', invited_email: 'admin@fiip.fr' },
        { id: 'member-user', role: 'member', status: 'active', invited_email: 'membre@fiip.fr' },
      ],
      pending_family_invites: [{ id: 'invite-1', invited_email: 'invite@fiip.fr', status: 'invited' }],
      is_family_admin: true,
    });
    vi.clearAllMocks();
  });

  it('shows a dedicated family tab with members and Family Pro details', async () => {
    render(<UserProfileModal isOpen onClose={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Famille/i }));

    await waitFor(() => {
      expect(screen.getByText('membre@fiip.fr')).toBeInTheDocument();
    });
    expect(screen.getByText('2/5 comptes')).toBeInTheDocument();
    expect(screen.getByText(/Budget IA partagé/i)).toBeInTheDocument();
    expect(screen.getByText('invite@fiip.fr')).toBeInTheDocument();
  });
});
