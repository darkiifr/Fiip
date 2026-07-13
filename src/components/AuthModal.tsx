
import { open } from '@tauri-apps/plugin-shell';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { keyAuthService } from '../services/keyauth';
import { authService, supabase, dataService } from '../services/supabase';
import TurnstileCaptcha from './TurnstileCaptcha';
import { GlassDialog, GlassButton, GlassInput } from './ui';

// Icons Import (Pim's Edition)
import IconGoogle from '~icons/logos/google-icon';
import IconPlus from '~icons/mingcute/add-fill';
import IconLogin from '~icons/mingcute/enter-door-fill';
import IconLogout from '~icons/mingcute/exit-door-fill';
import IconKey from '~icons/mingcute/key-2-fill';
import IconLock from '~icons/mingcute/lock-fill';
import IconMail from '~icons/mingcute/mail-send-fill';
import IconAward from '~icons/mingcute/trophy-fill';
import IconUpload from '~icons/mingcute/upload-2-fill';
import IconUser from '~icons/mingcute/user-4-fill';
import IconUserAdd from '~icons/mingcute/user-add-fill';

function getOAuthErrorMessage(error?: any) {
    if (error?.code === 'SUPABASE_CONFIG_MISSING') {
        return error.message;
    }

    const message = String(error?.message || '').trim();
    if (message) {
        return `Connexion Google impossible : ${message}`;
    }

    return "Connexion Google impossible. Vérifiez que Safari a ouvert Fiip, puis réessayez.";
}

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess?: () => void;
}

