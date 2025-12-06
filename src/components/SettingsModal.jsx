import React, { useState, useEffect, useRef } from 'react';
import { X, Type, Check, RefreshCw } from 'lucide-react';
import { relaunch } from '@tauri-apps/plugin-process';
import { open } from '@tauri-apps/plugin-shell';
import { getPlatformDisplayName } from '../services/platform';
import { generateText } from '../services/ai';

export default function SettingsModal({ isOpen, onClose, settings = {}, onUpdateSettings }) {
    const [localSettings, setLocalSettings] = useState(settings);
    const [hasChanges, setHasChanges] = useState(false);
    const [audioDevices, setAudioDevices] = useState({ inputs: [], outputs: [] });
    const originalSettingsRef = useRef(settings);
    const [platformName, setPlatformName] = useState('');
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Store original settings when modal opens
            originalSettingsRef.current = settings;
            setLocalSettings(settings);
            setHasChanges(false);

            // Load Audio Devices
            navigator.mediaDevices.enumerateDevices().then(devices => {
                const inputs = devices.filter(d => d.kind === 'audioinput');
                const outputs = devices.filter(d => d.kind === 'audiooutput');
                setAudioDevices({ inputs, outputs });
            });

            // Get platform info
            getPlatformDisplayName().then(name => setPlatformName(name));
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
            <div className="w-96 bg-[#2c2c2c] rounded-xl shadow-2xl border border-white/10 overflow-hidden transform transition-all scale-100 p-6 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h2 className="text-lg font-semibold text-white">Paramètres</h2>
                    <button onClick={handleClose} className="p-1 rounded-full hover:bg-white/10 transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="space-y-6 overflow-y-auto pr-1 custom-scrollbar">
                    
                    {/* Typography */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Affichage</h3>
                        <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Type className="w-5 h-5 text-gray-400" />
                                <span className="text-sm font-medium text-gray-200">Police Large</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={localSettings.largeText}
                                    onChange={(e) => handleUpdate({ ...localSettings, largeText: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>

                    {/* Titlebar Style */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Style de Barre de Titre</h3>
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
                                    {style === 'none' ? 'Aucun' : style.charAt(0).toUpperCase() + style.slice(1)}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-gray-400 px-1">
                            "Aucun" utilise les boutons dans la barre latérale.
                        </p>
                    </div>

                    {/* Window Effects */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Effets de Fenêtre (Windows 11)</h3>
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
                            "Mica" utilise votre fond d'écran. "Acrylic" est translucide.
                        </p>
                    </div>

                    {/* Audio & Media */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Audio et Médias</h3>

                        {/* Audio Input */}
                        <div>
                            <label className="block text-xs font-medium text-gray-300 mb-1">Microphone (Entrée)</label>
                            <select
                                value={localSettings.audioInputId || ''}
                                onChange={(e) => handleUpdate({ ...localSettings, audioInputId: e.target.value })}
                                className="w-full bg-black/20 border border-white/10 rounded-md px-2 py-2 text-sm text-gray-100 outline-none"
                            >
                                <option value="">Par défaut</option>
                                {audioDevices.inputs.map(device => (
                                    <option key={device.deviceId} value={device.deviceId}>
                                        {device.label || `Microphone ${device.deviceId.slice(0, 5)}...`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Audio Output */}
                        <div>
                            <label className="block text-xs font-medium text-gray-300 mb-1">Sortie Audio</label>
                            <select
                                value={localSettings.audioOutputId || ''}
                                onChange={(e) => handleUpdate({ ...localSettings, audioOutputId: e.target.value })}
                                className="w-full bg-black/20 border border-white/10 rounded-md px-2 py-2 text-sm text-gray-100 outline-none"
                            >
                                <option value="">Par défaut</option>
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
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Intelligence Artificielle</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-300 mb-1">Clé API OpenRouter</label>
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
                                    Obtenir une clé API OpenRouter
                                </button>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-300 mb-1">Modèle AI par défaut</label>
                                <select
                                    value={localSettings.aiModel || 'openai/gpt-4o-mini'}
                                    onChange={(e) => handleUpdate({ ...localSettings, aiModel: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded-md px-2 py-2 text-sm text-gray-100 outline-none"
                                >
                                    <optgroup label="Populaires">
                                        <option value="openai/gpt-4o-mini">GPT-4o Mini (Rapide & Économique)</option>
                                        <option value="openai/gpt-4o">GPT-4o (Puissant)</option>
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
                                <label className="block text-xs font-medium text-gray-300 mb-2">Modèles Personnalisés</label>

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
                                        <div className="text-xs text-gray-400 italic text-center py-2">Aucun modèle personnalisé</div>
                                    )}
                                </div>

                                {/* Add Input */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="ID Modèle (ex: google/gemini-pro)"
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
                                        Ajouter
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-white/5 flex flex-col gap-3 mt-4 shrink-0">
                    <button
                        onClick={handleApply}
                        className="w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 shadow-md transform hover:-translate-y-0.5"
                    >
                        <Check className="w-4 h-4" />
                        Appliquer les changements
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

                                        if (confirm(`Mise à jour disponible : ${update.version}\n\nVoulez-vous la télécharger et l'installer maintenant ?`)) {
                                            await update.downloadAndInstall();
                                            await relaunch();
                                        }
                                    } else {
                                        alert("Vous êtes à jour ! Aucune nouvelle version détectée.");
                                    }
                                } catch (e) {
                                    console.error("Update check error:", e);
                                    const msg = e?.message || (typeof e === 'string' ? e : JSON.stringify(e));
                                    
                                    if (msg.includes("parsing major version number") || msg.includes("unexpected character")) {
                                         console.warn("Update check failed due to invalid server version format. Assuming up to date.");
                                         alert("Vous êtes probablement à jour. (Impossible de vérifier la version distante)");
                                    } else if (msg.includes("Could not fetch a valid release JSON")) {
                                        alert("Impossible de récupérer les informations de mise à jour. Vérifiez votre connexion internet ou réessayez plus tard.");
                                    } else {
                                        alert("Erreur lors de la vérification : " + msg);
                                    }
                                } finally {
                                    setIsCheckingUpdate(false);
                                }
                            }}
                            className={`flex-1 py-2.5 px-5 bg-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-colors ${isCheckingUpdate ? 'opacity-50 cursor-wait' : ''}`}
                        >
                            {isCheckingUpdate ? 'Vérification...' : 'Vérifier MAJ'}
                        </button>
                        <button
                            onClick={handleRestart}
                            className="flex-1 py-2.5 px-5 bg-white text-gray-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Redémarrer
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-400 text-center">Fiip Notes v1.5.3</p>
                    {platformName && (
                        <p className="text-[10px] text-gray-500 text-center">Running on {platformName}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
