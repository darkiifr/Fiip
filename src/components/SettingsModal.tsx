import { getVersion } from '@tauri-apps/api/app';
import { type } from '@tauri-apps/plugin-os';
import { relaunch, exit } from '@tauri-apps/plugin-process';
import { open, Command } from '@tauri-apps/plugin-shell';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useUI } from '../providers/UIProvider';
import { keyAuthService } from '../services/keyauth';
import { getLocalizedLanguageLabel, LANGUAGES } from '../services/languages';
import { getPlatformDisplayName } from '../services/platform';

import CustomSelect from './CustomSelect';
import NucleoFlag from './NucleoFlag';
import { GlassDialog } from './ui/GlassDialog';
import { GlassButton } from './ui/GlassButton';
import { GlassSwitch } from './ui/GlassSwitch';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from './ui/Select';

// Icons Import (Pim's Edition)
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
import IconVolume from '~icons/mingcute/volume-fill';

interface Settings {
    language?: string;
    fontSize?: number;
    autoUpdate?: boolean;
    cloudSync?: boolean;
    windowEffect?: string;
    appSound?: boolean;
    chatSound?: boolean;
    audioInputId?: string;
    audioOutputId?: string;
    aiEnabled?: boolean;
    aiModel?: string;
    voiceEnabled?: boolean;
    voiceName?: string;
    dictationEnabled?: boolean;
}

interface StorageUsage {
    percent: number;
    used: number;
    limit: number;
}

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: Settings;
    onUpdateSettings: (settings: Settings) => void;
    storageUsage?: StorageUsage;
    onSync?: () => Promise<void>;
}

