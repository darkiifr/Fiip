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
                        <div className="space-y-2">
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
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Modèle (ID OpenRouter)</label>
                                <input
                                    type="text"
                                    value={settings.aiModel || 'openai/gpt-4o-mini'}
                                    onChange={(e) => onUpdateSettings({ ...settings, aiModel: e.target.value })}
                                    placeholder="ex: anthropic/claude-3-haiku"
                                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 dark:border-white/5 text-center">
                        <p className="text-xs text-gray-400">Fiip Notes v0.1.0</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
