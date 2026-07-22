import { lazy, Suspense, useEffect, useState } from 'react';

import AccountLayout from './components/account/AccountLayout';
import AccountOverview from './components/account/AccountOverview';
import LegalPage from './components/LegalPage';
import PricingCheckout from './components/account/PricingCheckout';
import PublicNoteView from './components/PublicNoteView';
import OAuthCallback from './components/OAuthCallback';
import { FiipClerkSignIn, useFiipClerk } from './providers/ClerkAccountBridge';
import { FIIP_ACCOUNT_PORTAL_URL, FIIP_DISCORD_SUPPORT_URL, FIIP_DOWNLOAD_URL, FIIP_PUBLIC_SITE_URL } from './config/links';
import { LEGAL_NAV_ITEMS } from './config/legal';
import {
  activateLicense,
  bootstrapClerkIdentity,
  canUsePasskeys,
  fetchAccountDevices,
  fetchAccountSummary,
  fetchSecurityEvents,
  getAuthErrorMessage,
  getSessionUser,
  registerPasskey,
  registerCurrentDevice,
  revokeAllDevices,
  revokeDevice,
  signInWithMagicLink,
  signInWithGoogle,
  signInWithPasskey,
  signInWithPassword,
  signUpWithPassword,
  sendPasswordReset,
  selectLicense,
  signOut,
  startProTrial,
  verifyMagicCode,
} from './services/account';
import { fetchFeatureFlags, readCachedFeatureFlags } from './services/featureFlags';

import IconAttachment from '~icons/mingcute/attachment-fill';
import IconEdit from '~icons/mingcute/edit-2-fill';
import IconFileExport from '~icons/mingcute/file-export-fill';
import IconLink from '~icons/mingcute/link-fill';
import IconShield from '~icons/mingcute/shield-fill';
import IconShoppingBag from '~icons/mingcute/shopping-bag-3-fill';
import IconUser from '~icons/mingcute/user-3-fill';
import IconClose from '~icons/mingcute/close-fill';

const AccountAiUsage = lazy(() => import('./components/account/AccountAiUsage'));
const AccountDevices = lazy(() => import('./components/account/AccountDevices'));
const AccountFamily = lazy(() => import('./components/account/AccountFamily'));
const AccountSecurity = lazy(() => import('./components/account/AccountSecurity'));
const AccountSubscription = lazy(() => import('./components/account/AccountSubscription'));

function ShowcaseImage({ src, alt, className = '', onOpen }) {
  return (
    <figure className={`showcase-media ${className}`.trim()}>
      <button
        type="button"
        className="showcase-zoom-trigger"
        onClick={() => onOpen({ src, alt })}
        aria-label={`Agrandir l’image : ${alt}`}
      >
        <img src={src} alt={alt} loading="lazy" />
        <span className="showcase-zoom-hint">Agrandir</span>
      </button>
    </figure>
  );
}