export default function SettingsModal({ 
    isOpen, 
    onClose, 
    settings, 
    onUpdateSettings, 
    storageUsage, 
    onSync 
}: SettingsModalProps) {
    const { t, i18n } = useTranslation();
    const { theme, setTheme } = useUI();
    const [localSettings, setLocalSettings] = useState<Settings>(settings);
    const [hasChanges, setHasChanges] = useState(false);

    const [audioDevices, setAudioDevices] = useState<{ inputs: any[], outputs: any[] }>({ inputs: [], outputs: [] });
    const originalSettingsRef = useRef<Settings>(settings);
    const [platformName, setPlatformName] = useState('');
    const [appVersion, setAppVersion] = useState('');
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [isLinux, setIsLinux] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<any>(null);
    const [pendingUpdatesCount, setPendingUpdatesCount] = useState(0);

    const languages = LANGUAGES;

    useEffect(() => {
        // Check OS
        const checkOS = async () => {
            try {
                const osType = await type();
                if (osType === 'linux') {setIsLinux(true);}
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

        // Check for pending updates
        const checkPending = () => {
            const updates = keyAuthService.pendingUpdates;
            if (updates) {
                setPendingUpdatesCount(Object.keys(updates).length);
            } else {
                setPendingUpdatesCount(0);
            }
        };
        
        checkPending();
        const interval = setInterval(checkPending, 2000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (isOpen) {
            // Store original settings when modal opens
            originalSettingsRef.current = settings;
            queueMicrotask(() => {
                setLocalSettings(settings);
                setHasChanges(false);
            });

            // Load Audio Devices
            if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
                navigator.mediaDevices.enumerateDevices()
                    .then(devices => {
                        const inputs = devices.filter(d => d.kind === 'audioinput');
                        const outputs = devices.filter(d => d.kind === 'audiooutput');
                        setAudioDevices({ inputs, outputs });
                        return null;
                    })
                    .catch(err => console.warn("Failed to enumerate devices:", err));
            }

            // Get platform info
            getPlatformDisplayName()
                .then(name => {
                    setPlatformName(name);
                    return null;
                })
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

    const handleUpdate = (newSettings: Settings) => {
        setLocalSettings(newSettings);
        setHasChanges(true);
        // Apply changes in real-time
        onUpdateSettings(newSettings);
    };

    const handleApply = async () => {
        if (!isOpen) return;
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
        } catch (error: any) {
            console.error('Failed to relaunch:', error);
            alert('Échec du redémarrage : ' + error.message);
        }
    };

    return (
        <GlassDialog 
            isOpen={isOpen} 
            onClose={handleClose} 
            title={t('settings.title')}
            maxWidth="480px"
        >
            <div className="flex flex-col h-full max-h-[80vh]">
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 custom-scrollbar scroll-smooth">

                    {/* Language */}
                    <div className="space-y-3 relative">
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('settings.language')}</h3>
                        <Select
                            value={languages.find(l => l.code === localSettings.language || l.code === i18n.language)?.code || 'fr'}
                            onValueChange={(code) => {
                                i18n.changeLanguage(code);
                                handleUpdate({ ...localSettings, language: code });
                            }}
                        >
                            <SelectTrigger>
                                <div className="flex items-center gap-2">
                                    <IconGlobe className="w-4 h-4 text-gray-400" />
                                    {(() => {
                                        const selected = languages.find(l => l.code === localSettings.language || l.code === i18n.language) || languages.find(l => l.code === 'fr') || languages[0];
                                        return (
                                            <>
                                                <NucleoFlag language={selected} className="h-5 w-5 shrink-0 rounded-[4px]" />
                                                <span className="font-medium truncate">{getLocalizedLanguageLabel(selected, i18n.language)}</span>
                                            </>
                                        );
                                    })()}
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {languages.map((l) => (
                                        <SelectItem key={l.code} value={l.code}>
                                            <div className="flex items-center gap-2">
                                                <NucleoFlag language={l} className="h-5 w-5 shrink-0 rounded-[4px]" />
                                                <span className="flex min-w-0 flex-col leading-tight">
                                                    <span className="font-medium truncate">{getLocalizedLanguageLabel(l, i18n.language)}</span>
                                                    {l.nativeLabel !== l.label ? (
                                                        <span className="truncate text-[11px] text-gray-400">{l.nativeLabel}</span>
                                                    ) : null}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Typography */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('settings.display_title')}</h3>
                        <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg">
                            <div className="flex items-center gap-3">
                                <IconFontSize className="w-5 h-5 text-gray-400" />
                                <span className="text-sm font-medium text-gray-200">{t('settings.font_size_label')}</span>
                            </div>
                            <div className="w-[140px]">
                                <Select 
                                    value={localSettings.fontSize || (localSettings.largeText ? 'large' : 'normal')}
                                    onValueChange={(val) => handleUpdate({ ...localSettings, fontSize: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem value="small">{t('settings.font_size_small')}</SelectItem>
                                            <SelectItem value="normal">{t('settings.font_size_normal')}</SelectItem>
                                            <SelectItem value="large">{t('settings.font_size_large')}</SelectItem>
                                            <SelectItem value="xlarge">{t('settings.font_size_xlarge')}</SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* UI Theme Style */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('settings.ui_theme')}</h3>
                        <div className="bg-white/5 border border-white/5 rounded-lg p-1 flex gap-1 flex-wrap">
                            {[
                                { id: 'original', label: t('settings.theme_classic') },
                                { id: 'liquid-glass', label: t('settings.theme_liquid_glass') }
                            ].map((style) => (
                                <button
                                    key={style.id}
                                    onClick={() => setTheme(style.id as any)}
                                    className={`flex-1 min-w-[30%] py-1.5 px-3 rounded-md text-[11px] font-medium transition-all ${theme === style.id ? 'bg-white/10 text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'}`}
                                >
                                    {style.label}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-gray-400 px-1">
                            {t('settings.ui_theme_desc')}
                        </p>
                    </div>

                    {/* Auto Update */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('settings.updates')}</h3>
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                            <div className="flex items-center gap-3">
                                <IconDownload className="w-5 h-5 text-gray-400" />
                                <span className="text-sm font-medium text-gray-200">{t('settings.auto_update')}</span>
                            </div>
                            <GlassSwitch
                                checked={localSettings.autoUpdate !== false}
                                onCheckedChange={(checked) => handleUpdate({ ...localSettings, autoUpdate: checked })}
                                aria-label={t('settings.auto_update')}
                            />
                        </div>
                    </div>

                    {/* Cloud Sync */}
                    <div className="space-y-3">
                         <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('settings.cloud_sync_title')}</h3>
                         <div className="bg-white/5 border border-white/5 rounded-lg p-3 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <IconCloud className="w-5 h-5 text-blue-400" />
                                    <span className="text-sm font-medium text-gray-200">{t('settings.cloud_sync_toggle')}</span>
                                </div>
                                <GlassSwitch
                                    checked={localSettings.cloudSync !== false}
                                    onCheckedChange={async (enabled) => {
                                        if (window.confirm(t('settings.sync_confirm'))) {
                                            handleUpdate({ ...localSettings, cloudSync: enabled });
                                            // Force save local first just in case
                                            if (keyAuthService.isAuthenticated && enabled) {
                                                if (onSync) { await onSync(); } // Sync notes now
                                            }
                                            localStorage.setItem('fiip-settings', JSON.stringify({ ...localSettings, cloudSync: enabled }));
                                            try {
                                                await relaunch();
                                            } catch (err: any) {
                                                alert("Redémarrage échoué: " + err);
                                            }
                                        }
                                    }}
                                    aria-label={t('settings.cloud_sync_toggle')}
                                />
                            </div>

                            {localSettings.cloudSync !== false && (
                                <div className="mt-2 pt-2 border-t border-white/5 space-y-2 animate-in fade-in slide-in-from-top-1">
                                    <div className="bg-sidebar-dark/50 border border-white/5 rounded-lg p-3 space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-400">{t('settings.sync_status')}</span>
                                            <span className="text-green-400 font-medium flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                                {t('settings.status_active')}
                                            </span>
                                        </div>
                                        
                                        {storageUsage ? (
                                            <div>
                                                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                                    <span>{t('settings.storage_used')}</span>
                                                    <span>{Math.round(storageUsage.percent || 0)}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full transition-all duration-500 ${storageUsage.percent > 90 ? 'bg-red-500' : 'bg-blue-500'}`} 
                                                        style={{ width: `${storageUsage.percent || 0}%` }}
                                                    />
                                                </div>
                                                <div className="text-[10px] text-gray-400 mt-1 text-right font-mono">
                                                    {((storageUsage.used || 0) / 1024 / 1024).toFixed(1)}MB / {((storageUsage.limit || 0) / 1024 / 1024).toFixed(0)}MB
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-[10px] text-gray-500 animate-pulse">
                                                {t('settings.calculating_storage')}
                                            </div>
                                        )}
                                    </div>

                                    {pendingUpdatesCount > 0 && (
                                        <div className="px-2 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded flex items-center gap-2 text-yellow-200 text-xs mb-2">
                                            <IconRefresh className="w-3 h-3 animate-spin" />
                                            <span>{pendingUpdatesCount} modification(s) en attente de connexion...</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <p className="text-[10px] text-gray-400 px-1 pt-2 border-t border-white/5 mt-1 flex flex-col gap-1">
                                <span>{t('settings.cloud_sync_desc')}</span>
                                <span className="text-blue-400 flex items-center gap-1">Propulsé par le cloud Fiip</span>
                            </p>
                         </div>
                    </div>
                    {/* Window Effects */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('settings.window_effects_title')}</h3>
                        <div className="bg-white/5 border border-white/5 rounded-lg p-1 flex gap-1">
                            {['none', 'mica', 'acrylic'].map((effect) => (
                                <button
                                    key={effect}
                                    onClick={() => handleUpdate({ ...localSettings, windowEffect: effect })}
                                    className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${localSettings.windowEffect === effect
                                        ? 'bg-white/10 text-blue-400 shadow-sm'
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
                        <div className="bg-white/5 border border-white/5 rounded-lg p-3 space-y-3 mb-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-200">{t('settings.app_sounds', "Sons de l'interface")}</span>
                                <GlassSwitch
                                    checked={localSettings.appSound !== false}
                                    onCheckedChange={(checked) => handleUpdate({ ...localSettings, appSound: checked })}
                                    aria-label={t('settings.app_sounds')}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-200">{t('settings.chat_sounds', "Notifications du chat")}</span>
                                <GlassSwitch
                                    checked={localSettings.chatSound !== false}
                                    onCheckedChange={(checked) => handleUpdate({ ...localSettings, chatSound: checked })}
                                    aria-label={t('settings.chat_sounds')}
                                />
                            </div>
                        </div>

                        {/* Audio Input */}
                        <div>
                            <label className="block text-xs font-medium text-gray-300 mb-1">{t('settings.mic_input')}</label>
                            <CustomSelect
                                value={localSettings.audioInputId || ''}
                                onChange={(val) => handleUpdate({ ...localSettings, audioInputId: val })}
                                options={[
                                    { value: "", label: t('settings.default') },
                                    ...audioDevices.inputs.map(device => ({
                                        value: device.deviceId,
                                        label: device.label || `Microphone ${device.deviceId.slice(0, 5)}...`
                                    }))
                                ]}
                                renderTrigger={(option) => (
                                    <>
                                        <IconMic className="w-4 h-4 text-gray-400" />
                                        <span className="truncate">{option.label}</span>
                                    </>
                                )}
                            />
                        </div>

                        {/* Audio Output */}
                        <div>
                            <label className="block text-xs font-medium text-gray-300 mb-1">{t('settings.audio_output')}</label>
                            <CustomSelect
                                value={localSettings.audioOutputId || ''}
                                onChange={(val) => handleUpdate({ ...localSettings, audioOutputId: val })}
                                options={[
                                    { value: "", label: t('settings.default') },
                                    ...audioDevices.outputs.map(device => ({
                                        value: device.deviceId,
                                        label: device.label || `Sortie ${device.deviceId.slice(0, 5)}...`
                                    }))
                                ]}
                                renderTrigger={(option) => (
                                    <>
                                        <IconVolume className="w-4 h-4 text-gray-400" />
                                        <span className="truncate">{option.label}</span>
                                    </>
                                )}
                            />
                        </div>
                    </div>

                    {/* AI Settings */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('settings.ai_title')}</h3>
                        
                        {/* Master Toggle */}
                        <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg">
                            <div className="flex items-center gap-3">
                                <IconBot className="w-5 h-5 text-gray-400" />
                                <span className="text-sm font-medium text-gray-200">{t('settings.ai_toggle')}</span>
                            </div>
                            <GlassSwitch
                                checked={localSettings.aiEnabled !== false}
                                onCheckedChange={(checked) => handleUpdate({ ...localSettings, aiEnabled: checked })}
                                aria-label={t('settings.ai_toggle')}
                            />
                        </div>

                        {keyAuthService.hasAIAccess() && localSettings.aiEnabled !== false && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                                    <div className="flex items-center gap-3">
                                        <IconCpu className="h-5 w-5 text-blue-300" />
                                        <div>
                                            <p className="text-sm font-semibold text-gray-100">Assistant Dexter</p>
                                            <p className="text-xs text-gray-400">Aide à résumer, reformuler, corriger et structurer vos notes.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                                    <p className="text-sm font-semibold text-gray-100">Accès géré par Fiip</p>
                                    <p className="mt-1 text-xs leading-relaxed text-gray-400">
                                        Aucune clé technique n'est demandée dans l'application. Fiip gère l'accès à Dexter automatiquement.
                                    </p>
                                </div>

                                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                                    <p className="text-sm font-semibold text-gray-100">Usage visible</p>
                                    <p className="mt-1 text-xs leading-relaxed text-gray-400">
                                        Les statistiques apparaissent après les réponses pour mieux comprendre l'activité de Dexter.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Audio & Accessibility */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('settings.audio_accessibility_title')}</h3>
                        
                        {/* TTS Toggle */}
                        <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-200">{t('settings.tts_toggle')}</span>
                            </div>
                            <GlassSwitch
                                checked={localSettings.voiceEnabled !== false}
                                onCheckedChange={(checked) => handleUpdate({ ...localSettings, voiceEnabled: checked })}
                                aria-label={t('settings.tts_toggle')}
                            />
                        </div>

                        {/* Voice Selection */}
                        {localSettings.voiceEnabled !== false && (
                            <div>
                                <label className="block text-xs font-medium text-gray-300 mb-1">{t('settings.voice_label')}</label>
                                <CustomSelect
                                    value={localSettings.voiceName || ''}
                                    onChange={(val) => handleUpdate({ ...localSettings, voiceName: val })}
                                    options={[
                                        { value: "", label: t('settings.default') },
                                        ...voices
                                            .filter(v => v.lang.startsWith((i18n.language || 'fr').split('-')[0]) || v.lang.startsWith('en'))
                                            .sort((a, b) => a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name))
                                            .map(voice => ({
                                                value: voice.name,
                                                label: `${voice.name} (${voice.lang})`
                                            }))
                                    ]}
                                    renderTrigger={(option) => (
                                        <>
                                            <IconMessage className="w-4 h-4 text-gray-400" />
                                            <span className="truncate">{option.label}</span>
                                        </>
                                    )}
                                />

                                {/* Linux TTS Warning */}
                                {isLinux && voices.length === 0 && (
                                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mt-3 animate-in fade-in slide-in-from-top-1">
                                        <p className="text-xs text-yellow-200 mb-2 leading-relaxed">
                                            {t('settings.no_voices_linux', "Aucune voix détectée. Sur Linux, le paquet speech-dispatcher est souvent requis pour le TTS.")}
                                        </p>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const cmd = Command.create('install_speech_dispatcher');
                                                    const output = await cmd.execute();
                                                    if (output.code === 0) {
                                                        alert(t('settings.install_success', "Installation terminée avec succès. L'application va redémarrer."));
                                                        await relaunch();
                                                    } else {
                                                        alert(t('settings.install_failed', "L'installation a échoué (Code {{code}}). Vérifiez votre mot de passe ou installez 'speech-dispatcher' manuellement.", { code: output.code }));
                                                    }
                                                } catch (e: any) {
                                                    console.error(e);
                                                    alert(t('settings.error_generic', "Erreur : {{msg}}", { msg: e.message }));
                                                }
                                            }}
                                            className="w-full text-xs bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-2 rounded transition-colors font-medium flex items-center justify-center gap-2"
                                        >
                                            <IconRefresh className="w-3 h-3" />
                                            {t('settings.install_speech_dl', "Installer speech-dispatcher & Redémarrer")}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* STT Toggle */}
                        <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-200">{t('settings.stt_toggle')}</span>
                            </div>
                            <GlassSwitch
                                checked={localSettings.dictationEnabled !== false}
                                onCheckedChange={(checked) => handleUpdate({ ...localSettings, dictationEnabled: checked })}
                                aria-label={t('settings.stt_toggle')}
                            />
                        </div>
                        
                        {/* Windows Voice Settings Link */}
                        <div className="flex justify-end px-1">
                            <button
                                onClick={() => open('https://support.microsoft.com/en-us/windows/language-packs-for-windows-a5094319-a92d-18de-5b53-1cfc697cfca8')}
                                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors group"
                            >
                                <span className="group-hover:underline underline-offset-2 decoration-blue-400/30">{t('settings.download_voices', 'Guide: Installer des langues et voix')}</span>
                                <IconDownload className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    {/* System */}
                    <div className="space-y-3 pt-4 border-t border-white/5">
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('settings.system', 'Système')}</h3>
                        
                        <div className="flex w-full gap-2">
                            <GlassButton
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
                                    } catch (e: any) {
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
                                variant="secondary"
                                className="flex-1"
                            >
                                {isCheckingUpdate ? t('settings.checking') : t('settings.check_update_btn')}
                            </GlassButton>
                            <GlassButton
                                onClick={handleRestart}
                                variant="primary"
                                className="flex-1"
                            >
                                <IconRefresh className="w-4 h-4" />
                                {t('settings.restart')}
                            </GlassButton>
                        </div>
                        <p className="text-[10px] text-gray-400 text-center">Fiip Notes v{appVersion || '...'}</p>
                        {platformName && (
                            <p className="text-[10px] text-gray-500 text-center">Running on {platformName}</p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="h-14 px-4 bg-white/5 border-t border-white/5 flex items-center justify-end gap-3 shrink-0">
                    <GlassButton
                        onClick={handleApply}
                        className="w-full"
                    >
                        <IconCheck className="w-4 h-4" />
                        {t('settings.apply')}
                    </GlassButton>
                </div>

                {/* Update Modal Overlay */}
                {updateInfo && (
                    <div className="absolute inset-0 z-50 bg-[#1c1c1e] flex flex-col p-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-center justify-between mb-4 shrink-0">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <IconSparkles className="w-5 h-5 text-blue-400" />
                                {t('settings.update_available')}
                            </h3>
                            <button onClick={() => setUpdateInfo(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                                <IconClose className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white/5 rounded-lg p-4 mb-4 border border-white/5">
                            <div className="flex justify-between items-baseline mb-3 pb-3 border-b border-white/5">
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-500 uppercase tracking-wider">{t('settings.current_version')}</span>
                                    <span className="text-sm font-mono text-gray-400">v{appVersion}</span>
                                </div>
                                <IconArrowRight className="w-4 h-4 text-gray-600 mx-2" />
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
                                <IconDownload className="w-4 h-4" />
                                {isCheckingUpdate ? t('settings.installing') : t('settings.install')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </GlassDialog>
    );
}



