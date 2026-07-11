import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AccountFamily from './AccountFamily';
import { ensureFamilyGroup, inviteFamilyMember, removeFamilyMember } from '../../services/account';

vi.mock('../../services/account', () => ({
  acceptFamilyInvite: vi.fn(),
  ensureFamilyGroup: vi.fn(),
  inviteFamilyMember: vi.fn(),
  removeFamilyMember: vi.fn(),
}));

const familyLicense = {
  tier: 'family_pro',
  keyauth_level: 4,
  family_slots: 5,
};

describe('AccountFamily', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/account/family');
  });

  it('asks for Family Pro before managing members', () => {
    render(<AccountFamily account={{ license: { tier: 'pro', keyauth_level: 2 } }} />);

    expect(screen.getByText('Family Pro requis')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir les licences' })).toHaveAttribute('href', '/pricing');
  });

  it('creates the family group before invitations', async () => {
    ensureFamilyGroup.mockResolvedValue({
      family_group: { id: 'family-1', owner_user_id: 'user-1' },
      family_members: [{ id: 'member-admin', role: 'admin', status: 'active', invited_email: 'admin@fiip.app' }],
      is_family_admin: true,
      pending_family_invites: [],
    });

    render(<AccountFamily account={{ license: familyLicense }} />);
    fireEvent.click(screen.getByRole('button', { name: /Créer mon foyer/i }));

    await waitFor(() => expect(ensureFamilyGroup).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Foyer Family Pro créé.')).toBeInTheDocument();
    expect(screen.getByLabelText('Inviter par e-mail')).toBeInTheDocument();
  });

  it('invites a member and renders the updated list', async () => {
    inviteFamilyMember.mockResolvedValue({
      family_group: { id: 'family-1', owner_user_id: 'user-1' },
      family_members: [
        { id: 'member-admin', role: 'admin', status: 'active', invited_email: 'admin@fiip.app' },
        { id: 'member-invite', role: 'member', status: 'invited', invited_email: 'ami@fiip.app' },
      ],
      is_family_admin: true,
      pending_family_invites: [],
    });

    render(<AccountFamily account={{
      license: familyLicense,
      family_group: { id: 'family-1', owner_user_id: 'user-1' },
      family_members: [{ id: 'member-admin', role: 'admin', status: 'active', invited_email: 'admin@fiip.app' }],
      is_family_admin: true,
    }} />);

    fireEvent.change(screen.getByLabelText('Inviter par e-mail'), { target: { value: 'ami@fiip.app' } });
    fireEvent.click(screen.getByRole('button', { name: /Inviter/i }));

    await waitFor(() => expect(inviteFamilyMember).toHaveBeenCalledWith('ami@fiip.app'));
    expect(screen.getByText('Invitation envoyée.')).toBeInTheDocument();
    expect(screen.getByText('ami@fiip.app')).toBeInTheDocument();
    expect(screen.getByText('Invitation envoyée')).toBeInTheDocument();
  });

  it('removes a non-admin member', async () => {
    removeFamilyMember.mockResolvedValue({
      family_group: { id: 'family-1', owner_user_id: 'user-1' },
      family_members: [{ id: 'member-admin', role: 'admin', status: 'active', invited_email: 'admin@fiip.app' }],
      is_family_admin: true,
      pending_family_invites: [],
    });

    render(<AccountFamily account={{
      license: familyLicense,
      family_group: { id: 'family-1', owner_user_id: 'user-1' },
      family_members: [
        { id: 'member-admin', role: 'admin', status: 'active', invited_email: 'admin@fiip.app' },
        { id: 'member-2', role: 'member', status: 'active', invited_email: 'ami@fiip.app' },
      ],
      is_family_admin: true,
    }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Retirer' }));

    await waitFor(() => expect(removeFamilyMember).toHaveBeenCalledWith('member-2'));
    expect(screen.getByText('Membre retiré.')).toBeInTheDocument();
  });
});
