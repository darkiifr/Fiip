import { Icon as IconifyIcon } from '@iconify/react';
import { useState } from 'react';
import { getDeviceLimitState } from '../../services/accountPresentation';

function formatDate(value) {
  if (!value) return 'Jamais';
  return new Date(value).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function platformLabel(platform) {
  if (platform === 'desktop') return 'Desktop';
  if (platform === 'mobile') return 'Mobile';
  return 'Web';
}

export default function AccountDevices({ account, section, onRefresh, onRevokeDevice }) {
  const [pendingDeviceId, setPendingDeviceId] = useState(null);
  const [message, setMessage] = useState('');
  const state = section?.status || 'loading';
  const data = section?.data || { devices: account?.devices || [] };
  const devices = data.devices || [];
  const deviceState = getDeviceLimitState({ ...account, ...data });

  const revoke = async (deviceId) => {
    setMessage('');
    setPendingDeviceId(deviceId);
    try {
      await onRevokeDevice(deviceId);
      setMessage('Appareil revoque.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPendingDeviceId(null);
    }
  };

  return (
    <section className="account-section account-devices-section">
      <div className="account-section-head">
        <div>
          <p className="eyebrow">Appareils connectes</p>
          <h2>{deviceState.label}</h2>
        </div>
        <button className="account-icon-button" type="button" onClick={onRefresh} title="Rafraichir">
          <IconifyIcon icon="mingcute:refresh-2-fill" />
        </button>
      </div>

      {state === 'loading' ? <p className="account-message">Chargement des appareils...</p> : null}
      {state === 'error' ? <p className="account-error">{section.error}</p> : null}
      {message ? <p className="account-message">{message}</p> : null}

      {state !== 'loading' && devices.length === 0 ? (
        <div className="account-empty">
          <IconifyIcon icon="mingcute:devices-fill" />
          <p>Aucun appareil enregistre pour ce compte.</p>
        </div>
      ) : null}

      {devices.length > 0 ? (
        <div className="account-device-table">
          <div className="account-device-row account-device-head">
            <span>Appareil</span>
            <span>Plateforme</span>
            <span>Derniere activite</span>
            <span>Etat</span>
            <span />
          </div>
          {devices.map((device) => {
            const revoked = Boolean(device.revoked_at);
            return (
              <div className="account-device-row" key={device.id}>
                <span>
                  <strong>{device.device_name || 'Appareil Fiip'}</strong>
                  {device.app_version ? <small>{device.app_version}</small> : null}
                </span>
                <span>{platformLabel(device.platform)}</span>
                <span>{formatDate(device.last_seen_at)}</span>
                <span>
                  <mark data-tone={revoked ? 'danger' : device.is_current ? 'ok' : 'neutral'}>
                    {revoked ? 'Revoque' : device.is_current ? 'Actuel' : 'Actif'}
                  </mark>
                </span>
                <span className="account-row-actions">
                  {!revoked && !device.is_current ? (
                    <button
                      className="account-icon-button danger"
                      type="button"
                      onClick={() => revoke(device.id)}
                      disabled={pendingDeviceId === device.id}
                      title="Revoquer"
                    >
                      <IconifyIcon icon="mingcute:delete-2-fill" />
                    </button>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
