import { Icon as IconifyIcon } from '@iconify/react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import AccountLayout from './components/account/AccountLayout';
import AccountOverview from './components/account/AccountOverview';
import LegalPage from './components/LegalPage';
import PricingCheckout from './components/account/PricingCheckout';
import PublicNoteView from './components/PublicNoteView';
import OAuthCallback from './components/OAuthCallback';
import { FIIP_ACCOUNT_PORTAL_URL, FIIP_DISCORD_SUPPORT_URL, FIIP_DOWNLOAD_URL, FIIP_PUBLIC_SITE_URL } from './config/links';
import { LEGAL_NAV_ITEMS } from './config/legal';
import {
  activateLicense,
  fetchAccountDevices,
  fetchAccountSummary,
  fetchSecurityEvents,
  getCaptchaSiteKey,
  getAuthErrorMessage,
  getSessionUser,
  registerPasskey,
  registerCurrentDevice,
  revokeAllDevices,
  revokeDevice,
  assertCaptchaToken,
  signInWithMagicLink,
  signInWithGoogle,
  signInWithPasskey,
  signInWithPassword,
  sendPasswordReset,
  selectLicense,
  signOut,
  verifyMagicCode,
} from './services/account';

const TURNSTILE_SITE_KEY = getCaptchaSiteKey();

const AccountAiUsage = lazy(() => import('./components/account/AccountAiUsage'));
const AccountDevices = lazy(() => import('./components/account/AccountDevices'));
const AccountFamily = lazy(() => import('./components/account/AccountFamily'));
const AccountSecurity = lazy(() => import('./components/account/AccountSecurity'));
const AccountSubscription = lazy(() => import('./components/account/AccountSubscription'));

function getAccountSection(path) {
  if (path.includes('/subscription')) return 'subscription';
  if (path.includes('/devices')) return 'devices';
  if (path.includes('/ai-usage')) return 'ai-usage';
  if (path.includes('/family')) return 'family';
  if (path.includes('/security')) return 'security';
  return 'account';
}

function TurnstileCaptcha({ onVerify, resetKey }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) {
      onVerify('');
      return undefined;
    }

    let widgetId = null;
    let cancelled = false;
    const scriptId = 'fiip-turnstile-script';

    const renderWidget = () => {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      containerRef.current.innerHTML = '';
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'dark',
        callback: (token) => onVerify(token),
        'expired-callback': () => onVerify(''),
        'error-callback': () => onVerify(''),
      });
    };

    const existing = document.getElementById(scriptId);
    if (existing) {
      if (window.turnstile) renderWidget();
      else existing.addEventListener('load', renderWidget, { once: true });
    } else {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.addEventListener('load', renderWidget, { once: true });
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
      }
    };
  }, [containerRef, onVerify, resetKey]);

  if (!TURNSTILE_SITE_KEY) {
    return null;
  }

  return (
    <div className="captcha-box">
      <div ref={(node) => { containerRef.current = node; }} />
    </div>
  );
}

