import React from 'react';
import { X, Moon, Sun, Type } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, settings, onUpdateSettings }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-96 bg-white dark:bg-[#2c2c2c] rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden transform transition-all scale-100 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Paramètres</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Appearance */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Apparence</h3>
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-black/20 rounded-lg">
                            <div className="flex items-center gap-3">
                                {settings.darkMode ? <Moon className="w-5 h-5 text-blue-500" /> : <Sun className="w-5 h-5 text-orange-500" />}
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Mode Sombre</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.darkMode}
                                    onChange={(e) => onUpdateSettings({ ...settings, darkMode: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>

                    {/* Typography */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Affichage</h3>
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-black/20 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Type className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Police Large</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.largeText}
                                    onChange={(e) => onUpdateSettings({ ...settings, largeText: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>

                    {/* Window Effects */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Effets de Fenêtre (Windows 11)</h3>
                        <div className="bg-gray-50 dark:bg-black/20 rounded-lg p-1 flex gap-1">
                            {['none', 'mica', 'acrylic'].map((effect) => (
                                <button
                                    key={effect}
                                    onClick={() => onUpdateSettings({ ...settings, windowEffect: effect })}
                                    className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${settings.windowEffect === effect
                                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-white/5'
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

                    {/* AI Settings */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Intelligence Artificielle</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Clé API OpenRouter</label>
                                <input
                                    type="password"
                                    value={settings.aiApiKey || ''}
                                    onChange={(e) => onUpdateSettings({ ...settings, aiApiKey: e.target.value })}
                                    placeholder="sk-or-..."
                                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                />
                            </div>

                            {/* Custom Models List */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Modèles Personnalisés</label>

                                {/* List */}
                                <div className="space-y-2 mb-2">
                                    {(settings.customModels || []).map((modelId) => (
                                        <div key={modelId} className="flex items-center justify-between bg-gray-50 dark:bg-black/20 px-3 py-2 rounded-md border border-gray-200 dark:border-white/5">
                                            <span className="text-xs text-gray-700 dark:text-gray-300 font-mono">{modelId}</span>
                                            <button
                                                onClick={() => {
                                                    const newModels = settings.customModels.filter(m => m !== modelId);
                                                    onUpdateSettings({ ...settings, customModels: newModels });
                                                }}
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                    {(settings.customModels || []).length === 0 && (
                                        <div className="text-xs text-gray-400 italic text-center py-2">Aucun modèle personnalisé</div>
                                    )}
                                </div>

                                {/* Add Input */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="ID Modèle (ex: google/gemini-pro)"
                                        className="flex-1 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-md px-3 py-2 text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                        id="new-model-input"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const val = e.target.value.trim();
                                                if (val && !(settings.customModels || []).includes(val)) {
                                                    const newModels = [...(settings.customModels || []), val];
                                                    onUpdateSettings({ ...settings, customModels: newModels });
                                                    e.target.value = '';
                                                }
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={() => {
                                            const input = document.getElementById('new-model-input');
                                            const val = input.value.trim();
                                            if (val && !(settings.customModels || []).includes(val)) {
                                                const newModels = [...(settings.customModels || []), val];
                                                onUpdateSettings({ ...settings, customModels: newModels });
                                                input.value = '';
                                            }
                                        }}
                                        className="px-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
                                    >
                                        Ajouter
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100 dark:border-white/5 flex flex-col gap-2 items-center">
                        <div className="flex w-full gap-2">
                            <button
                                onClick={async () => {
                                    try {
                                        const { check } = await import('@tauri-apps/plugin-updater');
                                        const update = await check();
                                        if (update?.available) {
                                            if (confirm(`Mise à jour disponible : ${update.version}\n\nVoulez-vous la télécharger et l'installer maintenant ?`)) {
                                                await update.downloadAndInstall();
                                                await import('@tauri-apps/plugin-process').then(p => p.relaunch());
                                            }
                                        } else {
                                            alert("Vous êtes à jour !");
                                        }
                                    } catch (e) {
                                        alert("Erreur lors de la vérification : " + e.message);
                                    }
                                }}
                                className="flex-1 py-2 px-4 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                            >
                                Vérifier MAJ
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 py-2 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></svg>
                                Redémarrer
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400">Fiip Notes v0.6.0 • Redémarrez pour appliquer certains effets</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