export default function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
    const { t } = useTranslation();
    const [mode, setMode] = useState<'login' | 'register' | 'profile'>('login');
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        username: ''
    });
    const [showAddLicense, setShowAddLicense] = useState(false);
    const [upgradeKey, setUpgradeKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [captchaToken, setCaptchaToken] = useState('');
    const [captchaResetKey, setCaptchaResetKey] = useState(0);
    const [user, setUser] = useState<any>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [isEditingPseudo, setIsEditingPseudo] = useState(false);
    const [tempPseudo, setTempPseudo] = useState('');
    const pseudoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditingPseudo && pseudoInputRef.current) {
            pseudoInputRef.current.focus();
        }
    }, [isEditingPseudo]);

    async function checkUser() {
        const currentUser = await authService.getUser();
        if (currentUser) {
            setUser(currentUser);
            setMode('profile');
            const level = await authService.getPlanLevel(currentUser);
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
    }

    useEffect(() => {
        let isMounted = true;

        if (isOpen) {
            // Queue to avoid cascading render warning in some React versions/linters
            queueMicrotask(() => {
                if (isMounted) {setIsChecking(true);}
            });
            
            // Check cache dynamically to avoid long network hangs
            const performCheck = async () => {
                const currentUser = await authService.getUser();
                if (isMounted) {
                    if (currentUser) {
                        setUser(currentUser);
                        setMode('profile');
                        const level = await authService.getPlanLevel(currentUser);
                        const username = currentUser.user_metadata?.username || currentUser.user_metadata?.nickname || currentUser.email;
                        keyAuthService.setLocalLevel(level, username);
                    } else {
                        setUser(null);
                        setMode('login');
                    }
                    setError(null);
                    setSuccess(null);
                    setShowAddLicense(false);
                    setUpgradeKey('');
                    setIsChecking(false);
                    setIsEditingPseudo(false);
                }
            };
            performCheck();
        }

        // Listen for auth state changes (e.g. from deep link OAuth callback)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN' && isMounted) {
                setLoading(false);
                checkUser();
            }
        });

        return () => {
            isMounted = false;
            subscription?.unsubscribe();
        };
    }, [isOpen]);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleUpgrade = async (e) => {
        e.preventDefault();
        
        const keyToVerify = upgradeKey.trim();
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
                let errorMsg = res.message || '';
                if (errorMsg.toLowerCase().includes('password')) {
                    errorMsg = t('license.error_invalid', "La clé de licence est invalide ou expirée.");
                } else if (!errorMsg) {
                    errorMsg = t('license.error_invalid', "La clé de licence est invalide ou expirée.");
                }
                setError(errorMsg);
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
                const { error } = await authService.signIn(formData.email, formData.password, captchaToken);
                if (error) {
                    setError(error.message);
                } else {
                    setSuccess(t('auth.success_login', "Connexion réussie !"));
                    setTimeout(() => {
                        if (onLoginSuccess) {onLoginSuccess();}
                        checkUser();
                    }, 1000);
                }
            } else {
                const { error } = await authService.signUp(formData.email, formData.password, formData.username, captchaToken);
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
            setCaptchaToken('');
            setCaptchaResetKey((current) => current + 1);
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        const email = formData.email.trim();
        if (!email) {
            setError('Entrez votre adresse e-mail avant de demander un nouveau mot de passe.');
            return;
        }

        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            const { error } = await authService.sendPasswordReset(email, captchaToken);
            if (error) {
                setError(error.message || 'Impossible d’envoyer le lien de réinitialisation.');
                return;
            }
            setSuccess('Lien de réinitialisation envoyé. Vérifiez votre boîte mail.');
        } catch (e) {
            setError(e.message || 'Impossible d’envoyer le lien de réinitialisation.');
        } finally {
            setCaptchaToken('');
            setCaptchaResetKey((current) => current + 1);
            setLoading(false);
        }
    };

    const handlePasskeyLogin = async () => {
        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            const { data, error } = await authService.signInWithPasskey();
            if (error) {
                setError(error.message || 'Connexion passkey impossible.');
                return;
            }

            setSuccess('Connexion passkey réussie.');
            if (data?.session?.user || data?.user) {
                if (onLoginSuccess) {onLoginSuccess();}
                await checkUser();
            }
        } catch (e) {
            setError(e.message || 'Connexion passkey impossible.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            const { data, error } = await authService.signInWithOAuth('google');
            if (error) {throw error;}
            if (!data?.url) {throw new Error("Le compte Fiip n'a pas renvoyé d'URL de connexion Google.");}
            await open(data.url);
        } catch (err) {
            console.error('Google OAuth error:', err);
            setError(getOAuthErrorMessage(err));
        } finally {
            setCaptchaToken('');
            setCaptchaResetKey((current) => current + 1);
            setLoading(false);
        }
    };

    const handleLinkGoogleIdentity = async () => {
        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            const { data, error } = await authService.linkGoogleIdentity();
            if (error) {throw error;}
            if (!data?.url) {throw new Error("Le compte Fiip n'a pas renvoyé d'URL de liaison Google.");}
            await open(data.url);
            setSuccess('Connexion Google ouverte. Terminez la liaison dans votre navigateur.');
        } catch (err) {
            console.error('Google identity link error:', err);
            setError(getOAuthErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterPasskey = async () => {
        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            const { error } = await authService.registerPasskey();
            if (error) {
                setError(error.message || 'Ajout de passkey impossible.');
                return;
            }
            setSuccess('Passkey ajoutée à ce compte.');
        } catch (e) {
            setError(e.message || 'Ajout de passkey impossible.');
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

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert("L'image est trop volumineuse (Max 2MB)");
                return;
            }
            try {
                const { url, error } = await dataService.uploadAvatar(file);
                if (error) {
                    alert("Erreur lors de l'upload de l'avatar: " + error.message);
                    return;
                }
                if (url) {
                    const { data: { user: updatedUser }, error: updateError } = await supabase.auth.updateUser({
                        data: { avatar_url: url }
                    });
                    if (!updateError && updatedUser) {
                        setUser(updatedUser);
                        
                        const saved = localStorage.getItem('fiip_public_profile');
                        const pubProfile = saved ? JSON.parse(saved) : {};
                        pubProfile.avatar = url;
                        localStorage.setItem('fiip_public_profile', JSON.stringify(pubProfile));
                        window.dispatchEvent(new Event('storage'));
                        
                        await dataService.saveProfile(pubProfile);
                    }
                }
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handlePseudoEditStart = () => {
        setTempPseudo(user?.user_metadata?.nickname || user?.user_metadata?.username || user?.email?.split('@')[0] || "Utilisateur");
        setIsEditingPseudo(true);
    };

    const handlePseudoEditSave = async () => {
        const val = tempPseudo.trim();
        const currentName = user?.user_metadata?.nickname || user?.user_metadata?.username || user?.email?.split('@')[0] || "Utilisateur";
        if (!val || val === currentName) {
            setIsEditingPseudo(false);
            return;
        }
        try {
            const { data: { user: updatedUser }, error } = await supabase.auth.updateUser({
                data: { nickname: val, username: val }
            });
            if (!error && updatedUser) {
                setUser(updatedUser);
                const saved = localStorage.getItem('fiip_public_profile');
                const pubProfile = saved ? JSON.parse(saved) : {};
                pubProfile.nickname = val;
                localStorage.setItem('fiip_public_profile', JSON.stringify(pubProfile));
                window.dispatchEvent(new Event('storage'));
                await dataService.saveProfile(pubProfile);
            }
        } catch (e) {
            console.error(e);
        }
        setIsEditingPseudo(false);
    };

    const currentLevel = user?.user_metadata?.subscription_level || keyAuthService.currentLevel || 0;
    const licenseKey = user?.user_metadata?.license_key || keyAuthService.licenseKey || "Aucune";
    const username = user?.user_metadata?.nickname || user?.user_metadata?.username || user?.email?.split('@')[0] || "Utilisateur";

    return (
        <GlassDialog 
            open={isOpen} 
            onOpenChange={(open) => !open && onClose()}
            title={mode === 'login' ? t('auth.login', 'Connexion') : 
                   mode === 'register' ? t('auth.register', 'Inscription') : 
                   t('auth.profile', 'Profil')}
            className="max-w-[480px] bg-[color:var(--bg-card)] text-[color:var(--text-primary)] border border-[color:var(--border-color)]"
        >
            <div className="overflow-y-auto custom-scrollbar pr-1" style={{ maxHeight: '70vh' }}>
                {isChecking ? (
                    <div className="flex flex-col items-center justify-center py-10 opacity-70">
                        <span className="w-8 h-8 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin mb-4" />
                        <p className="text-sm font-medium">Validation de session...</p>
                    </div>
                ) : mode === 'profile' ? (
                    <div className="animate-fade-in text-center relative px-2">
                        <div className="flex flex-col items-center mb-6">
                            <div className="w-20 h-20 rounded-full bg-linear-to-br from-blue-500 to-purple-600 p-0.5 shadow-lg shadow-purple-900/20 mb-4 relative group">
                                {user?.user_metadata?.avatar_url ? (
                                    <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover border-4 border-sidebar-dark" />
                                ) : (
                                    <div className="w-full h-full rounded-full bg-sidebar-dark flex items-center justify-center">
                                        <IconUser className="w-10 h-10 text-white" />
                                    </div>
                                )}
                                <button 
                                    type="button"
                                    aria-label="Upload Avatar"
                                    className="absolute inset-0 m-0.5 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer border-none"
                                    onClick={() => (document.getElementById('auth-avatar-upload') as HTMLInputElement).click()}
                                >
                                    <IconUpload className="w-6 h-6 text-white" />
                                </button>
                                <input type="file" id="auth-avatar-upload" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                            </div>
                            
                            {isEditingPseudo ? (
                                <div className="flex items-center gap-2 mb-1 w-full">
                                    <GlassInput 
                                        ref={pseudoInputRef}
                                        value={tempPseudo}
                                        onChange={(e) => setTempPseudo(e.target.value)}
                                        onKeyDown={(e) => { if(e.key === 'Enter') {handlePseudoEditSave();} if(e.key === 'Escape') {setIsEditingPseudo(false);} }}
                                        onBlur={handlePseudoEditSave}
                                        className="text-center text-xl font-bold"
                                        autoFocus
                                    />
                                </div>
                            ) : (
                                <button 
                                    type="button"
                                    className="mb-1 px-4 flex items-center justify-center gap-2 group cursor-pointer border-none bg-transparent w-full"
                                    onClick={handlePseudoEditStart}
                                    title="Modifier le pseudo"
                                >
                                    <h2 className="text-2xl font-bold text-white text-center break-all group-hover:text-blue-400 transition-colors">
                                        {username}
                                    </h2>
                                    <svg className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </button>
                            )}
                            <p className="text-sm text-gray-400 font-medium mb-3 opacity-60">
                                {user?.email}
                            </p>
                            <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                                {t('auth.account_active', 'Compte Actif')}
                            </span>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-left">
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <IconAward className="w-3.5 h-3.5" />
                                    {t('auth.licenses', 'Licences & Abonnements')}
                                </h3>
                                
                                <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5">
                                    <div className="flex flex-col">
                                        <span className="text-base font-semibold text-white capitalize">
                                            {keyAuthService.getCurrentSubscriptionName()}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            Niveau {currentLevel}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-lg border border-green-500/20">
                                        <IconKey className="w-3.5 h-3.5 text-green-400" />
                                        <span className="text-xs text-green-400 font-mono font-bold tracking-tight">
                                            {licenseKey.substring(0, 8)}...
                                        </span>
                                    </div>
                                </div>

                                {/* Add License Section */}
                                <div className="mt-4 pt-4 border-t border-white/5">
                                    {!showAddLicense ? (
                                        <button
                                            onClick={() => setShowAddLicense(true)}
                                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-2 transition-colors font-semibold px-2 py-1 rounded-lg hover:bg-blue-500/5"
                                        >
                                            <IconPlus className="w-4 h-4" />
                                            {t('auth.add_license', 'Ajouter une licence / Upgrade')}
                                        </button>
                                    ) : (
                                        <form onSubmit={handleUpgrade} className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <GlassInput
                                                value={upgradeKey}
                                                onChange={(e) => setUpgradeKey(e.target.value)}
                                                placeholder={t('license.key_placeholder_short', "Clé de licence")}
                                                className="font-mono"
                                                required
                                            />
                                            <div className="flex gap-2">
                                                <GlassButton
                                                    type="submit"
                                                    isLoading={loading}
                                                    className="flex-1"
                                                >
                                                    Activer
                                                </GlassButton>
                                                <GlassButton
                                                    type="button"
                                                    variant="secondary"
                                                    onClick={() => { setShowAddLicense(false); setUpgradeKey(''); setError(null); setSuccess(null); }}
                                                >
                                                    Annuler
                                                </GlassButton>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-left">
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <IconKey className="w-3.5 h-3.5" />
                                    Passkey
                                </h3>
                                <p className="text-xs text-gray-400 leading-relaxed mb-4">
                                    Ajoutez Windows Hello, Touch ID ou une clé de sécurité pour vous connecter sans mot de passe.
                                </p>
                                <GlassButton
                                    type="button"
                                    variant="secondary"
                                    onClick={handleRegisterPasskey}
                                    isLoading={loading}
                                    className="w-full"
                                    icon={<IconKey className="w-4 h-4" />}
                                >
                                    Ajouter une passkey
                                </GlassButton>
                                <GlassButton
                                    type="button"
                                    variant="secondary"
                                    onClick={handleLinkGoogleIdentity}
                                    isLoading={loading}
                                    className="w-full mt-3"
                                    icon={<IconGoogle className="w-4 h-4" />}
                                >
                                    Lier Google à ce compte
                                </GlassButton>
                            </div>
                        </div>
                        
                        <GlassButton
                            variant="danger"
                            onClick={handleLogout}
                            className="w-full"
                            icon={<IconLogout className="w-4 h-4" />}
                        >
                            {t('auth.logout', 'Déconnexion')}
                        </GlassButton>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="bg-blue-500/5 border border-blue-500/20 text-blue-300 text-xs p-4 rounded-xl flex gap-3 items-start text-left leading-relaxed">
                            <IconLock className="w-5 h-5 shrink-0 text-blue-400" />
                            <span>Créez un compte gratuitement pour synchroniser vos notes en toute sécurité et débloquer les fonctionnalités de partage et de collaboration.</span>
                        </div>

                        <div className="space-y-4">
                            <GlassInput
                                label={mode === 'login' ? 'Email ou Pseudo' : 'Email'}
                                type={mode === 'login' ? "text" : "email"}
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                icon={<IconMail className="w-4 h-4" />}
                                placeholder={mode === 'login' ? "votre@email.com ou pseudo" : "votre@email.com"}
                                required
                            />
                            
                            {mode === 'register' && (
                                <GlassInput
                                    label={t('auth.username', "Nom d'utilisateur")}
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    icon={<IconUser className="w-4 h-4" />}
                                    placeholder="Nom d'utilisateur"
                                    required
                                />
                            )}
                            
                            <GlassInput
                                label={t('auth.password', "Mot de passe")}
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                icon={<IconLock className="w-4 h-4" />}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <TurnstileCaptcha onVerify={setCaptchaToken} resetKey={captchaResetKey} />

                        {error && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
                                {error}
                            </div>
                        )}
                        
                        {success && (
                            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm animate-in fade-in slide-in-from-top-2">
                                {success}
                            </div>
                        )}

                        <div className="pt-2">
                            <GlassButton
                                type="submit"
                                isLoading={loading}
                                className="w-full py-4 text-base"
                                icon={mode === 'login' ? <IconLogin /> : <IconUserAdd />}
                            >
                                {mode === 'login' ? t('auth.login', 'Se connecter') : t('auth.create_account', 'S\'inscrire')}
                            </GlassButton>
                        </div>

                        {mode === 'login' && (
                            <GlassButton
                                type="button"
                                variant="secondary"
                                onClick={handlePasskeyLogin}
                                isLoading={loading}
                                className="w-full py-3 text-sm"
                                icon={<IconKey className="w-4 h-4" />}
                            >
                                Se connecter avec une passkey
                            </GlassButton>
                        )}

                        {mode === 'login' && (
                            <button
                                type="button"
                                onClick={handleForgotPassword}
                                className="w-full text-center text-xs font-bold text-blue-400 transition-colors hover:text-blue-300"
                            >
                                Mot de passe oublié
                            </button>
                        )}

                        {mode === 'login' && (
                            <div className="flex flex-col items-center gap-4">
                                <div className="flex items-center gap-4 w-full">
                                    <div className="h-px flex-1 bg-white/5"></div>
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ou continuer avec</span>
                                    <div className="h-px flex-1 bg-white/5"></div>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={handleGoogleLogin}
                                    className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all duration-300 border border-white/10 hover:border-white/20 hover:scale-110 active:scale-95"
                                >
                                    <IconGoogle className="w-6 h-6" />
                                </button>
                            </div>
                        )}
                    </form>
                )}
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-white/5 flex justify-center text-sm font-medium">
                {mode === 'login' ? (
                    <div className="text-gray-500">
                        {t('auth.no_account', "Pas de compte ?")}
                        <button onClick={() => { setMode('register'); setError(null); }} className="text-blue-400 hover:text-blue-300 ml-2 font-bold transition-colors">
                            {t('auth.create_account', "Créer un compte")}
                        </button>
                    </div>
                ) : mode === 'register' ? (
                    <div className="text-gray-500">
                        {t('auth.has_account', "Déjà un compte ?")}
                        <button onClick={() => { setMode('login'); setError(null); }} className="text-blue-400 hover:text-blue-300 ml-2 font-bold transition-colors">
                            {t('auth.login_link', "Se connecter")}
                        </button>
                    </div>
                ) : null}
            </div>
        </GlassDialog>
    );
}
