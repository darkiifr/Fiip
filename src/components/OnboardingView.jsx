import { open } from '@tauri-apps/plugin-shell';
import { useState } from 'react';

import { authService } from '../services/supabase';

import IconGoogle from '~icons/logos/google-icon';
import IconArrowRight from '~icons/mingcute/arrow-right-line';
import IconCheck from '~icons/mingcute/check-fill';
import IconLock from '~icons/mingcute/lock-fill';
import IconMail from '~icons/mingcute/mail-send-fill';
import IconSparkles from '~icons/mingcute/sparkles-2-fill';
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
        throw new Error("Supabase n'a pas renvoyé d'URL de connexion Google.");
      }

      try {
        await open(data.url);
      } catch (shellError) {
        console.warn('Tauri shell open failed, falling back to browser navigation.', shellError);
        window.location.assign(data.url);
      }

      setSuccess('Connexion Google ouverte. Terminez la validation dans votre navigateur.');
    } catch (err) {
      setError(err.message || 'Une erreur est survenue lors de la connexion Google.');
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

  return (
    <main className="min-h-screen w-screen overflow-hidden bg-[#f7f5f1] text-[#151515] antialiased dark:bg-[#0f0f0f] dark:text-[#f7f7f4]">
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,255,255,0)_42%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.16),rgba(251,191,36,0)_32%)] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0)_42%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),rgba(251,191,36,0)_32%)]" />

      <section className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-6 py-10 sm:px-10 lg:grid-cols-[0.95fr_1.05fr] lg:px-12">
        <div className="space-y-6">
          <div className="max-w-xl space-y-4">
            <p className="inline-flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
              <IconSparkles className="h-3.5 w-3.5" />
              Écriture, synchronisation et IA dans un espace calme
            </p>
            <h1 className="text-balance text-4xl font-black leading-[0.98] tracking-tight sm:text-5xl lg:text-[3.55rem]">
              Un départ clair, sans friction.
            </h1>
            <p className="max-w-lg text-sm leading-6 text-[#5f5c56] dark:text-[#c7c3ba] sm:text-[15px]">
              Commencez en local ou connectez votre compte Supabase. La licence est retirée de cet écran : le compte se lie dès la création et la connexion.
            </p>
          </div>

          <div className="grid max-w-xl gap-3 sm:grid-cols-3">
            {localBenefits.map((benefit) => (
              <div
                key={benefit}
                className="rounded-[1.15rem] border border-black/10 bg-white/54 p-3 text-xs font-semibold leading-5 shadow-[0_12px_30px_rgba(20,20,20,0.06)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/70 dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <IconCheck className="mb-2 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" />
                {benefit}
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-[31rem]">
          <div className="rounded-[2rem] border border-black/10 bg-white/72 p-4 shadow-[0_24px_80px_rgba(20,20,20,0.16)] backdrop-blur-3xl dark:border-white/10 dark:bg-[#1a1a18]/78 dark:shadow-[0_24px_90px_rgba(0,0,0,0.45)] sm:p-5">
            <div className="mb-5 rounded-[1.55rem] border border-black/10 bg-[#f5f2ec]/80 p-1 dark:border-white/10 dark:bg-white/8" role="tablist" aria-label="Choix de démarrage">
              <div className="grid grid-cols-3 gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => switchTab(tab.id)}
                    className={`rounded-[1.1rem] px-3 py-3 text-sm font-bold transition duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 motion-reduce:transition-none ${
                      activeTab === tab.id
                        ? 'bg-white text-[#151515] shadow-[0_10px_26px_rgba(20,20,20,0.11)] dark:bg-white dark:text-black'
                        : 'text-[#77736b] hover:bg-white/45 hover:text-[#151515] dark:text-[#a9a59d] dark:hover:bg-white/10 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-[24rem] rounded-[1.5rem] border border-black/10 bg-white/64 p-5 dark:border-white/10 dark:bg-black/18 sm:p-6">
              <div className="mb-6 space-y-2">
                <h2 className="text-2xl font-black tracking-tight">
                  {activeTab === 'trial' && 'Bienvenue sur Fiip'}
                  {activeTab === 'login' && 'Connectez-vous'}
                  {activeTab === 'register' && 'Créez votre compte'}
                </h2>
                <p className="text-sm leading-6 text-[#69665f] dark:text-[#c4c0b8]">
                  {activeTab === 'trial' && 'Démarrez immédiatement, puis ajoutez la synchronisation quand vous en avez besoin.'}
                  {activeTab === 'login' && 'Retrouvez vos notes, vos préférences et vos espaces synchronisés.'}
                  {activeTab === 'register' && 'Le lien de compte est créé ici, sans étape licence séparée.'}
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
                    className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[#151515] px-5 py-4 text-base font-bold text-white shadow-[0_18px_40px_rgba(20,20,20,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-black active:translate-y-0 dark:bg-white dark:text-black dark:hover:bg-[#f0ede6] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
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
                    className="w-full rounded-2xl bg-[#151515] px-5 py-4 text-base font-bold text-white shadow-[0_18px_40px_rgba(20,20,20,0.20)] transition duration-300 hover:-translate-y-0.5 hover:bg-black disabled:cursor-not-allowed disabled:opacity-55 dark:bg-white dark:text-black dark:hover:bg-[#f0ede6] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    {loading ? 'Chargement...' : activeTab === 'login' ? 'Se connecter' : "S'inscrire"}
                  </button>

                  {activeTab === 'login' && (
                    <div className="space-y-4 pt-1">
                      <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-[#858078] dark:text-[#9f9a91]">
                        <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
                        ou
                        <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
                      </div>

                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-black/10 bg-white px-5 py-4 text-base font-bold text-[#151515] shadow-[0_12px_28px_rgba(20,20,20,0.08)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#fbfaf7] disabled:cursor-not-allowed disabled:opacity-55 dark:border-white/10 dark:bg-white/92 dark:hover:bg-white motion-reduce:transition-none motion-reduce:hover:translate-y-0"
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
      <span className="text-sm font-bold text-[#504d47] dark:text-[#ded9cf]">{label}</span>
      <span className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/78 px-4 py-3.5 text-[#77736b] shadow-[0_8px_22px_rgba(20,20,20,0.05)] transition duration-300 focus-within:border-amber-500/50 focus-within:ring-4 focus-within:ring-amber-500/12 dark:border-white/10 dark:bg-white/8 dark:text-[#aaa59d] motion-reduce:transition-none">
        {icon}
        <input
          {...inputProps}
          className="min-w-0 flex-1 bg-transparent text-base font-semibold text-[#151515] outline-none placeholder:text-[#9a958b] dark:text-white dark:placeholder:text-[#77736b]"
        />
      </span>
    </label>
  );
}
