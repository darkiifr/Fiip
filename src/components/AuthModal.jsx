import { useState, useEffect } from 'react';
import { X, User, Lock, Key, Mail, LogIn, UserPlus, ShieldCheck, LogOut, Calendar, Award, Plus } from 'lucide-react';
import { keyAuthService } from '../services/keyauth';
import { useTranslation } from 'react-i18next';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
    const { t } = useTranslation();
    const [mode, setMode] = useState('login'); // 'login' | 'register' | 'profile'
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        license: '',
        email: ''
    });
    const [showAddLicense, setShowAddLicense] = useState(false);
    const [upgradeKey, setUpgradeKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        if (isOpen) {
            if (keyAuthService.isAuthenticated && keyAuthService.userData?.username) {
                setMode('profile');
                setUserData(keyAuthService.userData);
            } else {
                setMode('login');
                setUserData(null);
            }
            setError(null);
            setSuccess(null);
            setShowAddLicense(false);
            setUpgradeKey('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleUpgrade = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await keyAuthService.addLicense(userData.username, upgradeKey);
            if (res.success) {
                setSuccess(t('auth.success_upgrade', "Licence ajoutée avec succès !"));
                setUpgradeKey('');
                setShowAddLicense(false);
                
                // Refresh data if possible, otherwise logout to force refresh
                if (formData.password && formData.username === userData.username) {
                    const loginRes = await keyAuthService.loginByUser(formData.username, formData.password);
                    if (loginRes.success) {
                        setUserData(loginRes.info);
                    }
                } else {
                     setSuccess(t('auth.success_upgrade_logout', "Licence ajoutée. Veuillez vous reconnecter pour mettre à jour votre profil."));
                     setTimeout(() => handleLogout(), 2000);
                }
            } else {
                setError(res.message);
            }
        } catch {
            setError("Erreur lors de l'ajout de la licence.");
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
                const res = await keyAuthService.loginByUser(formData.username, formData.password);
                if (res.success) {
                    setSuccess(t('auth.success_login', "Connexion réussie !"));
                    setTimeout(() => {
                        if (onLoginSuccess) onLoginSuccess();
                        setUserData(keyAuthService.userData);
                        setMode('profile');
                    }, 1000);
                } else {
                    setError(res.message);
                }
            } else {
                const res = await keyAuthService.register(formData.username, formData.password, formData.license, formData.email);
                if (res.success) {
                    setSuccess(t('auth.success_register', "Inscription réussie ! Vous pouvez maintenant vous connecter."));
                    setTimeout(() => setMode('login'), 2000);
                } else {
                    setError(res.message);
                }
            }
        } catch {
            setError(t('auth.error_generic', "Une erreur est survenue."));
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        keyAuthService.logout();
        setMode('login');
        setUserData(null);
        setFormData({ username: '', password: '', license: '', email: '' });
        // Optionally notify parent
        if (onLoginSuccess) onLoginSuccess(); // Triggers re-render/sync logic in parent essentially
    };

    // Calculate active licenses count
    const activeLicensesCount = userData?.subscriptions?.length || (keyAuthService.isTrialActive ? 1 : 0);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md font-sora animate-in fade-in duration-300">
            <div className={`w-[480px] max-w-[480px] bg-[#1a1b1e]/90 backdrop-blur-xl rounded-[12px] border border-white/10 shadow-2xl overflow-hidden transform transition-all font-sora relative duration-300 ease-in-out flex flex-col`}>
                
                {/* Header - 40px */}
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
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-[24px] overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(90vh - 96px)' }}>
                    {mode === 'profile' ? (
                        <div className="animate-fade-in text-center relative">
                            <div className="flex flex-col items-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-0.5 shadow-lg shadow-purple-900/20 mb-3">
                                <div className="w-full h-full rounded-full bg-[#1C1C1E] flex items-center justify-center">
                                    <User className="w-6 h-6 text-white" />
                                </div>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-1 px-4 text-center break-all">
                                {(userData?.username && userData.username.length > 25 && userData.username.toUpperCase().startsWith('KEYAUTH-')) 
                                    ? "Utilisateur Licence"
                                    : userData?.username}
                             </h2>
                            <p className="text-[10px] text-gray-500 font-mono mb-2 truncate max-w-[200px] opacity-60">
                                {userData?.username}
                            </p>
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-medium uppercase tracking-wide">
                                {t('auth.account_active', 'Compte Actif')}
                            </span>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Award className="w-3 h-3" />
                                    {t('auth.licenses', 'Licences & Abonnements')}
                                </h3>
                                
                                <div className="flex items-center justify-between mb-3">
                                   <span className="text-xs text-gray-300">Licences actives</span>
                                   <span className="text-sm font-bold text-white bg-white/10 px-2 py-0.5 rounded-md">{activeLicensesCount}</span>
                                </div>

                                <div className="space-y-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                                    {/* Trial Display Correction */}
                                    {keyAuthService.isTrialActive && (
                                         <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20 mb-2">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-blue-400">Essai Gratuit</span>
                                                <span className="text-[10px] text-gray-400">Période d&apos;évaluation</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-900/20 rounded border border-blue-900/30">
                                                <Calendar className="w-3 h-3 text-blue-400" />
                                                <span className="text-[10px] text-blue-300 font-mono">
                                                    {keyAuthService.trialExpiry || "Actif"}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {userData?.subscriptions?.map((sub, idx) => {
                                        // Format Expiry
                                        let expiryDate = sub.expiry;
                                        if (!isNaN(sub.expiry) && sub.expiry > 2000000000) { // Likely timestamp in seconds
                                            // 2084433960 is year 2036, so fits seconds.
                                            // Handle potential ms vs s
                                            // If < 100000000000 (100 billion), it's likely seconds (valid until year 5000)
                                            expiryDate = new Date(parseInt(sub.expiry) * 1000).toLocaleDateString();
                                        } else if (!isNaN(sub.expiry)) {
                                             // older timestamps
                                             expiryDate = new Date(parseInt(sub.expiry) * 1000).toLocaleDateString();
                                        }

                                        // Map Level
                                        const getLevelLabel = (lvl) => {
                                            const l = parseFloat(lvl);
                                            if (l >= 4) return "Dev";
                                            if (l >= 3) return "Pro";
                                            if (l >= 2) return "AI"; // Ou 1.5 si c'était le cas avant
                                            if (l >= 1) return "Basic";
                                            return "Inconnu";
                                        };

                                        return (
                                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-[#141517] border border-gray-800">
                                                <div className="flex flex-col items-start pr-3">
                                                    <span className="text-sm font-medium text-purple-300 capitalize text-left">{sub.subscription || "Licence"}</span>
                                                    <span className="text-[10px] text-gray-500">
                                                        Niveau {sub.level} ({getLevelLabel(sub.level)})
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-green-900/20 rounded border border-green-900/30 shrink-0">
                                                    <Calendar className="w-3 h-3 text-green-500" />
                                                    <span className="text-[10px] text-green-400 font-mono">{expiryDate}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(!userData?.subscriptions || userData.subscriptions.length === 0) && !keyAuthService.isTrialActive && (
                                        <div className="text-center py-4 text-xs text-gray-500 italic border border-dashed border-gray-800 rounded-lg">
                                            Aucune licence active
                                        </div>
                                    )}
                                </div>

                                {/* Add License Section */}
                                <div className="mt-4 pt-3 border-t border-white/5 animate-fade-in" style={{animationDelay: '0.1s'}}>
                                    {!showAddLicense ? (
                                        <button
                                            onClick={() => setShowAddLicense(true)}
                                            className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors duration-[150ms] ease-out font-medium ml-1"
                                        >
                                            <Plus className="w-3 h-3" />
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
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">{t('auth.username', 'Nom d\'utilisateur')}</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all duration-[250ms] ease-in-out placeholder-gray-600 h-[40px]"
                                    placeholder="Nom d'utilisateur"
                                    required
                                />
                            </div>
                        </div>
                        
                        {mode === 'register' && (
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">{t('auth.email', 'Email (Optionnel)')}</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all duration-[250ms] ease-in-out placeholder-gray-600 h-[40px]"
                                        placeholder="email@exemple.com"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">{t('auth.password', 'Mot de passe')}</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all duration-[250ms] ease-in-out placeholder-gray-600 h-[40px]"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {mode === 'register' && (
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">{t('auth.license', 'Clé de Licence')}</label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="text"
                                        name="license"
                                        value={formData.license}
                                        onChange={handleChange}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all duration-[250ms] ease-in-out placeholder-gray-600 h-[40px]"
                                        placeholder="XXXX-XXXX-XXXX-XXXX"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 shrink-0" />
                                {success}
                            </div>
                        )}
                    </form>
                )}
            </div>

            {/* Footer - 56px */}
            <div className="h-[56px] px-[16px] bg-[#1a1b1e] border-t border-white/5 flex items-center justify-between shrink-0">
                {mode === 'profile' ? (
                    <button
                        onClick={handleLogout}
                        className="px-4 h-[32px] rounded-[6px] text-[13px] font-medium transition-all duration-[250ms] ease-in-out flex items-center gap-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 ml-auto"
                    >
                        <LogOut className="w-4 h-4" />
                        {t('auth.logout', 'Déconnexion')}
                    </button>
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={() => {
                                setMode(mode === 'login' ? 'register' : 'login');
                                setError(null);
                                setSuccess(null);
                            }}
                            className="text-[13px] text-gray-400 hover:text-white transition-all duration-[250ms] ease-in-out font-medium"
                        >
                            {mode === 'login' ? t('auth.create_account', 'Créer un compte') : t('auth.have_account', 'Déjà un compte ?')}
                        </button>

                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-[16px] h-[32px] bg-blue-600 hover:bg-blue-500 text-white rounded-[6px] text-[13px] font-medium transition-all duration-[250ms] ease-in-out shadow-lg shadow-blue-900/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : mode === 'login' ? (
                                <>
                                    <LogIn className="w-4 h-4" />
                                    {t('auth.login_btn', 'Se connecter')}
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-4 h-4" />
                                    {t('auth.register_btn', 'S\'inscrire')}
                                </>
                            )}
                        </button>
                    </>
                )}
            </div>
        </div>
    </div>
    );
}
