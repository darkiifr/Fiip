import { useState } from 'react';
import { formatAccountDate, getDeviceLimitState, getDisplayLicense, getLicenseState, getOcrState } from '../../services/accountPresentation';
import IconCalendar from '~icons/mingcute/calendar-2-fill';
import IconCertificate from '~icons/mingcute/certificate-fill';
import IconDevices from '~icons/mingcute/device-fill';
import IconScan from '~icons/mingcute/scan-2-fill';
import IconCloud from '~icons/mingcute/cloud-fill';
import { getQuotaPrompt, getTrialDaysRemaining } from '../../services/conversionSignals';

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} Go`;
  return `${(bytes / 1024 ** 2).toFixed(bytes > 0 ? 1 : 0)} Mo`;
}

function usagePercent(used, limit) {
  if (!Number(limit)) return 0;
  return Math.min(100, Math.round((Number(used || 0) / Number(limit)) * 100));
}

export default function AccountOverview({ account, onStartTrial }) {
  const [trialStatus, setTrialStatus] = useState('');
  const license = getDisplayLicense(account);
  const licenseState = getLicenseState(account);
  const ocrState = getOcrState(account);
  const deviceState = getDeviceLimitState(account);
  const renewal = license?.renews_at || license?.expires_at;
  const quota = account?.quota || {};
  const notePercent = usagePercent(quota.note_bytes_used, quota.note_storage_bytes);
  const attachmentPercent = usagePercent(quota.attachment_bytes_used, quota.attachment_storage_bytes);
  const canStartTrial = !account?.trial?.active && !account?.trial?.used && !licenseState.hasActiveLicense;
  const trialDaysRemaining = getTrialDaysRemaining(account?.trial);
  const quotaPrompt = getQuotaPrompt(notePercent, attachmentPercent);

  const startTrial = async () => {
    setTrialStatus('loading');
    try {
      await onStartTrial?.();
      setTrialStatus('success');
    } catch (error) {
      setTrialStatus(error?.message || 'Essai indisponible.');
    }
  };

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
      <div className="quota-usage-grid" aria-label="Utilisation cloud">
        <article className="quota-usage">
          <div><span>Notes chiffrées</span><strong>{notePercent}%</strong></div>
          <div className="quota-track"><span style={{ width: `${notePercent}%` }} /></div>
          <small>{formatBytes(quota.note_bytes_used)} utilisés sur {formatBytes(quota.note_storage_bytes)}</small>
        </article>
        <article className="quota-usage">
          <div><span>Pièces jointes R2</span><strong>{attachmentPercent}%</strong></div>
          <div className="quota-track"><span style={{ width: `${attachmentPercent}%` }} /></div>
          <small>{formatBytes(quota.attachment_bytes_used)} utilisés sur {formatBytes(quota.attachment_storage_bytes)}{quota.shared_family ? ' partagés par la famille' : ''}</small>
        </article>
      </div>
      {canStartTrial ? (
        <article className="trial-cta">
          <IconCloud />
          <div><strong>Essayez Pro pendant 14 jours</strong><p>Partage, extension et 20 scans OCR. Sans carte bancaire, avec 250 Mo de pièces jointes.</p></div>
          <button className="account-primary" type="button" onClick={startTrial} disabled={trialStatus === 'loading'}>{trialStatus === 'loading' ? 'Activation...' : 'Activer mon essai'}</button>
        </article>
      ) : null}
      {trialDaysRemaining !== null ? (
        <article className="conversion-cta" data-tone={trialDaysRemaining <= 3 ? 'warning' : 'info'}>
          <IconCalendar />
          <div>
            <strong>{trialDaysRemaining > 0 ? `${trialDaysRemaining} jour${trialDaysRemaining > 1 ? 's' : ''} restant${trialDaysRemaining > 1 ? 's' : ''} dans votre essai` : 'Votre essai se termine aujourd’hui'}</strong>
            <p>Conservez la synchronisation, le partage et vos quotas Pro après cette date.</p>
          </div>
          <a className="account-primary" href="/account/subscription">Conserver mes fonctions</a>
        </article>
      ) : null}
      {quotaPrompt ? (
        <article className="conversion-cta" data-tone={quotaPrompt.tone}>
          <IconCloud />
          <div><strong>{quotaPrompt.title}</strong><p>{quotaPrompt.detail}</p></div>
          <a className="account-primary" href="/account/subscription">{quotaPrompt.action}</a>
        </article>
      ) : null}
      {typeof trialStatus === 'string' && !['', 'loading', 'success'].includes(trialStatus) ? <p className="account-error">{trialStatus}</p> : null}
    </section>
  );
}