function ShowcaseLightbox({ image, onClose }) {
  useEffect(() => {
    if (!image) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [image, onClose]);

  if (!image) return null;

  return (
    <div className="showcase-lightbox" role="dialog" aria-modal="true" aria-label="Aperçu agrandi" onClick={onClose}>
      <div className="showcase-lightbox-card" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="showcase-lightbox-close" onClick={onClose} aria-label="Fermer l’aperçu">
          <IconClose />
        </button>
        <img src={image.src} alt={image.alt} />
      </div>
    </div>
  );
}

function getAccountSection(path) {
  if (path.includes('/subscription')) return 'subscription';
  if (path.includes('/devices')) return 'devices';
  if (path.includes('/ai-usage')) return 'ai-usage';
  if (path.includes('/family')) return 'family';
  if (path.includes('/security')) return 'security';
  return 'account';
}

function AccountPortal({ path }) {
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [active, setActive] = useState(() => getAccountSection(path));
  const [sections, setSections] = useState({});
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('info');
  const [loading, setLoading] = useState(true);
  const [authAction, setAuthAction] = useState('');
  const authParams = new URLSearchParams(window.location.search);
  const inviteToken = authParams.get('invite') || '';
  const inviteEmail = authParams.get('email') || '';

  useEffect(() => {
    if (!inviteToken || !inviteEmail) return;
    setEmail((current) => current || inviteEmail.trim().toLowerCase());
    setAuthMode('signup');
  }, [inviteToken, inviteEmail]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const currentUser = await getSessionUser();
      if (cancelled) return;
      setUser(currentUser);
      if (currentUser) {
        const summary = await fetchAccountSummary().catch((error) => ({ error: getAuthErrorMessage(error) }));
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
        if (!cancelled) setSections((current) => ({ ...current, [active]: { status: 'error', error: getAuthErrorMessage(error) } }));
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
    try {
      const data = await fetchSecurityEvents();
      setSections((current) => ({ ...current, security: { status: 'ready', data } }));
      return data;
    } catch (error) {
      setSections((current) => ({ ...current, security: { status: 'error', error: getAuthErrorMessage(error) } }));
      throw error;
    }
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

  const handleStartTrial = async () => {
    await startProTrial();
    const summary = await fetchAccountSummary();
    setAccount(summary);
    return summary;
  };

  const handlePasswordLogin = async (event) => {
    event.preventDefault();
    setMessage('');
    setMessageTone('info');
    setAuthAction('password');
    try {
      const { error } = await signInWithPassword(email, password);
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
      setAuthAction('');
    }
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    setMessage('');
    setMessageTone('info');
    setAuthAction('signup');
    try {
      const { error } = await signUpWithPassword(email, password, username);
      if (error) {
        setMessage(getAuthErrorMessage(error));
        setMessageTone('error');
        return;
      }
      setMessage(inviteToken
        ? 'Compte créé. Vérifiez votre e-mail, reconnectez-vous, puis l’invitation Family Pro sera validée.'
        : 'Compte créé. Vérifiez votre e-mail pour activer la connexion.');
      setMessageTone('success');
      setAuthMode('login');
    } catch (error) {
      setMessage(getAuthErrorMessage(error));
      setMessageTone('error');
    } finally {
      setAuthAction('');
    }
  };

  const handleMagicLink = async () => {
    setMessage('');
    setMessageTone('info');
    setAuthAction('magic');
    try {
      const { error } = await signInWithMagicLink(email);
      setMessage(error ? getAuthErrorMessage(error) : 'Lien de connexion envoyé. Vérifiez votre boîte mail.');
      setMessageTone(error ? 'error' : 'success');
    } catch (error) {
      setMessage(getAuthErrorMessage(error));
      setMessageTone('error');
    } finally {
      setAuthAction('');
    }
  };

  const handleVerifyMagicCode = async () => {
    setMessage('');
    setMessageTone('info');
    setAuthAction('otp');
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
    } finally {
      setAuthAction('');
    }
  };

  const handleForgotPassword = async () => {
    setMessage('');
    setMessageTone('info');
    setAuthAction('reset');
    try {
      const { error } = await sendPasswordReset(email);
      setMessage(error ? getAuthErrorMessage(error) : 'Lien de réinitialisation envoyé. Vérifiez votre boîte mail.');
      setMessageTone(error ? 'error' : 'success');
    } catch (error) {
      setMessage(getAuthErrorMessage(error));
      setMessageTone('error');
    } finally {
      setAuthAction('');
    }
  };

  const handlePasskeyLogin = async () => {
    setMessage('');
    setMessageTone('info');
    setAuthAction('passkey');
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
    } finally {
      setAuthAction('');
    }
  };

  const handleGoogleLogin = async () => {
    setMessage('');
    setMessageTone('info');
    setAuthAction('google');
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setMessage(getAuthErrorMessage(error));
        setMessageTone('error');
        setAuthAction('');
      }
    } catch (error) {
      setMessage(getAuthErrorMessage(error));
      setMessageTone('error');
      setAuthAction('');
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
    const passkeysAvailable = canUsePasskeys();
    const busy = Boolean(authAction);
    return (
      <main className="public-shell public-center">
        <form className="public-panel auth-panel" onSubmit={authMode === 'signup' ? handleSignup : handlePasswordLogin}>
          <h1>Compte Fiip</h1>
          <p>{inviteToken ? 'Connectez-vous ou créez un compte avec l’adresse invitée pour rejoindre l’abonnement Family Pro.' : 'Connectez-vous pour gérer votre licence, vos appareils et vos options.'}</p>
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@exemple.com" type="email" />
          {authMode === 'signup' ? (
            <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Nom d’utilisateur" type="text" />
          ) : null}
          <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mot de passe" type="password" />
          {authMode === 'login' ? <div className="otp-row">
            <input value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="Code reçu par e-mail" inputMode="numeric" />
            <button className="secondary-link" type="button" onClick={handleVerifyMagicCode} disabled={busy || !email || !otpCode}>
              {authAction === 'otp' ? 'Validation...' : 'Valider le code'}
            </button>
          </div> : null}
          {authMode === 'login' ? <button className="secondary-link" type="button" onClick={handleGoogleLogin} disabled={busy}>
            {authAction === 'google' ? 'Connexion à Google...' : 'Continuer avec Google'}
          </button> : null}
          <button className="download-link" type="submit" disabled={busy || !email || !password}>
            {authAction === 'signup' ? 'Création...' : authAction === 'password' ? 'Connexion...' : authMode === 'signup' ? 'Créer le compte' : 'Se connecter'}
          </button>
          {authMode === 'login' ? <button className="secondary-link" type="button" onClick={handleMagicLink} disabled={busy || !email}>
            {authAction === 'magic' ? 'Envoi...' : 'Recevoir un magic link'}
          </button> : null}
          {authMode === 'login' ? <button className="secondary-link" type="button" onClick={handleForgotPassword} disabled={busy || !email}>
            {authAction === 'reset' ? 'Envoi...' : 'Mot de passe oublié'}
          </button> : null}
          {authMode === 'login' ? <button
            className="secondary-link"
            type="button"
            onClick={handlePasskeyLogin}
            disabled={busy || !passkeysAvailable}
            title={passkeysAvailable ? 'Le navigateur vous demandera de valider la passkey liée à ce compte.' : 'Les passkeys ne sont pas disponibles dans ce navigateur.'}
          >
            {authAction === 'passkey' ? 'Validation passkey...' : 'Se connecter avec une passkey'}
          </button> : null}
          <button className="secondary-link" type="button" onClick={() => { setAuthMode(authMode === 'signup' ? 'login' : 'signup'); setMessage(''); }} disabled={busy}>
            {authMode === 'signup' ? 'J’ai déjà un compte' : inviteToken ? 'Créer un compte pour cette invitation' : 'Créer un compte'}
          </button>
          {message ? <p className={messageTone === 'error' ? 'account-error' : 'account-message'}>{message}</p> : null}
        </form>
      </main>
    );
  }

  return (
    <AccountLayout active={active} account={account} user={user} onNavigate={handleNavigate} onSignOut={async () => { await signOut(); window.location.assign('/'); }}>
      {active === 'account' ? <AccountOverview account={account} onStartTrial={handleStartTrial} /> : null}
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
  const [previewImage, setPreviewImage] = useState(null);
  const featureItems = [
    { Icon: IconShield, title: 'Lecture contrôlée', text: 'Seules les notes que vous choisissez de publier deviennent visibles.' },
    { Icon: IconFileExport, title: 'Exports utiles', text: 'Le lecteur peut garder une copie dans les formats courants.' },
    { Icon: IconAttachment, title: 'Médias lisibles', text: 'Images, audios et fichiers restent présentés dans une interface calme.' },
  ];

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
        {featureItems.map(({ Icon, title, text }) => (
          <article key={title} className="feature-card public-panel">
            <Icon />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="product-showcase public-panel">
        <div className="showcase-copy">
          <span className="eyebrow">Interface de partage</span>
          <h2>Une publication claire avant d’envoyer le lien.</h2>
          <p>
            Sélection de note, statut public, collaborateurs privés et actions sociales restent dans une surface unique.
          </p>
        </div>
        <ShowcaseImage
          src="/assets/fiip-share-modal.png"
          alt="Fenêtre de partage Fiip avec lien public et collaborateurs"
          onOpen={setPreviewImage}
        />
      </section>

      <section className="flow-band public-panel spacious-band">
        <div>
          <IconEdit />
          <h3>Écrire</h3>
          <p>Créer une note riche dans Fiip avec tâches, tags et pièces jointes.</p>
        </div>
        <div>
          <IconLink />
          <h3>Partager</h3>
          <p>Publier seulement ce qui est public, avec un lien propre et lisible.</p>
        </div>
        <div>
          <IconFileExport />
          <h3>Exporter</h3>
          <p>Laisser le lecteur garder une copie portable.</p>
        </div>
      </section>

      <ShowcaseLightbox image={previewImage} onClose={() => setPreviewImage(null)} />
    </main>
  );
}

function HomeProductShowcase() {
  const [previewImage, setPreviewImage] = useState(null);

  return (
    <>
      <section className="product-showcase home-product-showcase public-panel">
        <div className="showcase-copy">
          <span className="eyebrow">Desktop</span>
          <h2>Un espace sombre, calme et pensé pour écrire.</h2>
          <p>
            Fiip rassemble tableau de bord, éditeur, partage et assistant Dexter dans une interface cohérente.
          </p>
        </div>
        <div className="showcase-grid">
          <ShowcaseImage
            className="wide"
            src="/assets/fiip-desktop-dashboard.png"
            alt="Tableau de bord desktop Fiip en thème sombre"
            onOpen={setPreviewImage}
          />
          <ShowcaseImage
            src="/assets/fiip-editor-focus.png"
            alt="Éditeur Fiip avec barre d’actions et assistant Dexter"
            onOpen={setPreviewImage}
          />
          <ShowcaseImage
            src="/assets/fiip-share-modal.png"
            alt="Fenêtre de partage Fiip avec lien public et collaborateurs"
            onOpen={setPreviewImage}
          />
        </div>
      </section>

      <ShowcaseLightbox image={previewImage} onClose={() => setPreviewImage(null)} />
    </>
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

function FeatureFlagGate({ children }) {
  const [flags, setFlags] = useState(() => readCachedFeatureFlags());

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const nextFlags = await fetchFeatureFlags('site');
        if (!cancelled) setFlags(nextFlags);
      } catch (error) {
        console.warn('Feature flags unavailable:', error);
      }
    };
    refresh();
    const interval = setInterval(refresh, 10 * 60 * 1000);
    window.addEventListener('online', refresh);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('online', refresh);
    };
  }, []);

  const maintenance = flags.site_maintenance || flags.global_maintenance;
  if (maintenance?.status === 'disabled') {
    return (
      <main className="public-shell public-center">
        <section className="public-panel auth-panel">
          <h1>Maintenance Fiip</h1>
          <p>{maintenance.message || 'Le site Fiip est temporairement indisponible.'}</p>
          {maintenance.reason ? <p>{maintenance.reason}</p> : null}
          {maintenance.expected_reactivation_at ? <p>Retour prévu : {new Date(maintenance.expected_reactivation_at).toLocaleString()}</p> : null}
        </section>
      </main>
    );
  }

  const degraded = Object.values(flags).find((flag) => flag.status === 'degraded');
  return (
    <>
      {degraded ? (
        <div className="maintenance-banner">
          <strong>{degraded.message || 'Service Fiip dégradé.'}</strong>
          {degraded.reason ? <span>{degraded.reason}</span> : null}
        </div>
      ) : null}
      {children}
    </>
  );
}

