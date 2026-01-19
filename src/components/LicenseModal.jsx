import { useState, useEffect } from 'react';
import { X, Key, Check, AlertCircle, Loader2, ShieldCheck, CreditCard } from 'lucide-react';
import { keyAuthService } from '../services/keyauth';
import { useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/plugin-shell';

export default function LicenseModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { success: boolean, message: string }
  const [authData, setAuthData] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (keyAuthService.isAuthenticated) {
        setAuthData(keyAuthService.userData);
      }
      setStatus(null);
    }
  }, [isOpen]);

  const handleActivate = async () => {
    if (!licenseKey.trim()) return;
    setLoading(true);
    setStatus(null);

    try {
      const result = await keyAuthService.login(licenseKey);
      setStatus({ success: result.success, message: result.message });
      if (result.success) {
        setAuthData(keyAuthService.userData);
      }
    } catch (e) {
      setStatus({ success: false, message: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    keyAuthService.logout();
    setAuthData(null);
    setLicenseKey('');
    setStatus(null);
  };

  const handleBuy = async () => {
    await open('https://fiip-notes.app/pricing'); // Remplacer par l'URL réelle
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-[500px] max-h-[85vh] bg-[#1a1b26] rounded-xl shadow-2xl border border-gray-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-14 px-6 flex items-center justify-between border-b border-gray-800 bg-[#16161e]">
          <div className="flex items-center gap-2 text-gray-100 font-medium">
            <Key className="w-5 h-5 text-purple-400" />
            {t('license.title', 'Licence & Abonnement')}
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {authData ? (
            // Active State
            <div className="space-y-6">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-start gap-3">
                <ShieldCheck className="w-6 h-6 text-green-400 mt-0.5" />
                <div>
                  <h3 className="text-green-400 font-medium mb-1">{t('license.status_active', 'Licence Active')}</h3>
                  <p className="text-sm text-gray-400">
                    {t('license.level', 'Niveau')}: <span className="text-gray-200 font-medium capitalize">{authData.subscription || 'Standard'}</span>
                  </p>
                  {authData.expiry && (
                    <p className="text-sm text-gray-400">
                      {t('license.expiry', 'Expire le')}: <span className="text-gray-200">{authData.expiry}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-gray-700"
                >
                  {t('license.logout', 'Désactiver la licence')}
                </button>
              </div>
            </div>
          ) : (
            // Inactive State
            <div className="space-y-4">
              <div className="text-center space-y-2 mb-6">
                <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Key className="w-6 h-6 text-purple-400" />
                </div>
                <h2 className="text-lg font-medium text-white">{t('license.enter_key', 'Entrez votre clé de licence')}</h2>
                <p className="text-sm text-gray-400">
                  Débloquez toutes les fonctionnalités premium incluant l&apos;IA illimitée.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <input 
                    type="text" 
                    placeholder={t('license.key_placeholder', 'XXXX-XXXX-XXXX-XXXX')}
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    className="w-full h-10 bg-gray-900 border border-gray-700 rounded-lg px-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors font-mono uppercase"
                  />
                </div>

                {status && (
                  <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                    status.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {status.success ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {status.message}
                  </div>
                )}

                <button
                  onClick={handleActivate}
                  disabled={loading || !licenseKey}
                  className="w-full h-10 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('license.activate', 'Activer la licence')}
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-800" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#1a1b26] px-2 text-gray-500">Ou</span>
                  </div>
                </div>

                <button
                  onClick={handleBuy}
                  className="w-full h-10 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  {t('license.get_license', 'Obtenir une licence')}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
