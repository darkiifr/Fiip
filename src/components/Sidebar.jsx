import React, { useState } from 'react';
import { Search, Plus, Trash2, Settings, Bot, Download, Upload, Key, Lock, MessageCircle, UserCircle, ShieldCheck } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { exportNoteAsMarkdown, importMarkdownFile } from '../services/fileManager';
import { useTranslation } from 'react-i18next';
import { keyAuthService } from '../services/keyauth';

export default function Sidebar({ notes = [], onSelectNote, selectedNoteId, onCreateNote, onDeleteNote, onOpenSettings, onOpenLicense, onToggleDexter, onOpenChat, onOpenAuth, settings }) {
    const { t, i18n } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, noteId: null });
    const appWindow = getCurrentWindow();
    
    // START FIX: Local Profile Sync
    const [localProfile, setLocalProfile] = useState(null);

    React.useEffect(() => {
        const loadProfile = () => {
            const saved = localStorage.getItem('fiip_public_profile');
            if (saved) {
                try {
                    setLocalProfile(JSON.parse(saved));
                } catch (e) { console.error(e); }
            }
        };
        loadProfile();
        window.addEventListener('storage', loadProfile);
        return () => window.removeEventListener('storage', loadProfile);
    }, []);
    // END FIX
    React.useEffect(() => {
        const handleClick = () => setContextMenu({ ...contextMenu, visible: false });
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [contextMenu]);

    const handleContextMenu = (e, noteId) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            noteId
        });
    };

    const handleExport = async () => {
        const note = notes.find(n => n.id === selectedNoteId);
        if (!note) {
            alert(t('sidebar.no_note_selected'));
            return;
        }
        const result = await exportNoteAsMarkdown(note);
        if (result.success) {
            alert(t('sidebar.export_success'));
        } else if (!result.cancelled) {
            alert(t('sidebar.export_error', { error: result.error }));
        }
    };

    const handleImport = async () => {
        const result = await importMarkdownFile();
        if (result.success) {
            onCreateNote(result.note);
            alert(t('sidebar.import_success'));
        } else if (!result.cancelled) {
            alert(t('sidebar.import_error', { error: result.error }));
        }
    };

    const filteredNotes = (notes || []).filter(note =>
        (note.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (note.content || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="w-80 h-full bg-[#1C1C1E]/60 backdrop-blur-2xl border-r border-white/10 flex flex-col transition-colors duration-300">
            {/* Header : Window Controls & Search */}
            <div className="flex flex-col gap-0 px-4 pb-2 pt-1 select-none">
                {/* Top Row: User/Traffic + Drag */}
                <div className="flex items-center justify-between mb-0 mt-0">
                    {/* Traffic Lights - Only show when titlebar style is 'none' */}
                    {(!settings?.titlebarStyle || settings.titlebarStyle === 'none') && (
                        <div className="flex gap-2.5 group pl-1.5 pt-1 pr-4 z-50">
                            <button
                                onClick={(e) => { e.stopPropagation(); appWindow.close(); }}
                                className="w-3.5 h-3.5 rounded-full bg-[#FF5F57] hover:bg-[#FF4A42] border border-black/10 transition-all active:scale-95 shadow-sm"
                            ></button>
                            <button
                                onClick={(e) => { e.stopPropagation(); appWindow.minimize(); }}
                                className="w-3.5 h-3.5 rounded-full bg-[#FEBC2E] hover:bg-[#FEAE1C] border border-black/10 transition-all active:scale-95 shadow-sm"
                            ></button>
                            <button
                                onClick={(e) => { e.stopPropagation(); appWindow.toggleMaximize(); }}
                                className="w-3.5 h-3.5 rounded-full bg-[#28C840] hover:bg-[#1EB332] border border-black/10 transition-all active:scale-95 shadow-sm"
                            ></button>
                        </div>
                    )}

                    {/* Drag Region */}
                    <div className="flex-1 h-6" data-tauri-drag-region></div>

                     {/* Profile Avatar (Top Right of Sidebar actually, since Search is below ?? Wait user said "Top Left above search") */}
                     {/* The User asked: "met en haut a gauche du logiciel au dessus de la barre de recherche la photo de profile de l'utilisateur" */}
                     {/* Currently Traffic lights are top left. If macOS style, traffic lights are there. */}
                     {/* If I put it top left, I might conflict with traffic lights if present. */}
                     {/* But the user asked for it. I will place it next to traffic lights or above search. */}
                </div>

                {/* Profile Header Block */}
                <div className="flex items-center gap-3 mb-2 px-1 pt-1">
                    <button onClick={onOpenAuth} className="relative group shrink-0">
                         {keyAuthService.isAuthenticated && keyAuthService.userData?.username ? (
                             <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-0.5 shadow-md group-hover:shadow-blue-500/20 transition-all">
                                 {localProfile?.avatar || settings?.avatarUrl ? (
                                     <img src={localProfile?.avatar || settings?.avatarUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
                                 ) : (
                                    <div className="w-full h-full rounded-full bg-[#2C2C2E] flex items-center justify-center text-xs font-bold text-white uppercase">
                                        {keyAuthService.userData.username.substring(0, 2)}
                                    </div>
                                 )}
                             </div>
                         ) : (
                             <div className="w-9 h-9 rounded-full bg-[#2C2C2E] flex items-center justify-center hover:bg-[#3A3A3C] transition-colors border border-white/5">
                                 <UserCircle className="w-5 h-5 text-gray-400" />
                             </div>
                         )}
                         <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1C1C1E] bg-green-500 opacity-0 transition-opacity group-hover:opacity-100"></div>
                    </button>
                    <div>
                        <div className="text-sm font-bold text-white leading-tight">
                            {keyAuthService.isAuthenticated ? (localProfile?.nickname || keyAuthService.userData?.username) : 'Invité'}
                        </div>
                        <div className="text-[10px] text-gray-400">
                             {keyAuthService.isAuthenticated ? (keyAuthService.getCurrentSubscriptionName() || 'Membre') : 'Non connecté'}
                        </div>
                    </div>
                </div>

                <div className="relative z-10 flex-1 group">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors duration-200" />
                    <input
                        type="text"
                        placeholder={t('sidebar.search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#2C2C2E] border border-transparent focus:border-blue-500/50 pl-9 pr-3 py-2 rounded-md text-sm outline-none shadow-sm transition-all duration-200 font-medium placeholder-gray-500 text-gray-100"
                    />
                </div>
            </div>

            {/* Note List */}
            <div className="flex-1 overflow-y-auto px-3 space-y-2 py-2">
                {filteredNotes.length === 0 ? (
                    <div className="text-center text-gray-400 mt-10 text-sm font-medium animate-fade-in">{t('sidebar.no_notes')}</div>
                ) : (
                    filteredNotes.map((note, index) => (
                        <div
                            key={note.id}
                            onClick={() => onSelectNote(note.id)}
                            onContextMenu={(e) => handleContextMenu(e, note.id)}
                            style={{ animationDelay: `${index * 0.05}s` }}
                            className={`
                group p-4 rounded-xl cursor-pointer transition-all duration-200 ease-out
                flex flex-col gap-1.5 border border-transparent animate-fade-in-up
                ${selectedNoteId === note.id
                                    ? 'bg-blue-600 text-white shadow-md scale-[1.02]'
                                    : 'hover:bg-white/10 text-white border-white/5 bg-transparent hover:scale-[1.01]'}
              `}
                        >
                            <h3 className={`font-bold text-[15px] truncate transition-colors ${selectedNoteId === note.id ? 'text-white' : 'text-white'}`}>
                                {note.title || t('sidebar.new_note')}
                            </h3>
                            <div className="flex justify-between items-baseline opacity-95">
                                <span className={`text-xs truncate max-w-[70%] font-medium transition-colors ${selectedNoteId === note.id ? 'text-blue-100' : 'text-gray-300'}`}>
                                    {note.content?.slice(0, 40) || t('sidebar.no_content')}
                                </span>
                                <span className={`text-[11px] whitespace-nowrap font-medium ${selectedNoteId === note.id ? 'text-blue-200' : 'text-gray-400'}`}>
                                    {(() => {
                                        try {
                                            return new Date(note.updatedAt).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
                                        } catch (e) {
                                            return "";
                                        }
                                    })()}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Context Menu */}
            {contextMenu.visible && (
                <div
                    className="fixed z-50 w-48 bg-[#2c2c2c] border border-white/10 rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDeleteNote(contextMenu.noteId);
                            setContextMenu({ ...contextMenu, visible: false });
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/10 flex items-center gap-2 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        {t('sidebar.delete')}
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            const note = notes.find(n => n.id === contextMenu.noteId);
                            if (note) {
                                exportNoteAsMarkdown(note).then(res => {
                                    if (res.success) alert(t('sidebar.export_success'));
                                });
                            }
                            setContextMenu({ ...contextMenu, visible: false });
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-white/10 flex items-center gap-2 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        {t('sidebar.export')}
                    </button>
                </div>
            )}

            {/* Footer Actions */}
            <div className="p-3 border-t border-white/10 flex flex-wrap justify-between items-end bg-black/40 backdrop-blur-md gap-2 min-h-[60px]">
                <div className="flex flex-wrap gap-1 items-center flex-1">
                    <button
                        onClick={handleImport}
                        className="p-2 text-gray-300 hover:text-green-400 transition-all duration-200 rounded-lg hover:bg-green-900/20 active:scale-95"
                        title={t('sidebar.import')}
                    >
                        <Upload className="w-5 h-5" />
                    </button>

                    <button
                        onClick={handleExport}
                        className="p-2 text-gray-300 hover:text-blue-400 transition-all duration-200 rounded-lg hover:bg-blue-900/20 active:scale-95"
                        title={t('sidebar.export')}
                    >
                        <Download className="w-5 h-5" />
                    </button>

                    <button
                        onClick={onOpenAuth}
                        className={`p-2 transition-all duration-200 rounded-lg active:scale-95 ${keyAuthService.isAuthenticated && keyAuthService.userData?.username ? 'text-green-400 hover:bg-green-900/20' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                        title={keyAuthService.isAuthenticated && keyAuthService.userData?.username ? `Compte: ${keyAuthService.userData.username}` : "Connexion / Inscription"}
                    >
                        <UserCircle className="w-5 h-5" />
                    </button>

                    <button
                        onClick={onOpenChat}
                        className="p-2 text-blue-400 hover:text-blue-300 transition-all duration-200 rounded-lg hover:bg-blue-900/20 active:scale-95"
                        title={t('sidebar.chat', 'Communauté')}
                    >
                        <MessageCircle className="w-5 h-5" />
                    </button>

                    <button
                        onClick={() => {
                            if (!keyAuthService.isAuthenticated) {
                                onOpenLicense();
                            } else {
                                // Already licensed/authenticated
                                // Optionally show a small notification or just do nothing as requested
                                // alert(t('license.already_active', 'Licence active'));
                                onOpenAuth(); // Show profile instead
                            }
                        }}
                        className={`p-2 transition-all duration-200 rounded-lg active:scale-95 ${keyAuthService.isAuthenticated ? 'text-green-500 hover:text-green-400 hover:bg-green-900/20' : 'text-orange-400 hover:text-orange-300 hover:bg-orange-900/20'}`}
                        title={keyAuthService.isAuthenticated ? "Licence Active" : t('sidebar.license', 'Licence')}
                    >
                        {keyAuthService.isAuthenticated ? <ShieldCheck className="w-5 h-5" /> : <Key className="w-5 h-5" />}
                    </button>

                    <button
                        onClick={onOpenSettings}
                        className="p-2 text-gray-300 hover:text-white transition-all duration-200 rounded-lg hover:bg-white/10 active:scale-95"
                        title={t('sidebar.settings')}
                    >
                        <Settings className="w-5 h-5" />
                    </button>

                    {(settings?.aiEnabled !== false) && (
                        <button
                            onClick={() => keyAuthService.hasAIAccess() ? onToggleDexter() : onOpenLicense()}
                            className={`p-2 transition-all duration-200 rounded-lg active:scale-95 relative ${keyAuthService.hasAIAccess() ? 'text-purple-400 hover:text-purple-300 hover:bg-purple-900/30' : 'text-gray-600 hover:text-gray-500 hover:bg-gray-800'}`}
                            title={keyAuthService.hasAIAccess() ? t('dexter.dexter_name') : t('license.required_desc')}
                        >
                            <Bot className="w-5 h-5" />
                            {!keyAuthService.hasAIAccess() && (
                                <Lock className="w-2.5 h-2.5 absolute -top-0.5 -right-0.5 text-orange-500 bg-[#1C1C1E] rounded-full" />
                            )}
                        </button>
                    )}
                </div>

                <div className="flex-shrink-0 flex items-center gap-1">
                    <button
                        onClick={onCreateNote}
                        className="p-2 text-gray-100 hover:text-blue-400 transition-all duration-200 rounded-lg hover:bg-blue-500/10 active:scale-95 bg-white/5 border border-white/10"
                        title={t('sidebar.new_note')}
                    >
                        <Plus className="w-5 h-5" />
                    </button>

                    <button
                        onClick={onDeleteNote}
                        className="p-2 text-gray-500 hover:text-red-600 transition-all duration-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95 group"
                        title={t('sidebar.delete')}
                    >
                        <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
}
