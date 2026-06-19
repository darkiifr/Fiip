import { getVersion } from '@tauri-apps/api/app';
import { type } from '@tauri-apps/plugin-os';
import { relaunch } from '@tauri-apps/plugin-process';
import { open } from '@tauri-apps/plugin-shell';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useUI } from '../providers/UIProvider';
import { keyAuthService } from '../services/keyauth';
import { getPlatformDisplayName } from '../services/platform';

import FontManager from './FontManager';
import CustomSelect from './CustomSelect';
import { GlassSwitch } from './ui/GlassSwitch';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from './ui/Select';

// Icons Import
import IconArrowRight from '~icons/mingcute/arrow-right-fill';
import IconCheck from '~icons/mingcute/check-fill';
import IconCpu from '~icons/mingcute/chip-fill';
import IconClose from '~icons/mingcute/close-fill';
import IconCloud from '~icons/mingcute/cloud-fill';
import IconDownload from '~icons/mingcute/download-2-fill';
import IconGlobe from '~icons/mingcute/earth-2-fill';
import IconFontSize from '~icons/mingcute/font-size-fill';
import IconMessage from '~icons/mingcute/message-3-fill';
import IconMic from '~icons/mingcute/mic-fill';
import IconRefresh from '~icons/mingcute/refresh-3-fill';
import IconBot from '~icons/mingcute/robot-fill';
import IconSparkles from '~icons/mingcute/sparkles-fill';
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
    onBack
}) {
    const { t, i18n } = useTranslation();
    const { theme: uiTheme, setTheme: setUiTheme } = useUI();
    const [activeTab, setActiveTab] = useState('general');
    const [localSettings, setLocalSettings] = useState(settings);
    const [audioDevices, setAudioDevices] = useState({ inputs: [], outputs: [] });
    const [platformName, setPlatformName] = useState('');
    const [appVersion, setAppVersion] = useState('');
    const [voices, setVoices] = useState([]);
    const [isLinux, setIsLinux] = useState(false);
    const [pendingUpdatesCount, setPendingUpdatesCount] = useState(0);

    const languages = [
        { code: 'fr', label: 'Français', flag: '🇫🇷' },
        { code: 'en', label: 'English', flag: '🇺🇸' },
        { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
        { code: 'es', label: 'Español', flag: '🇪🇸' },
        { code: 'it', label: 'Italiano', flag: '🇮🇹' },
        { code: 'pt', label: 'Português', flag: '🇵🇹' },
        { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
        { code: 'ru', label: 'Русский', flag: '🇷🇺' },
        { code: 'ja', label: '日本語', flag: '🇯🇵' },
    ].sort((a, b) => a.label.localeCompare(b.label));

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    useEffect(() => {
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

        return () => clearInterval(interval);
    }, []);

    const handleUpdate = (newSettings) => {
        setLocalSettings(newSettings);
        onUpdateSettings(newSettings);
    };

    const handleRestart = async () => {
        try {
            await relaunch();
        } catch (error) {
            console.error('Failed to relaunch:', error);
            alert('Échec du redémarrage : ' + error.message);
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
                                <h3 className="text-xl font-bold tracking-tight mb-1">{t('settings.general', 'Général')}</h3>
                                <p className="text-sm text-warm-text-secondary-light dark:text-warm-text-secondary-dark">Gérez la langue et les préférences système de base.</p>
                            </div>

                            {/* Langue */}
                            <div className="bg-warm-card-light dark:bg-warm-card-dark border border-warm-border-light dark:border-warm-border-dark rounded-2xl p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <label className="text-sm font-semibold">{t('settings.language', 'Langue de l\'application')}</label>
                                        <p className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">Configurez la langue de l\'interface.</p>
                                    </div>
                                    <div className="w-48">
                                        <Select
                                            value={languages.find(l => l.code === localSettings.language || l.code === i18n.language)?.code || 'fr'}
                                            onValueChange={(code) => {
                                                i18n.changeLanguage(code);
                                                handleUpdate({ ...localSettings, language: code });
                                            }}
                                        >
                                            <SelectTrigger className="w-full bg-white dark:bg-zinc-800 border border-warm-border-light dark:border-warm-border-dark rounded-xl px-3 py-2 text-sm text-left">
                                                <div className="flex items-center gap-2">
                                                    <IconGlobe className="w-4 h-4 text-warm-text-muted-light" />
                                                    <SelectValue />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="bg-white dark:bg-zinc-900 border border-warm-border-light dark:border-warm-border-dark rounded-xl shadow-lg mt-1 p-1">
                                                <SelectGroup>
                                                    {languages.map((l) => (
                                                        <SelectItem key={l.code} value={l.code} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-warm-sidebar-item-active cursor-pointer">
                                                            <span className="shrink-0">{l.flag}</span>
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
                                        <p className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">Jouer un son lors de la réception d\'un message de Dexter.</p>
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
                                <h3 className="text-xl font-bold tracking-tight mb-1">{t('settings.appearance', 'Apparence')}</h3>
                                <p className="text-sm text-warm-text-secondary-light dark:text-warm-text-secondary-dark">Personnalisez le style visuel de l\'application.</p>
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
                                    {t('settings.ui_theme_desc', 'Basculez entre le style mat d\'origine (Acrylic/Mica) et les effets de verre organique dynamic Liquid Glass.')}
                                </p>
                            </div>

                            {/* Window Effects */}
                            <div className="bg-warm-card-light dark:bg-warm-card-dark border border-warm-border-light dark:border-warm-border-dark rounded-2xl p-4 space-y-4">
                                <label className="text-sm font-semibold block">{t('settings.window_effects_title', 'Effets de Transparence')}</label>
                                <div className="bg-warm-sidebar-light dark:bg-warm-sidebar-dark rounded-xl p-1 flex gap-1 border border-warm-border-light dark:border-warm-border-dark">
                                    {['none', 'mica', 'acrylic'].map((effect) => (
                                        <button
                                            key={effect}
                                            onClick={() => handleUpdate({ ...localSettings, windowEffect: effect })}
                                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                                                localSettings.windowEffect === effect
                                                    ? 'bg-white dark:bg-zinc-800 text-warm-text-primary-light dark:text-warm-text-primary-dark shadow-sm border border-warm-border-light dark:border-warm-border-dark'
                                                    : 'text-warm-text-muted-light dark:text-warm-text-muted-dark hover:text-warm-text-primary-light dark:hover:text-warm-text-primary-dark'
                                            }`}
                                        >
                                            {effect === 'none' ? 'Aucun' : effect.charAt(0).toUpperCase() + effect.slice(1)}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">
                                    {t('settings.window_effects_desc', 'Modifie le style de la fenêtre desktop transparente de Tauri.')}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ÉDITEUR */}
                    {activeTab === 'editor' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            <div>
                                <h3 className="text-xl font-bold tracking-tight mb-1">{t('settings.editor', 'Éditeur')}</h3>
                                <p className="text-sm text-warm-text-secondary-light dark:text-warm-text-secondary-dark">Ajustez les options de rédaction et d\'orthographe.</p>
                            </div>

                            {/* Taille de police */}
                            <div className="bg-warm-card-light dark:bg-warm-card-dark border border-warm-border-light dark:border-warm-border-dark rounded-2xl p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <label className="text-sm font-semibold">{t('settings.font_size_label', 'Taille du texte')}</label>
                                        <p className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">Ajuster la taille du texte dans l\'éditeur.</p>
                                    </div>
                                    <div className="w-48">
                                        <Select 
                                            value={localSettings.fontSize || 'normal'}
                                            onValueChange={(val) => handleUpdate({ ...localSettings, fontSize: val })}
                                        >
                                            <SelectTrigger className="w-full bg-white dark:bg-zinc-800 border border-warm-border-light dark:border-warm-border-dark rounded-xl px-3 py-2 text-sm text-left">
                                                <div className="flex items-center gap-2">
                                                    <IconFontSize className="w-4 h-4 text-warm-text-muted-light" />
                                                    <SelectValue />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="bg-white dark:bg-zinc-900 border border-warm-border-light dark:border-warm-border-dark rounded-xl shadow-lg mt-1 p-1">
                                                <SelectGroup>
                                                    <SelectItem value="small" className="px-3 py-2 rounded-lg text-sm hover:bg-warm-sidebar-item-active cursor-pointer">{t('settings.font_size_small', 'Petite')}</SelectItem>
                                                    <SelectItem value="normal" className="px-3 py-2 rounded-lg text-sm hover:bg-warm-sidebar-item-active cursor-pointer">{t('settings.font_size_normal', 'Normale')}</SelectItem>
                                                    <SelectItem value="large" className="px-3 py-2 rounded-lg text-sm hover:bg-warm-sidebar-item-active cursor-pointer">{t('settings.font_size_large', 'Grande')}</SelectItem>
                                                    <SelectItem value="xlarge" className="px-3 py-2 rounded-lg text-sm hover:bg-warm-sidebar-item-active cursor-pointer">{t('settings.font_size_xlarge', 'Très Grande')}</SelectItem>
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            {/* Correcteur */}
                            <div className="bg-warm-card-light dark:bg-warm-card-dark border border-warm-border-light dark:border-warm-border-dark rounded-2xl p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <span className="text-sm font-semibold">{t('settings.enable_correction', "Correcteur d'orthographe")}</span>
                                        <p className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">Souligner et corriger les fautes de grammaire et d\'orthographe.</p>
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
                                <h3 className="text-xl font-bold tracking-tight mb-1">{t('settings.cloud_sync_title', 'Synchronisation Cloud')}</h3>
                                <p className="text-sm text-warm-text-secondary-light dark:text-warm-text-secondary-dark">Gérez la réplication de vos données et le stockage multi-appareils.</p>
                            </div>

                            <div className="bg-warm-card-light dark:bg-warm-card-dark border border-warm-border-light dark:border-warm-border-dark rounded-2xl p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <span className="text-sm font-semibold flex items-center gap-2">
                                            <IconCloud className="w-4 h-4 text-blue-500" />
                                            {t('settings.cloud_sync_toggle', 'Activer la Synchronisation Cloud')}
                                        </span>
                                        <p className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">Vos notes sont synchronisées en toute sécurité avec Supabase.</p>
                                    </div>
                                    <GlassSwitch
                                        checked={localSettings.cloudSync !== false}
                                        onCheckedChange={async (enabled) => {
                                            if (window.confirm(t('settings.sync_confirm', 'Changer ce réglage redémarrera l\'application pour appliquer les nouveaux adaptateurs de stockage. Confirmer ?'))) {
                                                handleUpdate({ ...localSettings, cloudSync: enabled });
                                                localStorage.setItem('fiip-settings', JSON.stringify({ ...localSettings, cloudSync: enabled }));
                                                await relaunch().catch(console.error);
                                            }
                                        }}
                                    />
                                </div>

                                {localSettings.cloudSync !== false && (
                                    <div className="mt-4 pt-4 border-t border-warm-border-light dark:border-warm-border-dark space-y-4">
                                        <div className="bg-warm-sidebar-light/50 dark:bg-warm-sidebar-dark/50 rounded-xl p-3 border border-warm-border-light dark:border-warm-border-dark space-y-3">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-warm-text-muted-light dark:text-warm-text-muted-dark">{t('settings.sync_status', 'Statut de synchronisation')}</span>
                                                <span className="text-green-600 dark:text-green-400 font-semibold flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                                    {t('settings.status_active', 'Actif')}
                                                </span>
                                            </div>

                                            {storageUsage ? (
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-[10px] text-warm-text-muted-light dark:text-warm-text-muted-dark">
                                                        <span>{t('settings.storage_used', 'Espace disque utilisé')}</span>
                                                        <span>{Math.round(storageUsage.percent || 0)}%</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-warm-sidebar-light dark:bg-warm-sidebar-dark rounded-full overflow-hidden border border-warm-border-light dark:border-warm-border-dark">
                                                        <div 
                                                            className={`h-full transition-all duration-500 ${storageUsage.percent > 90 ? 'bg-red-500' : 'bg-blue-500'}`} 
                                                            style={{ width: `${storageUsage.percent || 0}%` }}
                                                        />
                                                    </div>
                                                    <div className="text-[10px] text-warm-text-muted-light dark:text-warm-text-muted-dark text-right font-mono">
                                                        {((storageUsage.used || 0) / 1024 / 1024).toFixed(2)} MB / {((storageUsage.limit || 0) / 1024 / 1024).toFixed(0)} MB
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark animate-pulse">
                                                    {t('settings.calculating_storage', 'Calcul de l\'utilisation de stockage...')}
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
                                                    onClick={() => onSync()}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-warm-sidebar-light hover:bg-warm-sidebar-item-active dark:bg-zinc-800 dark:hover:bg-zinc-800 border border-warm-border-light dark:border-warm-border-dark rounded-xl text-xs font-semibold transition-all"
                                                >
                                                    <IconRefresh className="w-3.5 h-3.5" />
                                                    Forcer la synchro
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* INTEL ARTIF */}
                    {activeTab === 'ai' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            <div>
                                <h3 className="text-xl font-bold tracking-tight mb-1">{t('settings.ai_title', 'Intelligence Artificielle')}</h3>
                                <p className="text-sm text-warm-text-secondary-light dark:text-warm-text-secondary-dark">Gérez l\'intégration de Dexter, votre assistant de rédaction intelligent.</p>
                            </div>

                            <div className="bg-warm-card-light dark:bg-warm-card-dark border border-warm-border-light dark:border-warm-border-dark rounded-2xl p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <span className="text-sm font-semibold flex items-center gap-2">
                                            <IconBot className="w-4 h-4 text-warm-text-muted-light" />
                                            {t('settings.ai_toggle', 'Activer l\'assistant intelligent')}
                                        </span>
                                        <p className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">Affiche l\'assistant IA Dexter et la barre d\'outils rapide.</p>
                                    </div>
                                    <GlassSwitch
                                        checked={localSettings.aiEnabled !== false}
                                        onCheckedChange={(checked) => handleUpdate({ ...localSettings, aiEnabled: checked })}
                                    />
                                </div>

                                {keyAuthService.hasAIAccess() && localSettings.aiEnabled !== false && (
                                    <div className="mt-4 pt-4 border-t border-warm-border-light dark:border-warm-border-dark grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="rounded-2xl border border-warm-border-light dark:border-warm-border-dark bg-white/70 dark:bg-white/5 p-4">
                                            <p className="text-xs font-bold uppercase text-warm-text-muted-light dark:text-warm-text-muted-dark">Routeur</p>
                                            <p className="mt-2 text-sm font-semibold flex items-center gap-2">
                                                <IconCpu className="w-4 h-4 text-amber-500" />
                                                openrouter/free
                                            </p>
                                            <p className="mt-1 text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">
                                                Les requêtes utilisent uniquement le routeur de modèles gratuits.
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-warm-border-light dark:border-warm-border-dark bg-white/70 dark:bg-white/5 p-4">
                                            <p className="text-xs font-bold uppercase text-warm-text-muted-light dark:text-warm-text-muted-dark">Clé API</p>
                                            <p className="mt-2 text-sm font-semibold">Secret GitHub</p>
                                            <p className="mt-1 text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">
                                                Aucune clé personnalisée n’est saisie ou stockée côté utilisateur.
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-warm-border-light dark:border-warm-border-dark bg-white/70 dark:bg-white/5 p-4">
                                            <p className="text-xs font-bold uppercase text-warm-text-muted-light dark:text-warm-text-muted-dark">Usage</p>
                                            <p className="mt-2 text-sm font-semibold">Statistiques OpenRouter</p>
                                            <p className="mt-1 text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">
                                                Les générations exposent les tokens et coûts via l’endpoint /generation.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* À PROPOS */}
                    {activeTab === 'about' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            <div>
                                <h3 className="text-xl font-bold tracking-tight mb-1">{t('settings.about', 'À propos')}</h3>
                                <p className="text-sm text-warm-text-secondary-light dark:text-warm-text-secondary-dark">Informations techniques de version et d\'assistance.</p>
                            </div>

                            <div className="bg-warm-card-light dark:bg-warm-card-dark border border-warm-border-light dark:border-warm-border-dark rounded-2xl p-6 text-center space-y-4">
                                <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-inner">
                                    <span className="text-3xl font-extrabold tracking-tighter text-amber-600 dark:text-amber-400">Fi</span>
                                </div>

                                <div className="space-y-1">
                                    <h4 className="text-lg font-bold">Fiip Desktop</h4>
                                    <p className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">Version {appVersion || '3.0.0'}</p>
                                    <p className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">Exécuté sur {platformName || 'Windows Desktop'}</p>
                                </div>

                                <div className="pt-4 border-t border-warm-border-light dark:border-warm-border-dark flex justify-center gap-4">
                                    <button 
                                        onClick={handleRestart}
                                        className="px-4 py-2 bg-warm-sidebar-light hover:bg-warm-sidebar-item-active dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-warm-border-light dark:border-warm-border-dark rounded-xl text-xs font-semibold transition-all"
                                    >
                                        Redémarrer l\'application
                                    </button>
                                    <button 
                                        onClick={() => open('mailto:support@fiip.app')}
                                        className="px-4 py-2 bg-zinc-950 hover:bg-zinc-900 dark:bg-zinc-50 dark:hover:bg-zinc-150 text-white dark:text-zinc-950 rounded-xl text-xs font-semibold transition-all"
                                    >
                                        Contacter le support
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
