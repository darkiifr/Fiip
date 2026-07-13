import { useState } from 'react';
import PricingCheckout from './PricingCheckout';
import { formatAccountDate } from '../../services/accountPresentation';

function isValidLicenseDate(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getUTCFullYear() >= 2024;
}

function isLicenseActive(license) {
  if (license?.status !== 'active') return false;
  if (!isValidLicenseDate(license.expires_at)) return true;
  return new Date(license.expires_at).getTime() > Date.now();
}

function formatLicenseName(license) {
  const tier = String(license?.tier || 'Licence').replace(/_/g, ' ');
  const interval = license?.billing_interval ? ` · ${license.billing_interval}` : '';
  return `${tier}${interval}`;
}

function formatDate(value) {
  return formatAccountDate(value);
}

export default function AccountSubscription({ account, onActivateLicense, onSelectLicense }) {
  const [licenseKey, setLicenseKey] = useState('');
  const [status, setStatus] = useState('');
  const [statusTone, setStatusTone] = useState('info');
  const [busy, setBusy] = useState(false);
  const [selectingId, setSelectingId] = useState('');
  const licenses = Array.isArray(account?.licenses) ? account.licenses : [];
  const activeLicenseId = account?.active_license_id || account?.license?.id || null;

  const activate = async (event) => {
    event.preventDefault();
    const key = licenseKey.trim();
    if (!key) {
      setStatus('Entrez une cle de licence.');
      setStatusTone('error');
      return;
    }
    setBusy(true);
    setStatusTone('info');
    setStatus('Activation en cours...');
    try {
      await onActivateLicense(key);
      setLicenseKey('');
      setStatus('Licence activee et synchronisee.');
      setStatusTone('success');
    } catch (error) {
      setStatus(error?.message || 'Licence invalide ou déjà liée à un autre compte.');
      setStatusTone('error');
    } finally {
      setBusy(false);
    }
  };

  const selectLicense = async (licenseId) => {
    if (!licenseId || licenseId === activeLicenseId || !onSelectLicense) return;
    setSelectingId(licenseId);
    setStatus('Synchronisation de la licence...');
    setStatusTone('info');
    try {
      await onSelectLicense(licenseId);
      setStatus('Licence sélectionnée pour ce compte.');
      setStatusTone('success');
    } catch (error) {
      setStatus(error?.message || 'Impossible de sélectionner cette licence.');
      setStatusTone('error');
    } finally {
      setSelectingId('');
    }
  };

  return (
    <>
      <section className="account-section">
        <div className="account-section-head">
          <div>
            <p className="eyebrow">Facturation</p>
            <h2>Gérer l’abonnement</h2>
          </div>
          <span className="status-pill">{account?.license?.billing_interval || 'mensuel/annuel'}</span>
        </div>
        <p>La licence reçue après paiement peut être activée dans Fiip ou retrouvée depuis votre e-mail.</p>
        <div className="account-license-list" aria-label="Licences du compte">
          {licenses.length ? licenses.map((license) => {
            const isActive = license.id === activeLicenseId && isLicenseActive(license);
            const canSelect = !isActive && isLicenseActive(license);
            return (
              <article className="account-license-item" data-active={isActive ? 'true' : 'false'} key={license.id}>
                <div>
                  <strong>{formatLicenseName(license)}</strong>
                  <span>{license.keyauth_license_key || 'Clé non affichable'}</span>
                  <small>
                    {license.status || 'statut inconnu'} · expiration {formatDate(license.expires_at || license.renews_at)}
                  </small>
                </div>
                <button
                  className={isActive ? 'account-secondary' : 'account-primary'}
                  type="button"
                  disabled={!canSelect || selectingId === license.id}
                  onClick={() => selectLicense(license.id)}
                >
                  {isActive ? 'Active' : selectingId === license.id ? 'Sélection...' : isLicenseActive(license) ? 'Utiliser' : 'Expirée'}
                </button>
              </article>
            );
          }) : (
            <p className="account-message">Aucune licence liée à ce compte pour le moment.</p>
          )}
        </div>
        <form className="account-license-form" onSubmit={activate}>
          <label htmlFor="account-license-key">Cle de licence</label>
          <div>
            <input
              id="account-license-key"
              value={licenseKey}
              onChange={(event) => setLicenseKey(event.target.value)}
              autoComplete="off"
              placeholder="XXXX-XXXX-XXXX"
            />
            <button className="account-primary" type="submit" disabled={busy}>
              {busy ? 'Activation...' : 'Activer'}
            </button>
          </div>
          {status ? <p className={statusTone === 'error' ? 'account-error' : 'account-message'}>{status}</p> : null}
        </form>
      </section>
      <PricingCheckout user={account?.user} />
    </>
  );
}
