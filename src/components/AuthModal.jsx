import React, { useState, useEffect } from 'react';
import { X, User, Lock, Key, Mail, LogIn, UserPlus, Fingerprint, ShieldCheck, LogOut, Calendar, Award, Plus } from 'lucide-react';
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
        } catch (err) {
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
        } catch (err) {
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md font-sora">
            <div className={`w-full ${mode === 'profile' ? 'max-w-md' : 'max-w-sm'} bg-[#1a1b1e]/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden transform transition-all font-sora relative duration-500 ease-in-out`}>
                
                {mode === 'profile' ? (
                    <div className="p-6 animate-fade-in text-center relative">
                        {/* Close Button specific for profile */}
                        <button 
                            onClick={onClose}
                            className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors z-10"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <div className="flex flex-col items-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-0.5 shadow-lg shadow-purple-900/20 mb-3">
                                <div className="w-full h-full rounded-full bg-[#1C1C1E] flex items-center justify-center">
                                    <User className="w-6 h-6 text-white" />
                                </div>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-1">{userData?.username}</h2>
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
                                    
                                    {userData?.subscriptions?.map((sub, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-[#141517] border border-gray-800">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-purple-300 capitalize">{sub.subscription}</span>
                                                <span className="text-[10px] text-gray-500">Niveau {sub.level}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-900/20 rounded border border-green-900/30">
                                                <Calendar className="w-3 h-3 text-green-500" />
                                                <span className="text-[10px] text-green-400">{sub.expiry}</span>
                                            </div>
                                        </div>
                                    ))}
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
                                            className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors font-medium ml-1"
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
                                                className="w-full bg-[#1C1C1E] border border-gray-700 text-white text-xs rounded-md px-3 py-2 focus:outline-none focus:border-blue-500 font-mono placeholder:text-gray-600"
                                                required
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold py-1.5 rounded-md transition-all flex items-center justify-center gap-1"
                                                >
                                                    {loading ? <span className="w-2 h-2 rounded-full border border-t-transparent animate-spin"></span> : 'Activer'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setShowAddLicense(false); setUpgradeKey(''); setError(null); }}
                                                    className="px-3 bg-white/5 hover:bg-white/10 text-gray-400 text-[10px] rounded-md transition-colors"
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
                            className="w-full py-2.5 rounded-xl font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
                        >
                            <LogOut className="w-4 h-4" />
                            {t('auth.logout', 'Se déconnecter')}
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Auth Header with Tabs - Compressed */}
                        <div className="flex items-center p-1 gap-2 bg-[#141517] border-b border-gray-800 pr-1.5">
                            <button 
                                onClick={() => setMode('login')}
                                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-300 font-sora ${mode === 'login' ? 'bg-[#2C2E33] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                            >
                                {t('auth.login_tab', 'Connexion')}
                            </button>
                            <button 
                                onClick={() => setMode('register')}
                                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-300 font-sora ${mode === 'register' ? 'bg-[#2C2E33] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                            >
                                {t('auth.register_tab', 'Inscription')}
                            </button>
                            
                            <button 
                                onClick={onClose}
                                className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center justify-center"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className={`font-sora animate-fade-in ${mode === 'register' ? 'p-4' : 'p-6'}`}>
                            <div className={`flex flex-col items-center justify-center ${mode === 'register' ? 'mb-4' : 'mb-6'}`}>
                                <div className={`p-2.5 rounded-2xl mb-2 transition-colors duration-500 ${mode === 'login' ? 'bg-blue-500/10 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)]' : 'bg-purple-500/10 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.15)]'}`}>
                                    {mode === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                                </div>
                                <h2 className="text-base font-bold text-center text-white mb-0.5 font-sora">
                                    {mode === 'login' ? t('auth.welcome_login', 'Heureux de vous revoir') : t('auth.create_account', 'Commencer l\'aventure')}
                                </h2>
                                <p className="text-[10px] text-gray-500 text-center max-w-[200px] leading-tight">
                                    {mode === 'login' ? 'Accédez à votre espace synchronisé.' : 'Créez un compte synchronisé.'}
                                </p>
                            </div>

                            {(error || success) && (
                                <div className={`mb-3 p-2.5 ${error ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'} border rounded-xl flex items-start gap-2 backdrop-blur-sm animate-fade-in-up`}>
                                    <ShieldCheck className={`w-3.5 h-3.5 ${error ? 'text-red-400' : 'text-green-400'} shrink-0 mt-0.5`} />
                                    <p className={`${error ? 'text-red-400' : 'text-green-400'} text-[11px] leading-tight`}>{error || success}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className={mode === 'register' ? 'space-y-2.5' : 'space-y-4'}>
                                
                                <div className="space-y-1 group">
                                    <label className="text-[10px] font-medium text-gray-400 ml-1 transition-colors group-focus-within:text-white">{t('auth.username', "Nom d'utilisateur")}</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors pointer-events-none">
                                            <User className="w-3.5 h-3.5" />
                                        </div>
                                        <input
                                            type="text"
                                            name="username"
                                            value={formData.username}
                                            onChange={handleChange}
                                            required
                                            className={`w-full bg-[#141517] border border-gray-800 text-white rounded-xl pl-9 pr-4 ${mode === 'register' ? 'py-2' : 'py-2.5'} text-xs focus:outline-none focus:border-blue-500 focus:bg-[#1C1C1E] transition-all font-sora placeholder:text-gray-700`}
                                            placeholder={t('auth.username_placeholder', "Utilisateur")}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1 group">
                                    <label className="text-[10px] font-medium text-gray-400 ml-1 transition-colors group-focus-within:text-white">{t('auth.password', "Mot de passe")}</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors pointer-events-none">
                                            <Lock className="w-3.5 h-3.5" />
                                        </div>
                                        <input
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                            className={`w-full bg-[#141517] border border-gray-800 text-white rounded-xl pl-9 pr-4 ${mode === 'register' ? 'py-2' : 'py-2.5'} text-xs focus:outline-none focus:border-blue-500 focus:bg-[#1C1C1E] transition-all font-sora placeholder:text-gray-700`}
                                            placeholder={t('auth.password_placeholder', "• • • • • • • •")}
                                        />
                                    </div>
                                </div>

                                {mode === 'register' && (
                                    <>
                                        <div className="space-y-1 group animate-fade-in-up" style={{animationDelay: '0.05s'}}>
                                            <label className="text-[10px] font-medium text-gray-400 ml-1 transition-colors group-focus-within:text-white">{t('auth.license', "Clé de Licence")}</label>
                                            <div className="relative">
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-500 transition-colors pointer-events-none">
                                                    <Key className="w-3.5 h-3.5" />
                                                </div>
                                                <input
                                                    type="text"
                                                    name="license"
                                                    value={formData.license}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full bg-[#141517] border border-gray-800 text-white rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-purple-500 focus:bg-[#1C1C1E] transition-all font-mono placeholder:text-gray-700"
                                                    placeholder={t('license.key_placeholder', "XXXX-XXXX-XXXX-XXXX")}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1 group animate-fade-in-up" style={{animationDelay: '0.1s'}}>
                                            <label className="text-[10px] font-medium text-gray-400 ml-1 transition-colors group-focus-within:text-white">{t('auth.email', "Email (Optionnel)")}</label>
                                            <div className="relative">
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-500 transition-colors pointer-events-none">
                                                    <Mail className="w-3.5 h-3.5" />
                                                </div>
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    className="w-full bg-[#141517] border border-gray-800 text-white rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-purple-500 focus:bg-[#1C1C1E] transition-all font-sora placeholder:text-gray-700"
                                                    placeholder={t('auth.email_placeholder', "email@exemple.com")}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full py-2.5 rounded-xl font-bold text-white shadow-lg transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 font-sora ${mode === 'register' ? 'mt-2' : 'mt-3'} text-xs
                                        ${mode === 'login' 
                                            ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-blue-500/20' 
                                            : 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 shadow-purple-500/20'}
                                    `}
                                >
                                    {loading ? (
                                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            {mode === 'login' ? <LogIn className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                                            {mode === 'login' ? t('auth.login_btn', 'Se connecter') : t('auth.register_btn', 'Créer un compte')}
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
