import { open } from '@tauri-apps/plugin-shell';
import { useState } from 'react';

import { keyAuthService } from '../services/keyauth';
import { authService } from '../services/supabase';

import IconGoogle from '~icons/logos/google-icon';
import IconArrowRight from '~icons/mingcute/arrow-right-line';
import IconCheck from '~icons/mingcute/check-fill';
import IconLock from '~icons/mingcute/lock-fill';
import IconMail from '~icons/mingcute/mail-send-fill';
import IconUser from '~icons/mingcute/user-4-fill';

const tabs = [
  { id: 'trial', label: 'Essai local' },
  { id: 'login', label: 'Connexion' },
  { id: 'register', label: "S'inscrire" },
];

const localBenefits = [
  'Notes locales illimitées',
  'Éditeur Tiptap rapide',
  'Synchronisation activable après connexion',
];

function getOAuthErrorMessage(error) {
  if (error?.code === 'SUPABASE_CONFIG_MISSING') {
    return error.message;
  }

  const message = String(error?.message || '').trim();
  if (message) {
    return `Connexion Google impossible : ${message}`;
  }

  return "Connexion Google impossible. Vérifiez que Safari a ouvert Fiip, puis réessayez.";
}

export default function OnboardingView({ onComplete, onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('trial');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const switchTab = (tabId) => {
    setActiveTab(tabId);
    setError(null);
    setSuccess(null);
  };

  const handleInputChange = (event) => {
    setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleFreeTrial = () => {
    if (!keyAuthService.startTrial()) {
      setError("L'essai gratuit a déjà été utilisé sur cet appareil ou une licence est déjà active.");
      return;
    }
    localStorage.setItem('fiip-onboarding-completed', 'true');
    localStorage.setItem('fiip-mode-local', 'true');
    onComplete();
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error: oauthError } = await authService.signInWithOAuth('google');
      if (oauthError) {
        throw oauthError;
      }
      if (!data?.url) {
        throw new Error("Le compte Fiip n'a pas renvoyé d'URL de connexion Google.");
      }

      try {
        await open(data.url);
      } catch (shellError) {
        console.warn('Tauri shell open failed, falling back to browser navigation.', shellError);
        window.location.assign(data.url);
      }

      setSuccess('Connexion Google ouverte. Terminez la validation dans votre navigateur.');
    } catch (err) {
      console.error('Google OAuth error:', err);
      setError(getOAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAuth = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (activeTab === 'login') {
        const { error: loginError } = await authService.signIn(formData.email, formData.password);
        if (loginError) {
          throw loginError;
        }

        setSuccess('Connexion réussie.');
        localStorage.setItem('fiip-onboarding-completed', 'true');
        localStorage.removeItem('fiip-mode-local');
        window.setTimeout(() => {
          onLoginSuccess();
          onComplete();
        }, 700);
      }

      if (activeTab === 'register') {
        const { error: registerError } = await authService.signUp(
          formData.email,
          formData.password,
          formData.username,
        );
        if (registerError) {
          throw registerError;
        }

        setSuccess('Compte créé. Vérifiez votre e-mail pour finaliser la connexion.');
        window.setTimeout(() => switchTab('login'), 1200);
      }
    } catch (err) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const { error: resetError } = await authService.sendPasswordReset(formData.email);
      if (resetError) {
        throw resetError;
      }
      setSuccess('Lien de réinitialisation envoyé. Vérifiez votre boîte mail.');
    } catch (err) {
      setError(err.message || 'Impossible d’envoyer le lien de réinitialisation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="dark min-h-screen w-screen overflow-hidden bg-[color:var(--bg-content)] text-[color:var(--text-primary)] antialiased">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_80%_8%,rgba(10,132,255,0.16),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.055),transparent_44%)]" />

      <section className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-6 py-10 sm:px-10 lg:grid-cols-[0.95fr_1.05fr] lg:px-12">
        <div className="space-y-6">
          <div className="max-w-xl space-y-4">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--accent)]">
              Fiip Desktop
            </p>
            <h1 className="text-balance text-4xl font-black leading-[0.98] tracking-tight sm:text-5xl lg:text-[3.55rem]">
              Écrire, classer, continuer.
            </h1>
            <p className="max-w-lg text-sm leading-6 text-[color:var(--text-secondary)] sm:text-[15px]">
              Démarrez en local ou connectez votre compte. Les notes restent au centre, sans étape inutile.
            </p>
          </div>

          <div className="grid max-w-xl gap-3 sm:grid-cols-3">
            {localBenefits.map((benefit) => (
              <div
                key={benefit}
                className="rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)]/72 p-3 text-xs font-semibold leading-5 shadow-[0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:bg-[color:var(--bg-elevated)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <IconCheck className="mb-2 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" />
                {benefit}
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-[31rem]">
          <div className="rounded-[28px] border border-[color:var(--border-color)] bg-[color:var(--bg-card)]/78 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-3xl sm:p-5">
            <div className="mb-5 rounded-[22px] border border-[color:var(--border-color)] bg-[color:var(--bg-sidebar)]/72 p-1" role="tablist" aria-label="Choix de démarrage">
              <div className="grid grid-cols-3 gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => switchTab(tab.id)}
                    className={`rounded-[18px] px-3 py-3 text-sm font-bold transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/50 motion-reduce:transition-none ${
                      activeTab === tab.id
                        ? 'bg-[color:var(--bg-card)] text-[color:var(--text-primary)] shadow-[0_10px_26px_rgba(20,20,20,0.11)]'
                        : 'text-[color:var(--text-muted)] hover:bg-[color:var(--bg-card)]/55 hover:text-[color:var(--text-primary)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-[24rem] rounded-[24px] border border-[color:var(--border-color)] bg-[color:var(--bg-card)]/70 p-5 sm:p-6">
              <div className="mb-6 space-y-2">
                <h2 className="text-2xl font-black tracking-tight">
                  {activeTab === 'trial' && 'Bienvenue sur Fiip'}
                  {activeTab === 'login' && 'Connectez-vous'}
                  {activeTab === 'register' && 'Créez votre compte'}
                </h2>
                <p className="text-sm leading-6 text-[color:var(--text-secondary)]">
                  {activeTab === 'trial' && 'Démarrez immédiatement, puis ajoutez la synchronisation quand vous en avez besoin.'}
                  {activeTab === 'login' && 'Retrouvez vos notes, vos préférences et vos espaces synchronisés.'}
                  {activeTab === 'register' && 'Créez votre espace et retrouvez-le sur vos appareils.'}
                </p>
              </div>

              {error && (
                <div className="mb-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-700 dark:text-red-300" role="alert">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-700 dark:text-emerald-300" role="status">
                  {success}
                </div>
              )}

              {activeTab === 'trial' && (
                <div className="animate-[fadeIn_220ms_ease-out] space-y-5 motion-reduce:animate-none">
                  <div className="rounded-xl border border-[color:var(--accent)]/35 bg-[color:var(--accent)]/10 px-4 py-3 text-sm font-semibold leading-6 text-[color:var(--text-primary)] shadow-[0_0_0_4px_rgba(110,116,255,0.06)]">
                    L’essai local dure 7 jours sur cet appareil. Connectez-vous plus tard pour synchroniser.
                  </div>
                  <div className="space-y-3">
                    {localBenefits.map((benefit) => (
                      <div key={benefit} className="flex items-center gap-3 text-sm font-semibold text-[#34312d] dark:text-[#ede9df]">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-700 dark:text-emerald-300">
                          <IconCheck className="h-4 w-4" />
                        </span>
                        {benefit}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleFreeTrial}
                    className="group flex w-full items-center justify-center gap-2 rounded-[18px] bg-[color:var(--accent)] px-5 py-4 text-base font-bold text-white shadow-[0_18px_40px_rgba(0,0,0,0.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-[color:var(--accent-light)] active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    Commencer en local
                    <IconArrowRight className="h-5 w-5 transition duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
                  </button>
                </div>
              )}

              {(activeTab === 'login' || activeTab === 'register') && (
                <form onSubmit={handleSubmitAuth} className="animate-[fadeIn_220ms_ease-out] space-y-4 motion-reduce:animate-none">
                  {activeTab === 'register' && (
                    <TextField
                      icon={<IconUser className="h-5 w-5" />}
                      label="Nom d'utilisateur"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="julien"
                      autoComplete="username"
                      required
                    />
                  )}

                  <TextField
                    icon={<IconMail className="h-5 w-5" />}
                    label="Adresse e-mail"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="adresse@exemple.com"
                    autoComplete="email"
                    required
                  />

                  <TextField
                    icon={<IconLock className="h-5 w-5" />}
                    label="Mot de passe"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="8 caractères minimum"
                    autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'}
                    required
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-[18px] bg-[color:var(--accent)] px-5 py-4 text-base font-bold text-white shadow-[0_18px_40px_rgba(0,0,0,0.20)] transition duration-200 hover:-translate-y-0.5 hover:bg-[color:var(--accent-light)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    {loading ? 'Chargement...' : activeTab === 'login' ? 'Se connecter' : "S'inscrire"}
                  </button>

                  {activeTab === 'login' && (
                    <div className="space-y-4 pt-1">
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        disabled={loading}
                        className="w-full rounded-[18px] border border-white/10 bg-white/8 px-5 py-3 text-sm font-bold text-[color:var(--text-primary)] transition duration-200 hover:bg-white/12 disabled:opacity-55"
                      >
                        Mot de passe oublié
                      </button>

                      <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-[#858078] dark:text-[#9f9a91]">
                        <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
                        ou
                        <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
                      </div>

                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="flex w-full items-center justify-center gap-3 rounded-[18px] border border-white/10 bg-white/92 px-5 py-4 text-base font-bold text-[#151515] shadow-[0_12px_28px_rgba(0,0,0,0.18)] transition duration-200 hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                      >
                        <IconGoogle className="h-5 w-5" />
                        Se connecter avec Google
                      </button>
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function TextField({ icon, label, ...inputProps }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-bold text-[color:var(--text-primary)]">{label}</span>
      <span className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/8 px-4 py-3.5 text-[color:var(--text-muted)] shadow-[0_8px_22px_rgba(0,0,0,0.14)] transition duration-200 focus-within:border-[color:var(--accent)]/50 focus-within:ring-4 focus-within:ring-[color:var(--accent)]/12 motion-reduce:transition-none">
        {icon}
        <input
          {...inputProps}
          className="min-w-0 flex-1 bg-transparent text-base font-semibold text-[#151515] outline-none placeholder:text-[#9a958b] dark:text-white dark:placeholder:text-[#77736b]"
        />
      </span>
    </label>
  );
}
