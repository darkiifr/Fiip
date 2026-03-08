
import { useState, useEffect } from 'react';
import { keyAuthService } from '../services/keyauth';
import { authService } from '../services/supabase';
import { useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/plugin-shell';

// Icons Import (Pim's Edition)
import IconClose from '~icons/mingcute/close-fill';
import IconUser from '~icons/mingcute/user-4-fill';
import IconLock from '~icons/mingcute/lock-fill';
import IconKey from '~icons/mingcute/key-2-fill';
import IconMail from '~icons/mingcute/mail-send-fill';
import IconLogin from '~icons/mingcute/enter-door-fill';
import IconUserAdd from '~icons/mingcute/user-add-fill';
import IconAward from '~icons/mingcute/trophy-fill';
import IconPlus from '~icons/mingcute/add-fill';
import IconLogout from '~icons/mingcute/exit-door-fill';
import IconGoogle from '~icons/logos/google-icon';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
    const { t } = useTranslation();
    const [mode, setMode] = useState('login'); // 'login' | 'register' | 'profile'
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        username: ''
    });
    const [showAddLicense, setShowAddLicense] = useState(false);
    const [upgradeKey, setUpgradeKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
        if (isOpen) {
            checkUser();
        }
    }, [isOpen]);

    const checkUser = async () => {
        const currentUser = await authService.getUser();
        if (currentUser) {
            setUser(currentUser);
            setMode('profile');
            // Sync KeyAuth level locally
            const level = currentUser.user_metadata?.subscription_level || 0;
            const username = currentUser.user_metadata?.username || currentUser.email;
            keyAuthService.setLocalLevel(level, username);
        } else {
            setUser(null);
            setMode('login');
        }
        setError(null);
        setSuccess(null);
        setShowAddLicense(false);
        setUpgradeKey('');
    };

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleUpgrade = async (e) => {
        e.preventDefault();
        
        let keyToVerify = upgradeKey.trim();
        if (!keyToVerify) {
            setError(t('license.error_empty', "La clé de licence ne peut pas être vide."));
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // 1. Validate with KeyAuth
            const res = await keyAuthService.validateLicense(keyToVerify);
            
            if (res.success) {
                // 2. Update Supabase
                if (user) {
                    const { data, error: updateError } = await authService.updateSubscription(res.level, keyToVerify);
                    
                    if (updateError) {
                        setError(t('license.error_save', "Licence valide mais erreur de sauvegarde: ") + updateError.message);
                    } else {
                        setSuccess(t('auth.success_upgrade', "Licence activée et associée au compte avec succès !"));
                        setUpgradeKey('');
                        setShowAddLicense(false);
                        const username = user?.user_metadata?.username || user?.email;
                        keyAuthService.setLocalLevel(res.level, username);
                        keyAuthService.licenseKey = keyToVerify;
                        if (data && data.user) {
                            setUser(data.user);
                        } else {
                            await checkUser(); // Refresh UI fallback
                        }
                    }
                } else {
                    localStorage.setItem('saved_license_key', keyToVerify);
                    setSuccess(t('auth.success_upgrade', "Licence activée localement avec succès !"));
                    setUpgradeKey('');
                    setShowAddLicense(false);
                    keyAuthService.setLocalLevel(res.level);
                    keyAuthService.licenseKey = keyToVerify;
                }
            } else {
                setError(res.message || t('license.error_invalid', "La clé de licence est invalide ou expirée."));
            }
        } catch (e) {
            console.error(e);
            setError(t('license.error_network', "Erreur lors de l'ajout de la licence. Vérifiez votre connexion."));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            if (mode === 'login') {
                const { error } = await authService.signIn(formData.email, formData.password);
                if (error) {
                    setError(error.message);
                } else {
                    setSuccess(t('auth.success_login', "Connexion réussie !"));
                    setTimeout(() => {
                        if (onLoginSuccess) onLoginSuccess();
                        checkUser();
                    }, 1000);
                }
            } else {
                const { error } = await authService.signUp(formData.email, formData.password, formData.username);
                if (error) {
                    setError(error.message);
                } else {
                    setSuccess(t('auth.success_register', "Inscription réussie ! Vérifiez votre email."));
                    setTimeout(() => setMode('login'), 3000);
                }
            }
        } catch (e) {
            setError(e.message || t('auth.error_generic', "Une erreur est survenue."));
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            setLoading(true);
            await authService.signOut();
        } catch (e) {
            console.error("Logout error", e);
        } finally {
            keyAuthService.isAuthenticated = false;
            keyAuthService.currentLevel = 0;
            keyAuthService.licenseKey = null;
            localStorage.removeItem('saved_license_key');
            
            setMode('login');
            setUser(null);
            setFormData({ email: '', password: '', username: '' });
            setLoading(false);
            // Optionally remove or keep onLoginSuccess if we decide it's a general onClose trigger
            // if (onLoginSuccess) onLoginSuccess();
        }
    };

    const currentLevel = user?.user_metadata?.subscription_level || keyAuthService.currentLevel || 0;
    const licenseKey = user?.user_metadata?.license_key || keyAuthService.licenseKey || "Aucune";
    const username = user?.user_metadata?.username || user?.email?.split('@')[0] || "Utilisateur";

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md font-sora animate-in fade-in duration-300">
            <div className={`w-[480px] max-w-[480px] bg-[#1a1b1e]/90 backdrop-blur-xl rounded-[12px] border border-white/10 shadow-2xl overflow-hidden transform transition-all font-sora relative duration-300 ease-in-out flex flex-col`}>
                
                {/* Header */}
                <div className="h-[40px] px-6 flex items-center justify-between border-b border-white/5 shrink-0">
                    <h2 className="text-sm font-semibold text-white">
                        {mode === 'login' ? t('auth.login', 'Connexion') : 
                         mode === 'register' ? t('auth.register', 'Inscription') : 
                         t('auth.profile', 'Profil')}
                    </h2>
                    <button 
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors duration-[150ms] ease-out"
                    >
                        <IconClose className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-[24px] overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(90vh - 96px)' }}>
                    {mode === 'profile' ? (
                        <div className="animate-fade-in text-center relative">
                            <div className="flex flex-col items-center mb-6">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-0.5 shadow-lg shadow-purple-900/20 mb-3">
                                    <div className="w-full h-full rounded-full bg-[#1C1C1E] flex items-center justify-center">
                                        <IconUser className="w-8 h-8 text-white" />
                                    </div>
                                </div>
                                <h2 className="text-xl font-bold text-white mb-1 px-4 text-center break-all">
                                    {username}
                                </h2>
                                <p className="text-[10px] text-gray-500 font-mono mb-2 truncate max-w-[200px] opacity-60">
                                    {user?.email}
                                </p>
                                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-medium uppercase tracking-wide">
                                    {t('auth.account_active', 'Compte Actif')}
                                </span>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                    <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <IconAward className="w-3 h-3" />
                                        {t('auth.licenses', 'Licences & Abonnements')}
                                    </h3>
                                    
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-[#141517] border border-gray-800">
                                        <div className="flex flex-col items-start pr-3">
                                            <span className="text-sm font-medium text-purple-300 capitalize text-left">
                                                {keyAuthService.getCurrentSubscriptionName()}
                                            </span>
                                            <span className="text-[10px] text-gray-500">
                                                Niveau {currentLevel}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-green-900/20 rounded border border-green-900/30 shrink-0">
                                            <IconKey className="w-3 h-3 text-green-500" />
                                            <span className="text-[10px] text-green-400 font-mono">
                                                {licenseKey.substring(0, 8)}...
                                            </span>
                                        </div>
                                    </div>

                                    {/* Add License Section */}
                                    <div className="mt-4 pt-3 border-t border-white/5 animate-fade-in">
                                        {!showAddLicense ? (
                                            <button
                                                onClick={() => setShowAddLicense(true)}
                                                className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors duration-[150ms] ease-out font-medium ml-1"
                                            >
                                                <IconPlus className="w-3 h-3" />
                                                {t('auth.add_license', 'Ajouter une licence / Upgrade')}
                                            </button>
                                        ) : (
                                            <form onSubmit={handleUpgrade} className="mt-2 space-y-2 animate-fade-in bg-[#141517] p-2 rounded-lg border border-blue-500/20">
                                                <input
                                                    type="text"
                                                    value={upgradeKey}
                                                    onChange={(e) => setUpgradeKey(e.target.value)}
                                                    placeholder={t('license.key_placeholder_short', "Clé de licence")}
                                                    className="w-full bg-[#1C1C1E] border border-gray-700 text-white text-xs rounded-md px-3 py-2 focus:outline-none focus:border-blue-500 font-mono placeholder:text-gray-600 transition-all duration-[250ms] ease-in-out"
                                                    required
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        type="submit"
                                                        disabled={loading}
                                                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold py-1.5 rounded-md transition-all duration-[250ms] ease-in-out flex items-center justify-center gap-1"
                                                    >
                                                        {loading ? <span className="w-2 h-2 rounded-full border border-t-transparent animate-spin"></span> : 'Activer'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setShowAddLicense(false); setUpgradeKey(''); setError(null); }}
                                                        className="px-3 bg-white/5 hover:bg-white/10 text-gray-400 text-[10px] rounded-md transition-colors duration-[150ms] ease-out"
                                                    >
                                                        Annuler
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <button
                                onClick={handleLogout}
                                className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-lg transition-colors border border-red-500/20 flex items-center justify-center gap-2"
                            >
                                <IconLogout className="w-3 h-3" />
                                {t('auth.logout', 'Déconnexion')}
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Email</label>
                                <div className="relative">
                                    <IconMail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all duration-[250ms] ease-in-out placeholder-gray-600 h-[40px]"
                                        placeholder="votre@email.com"
                                        required
                                    />
                                </div>
                            </div>
                            
                            {mode === 'register' && (
                                <div className="animate-in slide-in-from-top-2 duration-200">
                                    <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">{t('auth.username', 'Nom d\'utilisateur')}</label>
                                    <div className="relative">
                                        <IconUser className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input
                                            type="text"
                                            name="username"
                                            value={formData.username}
                                            onChange={handleChange}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all duration-[250ms] ease-in-out placeholder-gray-600 h-[40px]"
                                            placeholder="Pseudo"
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">{t('auth.password', 'Mot de passe')}</label>
                                <div className="relative">
                                    <IconLock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all duration-[250ms] ease-in-out placeholder-gray-600 h-[40px]"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 animate-in slide-in-from-top-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                    {error}
                                </div>
                            )}
                            
                            {success && (
                                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs flex items-center gap-2 animate-in slide-in-from-top-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                                    {success}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg shadow-lg shadow-blue-900/20 transition-all duration-300 transform hover:translate-y-[-1px] active:translate-y-[0px] flex items-center justify-center gap-2 mt-2"
                            >
                                {loading ? (
                                    <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                                ) : (
                                    <>
                                        {mode === 'login' ? <IconLogin className="w-4 h-4" /> : <IconUserAdd className="w-4 h-4" />}
                                        {mode === 'login' ? t('auth.login_btn', 'Se connecter') : t('auth.register_btn', 'S\'inscrire')}
                                    </>
                                )}
                            </button>
                            
                            {/* Decorative Google Icon (Now Functional) */}
                            {mode === 'login' && (
                                <div className="mt-4 flex justify-center">
                                     <div className="flex gap-4">
                                         <button 
                                            type="button" 
                                            onClick={async () => {
                                                setLoading(true);
                                                try {
                                                    const { data, error } = await authService.signInWithOAuth('google');
                                                    if (error) throw error;
                                                    if (data?.url) {
                                                        await open(data.url);
                                                        // Keep loading true while user authenticates in browser
                                                    }
                                                } catch (err) {
                                                    setError(err.message);
                                                    setLoading(false);
                                                }
                                            }}
                                            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/5"
                                         >
                                             <IconGoogle className="w-4 h-4" />
                                         </button>
                                     </div>
                                </div>
                            )}
                        </form>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-black/20 border-t border-white/5 flex justify-center text-xs text-gray-500">
                    {mode === 'login' ? (
                        <p>
                            {t('auth.no_account', "Pas de compte ?")}
                            <button onClick={() => { setMode('register'); setError(null); }} className="text-blue-400 hover:text-blue-300 ml-1.5 font-medium transition-colors">
                                {t('auth.create_account', "Créer un compte")}
                            </button>
                        </p>
                    ) : mode === 'register' ? (
                        <p>
                            {t('auth.has_account', "Déjà un compte ?")}
                            <button onClick={() => { setMode('login'); setError(null); }} className="text-blue-400 hover:text-blue-300 ml-1.5 font-medium transition-colors">
                                {t('auth.login_link', "Se connecter")}
                            </button>
                        </p>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
