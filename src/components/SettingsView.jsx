import { getVersion } from '@tauri-apps/api/app';
import { ask, message } from '@tauri-apps/plugin-dialog';
import { relaunch } from '@tauri-apps/plugin-process';
import { open } from '@tauri-apps/plugin-shell';
import { check } from '@tauri-apps/plugin-updater';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useUI } from '../providers/UIProvider';
import { FIIP_LICENSE_PURCHASE_URL } from '../config/links';
import { getLastAIUsageStats, subscribeToAIUsage } from '../services/ai';
import { clearAttachmentCache, formatBytes, getAttachmentCacheSize } from '../services/attachmentCache';
import {
    clearBiometricLock,
    enrollBiometricLock,
    getBiometricPlatformInfo,
    isBiometricApiAvailable,
} from '../services/biometricLock';
import { getFontCacheSize } from '../services/fontStore';
import { keyAuthService } from '../services/keyauth';
import { getLanguageOption, getLocalizedLanguageLabel, LANGUAGES } from '../services/languages';
import { getPlatformDisplayName } from '../services/platform';
import { authService } from '../services/supabase';
import { fetchGitHubLatestRelease, getUpdatePresentation } from '../services/updates';
import { coerceWindowEffect, getWindowEffectOptions } from '../utils/windowEffects';

