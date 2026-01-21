import { useState, useEffect } from 'react';
import { X, Key, Check, AlertCircle, Loader2, ShieldCheck, CreditCard, Sparkles, Star, Zap, RefreshCw, Clock, Globe, MessageCircle } from 'lucide-react';
import { keyAuthService } from '../services/keyauth';
import { useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/plugin-shell';

function FeatureItem({ label, active, icon: Icon }) {
    return (
        <div className={`flex items-center gap-2 text-sm p-3 rounded-lg border transition-colors ${active ? 'bg-green-500/10 border-green-500/20 text-gray-200' : 'bg-gray-800/30 border-gray-700/30 text-gray-500'}`}>
            {active ? <Check className="w-5 h-5 text-green-400 shrink-0" /> : <div className="w-5 h-5 rounded-full border border-gray-600 shrink-0" />}
            {Icon && <Icon className={`w-4 h-4 ${active ? 'text-purple-400' : 'text-gray-600'}`} />}
            <span className={`font-medium ${!active ? 'line-through decoration-gray-600 opacity-60' : ''}`}>{label}</span>
        </div>
    )
}

export default function LicenseModal({ isOpen, onClose, onOpenAuth }) {
  const { t } = useTranslation();
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { success: boolean, message: string }
  const [authData, setAuthData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [canTrial, setCanTrial] = useState(false);

  const refreshAuthData = async () => {
      setRefreshing(true);
      if (keyAuthService.checkSubscription()) {
          // If licensed/trial active
          if (keyAuthService.isAuthenticated) {
              setAuthData({
                  ...keyAuthService.userData,
                  subscriptionName: keyAuthService.getCurrentSubscriptionName(),
                  hasAI: keyAuthService.hasAIAccess(),
                  hasPro: keyAuthService.hasProAccess(),
                  currentLevel: keyAuthService.currentLevel,
                  isTrial: false
              });
          } else if (keyAuthService.isTrialActive) {
               setAuthData({
                  subscriptionName: t('license.trial_active'),
                  expiry: keyAuthService.trialExpiry,
                  hasAI: false,
                  hasPro: false,
                  currentLevel: 1,
                  isTrial: true
              });
          }
      } else {
        setAuthData(null);
        setCanTrial(keyAuthService.canStartTrial());
      }
      
      // Simulate a small delay
      setTimeout(() => setRefreshing(false), 500);
  };

  useEffect(() => {
    if (isOpen) {
      refreshAuthData();
      setStatus(null);
    }
  }, [isOpen]);

  const handleStartTrial = () => {
      if (keyAuthService.startTrial()) {
          refreshAuthData();
          if (onClose) onClose(); // Auto close on success if requested, but let's refresh UI first
      }
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) return;
    setLoading(true);
    setStatus(null);

    try {
      const result = await keyAuthService.login(licenseKey);
      setStatus({ success: result.success, message: result.message });
      if (result.success) {
        refreshAuthData();
        setLicenseKey('');
      }
    } catch (e) {
      setStatus({ success: false, message: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    keyAuthService.logout();
    refreshAuthData();
    setLicenseKey('');
    setStatus(null);
  };

  const handleBuy = async () => {
    await open('https://fiip-notes.app/pricing'); // Remplacer par l'URL réelle
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="w-[550px] max-h-[90vh] bg-[#1a1b26] rounded-xl shadow-2xl border border-gray-800 flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 duration-300"
        style={{ fontFamily: "'Sora', sans-serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-14 px-6 flex items-center justify-between border-b border-gray-800 bg-[#16161e]">
          <div className="flex items-center gap-2 text-gray-100 font-medium">
            <Key className="w-5 h-5 text-purple-400" />
            <span className="tracking-wide">{t('license.title', 'Licence & Abonnement')}</span>
          </div>
          <div className="flex items-center gap-1">
            <button 
                onClick={refreshAuthData}
                disabled={refreshing}
                title={t('license.refresh', 'Actualiser')}
                className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-all duration-300 transform active:scale-95"
            >
                <RefreshCw className={`w-4 h-4 transition-transform duration-700 ease-in-out ${refreshing ? 'rotate-[360deg]' : ''}`} />
            </button>
            <button 
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {authData ? (
            // Active State
            <div className="space-y-6">
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <div className="bg-green-500/20 p-3 rounded-full shrink-0">
                        <ShieldCheck className="w-8 h-8 text-green-400" />
                    </div>
                    <div>
                    <h3 className="text-lg text-green-400 font-semibold mb-0.5">{t('license.status_active', 'Licence Active')}</h3>
                    <p className="text-gray-200 font-bold text-xl capitalize tracking-wide">{authData.subscriptionName}</p>
                    {authData.expiry && (
                        <p className="text-xs text-gray-500 mt-1 uppercase font-semibold">
                        {t('license.expiry', 'Expire le')}: <span className="text-gray-400">{authData.expiry}</span>
                        </p>
                    )}
                    <p className="text-[10px] text-gray-600 mt-1 font-mono">{t('license.level', 'Niveau')}: {authData.currentLevel || 0}</p>
                    </div>
                </div>
              </div>

              <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('license.features_title', 'Fonctionnalités Incluses')}</h4>
                  <div className="flex flex-col gap-2.5">
                      <FeatureItem label={t('license.feature_notes', 'Fiip - Prise de notes & Organisation')} active={true} icon={Star} />
                      <FeatureItem label={t('license.feature_ai', 'Intelligence Artificielle Premium')} active={Boolean(authData.hasAI)} icon={Sparkles} />
                      <FeatureItem label={t('license.feature_expert', 'Mode Expert & Outils Avancés')} active={Boolean(authData.hasPro)} icon={Zap} />
                  </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-800 gap-3">
                <button
                    onClick={onOpenAuth}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors font-medium flex items-center gap-2"
                >
                    <Globe className="w-4 h-4" />
                    {t('license.manage_account', 'Gérer le compte')}
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors font-medium"
                >
                  {t('license.logout', 'Désactiver la licence')}
                </button>
              </div>
            </div>
          ) : (
            // Inactive State
            <div className="space-y-4">
              <div className="text-center space-y-2 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-purple-500/20 shadow-lg shadow-purple-900/10">
                  <Key className="w-8 h-8 text-purple-400" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">{t('license.enter_key', 'Activer votre licence')}</h2>
                <div className="flex flex-col gap-2 max-w-xs mx-auto">
                    <button onClick={onOpenAuth} className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center justify-center gap-1.5 py-1">
                        <span>{t('license.login_with_account', 'Se connecter avec un compte')}</span>
                    </button>
                    <p className="text-sm text-gray-400 leading-relaxed">
                    {t('license.unlock_desc', "Débloquez l'IA illimitée et les outils avancés pour booster votre productivité.")}
                    </p>
                </div>
              </div>

              <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('license.features_title', 'Fonctionnalités Incluses')}</h4>
                  <div className="flex flex-col gap-2.5">
                      <FeatureItem label={t('license.feature_notes', 'Fiip - Prise de notes & Organisation')} active={true} icon={Star} />
                      <FeatureItem label={t('license.feature_ai', 'Intelligence Artificielle Premium')} active={false} icon={Sparkles} />
                      <FeatureItem label={t('license.feature_expert', 'Mode Expert & Outils Avancés')} active={false} icon={Zap} />
                  </div>
              </div>

              {canTrial && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4">
                      <div className="flex items-start gap-3">
                          <div className="bg-blue-500/20 p-2 rounded-lg">
                              <Clock className="w-5 h-5 text-blue-400" />
                          </div>
                          <div className="flex-1">
                              <h3 className="text-blue-400 font-semibold mb-1">{t('license.trial_title', 'Essai Gratuit')}</h3>
                              <p className="text-sm text-gray-400 mb-3">{t('license.trial_desc', 'Profitez de 15 jours d\'essai pour découvrir toutes les fonctionnalités de base.')}</p>
                              <button
                                  onClick={handleStartTrial}
                                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
                              >
                                  {t('license.start_trial', 'Démarrer l\'essai (15 jours)')}
                              </button>
                          </div>
                      </div>
                  </div>
              )}

              <div className="space-y-3 bg-gray-900/30 p-6 rounded-xl border border-gray-800/50 text-center">
                  <p className="text-sm text-gray-400 mb-2">
                    {t('license.auth_required_desc', 'Pour activer votre licence, vous devez vous connecter ou créer un compte. Cela permet de sauvegarder vos données et de synchroniser vos préférences.')}
                  </p>
                  <button
                    onClick={onOpenAuth}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Globe className="w-4 h-4" />
                    {t('license.login_or_register', 'Se connecter / S\'inscrire')}
                  </button>
                  <button 
                    onClick={handleBuy}
                    className="w-full py-2 bg-transparent hover:bg-white/5 text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg text-sm transition-colors"
                  >
                    {t('license.get_license', 'OU OBTENIR UNE LICENCE')}
                  </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
