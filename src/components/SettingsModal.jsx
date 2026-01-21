import React, { useState, useEffect, useRef } from 'react';
import { X, Type, Check, RefreshCw, Bot, Download, Sparkles, MoveRight, ChevronDown, Globe, Cloud } from 'lucide-react';
import { relaunch, exit } from '@tauri-apps/plugin-process';
import { open, Command } from '@tauri-apps/plugin-shell';
import { type } from '@tauri-apps/plugin-os';
import { getVersion } from '@tauri-apps/api/app';
import { getPlatformDisplayName } from '../services/platform';
import { generateText } from '../services/ai';
import { keyAuthService } from '../services/keyauth';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, ShieldAlert, Key } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, settings = {}, onUpdateSettings }) {
    const { t, i18n } = useTranslation();
    const [localSettings, setLocalSettings] = useState(settings);
    const [hasChanges, setHasChanges] = useState(false);
    const [audioDevices, setAudioDevices] = useState({ inputs: [], outputs: [] });
    const originalSettingsRef = useRef(settings);
    const [platformName, setPlatformName] = useState('');
    const [appVersion, setAppVersion] = useState('');
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
    const [voices, setVoices] = useState([]);
    const [isLinux, setIsLinux] = useState(false);
    const [updateInfo, setUpdateInfo] = useState(null);
    const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
    const [authData, setAuthData] = useState(null);

    const languages = [
        { code: 'fr', label: 'Français', flag: '🇫🇷' },
        { code: 'fr-BE', label: 'Français (Belgique)', flag: '🇧🇪' },
        { code: 'fr-CA', label: 'Français (Canada)', flag: '🇨🇦' },
        { code: 'fr-QC', label: 'Français (Québec)', flag: '⚜️' },
        { code: 'en-US', label: 'English', flag: '🇺🇸' },
        { code: 'en-GB', label: 'English (UK)', flag: '🇬🇧' },
        { code: 'en-CA', label: 'English (Canada)', flag: '🇨🇦' },
        { code: 'es-EM', label: 'Español', flag: '🇪🇸' },
        { code: 'it-IT', label: 'Italiano', flag: '🇮🇹' },
        { code: 'de-DE', label: 'Deutsch', flag: '🇩🇪' },
        { code: 'nl-NL', label: 'Nederlands', flag: '🇳🇱' },
        { code: 'ja-JP', label: '日本語', flag: '🇯🇵' },
        { code: 'pl-PL', label: 'Polski', flag: '🇵🇱' },
        { code: 'pt-PT', label: 'Português', flag: '🇵🇹' },
        { code: 'ru-RU', label: 'Русский', flag: '🇷🇺' },
        { code: 'ru-UA', label: 'Русский (Украина)', flag: '🇺🇦' },
        { code: 'zh-CN', label: '简体中文', flag: '🇨🇳' },
        { code: 'zh-TW', label: '繁體中文', flag: '🇹🇼' },
        { code: 'uk-UA', label: 'Українська', flag: '🇺🇦' },
        { code: 'ar-SA', label: 'العربية', flag: '🇸🇦' },
        { code: 'bg-BG', label: 'Български', flag: '🇧🇬' },
        { code: 'ca-ES', label: 'Català', flag: '🇦🇩' },
        { code: 'hr-HR', label: 'Hrvatski', flag: '🇭🇷' },
        { code: 'fa-IR', label: 'فارسی', flag: '🇮🇷' },
        { code: 'sl-SI', label: 'Slovenščina', flag: '🇸🇮' },
        { code: 'hy-AM', label: 'Հայերեն', flag: '🇦🇲' },
        { code: 'br-FR', label: 'Brezhoneg', flag: '🇫🇷' },
        { code: 'co-FR', label: 'Corsu', flag: '🇫🇷' }
    ].sort((a, b) => a.label.localeCompare(b.label));

    useEffect(() => {
        // Check OS
        const checkOS = async () => {
            try {
                const osType = await type();
                if (osType === 'linux') setIsLinux(true);
            } catch (e) {
                console.warn(e);
            }
        };
        checkOS();

        const loadVoices = () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                const availableVoices = window.speechSynthesis.getVoices();
                setVoices(availableVoices);
            }
        };

        loadVoices();
        if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            // Store original settings when modal opens
            originalSettingsRef.current = settings;
            setLocalSettings(settings);
            setHasChanges(false);
            setAuthData(keyAuthService.isAuthenticated ? keyAuthService.userData : null);

            // Load Audio Devices
            if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
                navigator.mediaDevices.enumerateDevices()
                    .then(devices => {
                        const inputs = devices.filter(d => d.kind === 'audioinput');
                        const outputs = devices.filter(d => d.kind === 'audiooutput');
                        setAudioDevices({ inputs, outputs });
                    })
                    .catch(err => console.warn("Failed to enumerate devices:", err));
            }

            // Get platform info
            getPlatformDisplayName()
                .then(name => setPlatformName(name))
                .catch(err => console.warn("Failed to get platform name:", err));

            // Get App Version from installed file
            fetch('/version.json')
                .then(res => res.json())
                .then(data => setAppVersion(data.version))
                .catch(err => {
                    console.warn("Failed to load version.json:", err);
                    // Fallback to Tauri API if file fails
                    getVersion().then(v => setAppVersion(v)).catch(e => console.error(e));
                });
        }
    }, [isOpen, settings]);

    const handleUpdate = (newSettings) => {
        setLocalSettings(newSettings);
        setHasChanges(true);
        // Apply changes in real-time
        onUpdateSettings(newSettings);
    };

    const handleApply = () => {
        // Save the current settings as the new baseline
        originalSettingsRef.current = localSettings;
        setHasChanges(false);
        onClose();
    };

    const handleClose = () => {
        if (hasChanges) {
            // Revert to original settings if there are unsaved changes
            onUpdateSettings(originalSettingsRef.current);
        }
        onClose();
    };

    const handleRestart = async () => {
        try {
            await relaunch();
        } catch (error) {
            console.error('Failed to relaunch:', error);
            alert('Échec du redémarrage : ' + error.message);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-96 bg-[#2c2c2c] rounded-xl shadow-2xl border border-white/10 overflow-hidden transform transition-all scale-100 p-6 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h2 className="text-lg font-semibold text-white">{t('settings.title')}</h2>
                    <button onClick={handleClose} className="p-1 rounded-full hover:bg-white/10 transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="space-y-6 overflow-y-auto pr-1 custom-scrollbar">
                    
                    {/* Profile & Avatar Settings */}
                    {authData && (
                        <div className="space-y-3 relative z-20">
                            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('settings.profile', 'Profil')}</h3>
                            <div className="p-4 bg-black/20 border border-white/10 rounded-xl space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-0.5">
                                        {localSettings.avatarUrl ? (
                                            <img src={localSettings.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full rounded-full bg-[#1e1e1e] flex items-center justify-center text-xl font-bold text-white">
                                                {authData.username.substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                         <label className="text-xs text-gray-400 block mb-1">URL de l&apos;avatar</label>
                                         <input 
                                            type="text" 
                                            placeholder="https://..." 
                                            value={localSettings.avatarUrl || ''}
                                            onChange={(e) => handleUpdate({ ...localSettings, avatarUrl: e.target.value })}
                                            onBlur={() => {
                                                // Sync with KeyAuth cloud var when saving settings
                                                if (keyAuthService.isAuthenticated) {
                                                    keyAuthService.loadUserData().then(res => {
                                                        const currentData = res.data || {};
                                                        keyAuthService.saveUserData({ ...currentData, avatarUrl: localSettings.avatarUrl });
                                                    });
                                                }
                                            }}
                                            className="w-full bg-[#1e1e1e] border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none"
                                         />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Language */}
                    <div className="space-y-3 relative z-20">
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('settings.language')}</h3>
                        <div className="relative">
                            <button
                                onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none flex items-center justify-between hover:bg-white/5 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-gray-400" />
                                    <span>{languages.find(l => l.code === i18n.language)?.label || 'Français'}</span>
                                </div>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isLanguageMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isLanguageMenuOpen && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-40" 
                                        onClick={() => setIsLanguageMenuOpen(false)}
                                    />
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#2c2c2c] border border-white/10 rounded-lg shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                                        {languages.map((lang) => (
                                            <button
                                                key={lang.code}
                                                onClick={() => {
                                                    i18n.changeLanguage(lang.code);
                                                    setIsLanguageMenuOpen(false);
                                                }}
                                                className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between hover:bg-white/10 transition-colors ${i18n.language === lang.code ? 'bg-blue-600/20 text-blue-400' : 'text-gray-200'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-base">{lang.flag}</span>
                                                    <span className="font-medium">{lang.label}</span>
                                                </div>
                                                {i18n.language === lang.code && <Check className="w-4 h-4" />}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Writing Assistance */}
                    <div className="space-y-3 relative z-20">
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('settings.writing', 'Rédaction')}</h3>
                        <div className="p-3 bg-black/20 border border-white/10 rounded-lg flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-200">{t('settings.enable_correction', "Correcteur d'orthographe")}</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={localSettings.enableCorrection !== false}
                                    onChange={(e) => handleUpdate({ ...localSettings, enableCorrection: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>

                    {/* License Section */}
                    <div className="space-y-3" style={{ fontFamily: 'Sora, sans-serif' }}>
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('license.title', 'Licence & Abonnement')}</h3>
                        <div className={`p-4 rounded-lg border flex flex-col gap-3 ${authData ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                            <div className="flex items-start gap-3">
                                {authData ? (
                                    <ShieldCheck className="w-5 h-5 text-green-400 mt-0.5" />
                                ) : (
                                    <ShieldAlert className="w-5 h-5 text-red-400 mt-0.5" />
                                )}
                                <div>
                                    <h4 className={`text-sm font-medium ${authData ? 'text-green-400' : 'text-red-400'}`}>
                                        {authData ? t('license.status_active', 'Licence Active') : t('license.status_inactive', 'Licence Inactive')}
                                    </h4>
                                    {authData ? (
                                        <div className="mt-1 space-y-0.5">
                                            <p className="text-xs text-gray-400">
                                                {t('license.level', 'Niveau')}: <span className="text-gray-200 font-medium capitalize">{authData.subscription || 'Standard'}</span>
                                            </p>
                                            {authData.expiry && (
                                                <p className="text-xs text-gray-400">
                                                    {t('license.expiry', 'Expire le')}: <span className="text-gray-200">{authData.expiry}</span>
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 mt-1">
                                            {t('license.features_locked', 'Certaines fonctionnalités comme l\'IA sont restreintes.')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Typography */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('settings.display_title')}</h3>
                        <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Type className="w-5 h-5 text-gray-400" />
                                <span className="text-sm font-medium text-gray-200">{t('settings.large_text')}</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={localSettings.largeText}
                                    onChange={(e) => handleUpdate({ ...localSettings, largeText: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>

                    {/* Titlebar Style */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('settings.titlebar_style')}</h3>
                        <div className="bg-black/20 rounded-lg p-1 flex gap-1">
                            {['none', 'windows', 'macos'].map((style) => (
                                <button
                                    key={style}
                                    onClick={() => handleUpdate({ ...localSettings, titlebarStyle: style })}
                                    className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${localSettings.titlebarStyle === style
                                        ? 'bg-gray-700 text-blue-400 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
                                        }`}
                                >
                                    {style === 'none' ? t('settings.none') : style.charAt(0).toUpperCase() + style.slice(1)}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-gray-400 px-1">
                            {t('settings.titlebar_desc')}
                        </p>
                    </div>

                    {/* Cloud Sync */}
                    <div className="space-y-3">
                         <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('settings.cloud_sync_title', 'Synchronisation Cloud')}</h3>
                         <div className="bg-black/20 rounded-lg p-3 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Cloud className="w-5 h-5 text-blue-400" />
                                    <span className="text-sm font-medium text-gray-200">{t('settings.cloud_sync_toggle', 'Activer la synchronisation')}</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={localSettings.cloudSync !== false}
                                        onChange={async (e) => {
                                            const enabled = e.target.checked;
                                            handleUpdate({ ...localSettings, cloudSync: enabled });
                                            
                                            // Handle sync & restart
                                            if (window.confirm("L'application va synchroniser vos données et redémarrer pour appliquer les changements. Voulez-vous continuer ?")) {
                                                 // Force save local first just in case
                                                 if (keyAuthService.isAuthenticated && enabled) {
                                                     const notes = JSON.parse(localStorage.getItem('fiip-notes') || '[]');
                                                     await keyAuthService.saveUserData({ notes: notes }); // Sync notes now
                                                 }
                                                 localStorage.setItem('fiip-settings', JSON.stringify({ ...localSettings, cloudSync: enabled }));
                                                 try {
                                                     await relaunch();
                                                 } catch (err) {
                                                     alert("Redémarrage échoué: " + err);
                                                 }
                                            } else {
                                                // Revert toggle if cancelled
                                                handleUpdate({ ...localSettings, cloudSync: !enabled });
                                            }
                                        }}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all border-gray-600 peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            {localSettings.cloudSync !== false && (
                                <div className="mt-2 pt-2 border-t border-white/5 space-y-2 animate-in fade-in slide-in-from-top-1">
                                    <p className="text-[10px] text-gray-400 px-1 mb-2 font-medium">Choisir les éléments à synchroniser :</p>
                                    
                                    {[
                                        { key: 'notes', label: 'Mes Notes (Docs, Mémos)' },
                                        { key: 'ai', label: 'IA (Modèles, Clés API)' },
                                        { key: 'appearance', label: 'Apparence (Thème, Effets)' },
                                        { key: 'language', label: 'Langue' },
                                        { key: 'general', label: 'Général (Sons, Préférences)' }
                                    ].map(item => (
                                        <div key={item.key} className="flex items-center justify-between px-1 hover:bg-white/5 rounded py-1 transition-colors">
                                            <span className="text-xs text-gray-300">{item.label}</span>
                                            <input 
                                                type="checkbox" 
                                                checked={localSettings.syncPreferences?.[item.key] !== false}
                                                onChange={(e) => handleUpdate({ 
                                                    ...localSettings, 
                                                    syncPreferences: { 
                                                        ...(localSettings.syncPreferences || { notes: true, ai: true, appearance: true, language: true, general: true }), 
                                                        [item.key]: e.target.checked 
                                                    }
                                                })}
                                                className="accent-blue-600 w-3.5 h-3.5 rounded bg-gray-700 border-gray-600 cursor-pointer"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            <p className="text-[10px] text-gray-400 px-1 pt-1 border-t border-white/5 mt-1">
                                {t('settings.cloud_sync_desc', "Synchronise vos notes avec le cloud à chaque démarrage.")}
                            </p>
                         </div>
                    </div>

                    {/* Window Effects */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('settings.window_effects_title')}</h3>
                        <div className="bg-black/20 rounded-lg p-1 flex gap-1">
                            {['none', 'mica', 'acrylic'].map((effect) => (
                                <button
                                    key={effect}
                                    onClick={() => handleUpdate({ ...localSettings, windowEffect: effect })}
                                    className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${localSettings.windowEffect === effect
                                        ? 'bg-gray-700 text-blue-400 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
                                        }`}
                                >
                                    {effect.charAt(0).toUpperCase() + effect.slice(1)}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-gray-400 px-1">
                            {t('settings.window_effects_desc')}
                        </p>
                    </div>

                    {/* Audio & Media */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('settings.audio_media_title')}</h3>

                        {/* Sound Effects Toggles */}
                        <div className="bg-black/20 rounded-lg p-3 space-y-3 mb-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-200">{t('settings.app_sounds', "Sons de l'interface")}</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={localSettings.appSound !== false}
                                        onChange={(e) => handleUpdate({ ...localSettings, appSound: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all border-gray-600 peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <div className="flex items-center justify-between border-t border-white/5 pt-3">
                                <span className="text-sm font-medium text-gray-200">{t('settings.chat_sounds', "Notifications du chat")}</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={localSettings.chatSound !== false}
                                        onChange={(e) => handleUpdate({ ...localSettings, chatSound: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all border-gray-600 peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>

                        {/* Audio Input */}
                        <div>
                            <label className="block text-xs font-medium text-gray-300 mb-1">{t('settings.mic_input')}</label>
                            <select
                                value={localSettings.audioInputId || ''}
                                onChange={(e) => handleUpdate({ ...localSettings, audioInputId: e.target.value })}
                                className="w-full bg-black/20 border border-white/10 rounded-md px-2 py-2 text-sm text-gray-100 outline-none"
                            >
                                <option value="">{t('settings.default')}</option>
                                {audioDevices.inputs.map(device => (
                                    <option key={device.deviceId} value={device.deviceId}>
                                        {device.label || `Microphone ${device.deviceId.slice(0, 5)}...`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Audio Output */}
                        <div>
                            <label className="block text-xs font-medium text-gray-300 mb-1">{t('settings.audio_output')}</label>
                            <select
                                value={localSettings.audioOutputId || ''}
                                onChange={(e) => handleUpdate({ ...localSettings, audioOutputId: e.target.value })}
                                className="w-full bg-black/20 border border-white/10 rounded-md px-2 py-2 text-sm text-gray-100 outline-none"
                            >
                                <option value="">{t('settings.default')}</option>
                                {audioDevices.outputs.map(device => (
                                    <option key={device.deviceId} value={device.deviceId}>
                                        {device.label || `Sortie ${device.deviceId.slice(0, 5)}...`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* AI Settings */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('settings.ai_title')}</h3>
                        
                        {/* Master Toggle */}
                        <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Bot className="w-5 h-5 text-gray-400" />
                                <span className="text-sm font-medium text-gray-200">{t('settings.ai_toggle')}</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={localSettings.aiEnabled !== false}
                                    onChange={(e) => handleUpdate({ ...localSettings, aiEnabled: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        {localSettings.aiEnabled !== false && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div>
                                    <label className="block text-xs font-medium text-gray-300 mb-1">{t('settings.api_key_label')}</label>
                                    <input
                                        type="password"
                                        value={localSettings.aiApiKey || ''}
                                        onChange={(e) => handleUpdate({ ...localSettings, aiApiKey: e.target.value })}
                                        placeholder="sk-or-..."
                                        className="w-full bg-black/20 border border-white/10 rounded-md px-3.5 py-2.5 text-sm text-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                    />
                                    <button
                                        onClick={() => open('https://openrouter.ai/keys')}
                                        className="text-[10px] text-blue-400 hover:text-blue-300 mt-1.5 font-medium hover:underline transition-colors"
                                    >
                                        {t('settings.get_api_key')}
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-300 mb-1">{t('settings.ai_model_label')}</label>
                                    <select
                                        value={localSettings.aiModel || 'openai/gpt-4o-mini'}
                                        onChange={(e) => handleUpdate({ ...localSettings, aiModel: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-md px-2 py-2 text-sm text-gray-100 outline-none"
                                    >
                                        <optgroup label={t('settings.popular_models')}>
                                            <option value="openai/gpt-4o-mini">GPT-4o Mini {t('settings.model_desc_fast')}</option>
                                            <option value="openai/gpt-4o">GPT-4o {t('settings.model_desc_powerful')}</option>
                                            <option value="google/gemini-2.0-flash-001">Gemini 2.0 Flash</option>
                                            <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                                            <option value="mistralai/mistral-large-2411">Mistral Large</option>
                                        </optgroup>
                                        {(localSettings.customModels && localSettings.customModels.length > 0) && (
                                            <optgroup label="Personnalisés">
                                                {localSettings.customModels.map(m => (
                                                    <option key={m} value={m}>{m}</option>
                                                ))}
                                            </optgroup>
                                        )}
                                    </select>
                                </div>

                                {/* Custom Models List */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-300 mb-2">{t('settings.custom_models_label')}</label>

                                    {/* List */}
                                    <div className="space-y-2 mb-2">
                                        {(localSettings.customModels || []).map((modelId) => (
                                            <div key={modelId} className="flex items-center justify-between bg-black/20 px-3.5 py-2.5 rounded-md border border-white/5">
                                                <span className="text-xs text-gray-300 font-mono">{modelId}</span>
                                                <button
                                                    onClick={() => {
                                                        const newModels = localSettings.customModels.filter(m => m !== modelId);
                                                        handleUpdate({ ...localSettings, customModels: newModels });
                                                    }}
                                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                        {(localSettings.customModels || []).length === 0 && (
                                            <div className="text-xs text-gray-400 italic text-center py-2">{t('settings.no_custom_models')}</div>
                                        )}
                                    </div>

                                    {/* Add Input */}
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder={t('settings.add_model_placeholder')}
                                            className="flex-1 bg-black/20 border border-white/10 rounded-md px-3.5 py-2.5 text-xs text-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                            id="new-model-input"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    const val = e.target.value.trim();
                                                    if (val && !(localSettings.customModels || []).includes(val)) {
                                                        const newModels = [...(localSettings.customModels || []), val];
                                                        handleUpdate({ ...localSettings, customModels: newModels });
                                                        e.target.value = '';
                                                    }
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={() => {
                                                const input = document.getElementById('new-model-input');
                                                const val = input.value.trim();
                                                if (val && !(localSettings.customModels || []).includes(val)) {
                                                    const newModels = [...(localSettings.customModels || []), val];
                                                    handleUpdate({ ...localSettings, customModels: newModels });
                                                    input.value = '';
                                                }
                                            }}
                                            className="px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
                                        >
                                            {t('settings.add')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Audio & Accessibility */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('settings.audio_accessibility_title')}</h3>
                        
                        {/* TTS Toggle */}
                        <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-200">{t('settings.tts_toggle')}</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={localSettings.voiceEnabled !== false}
                                    onChange={(e) => handleUpdate({ ...localSettings, voiceEnabled: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        {/* Voice Selection */}
                        {localSettings.voiceEnabled !== false && (
                            <div>
                                <label className="block text-xs font-medium text-gray-300 mb-1">{t('settings.voice_label')}</label>
                                <select
                                    value={localSettings.voiceName || ''}
                                    onChange={(e) => handleUpdate({ ...localSettings, voiceName: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded-md px-2 py-2 text-sm text-gray-100 outline-none"
                                >
                                    <option value="">{t('settings.default')}</option>
                                    {voices.map((voice) => (
                                        <option key={voice.name} value={voice.name}>
                                            {voice.name} ({voice.lang})
                                        </option>
                                    ))}
                                </select>

                                {/* Linux TTS Warning */}
                                {isLinux && voices.length === 0 && (
                                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mt-3 animate-in fade-in slide-in-from-top-1">
                                        <p className="text-xs text-yellow-200 mb-2 leading-relaxed">
                                            Aucune voix détectée. Sur Linux, le paquet <code>speech-dispatcher</code> est souvent requis pour le TTS.
                                        </p>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const cmd = Command.create('install_speech_dispatcher');
                                                    const output = await cmd.execute();
                                                    if (output.code === 0) {
                                                        alert("Installation terminée avec succès. L'application va redémarrer.");
                                                        await relaunch();
                                                    } else {
                                                        alert("L'installation a échoué (Code " + output.code + "). Vérifiez votre mot de passe ou installez 'speech-dispatcher' manuellement.");
                                                    }
                                                } catch (e) {
                                                    console.error(e);
                                                    alert("Erreur : " + e.message);
                                                }
                                            }}
                                            className="w-full text-xs bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-2 rounded transition-colors font-medium flex items-center justify-center gap-2"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                            Installer speech-dispatcher & Redémarrer
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* STT Toggle */}
                        <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-200">{t('settings.stt_toggle')}</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={localSettings.dictationEnabled !== false}
                                    onChange={(e) => handleUpdate({ ...localSettings, dictationEnabled: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        
                        {/* Windows Voice Settings Link */}
                        <div className="flex justify-end px-1">
                            <button
                                onClick={() => open('https://support.microsoft.com/en-us/windows/language-packs-for-windows-a5094319-a92d-18de-5b53-1cfc697cfca8')}
                                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors group"
                            >
                                <span className="group-hover:underline underline-offset-2 decoration-blue-400/30">{t('settings.download_voices', 'Guide: Installer des langues et voix')}</span>
                                <Download className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-white/5 flex flex-col gap-3 mt-4 shrink-0">
                    <button
                        onClick={handleApply}
                        className="w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 shadow-md transform hover:-translate-y-0.5"
                    >
                        <Check className="w-4 h-4" />
                        {t('settings.apply')}
                    </button>

                    <div className="flex w-full gap-2">
                        <button
                            disabled={isCheckingUpdate}
                            onClick={async () => {
                                setIsCheckingUpdate(true);
                                try {
                                    const { check } = await import('@tauri-apps/plugin-updater');
                                    const update = await check();

                                    if (update?.available) {
                                        const currentVersion = update.currentVersion;
                                        const latestVersion = update.version;

                                        if (currentVersion === latestVersion) {
                                            alert(`Vous êtes déjà à jour ! (Version ${currentVersion})`);
                                            setIsCheckingUpdate(false);
                                            return;
                                        }

                                        setUpdateInfo(update);
                                    } else {
                                        alert(t('settings.update_not_found'));
                                    }
                                } catch (e) {
                                    console.error("Update check error:", e);
                                    const msg = e?.message || (typeof e === 'string' ? e : JSON.stringify(e));
                                    
                                    if (msg.includes("parsing major version number") || msg.includes("unexpected character")) {
                                         console.warn("Update check failed due to invalid server version format. Assuming up to date.");
                                         alert(t('settings.update_check_error_version'));
                                    } else if (msg.includes("Could not fetch a valid release JSON")) {
                                        alert(t('settings.update_check_error_network'));
                                    } else {
                                        alert(t('settings.update_check_error_generic', { error: msg }));
                                    }
                                } finally {
                                    setIsCheckingUpdate(false);
                                }
                            }}
                            className={`flex-1 py-2.5 px-5 bg-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-colors ${isCheckingUpdate ? 'opacity-50 cursor-wait' : ''}`}
                        >
                            {isCheckingUpdate ? t('settings.checking') : t('settings.check_update_btn')}
                        </button>
                        <button
                            onClick={handleRestart}
                            className="flex-1 py-2.5 px-5 bg-white text-gray-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            {t('settings.restart')}
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-400 text-center">Fiip Notes v{appVersion || '...'}</p>
                    {platformName && (
                        <p className="text-[10px] text-gray-500 text-center">Running on {platformName}</p>
                    )}
                </div>

                {/* Update Modal Overlay */}
                {updateInfo && (
                    <div className="absolute inset-0 z-50 bg-[#2c2c2c] flex flex-col p-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-center justify-between mb-4 shrink-0">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-blue-400" />
                                {t('settings.update_available')}
                            </h3>
                            <button onClick={() => setUpdateInfo(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20 rounded-lg p-4 mb-4 border border-white/5">
                            <div className="flex justify-between items-baseline mb-3 pb-3 border-b border-white/5">
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-500 uppercase tracking-wider">{t('settings.current_version')}</span>
                                    <span className="text-sm font-mono text-gray-400">v{appVersion}</span>
                                </div>
                                <MoveRight className="w-4 h-4 text-gray-600 mx-2" />
                                <div className="flex flex-col items-end">
                                    <span className="text-xs text-blue-400 uppercase tracking-wider font-medium">{t('settings.new_version')}</span>
                                    <span className="text-lg font-bold text-green-400 font-mono">v{updateInfo.version}</span>
                                </div>
                            </div>
                            
                            <div className="prose prose-invert prose-sm max-w-none">
                                {updateInfo.date && (
                                    <p className="text-xs text-gray-500 mb-2">
                                        {t('settings.published_on')} {new Date(updateInfo.date).toLocaleDateString()}
                                    </p>
                                )}
                                <div className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed">
                                    {updateInfo.body || t('settings.no_release_notes')}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 shrink-0">
                            <button
                                onClick={() => setUpdateInfo(null)}
                                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-sm font-medium transition-colors"
                            >
                                {t('settings.ignore')}
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        setIsCheckingUpdate(true);
                                        await updateInfo.downloadAndInstall();
                                        
                                        const osType = await type();
                                        if (osType === 'windows') {
                                            await exit();
                                        } else {
                                            await relaunch();
                                        }
                                    } catch (e) {
                                        console.error(e);
                                        alert("Erreur MAJ: " + e.message);
                                        setIsCheckingUpdate(false);
                                    }
                                }}
                                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg flex items-center justify-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                {isCheckingUpdate ? t('settings.installing') : t('settings.install')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
