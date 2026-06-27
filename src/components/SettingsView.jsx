import { getVersion } from '@tauri-apps/api/app';
import { relaunch } from '@tauri-apps/plugin-process';
import { open } from '@tauri-apps/plugin-shell';
import { check } from '@tauri-apps/plugin-updater';
import {
    IconFrance,
    IconGermany,
    IconItaly,
    IconJapan,
    IconNetherlands,
    IconPortugal,
    IconRussia,
    IconSpain,
    IconUnitedKingdom,
} from 'nucleo-flags';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useUI } from '../providers/UIProvider';
import { FIIP_LICENSE_PURCHASE_URL } from '../config/links';
import { FREE_MODEL_ROUTER, getLastAIUsageStats, subscribeToAIUsage } from '../services/ai';
import { clearAttachmentCache, formatBytes, getAttachmentCacheSize } from '../services/attachmentCache';
import { getFontCacheSize } from '../services/fontStore';
import { keyAuthService } from '../services/keyauth';
import { getPlatformDisplayName } from '../services/platform';
import { authService } from '../services/supabase';
import { coerceWindowEffect, getWindowEffectOptions } from '../utils/windowEffects';

import FontManager from './FontManager';
import { GlassSwitch } from './ui/GlassSwitch';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger } from './ui/Select';

// Icons Import
import IconCheck from '~icons/mingcute/check-fill';
import IconCpu from '~icons/mingcute/chip-fill';
import IconCloud from '~icons/mingcute/cloud-fill';
import IconDownload from '~icons/mingcute/download-2-fill';
import IconGlobe from '~icons/mingcute/earth-2-fill';
import IconRefresh from '~icons/mingcute/refresh-3-fill';
import IconBot from '~icons/mingcute/robot-fill';
import IconVolume from '~icons/mingcute/volume-fill';
import IconLeft from '~icons/mingcute/left-fill';
import IconSettings from '~icons/mingcute/settings-1-fill';
import IconPalette from '~icons/mingcute/palette-fill';
import IconDocument from '~icons/mingcute/document-fill';
import IconUser from '~icons/mingcute/user-3-fill';
import IconKey from '~icons/mingcute/key-2-fill';
import IconInfo from '~icons/mingcute/information-fill';

