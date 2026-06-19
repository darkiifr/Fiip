import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/plugin-shell';
import { authService, supabase, dataService } from '../services/supabase';
import { keyAuthService } from '../services/keyauth';
import { GlassSwitch } from './ui/GlassSwitch';

import IconGoogle from '~icons/logos/google-icon';
import IconCheck from '~icons/mingcute/check-fill';
import IconKey from '~icons/mingcute/key-2-fill';
import IconLock from '~icons/mingcute/lock-fill';
import IconMail from '~icons/mingcute/mail-send-fill';
import IconUser from '~icons/mingcute/user-4-fill';
import IconBot from '~icons/mingcute/robot-fill';

export default function OnboardingView({ onComplete, onLoginSuccess }) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('trial');
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        username: ''
    });
    const [licenseKey, setLicenseKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleInputChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleFreeTrial = () => {
        localStorage.setItem('fiip-onboarding-completed', 'true');
        localStorage.setItem('fiip-mode-local', 'true');
        onComplete();
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await authService.signInWithOAuth('google');
            if (error) {
                setError(error.message);
            }
        } catch (err) {
            setError(err.message || 'Une erreur est survenue lors de la connexion Google.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitAuth = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            if (activeTab === 'login') {
                const { error } = await authService.signIn(formData.email, formData.password);
                if (error) {
                    setError(error.message);
                } else {
                    setSuccess("Connexion réussie !");
                    localStorage.setItem('fiip-onboarding-completed', 'true');
                    localStorage.removeItem('fiip-mode-local');
                    setTimeout(() => {
                        onLoginSuccess();
                        onComplete();
                    }, 1000);
                }
            } else if (activeTab === 'register') {
                const { error } = await authService.signUp(formData.email, formData.password, formData.username);
                if (error) {
                    setError(error.message);
                } else {
                    setSuccess("Inscription réussie ! Vérifiez votre email pour confirmer.");
                    setTimeout(() => setActiveTab('login'), 3000);
                }
            }
        } catch (err) {
            setError(err.message || "Une erreur est survenue.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitLicense = async (e) => {
        e.preventDefault();
        const keyToVerify = licenseKey.trim();
        if (!keyToVerify) {
            setError("La clé de licence ne peut pas être vide.");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await keyAuthService.validateLicense(keyToVerify);
            if (res.success) {
                const currentUser = await authService.getUser();
                if (currentUser) {
                    const { data, error: updateError } = await authService.updateSubscription(res.level, keyToVerify);
                    if (updateError) {
                        setError("Licence valide mais erreur de sauvegarde: " + updateError.message);
                    } else {
                        setSuccess("Licence activée et associée au compte avec succès !");
                        keyAuthService.setLocalLevel(res.level, currentUser.email);
                        keyAuthService.licenseKey = keyToVerify;
                        localStorage.setItem('fiip-onboarding-completed', 'true');
                        localStorage.removeItem('fiip-mode-local');
                        setTimeout(() => {
                            onLoginSuccess();
                            onComplete();
                        }, 1200);
                    }
                } else {
                    localStorage.setItem('saved_license_key', keyToVerify);
                    keyAuthService.setLocalLevel(res.level);
                    keyAuthService.licenseKey = keyToVerify;
                    setSuccess("Licence activée localement avec succès !");
                    localStorage.setItem('fiip-onboarding-completed', 'true');
                    setTimeout(() => {
                        onComplete();
                    }, 1200);
                }
            } else {
                setError(res.message || "La clé de licence est invalide ou expirée.");
            }
        } catch (err) {
            console.error(err);
            setError("Erreur lors de l'activation. Vérifiez votre connexion.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-screen h-screen flex bg-[#FAF9F8] dark:bg-[#161615] text-[#1C1C1E] dark:text-[#F5F5F7] select-none font-sans overflow-hidden">
            {/* CÔTÉ GAUCHE : Brand Spotlight */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-[#F3F3F2] dark:bg-[#1E1E1E] p-16 flex-col justify-between items-start border-r border-warm-border-light dark:border-warm-border-dark overflow-hidden">
                <div className="absolute inset-0 z-0 opacity-80 pointer-events-none">
                    <img 
                        src="/assets/stone_sprout.png" 
                        alt="Fiip Aesthetic Stone Sprout" 
                        className="w-full h-full object-cover scale-105 select-none"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#F3F3F2] via-transparent to-transparent dark:from-[#1E1E1E]"></div>
                </div>

                <div className="z-10 flex items-center gap-2">
                    <span className="text-2xl font-extrabold tracking-tighter text-amber-600 dark:text-amber-400 bg-white/40 dark:bg-black/20 backdrop-blur-md px-3 py-1 rounded-xl border border-white/20">Fiip</span>
                </div>

                <div className="z-10 max-w-md space-y-4 bg-white/30 dark:bg-black/20 backdrop-blur-lg p-6 rounded-3xl border border-white/20 dark:border-white/5">
                    <h1 className="text-3xl font-extrabold tracking-tight leading-tight">Votre espace de pensée minimaliste et fluide.</h1>
                    <p className="text-sm text-[#4E4E4C] dark:text-[#A5A5A5] leading-relaxed">
                        Prenez des notes, collaborez en temps réel avec vos proches, et sublimez vos écrits grâce à notre assistant Dexter. Conçu pour Windows, macOS, iOS et Android.
                    </p>
                </div>
            </div>

            {/* CÔTÉ DROIT : Auth/License Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-6 sm:px-12 md:px-20 py-10 relative">
                <div className="w-full max-w-md space-y-6">
                    {/* Header */}
                    <div className="text-center lg:text-left space-y-2">
                        <h2 className="text-2xl font-extrabold tracking-tight">Bienvenue sur Fiip</h2>
                        <p className="text-xs text-warm-text-secondary-light dark:text-warm-text-secondary-dark">
                            Choisissez une option pour démarrer votre voyage d'écriture minimaliste.
                        </p>
                    </div>

                    {/* Tabs Segmented Control */}
                    <div className="bg-[#F3F3F2] dark:bg-[#262625] p-1 rounded-2xl flex border border-warm-border-light dark:border-warm-border-dark select-none text-[11px] font-bold tracking-tight">
                        {[
                            { id: 'trial', label: 'Essai Gratuit' },
                            { id: 'login', label: 'Connexion' },
                            { id: 'register', label: 'S\'inscrire' },
                            { id: 'license', label: 'Licence' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    setError(null);
                                    setSuccess(null);
                                }}
                                className={`flex-1 py-2 text-center rounded-xl transition-all ${
                                    activeTab === tab.id 
                                        ? 'bg-white dark:bg-zinc-800 text-warm-text-primary-light dark:text-warm-text-primary-dark shadow-sm border border-warm-border-light dark:border-warm-border-dark' 
                                        : 'text-warm-text-muted-light dark:text-warm-text-muted-dark hover:text-warm-text-primary-light dark:hover:text-warm-text-primary-dark'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Notification Alerts */}
                    {error && (
                        <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs leading-relaxed">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="p-3.5 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-xl text-xs leading-relaxed">
                            {success}
                        </div>
                    )}

                    {/* TAB CONTENT: Essai Gratuit */}
                    {activeTab === 'trial' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            <div className="bg-warm-card-light dark:bg-warm-card-dark border border-warm-border-light dark:border-warm-border-dark p-5 rounded-2xl space-y-4">
                                <h3 className="text-sm font-bold">Démarrer immédiatement</h3>
                                <p className="text-xs text-warm-text-secondary-light dark:text-warm-text-secondary-dark leading-relaxed">
                                    L'essai gratuit vous donne un accès immédiat en local. Vos notes restent à 100% privées sur votre ordinateur. Vous pourrez activer la synchronisation cloud à tout moment.
                                </p>
                                <ul className="space-y-2 text-xs">
                                    <li className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                        <IconCheck className="w-3.5 h-3.5" />
                                        <span>Notes locales illimitées</span>
                                    </li>
                                    <li className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                        <IconCheck className="w-3.5 h-3.5" />
                                        <span>Éditeur TipTap riche et rapide</span>
                                    </li>
                                    <li className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                        <IconCheck className="w-3.5 h-3.5" />
                                        <span>Sans création de compte requise</span>
                                    </li>
                                </ul>
                            </div>
                            <button
                                onClick={handleFreeTrial}
                                className="w-full py-3 bg-[#1C1C1E] hover:bg-[#2C2C2E] dark:bg-white dark:hover:bg-[#E5E5E3] text-white dark:text-black font-semibold rounded-2xl text-xs transition-colors shadow-sm"
                            >
                                Commencer l'essai gratuit en local
                            </button>
                        </div>
                    )}

                    {/* TAB CONTENT: Connexion / Inscription */}
                    {(activeTab === 'login' || activeTab === 'register') && (
                        <form onSubmit={handleSubmitAuth} className="space-y-4 animate-in fade-in duration-200">
                            {activeTab === 'register' && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-warm-text-muted-light">Nom d'utilisateur</label>
                                    <div className="relative">
                                        <IconUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-text-muted-light" />
                                        <input
                                            type="text"
                                            name="username"
                                            required
                                            value={formData.username}
                                            onChange={handleInputChange}
                                            placeholder="julien26"
                                            className="w-full pl-10 pr-3.5 py-3 bg-white dark:bg-[#262625] border border-warm-border-light dark:border-warm-border-dark rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-[#1C1C1E] dark:text-[#F5F5F7]"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-warm-text-muted-light">Adresse e-mail</label>
                                <div className="relative">
                                    <IconMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-text-muted-light" />
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="adresse@exemple.com"
                                        className="w-full pl-10 pr-3.5 py-3 bg-white dark:bg-[#262625] border border-warm-border-light dark:border-warm-border-dark rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-[#1C1C1E] dark:text-[#F5F5F7]"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-warm-text-muted-light">Mot de passe</label>
                                <div className="relative">
                                    <IconLock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-text-muted-light" />
                                    <input
                                        type="password"
                                        name="password"
                                        required
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        placeholder="••••••••"
                                        className="w-full pl-10 pr-3.5 py-3 bg-white dark:bg-[#262625] border border-warm-border-light dark:border-warm-border-dark rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-[#1C1C1E] dark:text-[#F5F5F7]"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-[#1C1C1E] hover:bg-[#2C2C2E] dark:bg-white dark:hover:bg-[#E5E5E3] text-white dark:text-black font-semibold rounded-2xl text-xs transition-colors shadow-sm disabled:opacity-50"
                            >
                                {loading ? "Chargement..." : activeTab === 'login' ? "Se connecter" : "S'inscrire"}
                            </button>

                            {activeTab === 'login' && (
                                <div className="pt-2">
                                    <div className="relative flex py-2 items-center">
                                        <div className="flex-grow border-t border-warm-border-light dark:border-warm-border-dark"></div>
                                        <span className="flex-shrink mx-4 text-[10px] text-warm-text-muted-light dark:text-warm-text-muted-dark uppercase tracking-wider font-bold">ou</span>
                                        <div className="flex-grow border-t border-warm-border-light dark:border-warm-border-dark"></div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleGoogleLogin}
                                        disabled={loading}
                                        className="w-full py-2.5 bg-white hover:bg-zinc-50 border border-warm-border-light dark:border-warm-border-dark text-xs font-semibold rounded-2xl flex items-center justify-center gap-2.5 text-[#1C1C1E] transition-colors"
                                    >
                                        <IconGoogle className="w-4 h-4" />
                                        Continuer avec Google
                                    </button>
                                </div>
                            )}
                        </form>
                    )}

                    {/* TAB CONTENT: Clé de Licence */}
                    {activeTab === 'license' && (
                        <form onSubmit={handleSubmitLicense} className="space-y-4 animate-in fade-in duration-200">
                            <div className="bg-warm-card-light dark:bg-warm-card-dark border border-warm-border-light dark:border-warm-border-dark p-4 rounded-2xl space-y-2">
                                <h3 className="text-xs font-bold flex items-center gap-2">
                                    <IconKey className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                    Activer une licence Premium
                                </h3>
                                <p className="text-[11px] text-warm-text-secondary-light dark:text-warm-text-secondary-dark leading-relaxed">
                                    Si vous avez acheté Fiip Premium, entrez votre clé d'activation ci-dessous pour débloquer l'accès à Dexter l'IA et aux fonctionnalités collaboratives.
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-warm-text-muted-light">Clé de Licence</label>
                                <input
                                    type="text"
                                    required
                                    value={licenseKey}
                                    onChange={(e) => setLicenseKey(e.target.value)}
                                    placeholder="FIIP-XXXX-XXXX-XXXX"
                                    className="w-full px-3.5 py-3 bg-white dark:bg-[#262625] border border-warm-border-light dark:border-warm-border-dark rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-[#1C1C1E] dark:text-[#F5F5F7] font-mono"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-[#1C1C1E] hover:bg-[#2C2C2E] dark:bg-white dark:hover:bg-[#E5E5E3] text-white dark:text-black font-semibold rounded-2xl text-xs transition-colors shadow-sm disabled:opacity-50"
                            >
                                {loading ? "Vérification..." : "Activer la clé"}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
