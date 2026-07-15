import { useEffect, useMemo, useState } from 'react';

import { acceptFamilyInvite, ensureFamilyGroup, getAuthErrorMessage, inviteFamilyMember, removeFamilyMember } from '../../services/account';
import IconGroup from '~icons/mingcute/group-3-fill';
import IconMailSend from '~icons/mingcute/mail-send-fill';

function formatStatus(member) {
  if (member.status === 'invited') return 'Invitation envoyée';
  if (member.status === 'active') return member.role === 'admin' ? 'Admin actif' : 'Membre actif';
  return 'Retiré';
}

function memberLabel(member) {
  return member.invited_email || member.user_id || 'Compte Fiip';
}

export default function AccountFamily({ account }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [familyState, setFamilyState] = useState({
    group: account?.family_group || null,
    members: account?.family_members || [],
    pending: account?.pending_family_invites || [],
    isAdmin: Boolean(account?.is_family_admin),
  });

  const license = account?.license;
  const isFamilyPro = license?.tier === 'family_pro' || Number(license?.keyauth_level || account?.profile?.plan_level || 0) >= 4;
  const maxSlots = Number(license?.family_slots || 5);
  const usedSlots = familyState.members.filter((member) => member.status !== 'removed').length;
  const remainingSlots = Math.max(0, maxSlots - usedSlots);

  const inviteToken = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('invite') || '';
  }, []);

  const applyFamilyResponse = (result) => {
    setFamilyState({
      group: result.family_group || null,
      members: result.family_members || [],
      pending: result.pending_family_invites || [],
      isAdmin: Boolean(result.is_family_admin),
    });
  };

  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;
    const accept = async () => {
      setBusy(true);
      setMessage('Acceptation de l’invitation...');
      try {
        const result = await acceptFamilyInvite(inviteToken);
        if (cancelled) return;
        applyFamilyResponse(result);
        setMessage('Invitation acceptée. Family Pro est actif sur ce compte.');
        window.history.replaceState({}, '', '/account/family');
      } catch (error) {
        if (!cancelled) setMessage(getAuthErrorMessage(error) || 'Impossible d’accepter cette invitation.');
      } finally {
        if (!cancelled) setBusy(false);
      }
    };
    accept();
    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  const handleEnsureGroup = async () => {
    setBusy(true);
    setMessage('');
    try {
      const result = await ensureFamilyGroup();
      applyFamilyResponse(result);
      setMessage('Foyer Family Pro créé.');
    } catch (error) {
      setMessage(getAuthErrorMessage(error) || 'Impossible de créer le foyer.');
    } finally {
      setBusy(false);
    }
  };

  const handleInvite = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const result = await inviteFamilyMember(email);
      applyFamilyResponse(result);
      setEmail('');
      setMessage('Invitation envoyée.');
    } catch (error) {
      setMessage(getAuthErrorMessage(error) || 'Impossible d’envoyer l’invitation.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (member) => {
    setBusy(true);
    setMessage('');
    try {
      const result = await removeFamilyMember(member.id);
      applyFamilyResponse(result);
      setMessage('Membre retiré.');
    } catch (error) {
      setMessage(getAuthErrorMessage(error) || 'Impossible de retirer ce membre.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="account-section family-section">
      <div className="account-section-head">
        <div>
          <p className="eyebrow">Family Pro</p>
          <h2>Membres du foyer</h2>
          <p className="section-lead">
            Invitez jusqu’à cinq comptes Fiip. Les membres actifs partagent les droits Family Pro.
          </p>
        </div>
        <span className="status-pill">{usedSlots}/{maxSlots} comptes</span>
      </div>

      {!isFamilyPro ? (
        <div className="account-card family-empty">
          <h3>Family Pro requis</h3>
          <p>Activez une licence Family Pro pour créer un foyer et inviter des membres.</p>
          <a className="account-primary" href="/pricing">Voir les licences</a>
        </div>
      ) : null}

      {isFamilyPro && !familyState.group ? (
        <div className="account-card family-empty">
          <h3>Créer le foyer</h3>
          <p>Votre licence Family Pro est active. Créez le foyer pour commencer à inviter des membres.</p>
          <button className="account-primary" onClick={handleEnsureGroup} disabled={busy}>
            <IconGroup />
            Créer mon foyer
          </button>
        </div>
      ) : null}

      {isFamilyPro && familyState.group && familyState.isAdmin ? (
        <form className="family-invite" onSubmit={handleInvite}>
          <label htmlFor="family-email">Inviter par e-mail</label>
          <div>
            <input
              id="family-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="membre@exemple.com"
              disabled={busy || remainingSlots <= 0}
              required
            />
            <button className="account-primary" type="submit" disabled={busy || remainingSlots <= 0}>
              <IconMailSend />
              Inviter
            </button>
          </div>
          <p>{remainingSlots > 0 ? `${remainingSlots} place(s) disponible(s).` : 'Limite Family Pro atteinte.'}</p>
        </form>
      ) : null}

      {message ? <p className="account-message">{message}</p> : null}

      <div className="account-grid family-grid">
        {familyState.members.map((member) => (
          <article className="account-card family-member-card" key={member.id}>
            <div>
              <h3>{memberLabel(member)}</h3>
              <p>{formatStatus(member)}</p>
            </div>
            <span className="status-pill">{member.role === 'admin' ? 'Admin' : 'Membre'}</span>
            {familyState.isAdmin && member.role !== 'admin' ? (
              <button className="account-secondary" type="button" onClick={() => handleRemove(member)} disabled={busy}>
                Retirer
              </button>
            ) : null}
          </article>
        ))}
        {familyState.group && familyState.members.length === 0 ? <p>Aucun membre actif pour le moment.</p> : null}
      </div>

      {!familyState.group && familyState.pending.length ? (
        <div className="account-card">
          <h3>Invitation en attente</h3>
          <p>Ouvrez le lien reçu par e-mail en étant connecté avec l’adresse invitée.</p>
        </div>
      ) : null}
    </section>
  );
}
