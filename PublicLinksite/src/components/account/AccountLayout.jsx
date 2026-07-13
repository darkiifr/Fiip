import { getDeviceLimitState, getLicenseState, getOcrState } from '../../services/accountPresentation';
import { FIIP_PUBLIC_SITE_URL } from '../../config/links';
import IconBankCard from '~icons/mingcute/bank-card-fill';
import IconDevices from '~icons/mingcute/device-fill';
import IconGroup from '~icons/mingcute/group-3-fill';
import IconRobot from '~icons/mingcute/robot-fill';
import IconShield from '~icons/mingcute/shield-fill';
import IconUser from '~icons/mingcute/user-3-fill';

const tabs = [
  ['account', '/account', IconUser, 'Compte'],
  ['subscription', '/account/subscription', IconBankCard, 'Abonnement'],
  ['devices', '/account/devices', IconDevices, 'Appareils'],
  ['ai-usage', '/account/ai-usage', IconRobot, 'Usage IA'],
  ['family', '/account/family', IconGroup, 'Famille'],
  ['security', '/account/security', IconShield, 'Sécurité'],
];

export default function AccountLayout({ active, account, user, onNavigate, onSignOut, children }) {
  const licenseState = getLicenseState(account);
  const ocrState = getOcrState(account);
  const deviceState = getDeviceLimitState(account);

  return (
    <main className="account-shell">
      <aside className="account-sidebar">
        <a href={FIIP_PUBLIC_SITE_URL} className="brand-mark account-brand">Fiip</a>
        <nav>
          {tabs.map(([id, href, Icon, label]) => (
            <a
              key={id}
              href={href}
              className={active === id ? 'active' : ''}
              onClick={(event) => onNavigate(event, href)}
            >
              <Icon />
              {label}
            </a>
          ))}
        </nav>
        <button className="account-secondary" onClick={onSignOut}>Déconnexion</button>
      </aside>
      <section className="account-main">
        <header className="account-topbar">
          <div className="account-identity">
            <p className="eyebrow">Portail compte</p>
            <h1>{licenseState.planLabel}</h1>
            <p>{user?.email}</p>
          </div>
          <div className="account-status-strip" aria-label="Etat du compte">
            <span data-tone={licenseState.hasActiveLicense ? 'ok' : 'limited'}>
              <strong>{licenseState.statusLabel}</strong>
              <small>Licence</small>
            </span>
            <span data-tone={ocrState.tone}>
              <strong>{ocrState.label}</strong>
              <small>{ocrState.detail}</small>
            </span>
            <span data-tone="neutral">
              <strong>{deviceState.label}</strong>
              <small>Appareils</small>
            </span>
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}
