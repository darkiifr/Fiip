import { Icon as IconifyIcon } from '@iconify/react';
import { Tag } from 'lucide-react';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

// Icons Import (Pim's Edition)
import { useUI } from '../providers/UIProvider';

import { PRESET_ICONS } from './NoteBadges';
import { LiquidGlassPrimitive } from './ui/LiquidGlassPrimitive';

import IconPlus from '~icons/mingcute/add-fill';
import IconRestore from '~icons/mingcute/back-2-fill';
import IconDeletePermanent from '~icons/mingcute/close-circle-fill';
import IconTrash from '~icons/mingcute/delete-2-fill';
import IconSearch from '~icons/mingcute/search-line';
import IconStarOn from '~icons/mingcute/star-fill';
import IconStarOff from '~icons/mingcute/star-line';



const BADGE_COLORS = [
    'text-red-400', 'text-orange-400', 'text-yellow-400', 'text-green-400', 'text-blue-400', 'text-indigo-400', 'text-purple-400', 'text-pink-400', 'text-gray-400'
];

export default function NoteList({ 
    notes, 
    selectedNoteId, 
    onSelectNote, 
    onCreateNote, 
    onDeleteNote,
    onRestoreNote,
    onToggleFavorite,
    activeNav,
    onEmptyTrash,
    settings
}) {
    const { t, i18n } = useTranslation();
    const { theme } = useUI();
    const [searchTerm, setSearchTerm] = useState('');
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, noteId: null });
    const isTransparent = settings?.windowEffect && settings.windowEffect !== 'none';

    const getNavFilteredNotes = () => {
        const baseNotes = notes || [];
        if (activeNav === 'trash') {
            return baseNotes.filter(n => n.deleted);
        } else if (activeNav === 'favorites') {
            return baseNotes.filter(n => n.favorite && !n.deleted);
        } else if (activeNav === 'shared') {
            return baseNotes.filter(n => (n.shared || n.public_slug) && !n.deleted);
        }
        // home or other
        return baseNotes.filter(n => !n.deleted);
    };

    const filteredNotes = getNavFilteredNotes().filter(note =>
        (note.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (note.content || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleContextMenu = (e, noteId) => {
        e.preventDefault();
        e.stopPropagation();
        onSelectNote(noteId);
        
        // Prevent menu from going off screen
        const menuWidth = 192; // w-48
        const menuHeight = 160; // Approx height

        let x = e.clientX;
        let y = e.clientY;

        // If passing right edge, move left of cursor
        if (x + menuWidth > window.innerWidth) {
            x = x - menuWidth;
        }
        
        // If passing bottom edge, move up
        if (y + menuHeight > window.innerHeight) {
            y = y - menuHeight;
        }

        // Ensure it doesn't got off top/left
        x = Math.max(0, x);
        y = Math.max(0, y);

        setContextMenu({
            visible: true,
            x,
            y,
            noteId
        });
    };

    React.useEffect(() => {
        const handleClick = () => setContextMenu({ ...contextMenu, visible: false });
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [contextMenu]);

    return (
        <LiquidGlassPrimitive 
            className="flex flex-col h-full border-r border-white/10" 
            variant={theme === 'liquid-glass' ? 'default' : 'subtle'}
            style={{ 
                width: '320px', 
                minWidth: '280px', 
                maxWidth: '320px',
                borderRadius: 0,
                background: theme === 'liquid-glass' ? undefined : (isTransparent ? '#1C1C1E40' : '#1C1C1E')
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-13 box-border shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white/90 px-2">{
                        activeNav === 'favorites' ? (t('sidebar.favorites') || "Favorites") :
                        activeNav === 'trash' ? (t('sidebar.trash') || "Trash") :
                        (t('sidebar.all_notes') || "Notes")
                    }</span>
                </div>
                
                {activeNav === 'trash' ? (
                    <button 
                        onClick={onEmptyTrash}
                        className="h-8 px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 text-[13px] font-medium rounded-md transition-colors duration-250 ease-in-out flex items-center gap-2 border border-red-500/20"
                        title={t('sidebar.empty_trash') || "Empty Trash"}
                    >
                        <IconTrash className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('sidebar.empty') || "Vider"}</span>
                    </button>
                ) : (
                    <button 
                        onClick={() => onCreateNote({})}
                        className="h-8 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-medium rounded-md transition-colors duration-250 ease-in-out flex items-center gap-2"
                    >
                        <IconPlus className="w-4 h-4" />
                        {t('sidebar.new_note') || "New Note"}
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="px-4 pb-1">
                <div className="relative group">
                    <IconSearch className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors duration-150 ease-out" />
                    <input
                        type="text"
                        placeholder={t('sidebar.search_placeholder') || "Search"}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`
                            w-full h-8 pl-9 pr-3 rounded-lg text-sm outline-none transition-all duration-250 ease-in-out text-gray-100 placeholder-gray-500
                            ${theme === 'liquid-glass' 
                                ? 'bg-white/5 border border-white/10 focus:bg-white/10 focus:border-blue-500/50' 
                                : 'bg-[#2C2C2E] border border-transparent focus:border-blue-500/50'}
                        `}
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-3 custom-scrollbar">
                {filteredNotes.length === 0 ? (
                    <div className="text-center text-white/20 mt-10 text-xs font-bold uppercase tracking-widest">{t('sidebar.no_notes') || "No notes"}</div>
                ) : (
                    filteredNotes.map((note) => (
                        <div
                            key={note.id}
                            onClick={() => onSelectNote(note.id)}
                            onContextMenu={(e) => handleContextMenu(e, note.id)}
                            className={`
                                group px-4 py-4 rounded-2xl cursor-pointer transition-all duration-300 ease-out
                                flex flex-col gap-2 border min-h-[84px] mb-3 relative overflow-hidden
                                ${selectedNoteId === note.id
                                    ? (theme === 'liquid-glass' ? 'bg-blue-600/90 border-blue-400/40 shadow-[0_8px_20px_rgba(59,130,246,0.4)]' : 'bg-blue-600 border-transparent text-white shadow-lg scale-[1.02]')
                                    : (theme === 'liquid-glass' ? 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20 hover:scale-[1.01]' : 'hover:bg-white/5 border-transparent text-gray-300')}
                            `}
                        >
                            {/* Glass overlay on hover */}
                            <div className="absolute inset-0 bg-linear-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            
                            <h3 className={`font-bold text-[15px] leading-tight truncate relative z-10 ${selectedNoteId === note.id ? 'text-white' : 'text-white/90'}`}>
                                {note.title || "Note sans titre"}
                            </h3>
                            <div className={`text-[12px] leading-relaxed line-clamp-2 relative z-10 ${selectedNoteId === note.id ? 'text-white/80' : 'text-white/30'}`}>
                                {(() => {
                                    if (!note.content) {return "Aucun contenu";}
                                    const tempDiv = document.createElement('div');
                                    tempDiv.innerHTML = note.content;
                                    return tempDiv.textContent || tempDiv.innerText || "";
                                })() || "Aucun contenu"}
                            </div>
                            <div className="flex items-center justify-between mt-1 relative z-10">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${selectedNoteId === note.id ? 'text-white/60' : 'text-white/20'}`}>
                                    {(() => {
                                        try {
                                            return new Date(note.updatedAt).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
                                        } catch {
                                            return "";
                                        }
                                    })()}
                                </span>
                                {note.favorite && (
                                    <IconStarOn className={`w-3.5 h-3.5 ${selectedNoteId === note.id ? 'text-white' : 'text-yellow-500'} opacity-80`} />
                                )}
                                {note.badges && note.badges.length > 0 && (
                                    <div className="flex items-center -space-x-1.5 ml-2">
                                        {note.badges.slice(0, 3).map((badge, idx) => {
                                            const isSkill = badge.icon && (badge.icon.startsWith('skill-icons:') || badge.icon.startsWith('logos:') || badge.icon.startsWith('devicon:') || badge.icon.startsWith('vscode-icons:') || badge.icon.startsWith('formkit:'));
                                            const colorClass = BADGE_COLORS[badge.color] || 'text-gray-400';
                                            return (
                                                <div key={idx} className={`w-5 h-5 rounded-full flex items-center justify-center bg-[#2C2C2E] border border-white/10 ring-2 ring-transparent relative z-${10-idx} shadow-sm group-hover:ring-white/5 transition-all`} title={badge.label}>
                                                    {isSkill ? (
                                                        <IconifyIcon icon={badge.icon} className="w-3 h-3" />
                                                    ) : (() => {
                                                        const Icon = PRESET_ICONS[badge.icon] || Tag;
                                                        return <Icon className={`w-3 h-3 ${colorClass}`} />;
                                                    })()}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Context Menu */}
            {contextMenu.visible && createPortal(
                <div
                    className={`fixed z-99999 w-48 rounded-lg shadow-xl py-1 text-white font-sans border border-white/10 ${theme === 'liquid-glass' ? 'bg-sidebar-dark/80 backdrop-blur-xl' : 'bg-[#2C2C2E]'}`}
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onContextMenu={(e) => e.preventDefault()}
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite && onToggleFavorite(contextMenu.noteId);
                            setContextMenu({ ...contextMenu, visible: false });
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/5 flex items-center gap-2 transition-colors duration-150 ease-out"
                    >
                        {notes.find(n => n.id === contextMenu.noteId)?.favorite ? (
                             <>
                                <IconStarOff className="w-4 h-4 text-gray-400" />
                                {t('sidebar.unfavorite') || "Unfavorite"}
                             </>
                        ) : (
                             <>
                                <IconStarOn className="w-4 h-4 text-gray-400" />
                                {t('sidebar.favorite') || "Favorite"}
                             </>
                        )}
                    </button>
                    
                    {activeNav === 'trash' ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRestoreNote && onRestoreNote(contextMenu.noteId);
                                setContextMenu({ ...contextMenu, visible: false });
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-green-400 hover:bg-white/5 flex items-center gap-2 transition-colors duration-150 ease-out"
                        >
                            <IconRestore className="w-4 h-4" />
                            {t('sidebar.restore') || "Restore"}
                        </button>
                    ) : null}

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDeleteNote(contextMenu.noteId);
                            setContextMenu({ ...contextMenu, visible: false });
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-white/5 flex items-center gap-2 transition-colors duration-150 ease-out"
                    >
                        {activeNav === 'trash' ? (
                            <>
                                <IconDeletePermanent className="w-4 h-4" />
                                {t('sidebar.delete_permanently') || "Delete Permanently"}
                            </>
                        ) : (
                            <>
                                <IconTrash className="w-4 h-4" />
                                {t('sidebar.delete') || "Delete"}
                            </>
                        )}
                    </button>
                </div>,
                document.body
            )}
        </LiquidGlassPrimitive>
    );
}
