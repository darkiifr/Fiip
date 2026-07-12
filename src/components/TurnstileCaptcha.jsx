import { useEffect, useRef } from 'react';

import { getCaptchaSiteKey } from '../services/supabase';

const TURNSTILE_SCRIPT_ID = 'fiip-turnstile-script';

export default function TurnstileCaptcha({ siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '', onVerify, resetKey = 0 }) {
  const containerRef = useRef(null);
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
        callback: (token) => onVerify?.(token),
        'expired-callback': () => onVerify?.(''),
        'error-callback': () => onVerify?.(''),
      });
    };

    const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID);
    if (existingScript) {
      if (window.turnstile) {
        renderWidget();
      } else {
        existingScript.addEventListener('load', renderWidget, { once: true });
      }
    } else {
      const script = document.createElement('script');
      script.id = TURNSTILE_SCRIPT_ID;
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
  }, [activeSiteKey, onVerify, resetKey]);

  if (!activeSiteKey) {
    return null;
  }

  return (
    <div className="fiip-turnstile-box">
      <div ref={containerRef} />
    </div>
  );
}
