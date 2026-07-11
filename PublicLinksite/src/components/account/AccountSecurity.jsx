import { Icon as IconifyIcon } from '@iconify/react';
import { useState } from 'react';

const EVENT_LABELS = {
  device_registered: 'Appareil ajoute',
  device_heartbeat: 'Activite appareil',
  device_revoked: 'Appareil revoque',
  all_devices_revoked: 'Appareils revoques',
};

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function AccountSecurity({ account, section, onRefresh, onRevokeAll }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const state = section?.status || 'loading';
  const events = section?.data?.events || [];

  const revokeOthers = async () => {
    setBusy(true);
    setMessage('');
    try {
      await onRevokeAll({ keepCurrent: true });
      setMessage('Les autres appareils ont ete revoques.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="account-section account-security-section">
      <div className="account-section-head">
        <div>
          <p className="eyebrow">Securite</p>
          <h2>{account?.user?.email || 'Compte Fiip'}</h2>
        </div>
        <div className="account-actions">
          <button className="account-secondary" type="button" onClick={onRefresh}>Rafraichir</button>
          <button className="account-primary danger" type="button" onClick={revokeOthers} disabled={busy}>
            Revoquer les autres appareils
          </button>
        </div>
      </div>

      {state === 'loading' ? <p className="account-message">Chargement de l’historique...</p> : null}
      {state === 'error' ? <p className="account-error">{section.error}</p> : null}
      {message ? <p className="account-message">{message}</p> : null}

      {state !== 'loading' && events.length === 0 ? (
        <div className="account-empty">
          <IconifyIcon icon="mingcute:shield-fill" />
          <p>Aucun evenement de securite pour le moment.</p>
        </div>
      ) : null}

      {events.length > 0 ? (
        <ol className="account-event-list">
          {events.map((event) => (
            <li key={event.id}>
              <IconifyIcon icon="mingcute:shield-fill" />
              <span>
                <strong>{EVENT_LABELS[event.event_type] || 'Evenement compte'}</strong>
                <small>{formatDate(event.created_at)}</small>
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
