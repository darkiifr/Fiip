import React, { useState } from 'react';
import { Plus, Search, Trash2, StarOff, ArchiveRestore, XCircle, Star, Heart, Flag, Bookmark, Tag, AlertCircle, Info, CheckCircle, Hash, Zap, Trophy, Flame } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const BADGE_ICONS = {
    Star, Heart, Flag, Bookmark, Tag, AlertCircle, Info, CheckCircle, Hash, Zap, Trophy, Flame
};

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
    onEmptyTrash
}) {
    const { t, i18n } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, noteId: null });

    const filteredNotes = (notes || []).filter(note =>
        (note.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (note.content || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleContextMenu = (e, noteId) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            noteId
        });
    };

    React.useEffect(() => {
        const handleClick = () => setContextMenu({ ...contextMenu, visible: false });
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [contextMenu]);

    return (
        <div className="flex flex-col h-full bg-[#1C1C1E]/95 border-r border-white/10" style={{ width: '320px', minWidth: '280px', maxWidth: '320px' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-[16px] h-[52px] box-border shrink-0">
                <span className="text-sm font-semibold text-white/90 px-2">{
                    activeNav === 'favorites' ? (t('sidebar.favorites') || "Favorites") :
                    activeNav === 'trash' ? (t('sidebar.trash') || "Trash") :
                    (t('sidebar.all_notes') || "Notes")
                }</span>
                
                {activeNav === 'trash' ? (
                    <button 
                        onClick={onEmptyTrash}
                        className="h-[32px] px-[16px] py-[8px] bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 text-[13px] font-medium rounded-[6px] transition-colors duration-[250ms] ease-in-out flex items-center gap-2 border border-red-500/20"
                        title={t('sidebar.empty_trash') || "Empty Trash"}
                    >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('sidebar.empty') || "Vider"}</span>
                    </button>
                ) : (
                    <button 
                        onClick={() => onCreateNote({})}
                        className="h-[32px] px-[16px] py-[8px] bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-medium rounded-[6px] transition-colors duration-[250ms] ease-in-out flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        {t('sidebar.new_note') || "New Note"}
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="px-4 pb-[4px]">
                <div className="relative group">
                    <Search className="w-4 h-4 absolute left-[12px] top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors duration-[150ms] ease-out" />
                    <input
                        type="text"
                        placeholder={t('sidebar.search_placeholder') || "Search"}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-[32px] bg-[#2C2C2E] border border-transparent focus:border-blue-500/50 pl-[36px] pr-[12px] rounded-[8px] text-sm outline-none transition-all duration-[250ms] ease-in-out text-gray-100 placeholder-gray-500"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-2 custom-scrollbar">
                {filteredNotes.length === 0 ? (
                    <div className="text-center text-gray-500 mt-10 text-sm">{t('sidebar.no_notes') || "No notes"}</div>
                ) : (
                    filteredNotes.map((note) => (
                        <div
                            key={note.id}
                            onClick={() => onSelectNote(note.id)}
                            onContextMenu={(e) => handleContextMenu(e, note.id)}
                            className={`
                                group px-[16px] py-[12px] rounded-[8px] cursor-pointer transition-all duration-[150ms] ease-out
                                flex flex-col gap-[6px] border border-transparent min-h-[72px] mb-[8px]
                                ${selectedNoteId === note.id
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'hover:bg-white/5 text-gray-300 border-transparent'}
                            `}
                        >
                            <h3 className={`font-semibold text-[15px] leading-5 truncate ${selectedNoteId === note.id ? 'text-white' : 'text-gray-200'}`}>
                                {note.title || t('sidebar.new_note') || "Untitled"}
                            </h3>
                            <div className={`text-[13px] leading-[18px] line-clamp-2 ${selectedNoteId === note.id ? 'text-blue-100' : 'text-gray-400'}`}>
                                {note.content || t('sidebar.no_content') || "No content"}
                            </div>
                            <div className="flex items-center justify-between mt-[8px]">
                                <span className={`text-[11px] ${selectedNoteId === note.id ? 'text-blue-200' : 'text-gray-500'}`}>
                                    {(() => {
                                        try {
                                            return new Date(note.updatedAt).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
                                        } catch {
                                            return "";
                                        }
                                    })()}
                                </span>
                                {note.badges && note.badges.length > 0 && (
                                    <div className="flex items-center -space-x-1">
                                        {note.badges.slice(0, 3).map((badge, idx) => {
                                            const Icon = BADGE_ICONS[badge.icon] || Tag;
                                            const colorClass = BADGE_COLORS[badge.color] || 'text-gray-400';
                                            return (
                                                <div key={idx} className={`w-4 h-4 rounded-full flex items-center justify-center bg-[#2C2C2E] border border-[#1C1C1E] ring-1 ring-[#1C1C1E] relative z-${10-idx}`} title={badge.label}>
                                                    <Icon className={`w-2.5 h-2.5 ${colorClass}`} />
                                                </div>
                                            );
                                        })}
                                        {note.badges.length > 3 && (
                                            <div className="w-4 h-4 rounded-full flex items-center justify-center bg-[#2C2C2E] border border-[#1C1C1E] text-[8px] text-gray-400 font-bold z-0 ring-1 ring-[#1C1C1E] relative">
                                                +{note.badges.length - 3}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Context Menu */}
            {contextMenu.visible && (
                <div
                    className="fixed z-50 w-48 bg-[#2C2C2E] border border-white/10 rounded-lg shadow-xl py-1"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite && onToggleFavorite(contextMenu.noteId);
                            setContextMenu({ ...contextMenu, visible: false });
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/5 flex items-center gap-2 transition-colors duration-[150ms] ease-out"
                    >
                        {notes.find(n => n.id === contextMenu.noteId)?.favorite ? (
                             <>
                                <StarOff className="w-4 h-4 text-gray-400" />
                                {t('sidebar.unfavorite') || "Unfavorite"}
                             </>
                        ) : (
                             <>
                                <Star className="w-4 h-4 text-gray-400" />
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
                            className="w-full text-left px-3 py-2 text-sm text-green-400 hover:bg-white/5 flex items-center gap-2 transition-colors duration-[150ms] ease-out"
                        >
                            <ArchiveRestore className="w-4 h-4" />
                            {t('sidebar.restore') || "Restore"}
                        </button>
                    ) : null}

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDeleteNote(contextMenu.noteId);
                            setContextMenu({ ...contextMenu, visible: false });
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-white/5 flex items-center gap-2 transition-colors duration-[150ms] ease-out"
                    >
                        {activeNav === 'trash' ? (
                            <>
                                <XCircle className="w-4 h-4" />
                                {t('sidebar.delete_permanently') || "Delete Permanently"}
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-4 h-4" />
                                {t('sidebar.delete') || "Delete"}
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
