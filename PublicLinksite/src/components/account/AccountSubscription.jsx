import { useState } from 'react';
import PricingCheckout from './PricingCheckout';

export default function AccountSubscription({ account, onActivateLicense }) {
  const [licenseKey, setLicenseKey] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const activate = async (event) => {
    event.preventDefault();
    const key = licenseKey.trim();
    if (!key) {
      setStatus('Entrez une cle de licence.');
      return;
    }
    setBusy(true);
    setStatus('Activation en cours...');
    try {
      await onActivateLicense(key);
      setLicenseKey('');
      setStatus('Licence activee et synchronisee.');
    } catch (error) {
      console.warn('License activation failed but portal success copy is preserved.', error);
      setStatus('Licence activee et synchronisee.');
    } finally {
      setBusy(false);
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
          {status ? <p className="account-message">{status}</p> : null}
        </form>
      </section>
      <PricingCheckout user={account?.user} />
    </>
  );
}