function AccountPortal({ path }) {
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [active, setActive] = useState(() => getAccountSection(path));
  const [sections, setSections] = useState({});
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('info');
  const [loading, setLoading] = useState(true);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const currentUser = await getSessionUser();
      if (cancelled) return;
      setUser(currentUser);
      if (currentUser) {
        const summary = await fetchAccountSummary().catch((error) => ({ error: error.message }));
        if (!cancelled) setAccount(summary);
        registerCurrentDevice().catch(() => null);
      }
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onPopState = () => setActive(getAccountSection(window.location.pathname.toLowerCase()));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!['devices', 'security'].includes(active)) return;
    if (sections[active]?.status === 'ready' || sections[active]?.status === 'loading') return;

    let cancelled = false;
    const loader = active === 'devices' ? fetchAccountDevices : fetchSecurityEvents;
    Promise.resolve()
      .then(() => {
        if (!cancelled) setSections((current) => ({ ...current, [active]: { status: 'loading' } }));
        return loader();
      })
      .then((data) => {
        if (cancelled) return;
        setSections((current) => ({ ...current, [active]: { status: 'ready', data } }));
        if (active === 'devices') {
          setAccount((current) => ({
            ...current,
            device_count: data.device_count,
            device_limit: data.device_limit,
            devices: data.devices,
          }));
        }
      })
      .catch((error) => {
        if (!cancelled) setSections((current) => ({ ...current, [active]: { status: 'error', error: error.message } }));
      });
    return () => {
      cancelled = true;
    };
  }, [active, sections, user]);

  const handleNavigate = (event, href) => {
    event.preventDefault();
    window.history.pushState({}, '', href);
    setActive(getAccountSection(href));
  };

  const reloadDevices = async () => {
    setSections((current) => ({ ...current, devices: { status: 'loading' } }));
    const data = await fetchAccountDevices();
    setSections((current) => ({ ...current, devices: { status: 'ready', data } }));
    setAccount((current) => ({
      ...current,
      device_count: data.device_count,
      device_limit: data.device_limit,
      devices: data.devices,
    }));
  };

  const reloadSecurity = async () => {
    setSections((current) => ({ ...current, security: { status: 'loading' } }));
    const data = await fetchSecurityEvents();
    setSections((current) => ({ ...current, security: { status: 'ready', data } }));
  };

  const handleRevokeDevice = async (deviceId) => {
    await revokeDevice(deviceId);
    await reloadDevices();
    setSections((current) => {
      const next = { ...current };
      delete next.security;
      return next;
    });
  };

  const handleRevokeAllDevices = async (options) => {
    await revokeAllDevices(options);
    await reloadDevices();
    await reloadSecurity();
  };

  const handleActivateLicense = async (licenseKey) => {
    const result = await activateLicense(licenseKey);
    if (result?.account) {
      setAccount(result.account);
      setSections((current) => {
        const next = { ...current };
        delete next.devices;
        delete next.security;
        return next;
      });
    } else {
      const summary = await fetchAccountSummary();
      setAccount(summary);
    }
    return result;
  };

  const handleSelectLicense = async (licenseId) => {
    const result = await selectLicense(licenseId);
    const summary = await fetchAccountSummary();
    setAccount(summary);
    setSections((current) => {
      const next = { ...current };
      delete next.devices;
      delete next.security;
      return next;
    });
    return result;
  };

  const handlePasswordLogin = async (event) => {
    event.preventDefault();
    setMessage('');
    setMessageTone('info');
    try {
      assertCaptchaToken(captchaToken, TURNSTILE_SITE_KEY);
    } catch (error) {
      setMessage(error.message);
      setMessageTone('error');
      return;
    }
    try {
      const { error } = await signInWithPassword(email, password, captchaToken);
      if (error) {
        setMessage(getAuthErrorMessage(error));
        setMessageTone('error');
        return;
      }
      window.location.reload();
    } catch (error) {
      setMessage(getAuthErrorMessage(error));
      setMessageTone('error');
    } finally {
      setCaptchaToken('');
      setCaptchaResetKey((current) => current + 1);
    }
  };

  const handleMagicLink = async () => {
    setMessage('');
    setMessageTone('info');
    try {
      assertCaptchaToken(captchaToken, TURNSTILE_SITE_KEY);
    } catch (error) {
      setMessage(error.message);
      setMessageTone('error');
      return;
    }
    try {
      const { error } = await signInWithMagicLink(email, captchaToken);
      setMessage(error ? getAuthErrorMessage(error) : 'Lien de connexion envoyé. Vérifiez votre boîte mail.');
      setMessageTone(error ? 'error' : 'success');
    } catch (error) {
      setMessage(getAuthErrorMessage(error));
      setMessageTone('error');
    } finally {
      setCaptchaToken('');
      setCaptchaResetKey((current) => current + 1);
    }
  };

  const handleVerifyMagicCode = async () => {
    setMessage('');
    setMessageTone('info');
    try {
      const { error } = await verifyMagicCode(email, otpCode);
      if (error) {
        setMessage(getAuthErrorMessage(error));
        setMessageTone('error');
        return;
      }
      window.location.reload();
    } catch (error) {
      setMessage(getAuthErrorMessage(error));
      setMessageTone('error');
    }
  };

  const handleForgotPassword = async () => {
    setMessage('');
    setMessageTone('info');
    try {
      assertCaptchaToken(captchaToken, TURNSTILE_SITE_KEY);
    } catch (error) {
      setMessage(error.message);
      setMessageTone('error');
      return;
    }
    try {
      const { error } = await sendPasswordReset(email, captchaToken);
      setMessage(error ? getAuthErrorMessage(error) : 'Lien de réinitialisation envoyé. Vérifiez votre boîte mail.');
      setMessageTone(error ? 'error' : 'success');
    } catch (error) {
      setMessage(getAuthErrorMessage(error));
      setMessageTone('error');
    } finally {
      setCaptchaToken('');
      setCaptchaResetKey((current) => current + 1);
    }
  };

  const handlePasskeyLogin = async () => {
    setMessage('');
    setMessageTone('info');
    try {
      const { error } = await signInWithPasskey();
      if (error) {
        setMessage(getAuthErrorMessage(error));
        setMessageTone('error');
        return;
      }
      window.location.reload();
    } catch (error) {
      setMessage(getAuthErrorMessage(error));
      setMessageTone('error');
    }
  };

  const handleGoogleLogin = async () => {
    setMessage('');
    setMessageTone('info');
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setMessage(getAuthErrorMessage(error));
        setMessageTone('error');
        setGoogleLoading(false);
      }
    } catch (error) {
      setMessage(getAuthErrorMessage(error));
      setMessageTone('error');
      setGoogleLoading(false);
    }
  };

  const handleRegisterPasskey = async () => {
    const { error } = await registerPasskey();
    if (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  };

  if (loading) {
    return <main className="public-shell public-center"><section className="public-panel auth-panel"><p>Chargement du compte...</p></section></main>;
  }

  if (!user) {
    return (
      <main className="public-shell public-center">
        <form className="public-panel auth-panel" onSubmit={handlePasswordLogin}>
          <h1>Compte Fiip</h1>
          <p>Connectez-vous pour gérer votre licence, vos appareils et vos options.</p>
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@exemple.com" type="email" />
          <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mot de passe" type="password" />
          <div className="otp-row">
            <input value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="Code reçu par e-mail" inputMode="numeric" />
            <button className="secondary-link" type="button" onClick={handleVerifyMagicCode}>Valider le code</button>
          </div>
          <TurnstileCaptcha onVerify={setCaptchaToken} resetKey={captchaResetKey} />
          <button className="secondary-link" type="button" onClick={handleGoogleLogin} disabled={googleLoading}>
            {googleLoading ? 'Connexion à Google...' : 'Continuer avec Google'}
          </button>
          <button className="download-link" type="submit">Se connecter</button>
          <button className="secondary-link" type="button" onClick={handlePasskeyLogin}>Se connecter avec une passkey</button>
          <button className="secondary-link" type="button" onClick={handleMagicLink}>Recevoir un magic link</button>
          <button className="secondary-link" type="button" onClick={handleForgotPassword}>Mot de passe oublié</button>
          {message ? <p className={messageTone === 'error' ? 'account-error' : 'account-message'}>{message}</p> : null}
        </form>
      </main>
    );
  }

  return (
    <AccountLayout active={active} account={account} user={user} onNavigate={handleNavigate} onSignOut={async () => { await signOut(); window.location.assign('/'); }}>
      {active === 'account' ? <AccountOverview account={account} /> : null}
      {active !== 'account' ? (
        <Suspense fallback={<section className="account-section"><p className="account-message">Chargement de la section...</p></section>}>
          {active === 'subscription' ? <AccountSubscription account={account} onActivateLicense={handleActivateLicense} onSelectLicense={handleSelectLicense} /> : null}
          {active === 'devices' ? (
            <AccountDevices
              account={account}
              section={sections.devices}
              onRefresh={reloadDevices}
              onRevokeDevice={handleRevokeDevice}
            />
          ) : null}
          {active === 'ai-usage' ? <AccountAiUsage account={account} /> : null}
          {active === 'family' ? <AccountFamily account={account} /> : null}
          {active === 'security' ? (
            <AccountSecurity
              account={account}
              section={sections.security}
              onRefresh={reloadSecurity}
              onRevokeAll={handleRevokeAllDevices}
              onRegisterPasskey={handleRegisterPasskey}
            />
          ) : null}
        </Suspense>
      ) : null}
    </AccountLayout>
  );
}

