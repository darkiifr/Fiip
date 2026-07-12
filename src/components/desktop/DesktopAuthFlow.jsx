import { useState } from 'react';
import { authService } from '../../services/supabase';
import { keyAuthService } from '../../services/keyauth';
import TurnstileCaptcha from '../TurnstileCaptcha';

export default function DesktopAuthFlow({ onAuthed }) {
  const [stage, setStage] = useState('entry');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  async function handleLogin() {
    setLoading(true);
    setError('');
    const { error: err } = await authService.signIn(email, password, captchaToken);
    setLoading(false);
    setCaptchaToken('');
    setCaptchaResetKey((current) => current + 1);
    if (err) return setError(err.message || 'Connexion impossible');
    onAuthed();
  }

  async function handlePasskeyLogin() {
    setLoading(true);
    setError('');
    try {
      const { error: err } = await authService.signInWithPasskey();
      if (err) {
        setError(err.message || 'Connexion passkey impossible');
        return;
      }
      onAuthed();
    } catch (err) {
      setError(err?.message || 'Connexion passkey impossible');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup() {
    setLoading(true);
    setError('');
    const { error: err } = await authService.signUp(email, password, username || email.split('@')[0], captchaToken);
    setLoading(false);
    setCaptchaToken('');
    setCaptchaResetKey((current) => current + 1);
    if (err) return setError(err.message || 'Inscription impossible');
    setStage('login');
  }

  async function handleForgotPassword() {
    setLoading(true);
    setError('');
    const { error: err } = await authService.sendPasswordReset(email, captchaToken);
    setLoading(false);
    setCaptchaToken('');
    setCaptchaResetKey((current) => current + 1);
    if (err) return setError(err.message || 'Réinitialisation impossible');
    setError('Lien de réinitialisation envoyé.');
  }

  function handleTrial() {
    const ok = keyAuthService.startTrial();
    if (!ok) {
      setError("L'essai gratuit est déjà utilisé ou indisponible.");
      return;
    }
    onAuthed();
  }

  return (
    <div className="fiip-auth-shell">
      <div className="fiip-auth-card">
        {stage === 'entry' && (
          <>
            <h1>Bienvenue dans Fiip</h1>
            <p>Écrivez, structurez et partagez vos notes avec une expérience desktop claire et moderne.</p>
            <div className="fiip-auth-actions">
              <button type="button" onClick={() => setStage('login')}>Se connecter</button>
              <button type="button" onClick={handlePasskeyLogin} disabled={loading}>Passkey</button>
              <button type="button" onClick={() => setStage('signup')}>Créer un compte</button>
              <button type="button" onClick={handleTrial}>Commencer un essai gratuit</button>
            </div>
          </>
        )}

        {(stage === 'login' || stage === 'signup') && (
          <>
            <h1>{stage === 'login' ? 'Connexion' : 'Inscription'}</h1>
            <p>{stage === 'login' ? 'Accédez à vos notes synchronisées.' : 'Créez votre espace de travail en moins d\'une minute.'}</p>
            <div className="fiip-auth-form">
              {stage === 'signup' && <input placeholder="Nom d'utilisateur" value={username} onChange={(e) => setUsername(e.target.value)} />}
              <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input placeholder="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <TurnstileCaptcha onVerify={setCaptchaToken} resetKey={captchaResetKey} />
              <button type="button" disabled={loading} onClick={stage === 'login' ? handleLogin : handleSignup}>{loading ? '...' : stage === 'login' ? 'Se connecter' : "Créer un compte"}</button>
              {stage === 'login' && (
                <button type="button" className="ghost" disabled={loading} onClick={handlePasskeyLogin}>
                  Se connecter avec une passkey
                </button>
              )}
              {stage === 'login' && (
                <button type="button" className="ghost" disabled={loading || !email} onClick={handleForgotPassword}>
                  Mot de passe oublié
                </button>
              )}
              <button type="button" className="ghost" onClick={() => setStage('entry')}>Retour</button>
            </div>
          </>
        )}

        {error && <p className="fiip-status error">{error}</p>}
      </div>
    </div>
  );
}
