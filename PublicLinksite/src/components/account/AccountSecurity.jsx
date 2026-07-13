import { useState } from 'react';
import IconShield from '~icons/mingcute/shield-fill';

const EVENT_LABELS = {
  device_registered: 'Appareil ajoute',
  device_heartbeat: 'Activite appareil',
  device_revoked: 'Appareil revoque',
  all_devices_revoked: 'Appareils revoques',
  license_activated: 'Licence activee',
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
  const errorMessage = section?.error || section?.data?.error || 'Historique de securite indisponible.';

  const getEventDetails = (event) => {
    const metadata = event?.metadata || {};
    if (event.event_type === 'device_registered' || event.event_type === 'device_heartbeat') {
      return [metadata.device_name, metadata.platform, metadata.app_version].filter(Boolean).join(' - ');
    }
    if (event.event_type === 'device_revoked') {
      return metadata.reason ? `Raison : ${metadata.reason}` : 'Appareil retire de ce compte.';
    }
    if (event.event_type === 'all_devices_revoked') {
      return event.device_id ? 'Les autres appareils ont ete revoques.' : 'Tous les appareils eligibles ont ete revoques.';
    }
    if (event.event_type === 'license_activated') {
      return metadata.tier ? `Offre : ${metadata.tier}` : 'Licence ajoutee au compte.';
    }
    return '';
  };

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
      {state === 'error' ? <p className="account-error">{errorMessage}</p> : null}
      {message ? <p className="account-message">{message}</p> : null}

      {state !== 'loading' && events.length === 0 ? (
        <div className="account-empty">
          <IconShield />
          <p>Aucun evenement de securite pour le moment.</p>
        </div>
      ) : null}

      {events.length > 0 ? (
        <ol className="account-event-list">
          {events.map((event) => (
            <li key={event.id}>
              <IconShield />
              <span>
                <strong>{EVENT_LABELS[event.event_type] || 'Evenement compte'}</strong>
                {getEventDetails(event) ? <em>{getEventDetails(event)}</em> : null}
                <small>{formatDate(event.created_at)}</small>
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
