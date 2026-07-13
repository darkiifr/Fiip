import { Icon as IconifyIcon } from '@iconify/react';
import { useEffect, useRef } from 'react';

import { buildDesktopOAuthCallbackUrl, getOAuthCallbackError } from '../services/oauthCallback';

export default function OAuthCallback({
  location = window.location,
  navigate = (url) => window.location.replace(url),
  delay = 500,
}) {
  const callbackUrl = buildDesktopOAuthCallbackUrl(location);
  const oauthError = getOAuthCallbackError(location);
  const timerRef = useRef(null);

  const handleManualFallback = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    navigate(callbackUrl);
  };

  useEffect(() => {
    if (oauthError) return undefined;
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      navigate(callbackUrl);
    }, delay);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [callbackUrl, delay, navigate, oauthError]);

  return (
    <main className="public-shell public-center">
      <section className="public-panel auth-panel">
        {!oauthError ? <IconifyIcon icon="mingcute:loading-fill" className="spin-icon" /> : null}
        <h1>Connexion à Fiip</h1>
        {oauthError
          ? <p className="account-error" role="alert">{oauthError}</p>
          : <p>Redirection sécurisée vers l’application.</p>}
        <button className="download-link" type="button" onClick={handleManualFallback}>
          Ouvrir Fiip
        </button>
      </section>
    </main>
  );
}