export default function SettingsView({
    settings,
    onUpdateSettings,
    storageUsage,
    onSync,
    onBack,
    initialTab = 'general',
    osType = 'unknown'
}) {
    const { t, i18n } = useTranslation();
    const { theme: uiTheme, setTheme: setUiTheme } = useUI();
    const [activeTab, setActiveTab] = useState(initialTab);
    const [localSettings, setLocalSettings] = useState(settings);
    const [audioDevices, setAudioDevices] = useState({ inputs: [], outputs: [] });
    const [platformName, setPlatformName] = useState('');
    const [appVersion, setAppVersion] = useState('');
    const [voices, setVoices] = useState([]);
    const [pendingUpdatesCount, setPendingUpdatesCount] = useState(0);
    const [currentUser, setCurrentUser] = useState(null);
    const [lastSyncAt, setLastSyncAt] = useState(() => localStorage.getItem('fiip-last-sync-at') || '');
    const [aiUsage, setAiUsage] = useState(() => getLastAIUsageStats());
    const [cacheStats, setCacheStats] = useState({ attachments: 0, fonts: 0 });
    const [updateStatus, setUpdateStatus] = useState('Non vérifié');

    const languages = [
        { code: 'fr', label: 'Français', short: 'FR', Flag: IconFrance },
        { code: 'en', label: 'English', short: 'EN', Flag: IconUnitedKingdom },
        { code: 'de', label: 'Deutsch', short: 'DE', Flag: IconGermany },
        { code: 'es', label: 'Español', short: 'ES', Flag: IconSpain },
        { code: 'it', label: 'Italiano', short: 'IT', Flag: IconItaly },
        { code: 'pt', label: 'Português', short: 'PT', Flag: IconPortugal },
        { code: 'nl', label: 'Nederlands', short: 'NL', Flag: IconNetherlands },
        { code: 'ru', label: 'Русский', short: 'RU', Flag: IconRussia },
        { code: 'ja', label: '日本語', short: 'JA', Flag: IconJapan },
    ].sort((a, b) => a.label.localeCompare(b.label));
    const selectedLanguage = languages.find(l => l.code === localSettings.language || l.code === i18n.language) || languages[0];
    const SelectedLanguageFlag = selectedLanguage.Flag;

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    useEffect(() => {
        setActiveTab(initialTab || 'general');
    }, [initialTab]);

    useEffect(() => {
        authService.getUser().then(setCurrentUser).catch(() => setCurrentUser(null));
        const unsubscribeAI = subscribeToAIUsage(setAiUsage);
        const refreshCache = async () => {
            const [attachments, fonts] = await Promise.all([
                getAttachmentCacheSize(),
                getFontCacheSize(),
            ]);
            setCacheStats({ attachments, fonts });
        };
        refreshCache();

        const loadVoices = () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                setVoices(window.speechSynthesis.getVoices());
            }
        };
        loadVoices();
        if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }

        const checkPending = () => {
            const updates = keyAuthService.pendingUpdates;
            setPendingUpdatesCount(updates ? Object.keys(updates).length : 0);
        };
        checkPending();
        const interval = setInterval(checkPending, 2000);

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

        // Get App Version
        fetch('/version.json')
            .then(res => res.json())
            .then(data => setAppVersion(data.version))
            .catch(() => {
                getVersion().then(v => setAppVersion(v)).catch(() => setAppVersion('3.0.0'));
            });

        return () => {
            clearInterval(interval);
            unsubscribeAI?.();
        };
    }, []);

    const handleUpdate = (newSettings) => {
        setLocalSettings(newSettings);
        onUpdateSettings(newSettings);
    };

    const syncAvailable = Boolean(currentUser);
    const storagePercent = Number.isFinite(storageUsage?.percent) ? storageUsage.percent : 0;
    const storageLimit = Number(storageUsage?.limit || 0);
    const totalCacheSize = cacheStats.attachments + cacheStats.fonts;
    const currentLicenseName = keyAuthService.isAuthenticated ? keyAuthService.getCurrentSubscriptionName() : 'Aucune licence active';
    const windowEffectOptions = getWindowEffectOptions(osType);

    const handleClearAttachmentCache = async () => {
        await clearAttachmentCache();
        setCacheStats((stats) => ({ ...stats, attachments: 0 }));
    };

    const handleCheckUpdates = async () => {
        setUpdateStatus('Vérification...');
        if (!window.__TAURI_INTERNALS__) {
            setUpdateStatus('Ouvre les versions GitHub');
            await open('https://github.com/darkiifr/Fiip/releases');
            return;
        }
        try {
            const update = await check();
            if (update?.available) {
                setUpdateStatus(`Version ${update.version} disponible`);
            } else {
                setUpdateStatus(`À jour (${appVersion || 'version actuelle'})`);
            }
        } catch (error) {
            setUpdateStatus(error?.message || 'Vérification impossible');
        }
    };

    return (
        <div className="flex-1 flex h-full overflow-hidden bg-warm-bg-light dark:bg-warm-bg-dark text-warm-text-primary-light dark:text-warm-text-primary-dark">
            {/* Sidebar gauche macOS Style */}
            <div className="w-64 border-r border-warm-border-light dark:border-warm-border-dark bg-warm-sidebar-light/50 dark:bg-warm-sidebar-dark/50 flex flex-col p-4">
                <button 
                    onClick={onBack}
                    className="flex items-center gap-2 mb-6 text-xs font-semibold uppercase tracking-wider text-warm-text-muted-light dark:text-warm-text-muted-dark hover:text-warm-text-primary-light dark:hover:text-warm-text-primary-dark transition-colors self-start"
                >
                    <IconLeft className="w-3.5 h-3.5" />
                    {t('common.back', 'Retour')}
                </button>

                <h2 className="px-3 mb-4 text-lg font-bold tracking-tight">{t('settings.title', 'Réglages')}</h2>

                <nav className="flex-1 space-y-1">
                    {[
                        { id: 'general', label: t('settings.general', 'Général'), icon: IconSettings },
                        { id: 'appearance', label: t('settings.appearance', 'Apparence'), icon: IconPalette },
                        { id: 'editor', label: t('settings.editor', 'Éditeur'), icon: IconDocument },
                        { id: 'sync', label: t('settings.sync', 'Synchronisation'), icon: IconUser },
                        { id: 'ai', label: t('settings.ai', 'Intelligence Artificielle'), icon: IconBot },
                        { id: 'premium', label: 'Fiip Premium', icon: IconKey },
                        { id: 'cache', label: 'Cache local', icon: IconDownload },
                        { id: 'about', label: t('settings.about', 'À propos'), icon: IconInfo }
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                                    active 
                                        ? 'bg-warm-sidebar-item-active dark:bg-warm-sidebar-item-active text-warm-text-primary-light dark:text-warm-text-primary-dark font-semibold' 
                                        : 'text-warm-text-secondary-light dark:text-warm-text-secondary-dark hover:bg-warm-sidebar-item-active/50 dark:hover:bg-warm-sidebar-item-active/30'
                                }`}
                            >
                                <Icon className={`w-4 h-4 ${active ? 'text-warm-text-primary-light dark:text-warm-text-primary-dark' : 'text-warm-text-muted-light dark:text-warm-text-muted-dark'}`} />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Zone de contenu droite */}
            <div className="flex-1 overflow-y-auto px-10 py-8 custom-scrollbar">
                <div className="max-w-2xl space-y-8">
                    {/* GÉNÉRAL */}
                    {activeTab === 'general' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            <div>
                                <h3 className="text-lg font-semibold tracking-tight mb-1">{t('settings.general', 'Général')}</h3>
                                <p className="text-sm text-warm-text-secondary-light dark:text-warm-text-secondary-dark">Gérez la langue et les préférences système de base.</p>
                            </div>

                            {/* Langue */}
                            <div className="bg-warm-card-light dark:bg-warm-card-dark border border-warm-border-light dark:border-warm-border-dark rounded-2xl p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <label className="text-sm font-semibold">{t('settings.language', "Langue de l'application")}</label>
                                        <p className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">Configurez la langue de l'interface.</p>
                                    </div>
                                    <div className="w-48">
                                        <Select
                                            value={selectedLanguage.code}
                                            onValueChange={(code) => {
                                                i18n.changeLanguage(code);
                                                handleUpdate({ ...localSettings, language: code });
                                            }}
                                        >
                                            <SelectTrigger className="w-full bg-white dark:bg-zinc-800 border border-warm-border-light dark:border-warm-border-dark rounded-xl px-3 py-2 text-sm text-left">
                                                <div className="flex items-center gap-2">
                                                    <IconGlobe className="w-4 h-4 text-warm-text-muted-light" />
                                                    <SelectedLanguageFlag size={22} className="shrink-0 rounded-[4px] shadow-sm" title={selectedLanguage.label} />
                                                    <span className="truncate font-semibold">{selectedLanguage.label}</span>
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="bg-white dark:bg-zinc-900 border border-warm-border-light dark:border-warm-border-dark rounded-xl shadow-lg mt-1 p-1">
                                                <SelectGroup>
                                                    {languages.map((l) => (
                                                        <SelectItem key={l.code} value={l.code} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-warm-sidebar-item-active cursor-pointer">
                                                            <l.Flag size={22} className="shrink-0 rounded-[4px] shadow-sm" title={l.label} />
                                                            <span className="font-medium truncate">{l.label}</span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            {/* Sons */}
                            <div className="bg-warm-card-light dark:bg-warm-card-dark border border-warm-border-light dark:border-warm-border-dark rounded-2xl p-4 space-y-4">
                                <h4 className="text-sm font-bold tracking-tight">{t('settings.audio_media_title', 'Effets Sonores')}</h4>
                                
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <span className="text-sm font-semibold">{t('settings.app_sounds', "Sons de l'interface")}</span>
                                        <p className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">Activer les sons lors des clics et transitions.</p>
                                    </div>
                                    <GlassSwitch
                                        checked={localSettings.appSound !== false}
                                        onCheckedChange={(checked) => handleUpdate({ ...localSettings, appSound: checked })}
                                    />
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-warm-border-light dark:border-warm-border-dark">
                                    <div className="space-y-0.5">
                                        <span className="text-sm font-semibold">{t('settings.chat_sounds', "Notifications du chat")}</span>
                                        <p className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">Jouer un son lors de la réception d'un message de Dexter.</p>
                                    </div>
                                    <GlassSwitch
                                        checked={localSettings.chatSound !== false}
                                        onCheckedChange={(checked) => handleUpdate({ ...localSettings, chatSound: checked })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* APPARENCE */}
                    {activeTab === 'appearance' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            <div>
                                <h3 className="text-lg font-semibold tracking-tight mb-1">{t('settings.appearance', 'Apparence')}</h3>
                                <p className="text-sm text-warm-text-secondary-light dark:text-warm-text-secondary-dark">Personnalisez le style visuel de l'application.</p>
                            </div>

                            {/* Thème segmented picker */}
                            <div className="bg-warm-card-light dark:bg-warm-card-dark border border-warm-border-light dark:border-warm-border-dark rounded-2xl p-4 space-y-4">
                                <label className="text-sm font-semibold block">{t('settings.ui_theme', 'Thème de couleur')}</label>
                                <div className="bg-warm-sidebar-light dark:bg-warm-sidebar-dark rounded-xl p-1 flex gap-1 border border-warm-border-light dark:border-warm-border-dark">
                                    {[
                                        { id: 'light', label: 'Clair' },
                                        { id: 'dark', label: 'Sombre' },
                                        { id: 'system', label: 'Système' }
                                    ].map((tStyle) => (
                                        <button
                                            key={tStyle.id}
                                            onClick={() => handleUpdate({ ...localSettings, theme: tStyle.id })}
                                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                                                localSettings.theme === tStyle.id 
                                                    ? 'bg-white dark:bg-zinc-800 text-warm-text-primary-light dark:text-warm-text-primary-dark shadow-sm border border-warm-border-light dark:border-warm-border-dark' 
                                                    : 'text-warm-text-muted-light dark:text-warm-text-muted-dark hover:text-warm-text-primary-light dark:hover:text-warm-text-primary-dark'
                                            }`}
                                        >
                                            {tStyle.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Matériau (Liquid Glass vs Classic) */}
                            <div className="bg-warm-card-light dark:bg-warm-card-dark border border-warm-border-light dark:border-warm-border-dark rounded-2xl p-4 space-y-4">
                                <label className="text-sm font-semibold block">{t('settings.ui_theme_style', 'Style du Matériau')}</label>
                                <div className="bg-warm-sidebar-light dark:bg-warm-sidebar-dark rounded-xl p-1 flex gap-1 border border-warm-border-light dark:border-warm-border-dark">
                                    {[
                                        { id: 'original', label: 'Mica / Acrylic (Windows)' },
                                        { id: 'liquid-glass', label: 'Liquid Glass (macOS 26)' }
                                    ].map((style) => (
                                        <button
                                            key={style.id}
                                            onClick={() => setUiTheme(style.id)}
                                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                                                uiTheme === style.id 
                                                    ? 'bg-white dark:bg-zinc-800 text-warm-text-primary-light dark:text-warm-text-primary-dark shadow-sm border border-warm-border-light dark:border-warm-border-dark' 
                                                    : 'text-warm-text-muted-light dark:text-warm-text-muted-dark hover:text-warm-text-primary-light dark:hover:text-warm-text-primary-dark'
                                            }`}
                                        >
                                            {style.label}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">
                                    {t('settings.ui_theme_desc', "Basculez entre le style mat d'origine (Acrylic/Mica) et les effets de verre organique dynamic Liquid Glass.")}
                                </p>
                            </div>

                            {/* Window Effects */}
                            <div className="bg-warm-card-light dark:bg-warm-card-dark border border-warm-border-light dark:border-warm-border-dark rounded-2xl p-4 space-y-4">
                                <label className="text-sm font-semibold block">{t('settings.window_effects_title', 'Effets de Transparence')}</label>
                                <div className="bg-warm-sidebar-light dark:bg-warm-sidebar-dark rounded-xl p-1 flex gap-1 border border-warm-border-light dark:border-warm-border-dark">
                                    {windowEffectOptions.map((effect) => (
                                        <button
                                            key={effect.id}
                                            disabled={!effect.supported}
                                            onClick={() => handleUpdate({ ...localSettings, windowEffect: coerceWindowEffect(effect.id, osType) })}
                                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                                                localSettings.windowEffect === effect.id
                                                    ? 'bg-white dark:bg-zinc-800 text-warm-text-primary-light dark:text-warm-text-primary-dark shadow-sm border border-warm-border-light dark:border-warm-border-dark'
                                                    : 'text-warm-text-muted-light dark:text-warm-text-muted-dark hover:text-warm-text-primary-light dark:hover:text-warm-text-primary-dark disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:text-warm-text-muted-light'
                                            }`}
                                            title={effect.supported ? undefined : 'Indisponible sur cet OS'}
                                        >
                                            {effect.label}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">
                                    {t('settings.window_effects_desc', 'Les effets non supportes par votre OS restent desactives. Windows prend en charge Mica/Acrylic/Blur, macOS Vibrancy, Linux aucun effet natif.')}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ÉDITEUR */}
                    {activeTab === 'editor' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            <div>
                                <h3 className="text-lg font-semibold tracking-tight mb-1">{t('settings.editor', 'Éditeur')}</h3>
                                <p className="text-sm text-warm-text-secondary-light dark:text-warm-text-secondary-dark">Ajustez les options de rédaction et d'orthographe.</p>
                            </div>

                            {/* Correcteur */}
                            <div className="bg-warm-card-light dark:bg-warm-card-dark border border-warm-border-light dark:border-warm-border-dark rounded-2xl p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <span className="text-sm font-semibold">{t('settings.enable_correction', "Correcteur d'orthographe")}</span>
                                        <p className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">Souligner et corriger les fautes de grammaire et d'orthographe.</p>
                                    </div>
                                    <GlassSwitch
                                        checked={localSettings.enableCorrection !== false}
                                        onCheckedChange={(checked) => handleUpdate({ ...localSettings, enableCorrection: checked })}
                                    />
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-warm-border-light dark:border-warm-border-dark">
                                    <div className="space-y-0.5">
                                        <span className="text-sm font-semibold">Sauvegarde automatique</span>
                                        <p className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">Sauvegarder instantanément vos modifications en tâche de fond.</p>
                                    </div>
                                    <GlassSwitch
                                        checked={localSettings.autoSave !== false}
                                        onCheckedChange={(checked) => handleUpdate({ ...localSettings, autoSave: checked })}
                                    />
                                </div>
                            </div>

                            {/* Polices du système */}
                            <FontManager />
                        </div>
                    )}

                    {/* SYNCHRONISATION */}
                    {activeTab === 'sync' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            <div>
                                <h3 className="text-lg font-semibold tracking-tight mb-1">{t('settings.cloud_sync_title', 'Synchronisation Cloud')}</h3>
                                <p className="text-sm text-warm-text-secondary-light dark:text-warm-text-secondary-dark">Gérez la réplication de vos données et le stockage multi-appareils.</p>
                            </div>

                            <div className={`bg-warm-card-light dark:bg-warm-card-dark border border-warm-border-light dark:border-warm-border-dark rounded-2xl p-4 space-y-4 ${!syncAvailable ? 'opacity-70 grayscale-[0.35]' : ''}`}>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <span className="text-sm font-semibold flex items-center gap-2">
                                            <IconCloud className={`w-4 h-4 ${syncAvailable ? 'text-blue-500' : 'text-warm-text-muted-light'}`} />
                                            {t('settings.cloud_sync_toggle', 'Activer la Synchronisation Cloud')}
                                        </span>
                                        <p className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">
                                            {syncAvailable ? 'Vos notes sont synchronisées en toute sécurité avec Supabase.' : 'Connectez un compte Supabase pour activer la synchronisation.'}
                                        </p>
                                    </div>
                                    <GlassSwitch
                                        disabled={!syncAvailable}
                                        checked={syncAvailable && localSettings.cloudSync !== false}
                                        onCheckedChange={async (enabled) => {
                                            if (!syncAvailable) return;
                                            if (window.confirm(t('settings.sync_confirm', "Changer ce réglage redémarrera l'application pour appliquer les nouveaux adaptateurs de stockage. Confirmer ?"))) {
                                                handleUpdate({ ...localSettings, cloudSync: enabled });
                                                localStorage.setItem('fiip-settings', JSON.stringify({ ...localSettings, cloudSync: enabled }));
                                                await relaunch().catch(console.error);
                                            }
                                        }}
                                    />
                                </div>

                                {syncAvailable && localSettings.cloudSync !== false && (
                                    <div className="mt-4 pt-4 border-t border-warm-border-light dark:border-warm-border-dark space-y-4">
                                        <div className="bg-warm-sidebar-light/50 dark:bg-warm-sidebar-dark/50 rounded-xl p-3 border border-warm-border-light dark:border-warm-border-dark space-y-3">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-warm-text-muted-light dark:text-warm-text-muted-dark">{t('settings.sync_status', 'Statut de synchronisation')}</span>
                                                <span className="text-green-600 dark:text-green-400 font-semibold flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                                    {t('settings.status_active', 'Actif')}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-warm-text-muted-light dark:text-warm-text-muted-dark">Dernière synchronisation</span>
                                                <span className="font-semibold text-warm-text-secondary-light dark:text-warm-text-secondary-dark">
                                                    {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : 'Jamais'}
                                                </span>
                                            </div>

                                            {storageUsage ? (
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-[10px] text-warm-text-muted-light dark:text-warm-text-muted-dark">
                                                        <span>{t('settings.storage_used', 'Espace disque utilisé')}</span>
                                                        <span>{Math.round(storagePercent)}%</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-warm-sidebar-light dark:bg-warm-sidebar-dark rounded-full overflow-hidden border border-warm-border-light dark:border-warm-border-dark">
                                                        <div 
                                                            className={`h-full transition-all duration-500 ${storagePercent > 90 ? 'bg-red-500' : 'bg-blue-500'}`} 
                                                            style={{ width: `${Math.min(storagePercent, 100)}%` }}
                                                        />
                                                    </div>
                                                    <div className="text-[10px] text-warm-text-muted-light dark:text-warm-text-muted-dark text-right font-mono">
                                                        {formatBytes(storageUsage.used || 0)} / {storageLimit ? formatBytes(storageLimit) : 'limite inconnue'}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark animate-pulse">
                                                    {t('settings.calculating_storage', "Calcul de l'utilisation de stockage...")}
                                                </div>
                                            )}
                                        </div>

                                        {pendingUpdatesCount > 0 && (
                                            <div className="px-3 py-2 bg-yellow-500/10 border border-yellow-500/25 rounded-xl flex items-center gap-2 text-yellow-800 dark:text-yellow-200 text-xs">
                                                <IconRefresh className="w-3.5 h-3.5 animate-spin text-yellow-600 dark:text-yellow-400" />
                                                <span>{pendingUpdatesCount} modification(s) en attente de synchronisation...</span>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-3">
                                            {onSync && (
                                                <button
                                                    onClick={async () => {
                                                        await onSync();
                                                        const now = new Date().toISOString();
                                                        localStorage.setItem('fiip-last-sync-at', now);
                                                        setLastSyncAt(now);
                                                    }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-warm-sidebar-light hover:bg-warm-sidebar-item-active dark:bg-zinc-800 dark:hover:bg-zinc-800 border border-warm-border-light dark:border-warm-border-dark rounded-xl text-xs font-semibold transition-all"
                                                >
                                                    <IconRefresh className="w-3.5 h-3.5" />
                                                    Synchroniser maintenant
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {!syncAvailable && (
                                    <div className="mt-4 rounded-xl border border-dashed border-warm-border-light dark:border-warm-border-dark p-4 text-xs text-warm-text-secondary-light dark:text-warm-text-secondary-dark">
                                        La synchronisation reste locale tant qu'aucun compte valide n'est connecté.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* INTEL ARTIF */}
                    {activeTab === 'ai' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            <div>
                                <h3 className="text-lg font-semibold tracking-tight mb-1">{t('settings.ai_title', 'Intelligence Artificielle')}</h3>
                                <p className="text-sm text-warm-text-secondary-light dark:text-warm-text-secondary-dark">Gérez l'intégration de Dexter, votre assistant de rédaction intelligent.</p>
                            </div>

                            <div className="bg-warm-card-light dark:bg-warm-card-dark border border-warm-border-light dark:border-warm-border-dark rounded-2xl p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <span className="text-sm font-semibold flex items-center gap-2">
                                            <IconBot className="w-4 h-4 text-warm-text-muted-light" />
                                            {t('settings.ai_toggle', "Activer l'assistant intelligent")}
                                        </span>
                                        <p className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">Affiche l'assistant IA Dexter et la barre d'outils rapide.</p>
                                    </div>
                                    <GlassSwitch
                                        checked={localSettings.aiEnabled !== false}
                                        onCheckedChange={(checked) => handleUpdate({ ...localSettings, aiEnabled: checked })}
                                    />
                                </div>

                                <div className="mt-4 pt-4 border-t border-warm-border-light dark:border-warm-border-dark grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="rounded-2xl border border-warm-border-light dark:border-warm-border-dark bg-white/70 dark:bg-white/5 p-4">
                                        <p className="text-xs font-bold uppercase text-warm-text-muted-light dark:text-warm-text-muted-dark">Routeur</p>
                                        <p className="mt-2 text-sm font-semibold flex items-center gap-2">
                                            <IconCpu className="w-4 h-4 text-amber-500" />
                                            {FREE_MODEL_ROUTER}
                                        </p>
                                        <p className="mt-1 text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">
                                            Endpoints autorisés: /chat/completions, /generation et /models.
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-warm-border-light dark:border-warm-border-dark bg-white/70 dark:bg-white/5 p-4">
                                        <p className="text-xs font-bold uppercase text-warm-text-muted-light dark:text-warm-text-muted-dark">Accès</p>
                                        <p className="mt-2 text-sm font-semibold">{keyAuthService.hasAIAccess() ? 'Disponible' : 'Licence requise'}</p>
                                        <p className="mt-1 text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">
                                            Aucune clé OpenRouter personnalisée n'est demandée à l'utilisateur.
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-warm-border-light dark:border-warm-border-dark bg-white/70 dark:bg-white/5 p-4">
                                        <p className="text-xs font-bold uppercase text-warm-text-muted-light dark:text-warm-text-muted-dark">Dernière génération</p>
                                        <p className="mt-2 text-sm font-semibold">{aiUsage?.id || 'Aucune'}</p>
                                        <p className="mt-1 text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">
                                            {aiUsage?.createdAt ? new Date(aiUsage.createdAt).toLocaleString() : 'Dexter affichera les statistiques après une réponse.'}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-warm-border-light dark:border-warm-border-dark bg-white/70 dark:bg-white/5 p-4">
                                        <p className="text-xs font-bold uppercase text-warm-text-muted-light dark:text-warm-text-muted-dark">Usage OpenRouter</p>
                                        <p className="mt-2 text-sm font-semibold">
                                            {aiUsage?.usage?.total_tokens ?? aiUsage?.usage?.tokens ?? 0} tokens
                                        </p>
                                        <p className="mt-1 text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">
                                            Coût estimé: {aiUsage?.usage?.total_cost ?? aiUsage?.usage?.cost ?? 0}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* FIIP PREMIUM */}
                    {activeTab === 'premium' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            <div>
                                <h3 className="text-lg font-semibold tracking-tight mb-1">Fiip Premium</h3>
                                <p className="text-sm text-warm-text-secondary-light dark:text-warm-text-secondary-dark">Compte, licence officielle et synchronisation multi-appareils.</p>
                            </div>

                            <div className="rounded-3xl border border-amber-500/20 bg-warm-card-light p-6 shadow-sm dark:bg-white/[0.045]">
                                <div className="flex items-start justify-between gap-6">
                                    <div className="space-y-3">
                                        <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                                            <IconKey className="h-3.5 w-3.5" />
                                            Licence SellAuth
                                        </span>
                                        <h4 className="text-xl font-semibold tracking-tight">Votre licence Fiip</h4>
                                        <p className="max-w-md text-sm leading-6 text-warm-text-secondary-light dark:text-warm-text-secondary-dark">
                                            Activez la synchronisation, les limites étendues et Dexter sans saisir de clé OpenRouter personnelle.
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-warm-border-light bg-white/70 px-4 py-3 text-right dark:border-white/10 dark:bg-white/[0.06]">
                                        <p className="text-[11px] font-semibold text-warm-text-muted-light">Licence actuelle</p>
                                        <p className="mt-1 text-sm font-semibold">{currentLicenseName}</p>
                                    </div>
                                </div>
                                <div className="mt-5 flex flex-wrap gap-2 border-t border-warm-border-light pt-4 dark:border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => open(FIIP_LICENSE_PURCHASE_URL)}
                                        className="rounded-2xl bg-zinc-950 px-4 py-2 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 dark:bg-white dark:text-zinc-950"
                                    >
                                        Acheter une licence
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => open(FIIP_LICENSE_PURCHASE_URL)}
                                        className="rounded-2xl border border-warm-border-light px-4 py-2 text-xs font-bold hover:bg-warm-sidebar-item-active dark:border-white/10 dark:hover:bg-white/10"
                                    >
                                        Mettre à jour la licence
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CACHE LOCAL */}
                    {activeTab === 'cache' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            <div>
                                <h3 className="text-lg font-semibold tracking-tight mb-1">Cache local</h3>
                                <p className="text-sm text-warm-text-secondary-light dark:text-warm-text-secondary-dark">Consultez et nettoyez les fichiers stockés dans AppData.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {[
                                    ['Total', formatBytes(totalCacheSize)],
                                    ['Pièces jointes', formatBytes(cacheStats.attachments)],
                                    ['Polices', formatBytes(cacheStats.fonts)],
                                ].map(([label, value]) => (
                                    <div key={label} className="rounded-2xl border border-warm-border-light dark:border-warm-border-dark bg-warm-card-light dark:bg-warm-card-dark p-4">
                                        <p className="text-[11px] font-semibold text-warm-text-muted-light">{label}</p>
                                        <p className="mt-2 text-lg font-semibold">{value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="rounded-2xl border border-warm-border-light dark:border-warm-border-dark bg-warm-card-light dark:bg-warm-card-dark p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold">Nettoyer les pièces jointes locales</p>
                                    <p className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">Les notes restent en place, seuls les fichiers copiés localement sont supprimés.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleClearAttachmentCache}
                                    className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-300 hover:bg-red-500/15"
                                >
                                    Nettoyer
                                </button>
                            </div>
                        </div>
                    )}

                    {/* À PROPOS */}
                    {activeTab === 'about' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            <div>
                                <h3 className="text-lg font-semibold tracking-tight mb-1">{t('settings.about', 'À propos')}</h3>
                                <p className="text-sm text-warm-text-secondary-light dark:text-warm-text-secondary-dark">Informations techniques de version et d'assistance.</p>
                            </div>

                            <div className="overflow-hidden rounded-3xl border border-warm-border-light bg-warm-card-light dark:border-white/10 dark:bg-[#20201f]">
                                <div className="flex items-start justify-between gap-6 border-b border-warm-border-light bg-gradient-to-br from-white to-warm-sidebar-light p-6 dark:border-white/10 dark:from-white/[0.08] dark:to-transparent">
                                    <div>
                                        <span className="mb-3 inline-flex items-center gap-2 rounded-lg border border-teal-500/25 bg-teal-500/10 px-2.5 py-1 text-[11px] font-semibold text-teal-700 dark:text-teal-200">
                                            <IconDocument className="h-3.5 w-3.5" />
                                            Notes desktop locales
                                        </span>
                                        <h4 className="text-xl font-semibold tracking-tight">Fiip Desktop</h4>
                                        <p className="mt-2 text-sm leading-6 text-warm-text-secondary-light dark:text-warm-text-secondary-dark">
                                            Application de notes locale, synchronisable et assistée par Dexter.
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-warm-border-light dark:border-warm-border-dark bg-white/70 dark:bg-white/[0.05] px-4 py-3 text-right">
                                        <p className="text-[11px] font-semibold text-warm-text-muted-light">Version</p>
                                        <p className="text-sm font-bold">{appVersion || '3.0.1'}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2">
                                    <div className="border-b border-r border-warm-border-light p-4 dark:border-white/10">
                                        <p className="text-[11px] font-semibold text-warm-text-muted-light">Plateforme</p>
                                        <p className="mt-1 text-sm font-semibold">{platformName || 'Desktop'}</p>
                                    </div>
                                    <div className="border-b border-warm-border-light p-4 dark:border-white/10">
                                        <p className="text-[11px] font-semibold text-warm-text-muted-light">Support</p>
                                        <p className="mt-1 text-sm font-semibold">darkii_fr@hotmail.com</p>
                                    </div>
                                </div>

                                <div className="grid gap-3 p-4 md:grid-cols-2">
                                    <div className="rounded-2xl border border-warm-border-light p-4 dark:border-white/10">
                                        <IconCheck className="mb-3 h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                                        <p className="text-sm font-semibold">Confidentialité</p>
                                        <p className="mt-2 text-sm leading-6 text-warm-text-secondary-light dark:text-warm-text-secondary-dark">Vos notes restent locales tant que vous ne choisissez pas la synchronisation ou un lien public.</p>
                                    </div>
                                    <div className="rounded-2xl border border-warm-border-light p-4 dark:border-white/10">
                                        <IconSettings className="mb-3 h-5 w-5 text-blue-600 dark:text-blue-300" />
                                        <p className="text-sm font-semibold">Confidentialite et synchro</p>
                                        <p className="mt-2 text-sm leading-6 text-warm-text-secondary-light dark:text-warm-text-secondary-dark">Les notes restent locales par defaut, les liens publics sont explicites et Supabase applique les politiques RLS.</p>
                                    </div>
                                </div>

                                <div className="m-4 mt-0 flex items-center justify-between rounded-2xl border border-warm-border-light p-4 dark:border-white/10">
                                    <div>
                                        <p className="text-sm font-semibold">Mises à jour</p>
                                        <p className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">{pendingUpdatesCount > 0 ? `${pendingUpdatesCount} changement(s) prêt(s)` : updateStatus}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCheckUpdates}
                                        className="rounded-2xl bg-zinc-950 px-4 py-2 text-xs font-bold text-white dark:bg-white dark:text-zinc-950"
                                    >
                                        Vérifier les mises à jour
                                    </button>
                                </div>

                                <div className="grid gap-2 p-4 pt-0 md:grid-cols-2">
                                    <button onClick={() => open('https://github.com/darkiifr/Fiip')} className="rounded-2xl border border-warm-border-light px-4 py-3 text-left text-xs font-bold hover:bg-warm-sidebar-item-active dark:border-white/10 dark:hover:bg-white/10">
                                        Code source et versions
                                    </button>
                                    <button onClick={() => open('mailto:darkii_fr@hotmail.com')} className="rounded-2xl border border-warm-border-light px-4 py-3 text-left text-xs font-bold hover:bg-warm-sidebar-item-active dark:border-white/10 dark:hover:bg-white/10">
                                        Support du projet
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
