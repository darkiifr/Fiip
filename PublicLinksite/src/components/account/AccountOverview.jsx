import { formatAccountDate, getDeviceLimitState, getDisplayLicense, getLicenseState, getOcrState } from '../../services/accountPresentation';
import IconCalendar from '~icons/mingcute/calendar-2-fill';
import IconCertificate from '~icons/mingcute/certificate-fill';
import IconDevices from '~icons/mingcute/device-fill';
import IconScan from '~icons/mingcute/scan-2-fill';

export default function AccountOverview({ account }) {
  const license = getDisplayLicense(account);
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
          <IconCertificate />
          <span>Licence</span>
          <strong>{licenseState.statusLabel}</strong>
        </article>
        <article className="account-metric">
          <IconCalendar />
          <span>Renouvellement</span>
          <strong>{formatAccountDate(renewal)}</strong>
        </article>
        <article className="account-metric" data-tone={ocrState.tone}>
          <IconScan />
          <span>OCR</span>
          <strong>{ocrState.label}</strong>
          <small>{ocrState.detail}</small>
        </article>
        <article className="account-metric">
          <IconDevices />
          <span>Appareils</span>
          <strong>{deviceState.label}</strong>
        </article>
      </div>
    </section>
  );
}