function ClerkAccountPortal({ path }) {
  const clerk = useFiipClerk();
  const [bridgedUserId, setBridgedUserId] = useState(null);
  const [bridgeError, setBridgeError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!clerk.loaded || !clerk.signedIn) {
      return undefined;
    }
    const userId = clerk.user?.id;
    bootstrapClerkIdentity()
      .then(() => {
        if (!cancelled) {
          setBridgedUserId(userId);
          setBridgeError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setBridgeError({ userId, message: getAuthErrorMessage(error) });
        }
      });
    return () => { cancelled = true; };
  }, [clerk.loaded, clerk.signedIn, clerk.user?.id]);

  const bridgeReady = clerk.signedIn && bridgedUserId === clerk.user?.id;
  const activeBridgeError = bridgeError && bridgeError.userId === clerk.user?.id
    ? bridgeError.message
    : '';

  if (!clerk.loaded) {
    return <main className="public-shell public-center"><section className="public-panel auth-panel"><p>Chargement du compte...</p></section></main>;
  }
  if (!clerk.signedIn) {
    return <main className="public-shell public-center"><section className="clerk-auth-shell"><FiipClerkSignIn /></section></main>;
  }
  if (activeBridgeError) {
    return <main className="public-shell public-center"><section className="public-panel auth-panel"><h1>Compte indisponible</h1><p className="account-error">{activeBridgeError}</p></section></main>;
  }
  if (!bridgeReady) {
    return <main className="public-shell public-center"><section className="public-panel auth-panel"><p>Préparation du compte...</p></section></main>;
  }
  return <AccountPortal path={path} />;
}