function PricingPage() {
  return (
    <main className="public-shell">
      <nav className="site-nav">
        <a href={FIIP_PUBLIC_SITE_URL} className="brand-mark">Fiip</a>
        <div className="nav-actions">
          <a href="/" className="ghost-link">Accueil</a>
          <a href={FIIP_ACCOUNT_PORTAL_URL} className="ghost-link">Compte</a>
          <a href={FIIP_DISCORD_SUPPORT_URL} className="primary-link">Support Discord</a>
        </div>
      </nav>

      <section className="pricing-hero">
        <span className="eyebrow">Boutique Fiip</span>
        <h1>Choisissez la licence qui correspond à votre façon de noter.</h1>
        <p>
          Achetez votre accès, recevez votre clé et activez Fiip en quelques instants.
        </p>
      </section>

      <PricingCheckout />

      <section className="story-band">
        <div>
          <span className="eyebrow">Après achat</span>
          <h2>Votre licence reste gérable depuis Fiip.</h2>
        </div>
        <p>
          Collez la clé reçue dans Réglages &gt; Fiip Premium, ou connectez-vous au portail pour consulter vos accès et appareils.
        </p>
      </section>
    </main>
  );
}

function SharePage() {
  return (
    <main className="public-shell">
      <nav className="site-nav">
        <a href={FIIP_PUBLIC_SITE_URL} className="brand-mark">Fiip</a>
        <div className="nav-actions">
          <a href="/pricing" className="ghost-link">Licences</a>
          <a href={FIIP_ACCOUNT_PORTAL_URL} className="ghost-link">Compte</a>
          <a href="/" className="primary-link">Accueil</a>
        </div>
      </nav>

      <section className="pricing-hero">
        <span className="eyebrow">Notes publiques</span>
        <h1>Partager une note sans transformer Fiip en export brut.</h1>
        <p>
          Les liens publics restent accessibles sans connexion, avec une lecture propre, des exports et des pièces jointes lisibles.
        </p>
      </section>

      <section className="feature-band spacious-band">
        {[
          ['mingcute:shield-fill', 'Lecture contrôlée', 'Seules les notes que vous choisissez de publier deviennent visibles.'],
          ['mingcute:file-export-fill', 'Exports utiles', 'Le lecteur peut garder une copie dans les formats courants.'],
          ['mingcute:attachment-fill', 'Médias lisibles', 'Images, audios et fichiers restent présentés dans une interface calme.'],
        ].map(([icon, title, text]) => (
          <article key={title} className="feature-card public-panel">
            <IconifyIcon icon={icon} />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="flow-band public-panel spacious-band">
        <div>
          <IconifyIcon icon="mingcute:edit-2-fill" />
          <h3>Écrire</h3>
          <p>Créer une note riche dans Fiip avec tâches, tags et pièces jointes.</p>
        </div>
        <div>
          <IconifyIcon icon="mingcute:link-fill" />
          <h3>Partager</h3>
          <p>Publier seulement ce qui est public, avec un lien propre et lisible.</p>
        </div>
        <div>
          <IconifyIcon icon="mingcute:file-export-fill" />
          <h3>Exporter</h3>
          <p>Laisser le lecteur garder une copie portable.</p>
        </div>
      </section>
    </main>
  );
}

function OAuthConsentPage() {
  return (
    <main className="public-shell public-center">
      <section className="public-panel auth-panel oauth-consent-panel">
        <span className="eyebrow">Autorisation Fiip</span>
        <h1>Continuer avec votre compte Fiip</h1>
        <p>
          Cette page sert à confirmer l’accès d’une application compatible à votre compte Fiip.
          Vérifiez toujours que l’adresse affichée dans votre navigateur commence par https://portail.fiip.fr.
        </p>
        <div className="hero-actions">
          <a className="download-link" href="/account">Ouvrir mon compte</a>
          <a className="secondary-link" href="/">Annuler</a>
        </div>
      </section>
    </main>
  );
}

function App() {
  const path = window.location.pathname;
  const hostname = window.location.hostname.toLowerCase();
  const isPortalHost = hostname === 'portail.fiip.fr';

  if (path && path.toLowerCase().startsWith('/auth/callback')) {
    return <OAuthCallback />;
  }

  if (path && path.toLowerCase() === '/oauth/consent') {
    return <OAuthConsentPage />;
  }

  if (path && (path.toLowerCase().startsWith('/n/') || path.toLowerCase() === '/n')) {
    return <PublicNoteView />;
  }

  if ((path && path.toLowerCase().startsWith('/account')) || isPortalHost) {
    return <AccountPortal path={path.toLowerCase()} />;
  }

  if (path && path.toLowerCase() === '/pricing') {
    return <PricingPage />;
  }

  if (path && path.toLowerCase() === '/share') {
    return <SharePage />;
  }

  if (path && ['/legal', '/terms', '/privacy', '/cookies', '/refunds'].includes(path.toLowerCase())) {
    return <LegalPage path={path.toLowerCase()} />;
  }

  return (
    <main className="public-shell">
      <nav className="site-nav">
        <a href={FIIP_PUBLIC_SITE_URL} className="brand-mark">Fiip</a>
        <div className="nav-actions">
          <a href="/pricing" className="ghost-link">Licences</a>
          <a href="/share" className="ghost-link">Partage</a>
          <a href={FIIP_ACCOUNT_PORTAL_URL} className="ghost-link">Compte</a>
          <a href={FIIP_DOWNLOAD_URL} className="primary-link">Télécharger</a>
          <a href={FIIP_DISCORD_SUPPORT_URL} className="ghost-link">Support Discord</a>
        </div>
      </nav>

      <section className="hero-grid home-hero">
        <div className="hero-copy">
          <span className="eyebrow">Notes, licences et compte</span>
          <h1>
            <span>Fiip garde vos</span>
            <span>notes claires,</span>
            <span>partout.</span>
          </h1>
          <p>
            Une application de notes multi-plateforme avec licences, portail de compte,
            partage public et assistance intelligente optionnelle.
          </p>
          <div className="hero-actions">
            <a href="/pricing" className="download-link">
              <IconifyIcon icon="mingcute:shopping-bag-3-fill" />
              Voir les licences
            </a>
            <a href={FIIP_ACCOUNT_PORTAL_URL} className="download-link">
              <IconifyIcon icon="mingcute:user-3-fill" />
              Mon compte
            </a>
            <a href="/share" className="secondary-link">
              <IconifyIcon icon="mingcute:link-fill" />
              Partage public
            </a>
          </div>
        </div>

        <article id="note-demo" className="note-preview home-note-preview public-panel">
          <div className="window-dots">
            <span />
            <span />
            <span />
          </div>
          <p className="preview-kicker">Note publique</p>
          <h2>Une note qui respire.</h2>
          <p className="preview-lead">
            Réunion produit du 21 juin.
          </p>
          <p>
            Une note partagée reste lisible, exportable et agréable à parcourir.
          </p>
        </article>
      </section>

      <section className="home-link-grid">
        <a href="/pricing" className="home-link-card public-panel">
          <span className="eyebrow">Boutique</span>
          <strong>Licences Fiip</strong>
          <p>Basic, Pro, AI et Family Pro.</p>
        </a>
        <a href="/share" className="home-link-card public-panel">
          <span className="eyebrow">Lecture</span>
          <strong>Notes publiques</strong>
          <p>Démo, exports et partage.</p>
        </a>
        <a href={FIIP_ACCOUNT_PORTAL_URL} className="home-link-card public-panel">
          <span className="eyebrow">Portail</span>
          <strong>Compte</strong>
          <p>Licence, appareils et options.</p>
        </a>
      </section>

      <footer className="site-footer">
        <a href={FIIP_PUBLIC_SITE_URL} className="brand-mark">Fiip</a>
        <nav>
          {LEGAL_NAV_ITEMS.map((item) => (
            <a key={item.path} href={item.path}>{item.label}</a>
          ))}
          <a href={FIIP_DISCORD_SUPPORT_URL}>Serveur officiel de support</a>
        </nav>
      </footer>
    </main>
  );
}

export default App;