import FontManager from './FontManager';
import NucleoFlag from './NucleoFlag';
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
    const [, setAudioDevices] = useState({ inputs: [], outputs: [] });
    const [platformName, setPlatformName] = useState('');
    const [appVersion, setAppVersion] = useState('');
    const [, setVoices] = useState([]);
    const [pendingUpdatesCount, setPendingUpdatesCount] = useState(0);
    const [currentUser, setCurrentUser] = useState(null);
    const [lastSyncAt, setLastSyncAt] = useState(() => localStorage.getItem('fiip-last-sync-at') || '');
    const [aiUsage, setAiUsage] = useState(() => getLastAIUsageStats());
    const [cacheStats, setCacheStats] = useState({ attachments: 0, fonts: 0 });
    const [updateStatus, setUpdateStatus] = useState(() => t('settings.update_not_checked', 'Not checked'));
    const [updateInfo, setUpdateInfo] = useState(null);
    const [availableUpdate, setAvailableUpdate] = useState(null);
    const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);
    const [biometricStatus, setBiometricStatus] = useState('');
    const [biometricAvailable, setBiometricAvailable] = useState(false);

    const languages = LANGUAGES;
    const selectedLanguage = getLanguageOption(localSettings.language || i18n.language);

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
        setBiometricAvailable(isBiometricApiAvailable());

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
    const currentLicenseName = keyAuthService.isAuthenticated ? keyAuthService.getCurrentSubscriptionName() : t('settings.no_active_license', 'No active license');
    const windowEffectOptions = getWindowEffectOptions(osType);
    const biometricInfo = getBiometricPlatformInfo(osType);

    const handleClearAttachmentCache = async () => {
        await clearAttachmentCache();
        setCacheStats((stats) => ({ ...stats, attachments: 0 }));
    };

    const handleCheckUpdates = async () => {
        setUpdateStatus(t('settings.checking', 'Checking...'));
        setUpdateInfo(null);
        setAvailableUpdate(null);
        const githubReleasePromise = fetchGitHubLatestRelease().catch((error) => {
            console.warn('GitHub release lookup failed:', error);
            return null;
        });
        if (!window.__TAURI_INTERNALS__) {
            const githubRelease = await githubReleasePromise;
            setUpdateInfo(getUpdatePresentation(null, githubRelease));
            setUpdateStatus(githubRelease ? t('settings.github_latest_version', 'Latest GitHub version: {{version}}', { version: githubRelease.tag_name }) : t('settings.github_versions_available', 'GitHub versions available'));
            return;
        }
        try {
            const update = await check();
            const githubRelease = await githubReleasePromise;
            if (update?.available) {
                setUpdateStatus(t('settings.update_version_available', 'Version {{version}} available', { version: update.version }));
                setAvailableUpdate(update);
                setUpdateInfo(getUpdatePresentation(update, githubRelease));
            } else {
                setUpdateStatus(t('settings.up_to_date_version', 'Up to date ({{version}})', { version: appVersion || t('settings.current_version_label', 'current version') }));
                setUpdateInfo(getUpdatePresentation(null, githubRelease));
            }
        } catch (error) {
            setUpdateStatus(error?.message || t('settings.update_check_unavailable', 'Update check unavailable'));
        }
    };

    const handleInstallUpdate = async () => {
        if (!availableUpdate) return;
        const confirmed = await ask(
            t('settings.update_install_confirm', 'Install Fiip {{version}} now? The app will restart after installation.', { version: availableUpdate.version }),
            { title: t('settings.update_dialog_title', 'Fiip update'), kind: 'info' }
        ).catch(() => false);
        if (!confirmed) return;
        try {
            setIsInstallingUpdate(true);
            setUpdateStatus(t('settings.downloading_installing', 'Downloading and installing...'));
            await availableUpdate.downloadAndInstall();
            await relaunch();
        } catch (error) {
            setUpdateStatus(error?.message || t('settings.install_unavailable', 'Installation unavailable'));
            await message(error?.message || t('settings.install_error_message', 'Unable to install the update.'), { title: 'Fiip', kind: 'error' }).catch(console.error);
        } finally {
            setIsInstallingUpdate(false);
        }
    };

    const handleBiometricToggle = async (enabled) => {
        if (!enabled) {
            clearBiometricLock();
            setBiometricStatus(t('settings.biometric_disabled', 'Biometric lock disabled.'));
            handleUpdate({ ...localSettings, biometricLockEnabled: false });
            return;
        }
        if (!isBiometricApiAvailable()) {
            setBiometricStatus(t('settings.biometric_no_authenticator', 'No compatible local authenticator was detected.'));
            return;
        }
        try {
            setBiometricStatus(t('settings.biometric_setup_progress', 'Setting up...'));
            await enrollBiometricLock();
            setBiometricStatus(t('settings.biometric_enabled', '{{method}} enabled.', { method: biometricInfo.name }));
            handleUpdate({ ...localSettings, biometricLockEnabled: true });
        } catch (error) {
            setBiometricStatus(error?.message || t('settings.biometric_setup_error', 'Biometric setup is unavailable.'));
        }
    };

    return (
        <div className="fiip-light-settings-view flex-1 flex h-full overflow-hidden bg-warm-bg-light dark:bg-warm-bg-dark text-warm-text-primary-light dark:text-warm-text-primary-dark">
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
                        { id: 'premium', label: t('settings.premium', 'Fiip Premium'), icon: IconKey },
                        { id: 'cache', label: t('settings.cache_local', 'Local cache'), icon: IconDownload },
                        { id: 'about', label: t('settings.about', 'À propos'), icon: IconInfo }
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`fiip-light-settings-tab w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                                    active 
                                        ? 'fiip-light-settings-tab-active bg-warm-sidebar-item-active dark:bg-warm-sidebar-item-active text-warm-text-primary-light dark:text-warm-text-primary-dark font-semibold' 
                                        : 'text-warm-text-secondary-light dark:text-warm-text-secondary-dark hover:bg-warm-sidebar-item-active/50 dark:hover:bg-warm-sidebar-item-active/30'
                                }`}
                            >
                                <Icon className={`fiip-light-settings-tab-icon w-4 h-4 ${active ? 'text-warm-text-primary-light dark:text-warm-text-primary-dark' : 'text-warm-text-muted-light dark:text-warm-text-muted-dark'}`} />
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
                                <h3 className="fiip-light-settings-heading text-lg font-semibold tracking-tight mb-1">{t('settings.general', 'Général')}</h3>
                                <p className="text-sm text-warm-text-secondary-light dark:text-warm-text-secondary-dark">{t('settings.general_desc', 'Manage language and basic system preferences.')}</p>
                            </div>

                            {/* Langue */}
                            <div className="bg-warm-card-light dark:bg-warm-card-dark border border-warm-border-light dark:border-warm-border-dark rounded-2xl p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <label className="text-sm font-semibold">{t('settings.language', "Langue de l'application")}</label>
                                        <p className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">{t('settings.language_desc', 'Choose the interface language.')}</p>
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
                                                    <NucleoFlag language={selectedLanguage} className="h-5 w-5 shrink-0 rounded-[4px]" />
                                                    <span className="truncate font-semibold">{getLocalizedLanguageLabel(selectedLanguage, i18n.language)}</span>
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[360px] rounded-xl shadow-lg mt-1 p-1">
                                                <SelectGroup>
                                                    {languages.map((l) => (
                                                        <SelectItem key={l.code} value={l.code} className="min-h-9 px-3 py-2 rounded-lg text-sm cursor-pointer">
                                                            <span className="inline-flex items-center gap-3">
                                                                <NucleoFlag language={l} className="h-5 w-5 shrink-0 rounded-[4px]" />
                                                                <span className="flex min-w-0 flex-col leading-tight">
                                                                    <span className="truncate font-semibold">{getLocalizedLanguageLabel(l, i18n.language)}</span>
                                                                    {l.nativeLabel !== l.label ? (
                                                                        <span className="truncate text-[11px] font-medium text-warm-text-muted-light dark:text-warm-text-muted-dark">{l.nativeLabel}</span>
                                                                    ) : null}
                                                                </span>
                                                            </span>
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
                                        <p className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">{t('settings.app_sounds_desc', 'Play sounds for clicks and transitions.')}</p>
                                    </div>
                                    <GlassSwitch
                                        checked={localSettings.appSound !== false}
                                        onCheckedChange={(checked) => handleUpdate({ ...localSettings, appSound: checked })}
                                    />
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-warm-border-light dark:border-warm-border-dark">
                                    <div className="space-y-0.5">
                                        <span className="text-sm font-semibold">{t('settings.chat_sounds', "Notifications du chat")}</span>
                                        <p className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">{t('settings.chat_sounds_desc', 'Play a sound when Dexter sends a message.')}</p>
                                    </div>
                                    <GlassSwitch
                                        checked={localSettings.chatSound !== false}
                                        onCheckedChange={(checked) => handleUpdate({ ...localSettings, chatSound: checked })}
                                    />
                                </div>
                            </div>

                            <div className="bg-warm-card-light dark:bg-warm-card-dark border border-warm-border-light dark:border-warm-border-dark rounded-2xl p-4 space-y-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <span className="text-sm font-semibold">{t('settings.biometric_lock_title', 'Biometric lock')}</span>
                                        <p className="text-xs leading-5 text-warm-text-muted-light dark:text-warm-text-muted-dark">
                                            {biometricInfo.description}
                                        </p>
                                        <p className="text-xs font-semibold text-warm-text-secondary-light dark:text-warm-text-secondary-dark">
                                            {t('settings.biometric_method', 'Method')}: {biometricInfo.name}
                                        </p>
                                    </div>
                                    <GlassSwitch
                                        checked={localSettings.biometricLockEnabled === true}
                                        onCheckedChange={handleBiometricToggle}
                                        disabled={!biometricAvailable}
                                    />
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-warm-border-light pt-3 dark:border-warm-border-dark">
                                    <p className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">
                                        {biometricAvailable ? (biometricStatus || t('settings.biometric_available', 'Available on this device.')) : t('settings.biometric_unavailable', 'Unavailable in this WebView or on this device.')}
                                    </p>
                                    <button
                                        type="button"
                                        disabled={localSettings.biometricLockEnabled !== true}
                                        onClick={() => window.dispatchEvent(new Event('fiip-lock-now'))}
                                        className="rounded-xl border border-warm-border-light px-3 py-2 text-xs font-bold hover:bg-warm-sidebar-item-active disabled:cursor-not-allowed disabled:opacity-40 dark:border-warm-border-dark dark:hover:bg-white/10"
                                    >
                                        {t('settings.lock_now', 'Lock now')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* APPARENCE */}
                    {activeTab === 'appearance' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            <div>
                                <h3 className="fiip-light-settings-heading text-lg font-semibold tracking-tight mb-1">{t('settings.appearance', 'Apparence')}</h3>
                                <p className="text-sm text-warm-text-secondary-light dark:text-warm-text-secondary-dark">{t('settings.appearance_desc', 'Customize the visual style of the app.')}</p>
                            </div>

                            {/* Thème segmented picker */}
                            <div className="bg-warm-card-light dark:bg-warm-card-dark border border-warm-border-light dark:border-warm-border-dark rounded-2xl p-4 space-y-4">
                                <label className="text-sm font-semibold block">{t('settings.ui_theme', 'Thème de couleur')}</label>
                                <div className="bg-warm-sidebar-light dark:bg-warm-sidebar-dark rounded-xl p-1 flex gap-1 border border-warm-border-light dark:border-warm-border-dark">
                                    {[
                                        { id: 'light', label: t('settings.theme_light', 'Light') },
                                        { id: 'dark', label: t('settings.theme_dark', 'Dark') },
                                        { id: 'system', label: t('settings.theme_system', 'System') }
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
                                            title={effect.supported ? undefined : t('settings.unavailable_os', 'Unavailable on this OS')}
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
                                <h3 className="fiip-light-settings-heading text-lg font-semibold tracking-tight mb-1">{t('settings.editor', 'Éditeur')}</h3>
                                <p className="text-sm text-warm-text-secondary-light dark:text-warm-text-secondary-dark">{t('settings.editor_desc', 'Adjust writing options.')}</p>
                            </div>

                            <div className="bg-warm-card-light dark:bg-warm-card-dark border border-warm-border-light dark:border-warm-border-dark rounded-2xl p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <span className="text-sm font-semibold">{t('settings.auto_save', 'Auto-save')}</span>
                                        <p className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">{t('settings.auto_save_desc', 'Save changes instantly in the background.')}</p>
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
                                <h3 className="fiip-light-settings-heading text-lg font-semibold tracking-tight mb-1">{t('settings.cloud_sync_title', 'Synchronisation Cloud')}</h3>
                                <p className="text-sm text-warm-text-secondary-light dark:text-warm-text-secondary-dark">{t('settings.cloud_sync_header_desc', 'Manage cloud data replication and multi-device storage.')}</p>
                            </div>

                            <div className={`bg-warm-card-light dark:bg-warm-card-dark border border-warm-border-light dark:border-warm-border-dark rounded-2xl p-4 space-y-4 ${!syncAvailable ? 'opacity-70 grayscale-[0.35]' : ''}`}>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <span className="text-sm font-semibold flex items-center gap-2">
                                            <IconCloud className={`w-4 h-4 ${syncAvailable ? 'text-blue-500' : 'text-warm-text-muted-light'}`} />
                                            {t('settings.cloud_sync_toggle', 'Activer la Synchronisation Cloud')}
                                        </span>
                                        <p className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">
                                            {syncAvailable ? t('settings.cloud_sync_enabled_desc', 'Your notes are synced securely with the cloud.') : t('settings.cloud_sync_login_desc', 'Connect a cloud account to enable sync.')}
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
                                                <span className="text-warm-text-muted-light dark:text-warm-text-muted-dark">{t('settings.last_sync', 'Last sync')}</span>
                                                <span className="font-semibold text-warm-text-secondary-light dark:text-warm-text-secondary-dark">
                                                    {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : t('settings.never', 'Never')}
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
                                                        {formatBytes(storageUsage.used || 0)} / {storageLimit ? formatBytes(storageLimit) : t('settings.unknown_limit', 'unknown limit')}
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
                                                <span>{t('settings.pending_sync_changes', '{{count}} pending sync change(s)...', { count: pendingUpdatesCount })}</span>
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
                                                    {t('settings.sync_now', 'Sync now')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {!syncAvailable && (
                                    <div className="mt-4 rounded-xl border border-dashed border-warm-border-light dark:border-warm-border-dark p-4 text-xs text-warm-text-secondary-light dark:text-warm-text-secondary-dark">
                                        {t('settings.local_sync_only', 'Sync remains local until a valid cloud account is connected.')}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* INTEL ARTIF */}
                    {activeTab === 'ai' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            <div>
                                <h3 className="fiip-light-settings-heading text-lg font-semibold tracking-tight mb-1">{t('settings.ai_title', 'Intelligence Artificielle')}</h3>
                                <p className="text-sm text-warm-text-secondary-light dark:text-warm-text-secondary-dark">{t('settings.ai_desc', 'Configure Dexter, the assistant that helps write, summarize, and clarify your notes.')}</p>
                            </div>

                            <div className="overflow-hidden rounded-3xl border border-warm-border-light bg-warm-card-light dark:border-white/10 dark:bg-warm-card-dark">
                                <div className="flex flex-col gap-4 border-b border-warm-border-light p-5 dark:border-white/10 md:flex-row md:items-center md:justify-between">
                                    <div className="space-y-0.5">
                                        <span className="flex items-center gap-2 text-sm font-semibold">
                                            <IconBot className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                                            {t('settings.ai_toggle', "Activer l'assistant intelligent")}
                                        </span>
                                        <p className="max-w-xl text-sm leading-6 text-warm-text-secondary-light dark:text-warm-text-secondary-dark">
                                            {t('settings.ai_enabled_desc', 'When Dexter is active, you can open the assistant panel, rephrase a note, summarize a passage, or request a text structure.')}
                                        </p>
                                    </div>
                                    <GlassSwitch
                                        checked={localSettings.aiEnabled !== false}
                                        onCheckedChange={(checked) => handleUpdate({ ...localSettings, aiEnabled: checked })}
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
                                    <div className="rounded-2xl border border-warm-border-light bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                                        <p className="text-xs font-bold uppercase text-warm-text-muted-light dark:text-warm-text-muted-dark">{t('settings.ai_capabilities_title', 'What Dexter can do')}</p>
                                        <p className="mt-2 text-sm font-semibold">{t('settings.ai_capabilities_subtitle', 'Write faster without leaving the note')}</p>
                                        <p className="mt-1 text-xs leading-5 text-warm-text-muted-light dark:text-warm-text-muted-dark">
                                            {t('settings.ai_capabilities_desc', 'Summaries, correction, outlines, rephrasing, and draft help are available from the editor.')}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-warm-border-light bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                                        <p className="text-xs font-bold uppercase text-warm-text-muted-light dark:text-warm-text-muted-dark">{t('settings.ai_availability_title', 'Availability')}</p>
                                        <p className="mt-2 text-sm font-semibold">{keyAuthService.hasAIAccess() ? t('settings.available', 'Available') : t('settings.license_required', 'License required')}</p>
                                        <p className="mt-1 text-xs leading-5 text-warm-text-muted-light dark:text-warm-text-muted-dark">
                                            {t('settings.ai_access_desc', 'Fiip manages access automatically. No technical key is requested in the app.')}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-warm-border-light bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                                        <p className="text-xs font-bold uppercase text-warm-text-muted-light dark:text-warm-text-muted-dark">{t('settings.privacy_title', 'Privacy')}</p>
                                        <p className="mt-2 text-sm font-semibold">{t('settings.ai_privacy_subtitle', 'You choose when to use it')}</p>
                                        <p className="mt-1 text-xs leading-5 text-warm-text-muted-light dark:text-warm-text-muted-dark">
                                            {t('settings.ai_privacy_desc', 'Dexter does not activate by itself. Send only the text you select or the request you write.')}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-warm-border-light bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                                        <p className="text-xs font-bold uppercase text-warm-text-muted-light dark:text-warm-text-muted-dark">{t('settings.last_response', 'Last response')}</p>
                                        <p className="mt-2 flex items-center gap-2 text-sm font-semibold">
                                            <IconCpu className="h-4 w-4 text-amber-500" />
                                            {aiUsage?.usage?.total_tokens ?? aiUsage?.usage?.tokens ?? 0} tokens
                                        </p>
                                        <p className="mt-1 text-xs leading-5 text-warm-text-muted-light dark:text-warm-text-muted-dark">
                                            {aiUsage?.createdAt ? t('settings.last_activity', 'Last activity: {{date}}', { date: new Date(aiUsage.createdAt).toLocaleString() }) : t('settings.ai_stats_waiting', 'Statistics appear after a Dexter response.')}
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
                                <h3 className="fiip-light-settings-heading text-lg font-semibold tracking-tight mb-1">{t('settings.premium', 'Fiip Premium')}</h3>
                                <p className="text-sm text-warm-text-secondary-light dark:text-warm-text-secondary-dark">{t('settings.premium_desc', 'Account, official license, and multi-device sync.')}</p>
                            </div>

                            <div className="rounded-3xl border border-amber-500/20 bg-warm-card-light p-6 shadow-sm dark:bg-white/[0.045]">
                                <div className="flex items-start justify-between gap-6">
                                    <div className="space-y-3">
                                        <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                                            <IconKey className="h-3.5 w-3.5" />
                                            {t('settings.license_provider_badge', 'Official license')}
                                        </span>
                                        <h4 className="text-xl font-semibold tracking-tight">{t('settings.fiip_license_title', 'Your Fiip license')}</h4>
                                        <p className="max-w-md text-sm leading-6 text-warm-text-secondary-light dark:text-warm-text-secondary-dark">
                                            {t('settings.fiip_license_desc', 'Enable sync, extended limits, and Dexter without entering any technical key.')}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-warm-border-light bg-white/70 px-4 py-3 text-right dark:border-white/10 dark:bg-white/[0.06]">
                                        <p className="text-[11px] font-semibold text-warm-text-muted-light">{t('settings.current_license', 'Current license')}</p>
                                        <p className="mt-1 text-sm font-semibold">{currentLicenseName}</p>
                                    </div>
                                </div>
                                <div className="mt-5 flex flex-wrap gap-2 border-t border-warm-border-light pt-4 dark:border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => open(FIIP_LICENSE_PURCHASE_URL)}
                                        className="rounded-2xl bg-zinc-950 px-4 py-2 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 dark:bg-white dark:text-zinc-950"
                                    >
                                        {t('settings.buy_license', 'Buy a license')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => open(FIIP_LICENSE_PURCHASE_URL)}
                                        className="rounded-2xl border border-warm-border-light px-4 py-2 text-xs font-bold hover:bg-warm-sidebar-item-active dark:border-white/10 dark:hover:bg-white/10"
                                    >
                                        {t('settings.update_license', 'Update license')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CACHE LOCAL */}
                    {activeTab === 'cache' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            <div>
                                <h3 className="fiip-light-settings-heading text-lg font-semibold tracking-tight mb-1">{t('settings.cache_local', 'Local cache')}</h3>
                                <p className="text-sm text-warm-text-secondary-light dark:text-warm-text-secondary-dark">{t('settings.cache_local_desc', 'Review and clean files stored locally.')}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {[
                                    [t('settings.total', 'Total'), formatBytes(totalCacheSize)],
                                    [t('settings.attachments', 'Attachments'), formatBytes(cacheStats.attachments)],
                                    [t('settings.fonts', 'Fonts'), formatBytes(cacheStats.fonts)],
                                ].map(([label, value]) => (
                                    <div key={label} className="rounded-2xl border border-warm-border-light dark:border-warm-border-dark bg-warm-card-light dark:bg-warm-card-dark p-4">
                                        <p className="text-[11px] font-semibold text-warm-text-muted-light">{label}</p>
                                        <p className="mt-2 text-lg font-semibold">{value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="rounded-2xl border border-warm-border-light dark:border-warm-border-dark bg-warm-card-light dark:bg-warm-card-dark p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold">{t('settings.clean_local_attachments', 'Clean local attachments')}</p>
                                    <p className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">{t('settings.clean_local_attachments_desc', 'Notes remain in place; only locally copied files are removed.')}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleClearAttachmentCache}
                                    className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-300 hover:bg-red-500/15"
                                >
                                    {t('settings.clean', 'Clean')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* À PROPOS */}
                    {activeTab === 'about' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            <div>
                                <h3 className="fiip-light-settings-heading text-lg font-semibold tracking-tight mb-1">{t('settings.about', 'À propos')}</h3>
                                <p className="text-sm text-warm-text-secondary-light dark:text-warm-text-secondary-dark">{t('settings.about_desc', 'Find app status, useful links, and support information.')}</p>
                            </div>

                            <div className="overflow-hidden rounded-3xl border border-warm-border-light bg-warm-card-light dark:border-white/10 dark:bg-[#20201f]">
                                <div className="flex items-start justify-between gap-6 border-b border-warm-border-light bg-gradient-to-br from-white to-warm-sidebar-light p-6 dark:border-white/10 dark:from-white/[0.08] dark:to-transparent">
                                    <div>
                                        <span className="mb-3 inline-flex items-center gap-2 rounded-lg border border-teal-500/25 bg-teal-500/10 px-2.5 py-1 text-[11px] font-semibold text-teal-700 dark:text-teal-200">
                                            <IconDocument className="h-3.5 w-3.5" />
                                            {t('settings.fiip_app_badge', 'Fiip app')}
                                        </span>
                                        <h4 className="text-xl font-semibold tracking-tight">Fiip Desktop</h4>
                                        <p className="mt-2 text-sm leading-6 text-warm-text-secondary-light dark:text-warm-text-secondary-dark">
                                            {t('settings.fiip_desktop_desc', 'A local-first notes space with optional sync, controlled public links, and Dexter assistant.')}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-warm-border-light dark:border-warm-border-dark bg-white/70 dark:bg-white/[0.05] px-4 py-3 text-right">
                                        <p className="text-[11px] font-semibold text-warm-text-muted-light">{t('settings.version', 'Version')}</p>
                                        <p className="text-sm font-bold">{appVersion || '3.0.1'}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2">
                                    <div className="border-b border-r border-warm-border-light p-4 dark:border-white/10">
                                        <p className="text-[11px] font-semibold text-warm-text-muted-light">{t('settings.platform', 'Platform')}</p>
                                        <p className="mt-1 text-sm font-semibold">{platformName || 'Desktop'}</p>
                                    </div>
                                    <div className="border-b border-warm-border-light p-4 dark:border-white/10">
                                        <p className="text-[11px] font-semibold text-warm-text-muted-light">{t('settings.connected_account', 'Connected account')}</p>
                                        <p className="mt-1 text-sm font-semibold">{currentUser?.email || t('settings.no_connected_account', 'No connected account')}</p>
                                    </div>
                                </div>

                                <div className="grid gap-3 p-4 md:grid-cols-2">
                                    <div className="rounded-2xl border border-warm-border-light p-4 dark:border-white/10">
                                        <IconCheck className="mb-3 h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                                        <p className="text-sm font-semibold">{t('settings.data_privacy_title', 'Data and privacy')}</p>
                                        <p className="mt-2 text-sm leading-6 text-warm-text-secondary-light dark:text-warm-text-secondary-dark">{t('settings.data_privacy_desc', 'Your notes stay on this device by default. Sync and publishing are explicit actions.')}</p>
                                    </div>
                                    <div className="rounded-2xl border border-warm-border-light p-4 dark:border-white/10">
                                        <IconSettings className="mb-3 h-5 w-5 text-blue-600 dark:text-blue-300" />
                                        <p className="text-sm font-semibold">{t('settings.sync', 'Sync')}</p>
                                        <p className="mt-2 text-sm leading-6 text-warm-text-secondary-light dark:text-warm-text-secondary-dark">{t('settings.cloud_security_desc', 'When enabled, the cloud protects data with project access rules.')}</p>
                                    </div>
                                </div>

                                <div className="m-4 mt-0 rounded-2xl border border-warm-border-light p-4 dark:border-white/10">
                                    <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-semibold">{t('settings.updates', 'Updates')}</p>
                                        <p className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">{pendingUpdatesCount > 0 ? t('settings.ready_changes', '{{count}} change(s) ready', { count: pendingUpdatesCount }) : updateStatus}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={handleCheckUpdates}
                                            className="fiip-light-settings-update-button rounded-2xl bg-zinc-950 px-4 py-2 text-xs font-bold text-white dark:bg-white dark:text-zinc-950"
                                        >
                                            {t('settings.check_update', 'Check for updates')}
                                        </button>
                                        {availableUpdate && (
                                            <button
                                                type="button"
                                                disabled={isInstallingUpdate}
                                                onClick={handleInstallUpdate}
                                                className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:cursor-wait disabled:opacity-70"
                                            >
                                                {isInstallingUpdate ? t('settings.installing', 'Installing...') : t('settings.install', 'Install')}
                                            </button>
                                        )}
                                    </div>
                                    </div>
                                    {updateInfo && (
                                        <div className="mt-4 rounded-2xl border border-warm-border-light bg-warm-sidebar-light/60 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-xs font-bold uppercase text-warm-text-muted-light dark:text-warm-text-muted-dark">
                                                    {t('settings.changelog', 'Changelog')} {updateInfo.version ? `v${updateInfo.version}` : ''}
                                                </p>
                                                {updateInfo.releaseUrl && (
                                                    <button
                                                        type="button"
                                                        onClick={() => open(updateInfo.releaseUrl)}
                                                        className="text-xs font-bold text-amber-700 hover:underline dark:text-amber-300"
                                                    >
                                                        {t('settings.view_on_github', 'View on GitHub')}
                                                    </button>
                                                )}
                                            </div>
                                            <pre className="mt-3 max-h-52 whitespace-pre-wrap overflow-auto rounded-xl bg-white/70 p-3 text-xs leading-5 text-warm-text-secondary-light dark:bg-black/20 dark:text-warm-text-secondary-dark">
                                                {updateInfo.changelog}
                                            </pre>
                                        </div>
                                    )}
                                </div>

                                <div className="grid gap-2 p-4 pt-0 md:grid-cols-2">
                                    <button onClick={() => open('https://github.com/darkiifr/Fiip')} className="rounded-2xl border border-warm-border-light px-4 py-3 text-left text-xs font-bold hover:bg-warm-sidebar-item-active dark:border-white/10 dark:hover:bg-white/10">
                                        {t('settings.source_and_versions', 'Source code and versions')}
                                    </button>
                                    <button onClick={() => open('mailto:darkii_fr@hotmail.com')} className="rounded-2xl border border-warm-border-light px-4 py-3 text-left text-xs font-bold hover:bg-warm-sidebar-item-active dark:border-white/10 dark:hover:bg-white/10">
                                        {t('settings.contact_support', 'Contact support')}
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
