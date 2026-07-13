import { useEffect, useRef, useState } from 'react';

import { getCaptchaSiteKey } from '../services/supabase';

const TURNSTILE_SCRIPT_ID = 'fiip-turnstile-script';

export default function TurnstileCaptcha({ siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '', onVerify, resetKey = 0 }) {
  const containerRef = useRef(null);
  const [statusError, setStatusError] = useState('');
  const activeSiteKey = getCaptchaSiteKey(siteKey);

  useEffect(() => {
    if (!activeSiteKey) {
      onVerify?.('');
      return undefined;
    }

    let widgetId = null;
    let cancelled = false;

    const renderWidget = () => {
      if (cancelled || !containerRef.current || !window.turnstile) {
        return;
      }

      containerRef.current.innerHTML = '';
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: activeSiteKey,
        theme: 'dark',
        callback: (token) => { setStatusError(''); onVerify?.(token, null); },
        'expired-callback': () => { setStatusError('Le défi anti-bot a expiré. Revalidez-le.'); onVerify?.('', 'expired'); },
        'error-callback': () => { setStatusError('Le défi anti-bot a rencontré une erreur. Réessayez.'); onVerify?.('', 'error'); },
      });
    };

    const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID);
    if (window.turnstile) {
      renderWidget();
    } else if (existingScript) {
        existingScript.addEventListener('load', renderWidget, { once: true });
        existingScript.addEventListener('error', () => {
          if (!cancelled) {
            setStatusError("Le chargement de la protection anti-bot a échoué.");
            onVerify?.('', 'load');
          }
        }, { once: true });
    } else {
      const script = document.createElement('script');
      script.id = TURNSTILE_SCRIPT_ID;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.addEventListener('load', renderWidget, { once: true });
      script.addEventListener('error', () => {
        if (!cancelled) {
          setStatusError("Le chargement de la protection anti-bot a échoué.");
          onVerify?.('', 'load');
        }
      }, { once: true });
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
      }
    };
  }, [activeSiteKey, onVerify, resetKey]);

  if (!activeSiteKey) {
    return null;
  }

  return (
    <div className="fiip-turnstile-box">
      <div ref={containerRef} />
      {statusError && <p role="alert">{statusError}</p>}
    </div>
  );
}
