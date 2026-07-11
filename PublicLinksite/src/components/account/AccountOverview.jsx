import { Icon as IconifyIcon } from '@iconify/react';
import { getDeviceLimitState, getLicenseState, getOcrState } from '../../services/accountPresentation';

export default function AccountOverview({ account }) {
  const license = account?.license;
  const licenseState = getLicenseState(account);
  const ocrState = getOcrState(account);
  const deviceState = getDeviceLimitState(account);
  const renewal = license?.renews_at || license?.expires_at;

  return (
    <section className="account-section account-overview">
      <div className="account-section-head">
        <div>
          <p className="eyebrow">Vue d’ensemble</p>
          <h2>{licenseState.planLabel}</h2>
        </div>
        <span className="status-pill" data-tone={licenseState.hasActiveLicense ? 'ok' : 'limited'}>
          {licenseState.statusLabel}
        </span>
      </div>
      <div className="account-metric-grid">
        <article className="account-metric">
          <IconifyIcon icon="mingcute:certificate-fill" />
          <span>Licence</span>
          <strong>{licenseState.statusLabel}</strong>
        </article>
        <article className="account-metric">
          <IconifyIcon icon="mingcute:calendar-2-fill" />
          <span>Renouvellement</span>
          <strong>{renewal ? new Date(renewal).toLocaleDateString('fr-FR') : 'Non defini'}</strong>
        </article>
        <article className="account-metric" data-tone={ocrState.tone}>
          <IconifyIcon icon="mingcute:scan-2-fill" />
          <span>OCR</span>
          <strong>{ocrState.label}</strong>
          <small>{ocrState.detail}</small>
        </article>
        <article className="account-metric">
          <IconifyIcon icon="mingcute:devices-fill" />
          <span>Appareils</span>
          <strong>{deviceState.label}</strong>
        </article>
      </div>
    </section>
  );
}