function ClerkAuthenticationPortal() {
  const clerk = useFiipClerk();

  useEffect(() => {
    if (clerk.loaded && clerk.signedIn) {
      window.location.replace('https://portail.fiip.fr/account');
    }
  }, [clerk.loaded, clerk.signedIn]);

  return (
    <main className="public-shell public-center">
      <section className="clerk-auth-shell">
        {clerk.loaded && !clerk.signedIn
          ? <FiipClerkSignIn />
          : <p>Ouverture de votre espace Fiip...</p>}
      </section>
    </main>
  );
}

function RoutedApp() {
  const path = window.location.pathname;
  const hostname = window.location.hostname.toLowerCase();
  const isAuthenticationHost = hostname === 'portail.fiip.fr';

  if (path && path.toLowerCase().startsWith('/auth/callback')) {
    return <OAuthCallback />;
  }

  if (isAuthenticationHost && path.toLowerCase().startsWith('/account')) {
    return <ClerkAccountPortal path={path.toLowerCase()} />;
  }

  if (isAuthenticationHost) {
    return <ClerkAuthenticationPortal />;
  }

  if (path && path.toLowerCase() === '/oauth/consent') {
    return <OAuthConsentPage />;
  }

  if (path && (path.toLowerCase().startsWith('/n/') || path.toLowerCase() === '/n')) {
    return <PublicNoteView />;
  }

  if (path && path.toLowerCase().startsWith('/account')) {
    return <ClerkAccountPortal path={path.toLowerCase()} />;
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
              <IconShoppingBag />
              Voir les licences
            </a>
            <a href={FIIP_ACCOUNT_PORTAL_URL} className="download-link">
              <IconUser />
              Mon compte
            </a>
            <a href="/share" className="secondary-link">
              <IconLink />
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

      <HomeProductShowcase />

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

function App() {
  return (
    <FeatureFlagGate>
      <RoutedApp />
    </FeatureFlagGate>
  );
}

export default App;
