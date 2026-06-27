import { Icon as IconifyIcon } from '@iconify/react';
import { 
    Search, 
    Home, 
    Star, 
    Trash2, 
    Settings, 
    LogOut, 
    Plus,
    SearchX,
    X,
    Pencil
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { authService, dataService } from '../services/supabase';
import { getTagColorClasses, normalizeNoteTags } from '../utils/noteTags';
import { getSafePublicUrl } from '../utils/safeUrl';

import { PRESET_ICONS } from './NoteBadges';

function NoteSearchBox({ value, onChange, resultCount, totalCount, placeholder }) {
    const hasQuery = value.trim().length > 0;

    return (
        <div className="rounded-2xl border border-warm-border-light bg-warm-card-light/80 p-2 shadow-sm transition-all focus-within:border-amber-500/35 focus-within:ring-4 focus-within:ring-amber-500/10 dark:border-white/10 dark:bg-white/[0.06]">
            <div className="flex items-center gap-2">
                <Search size={14} className="shrink-0 text-warm-text-muted-light dark:text-warm-text-muted-dark" />
                <input
                    type="text"
                    placeholder={placeholder}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="h-7 min-w-0 flex-1 bg-transparent text-xs font-semibold text-warm-text-primary-light outline-none placeholder:text-warm-text-muted-light/60 dark:text-warm-text-primary-dark dark:placeholder:text-warm-text-muted-dark/60"
                />
                {hasQuery && (
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        className="rounded-lg p-1 text-warm-text-muted-light transition-all hover:bg-black/[0.04] hover:text-warm-text-primary-light dark:hover:bg-white/10 dark:hover:text-white"
                        aria-label="Effacer la recherche"
                    >
                        <X size={13} />
                    </button>
                )}
            </div>
            {hasQuery && (
                <p className="mt-1 px-6 text-[10px] font-bold text-warm-text-muted-light dark:text-warm-text-muted-dark">
                    {resultCount} résultat{resultCount > 1 ? 's' : ''} sur {totalCount}
                </p>
            )}
        </div>
    );
}

export default function UnifiedSidebar({ 
    notes = [], 
    selectedNoteId, 
    onSelectNote, 
    activeNav, 
    onNavigate,
    onOpenSettings,
    onOpenAuth,
    onOpenProfile,
    onRestoreNote,
    onToggleFavorite,
    onDeleteNote,
    onEmptyTrash,
    notebooks = [],
    onCreateNotebook,
    onRenameNotebook,
    onDeleteNotebook
}) {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, noteId: null });
    const [editingNotebookId, setEditingNotebookId] = useState('');
    const [notebookDraft, setNotebookDraft] = useState('');

    const getDisplayName = () => (
        profile?.nickname ||
        profile?.username ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.user_metadata?.nickname ||
        user?.email?.split('@')[0] ||
        'Compte Fiip'
    );

    const avatarUrl = getSafePublicUrl(profile?.avatar_url || profile?.avatar || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '');

    // Track user session
    useEffect(() => {
        let isMounted = true;
        authService.getUser().then(u => {
            if (isMounted) setUser(u);
        }).catch(console.error);
        dataService.fetchProfile().then(({ data }) => {
            if (isMounted) setProfile(data || null);
        }).catch(() => {});

        // Sub to auth changes
        const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
            if (isMounted) setUser(session?.user || null);
            if (session?.user) {
                dataService.fetchProfile().then(({ data }) => {
                    if (isMounted) setProfile(data || null);
                }).catch(() => {});
            } else {
                setProfile(null);
            }
        });

        const refreshLocalProfile = () => {
            try {
                const localProfile = JSON.parse(localStorage.getItem('fiip_public_profile') || 'null');
                if (localProfile && isMounted) setProfile((current) => ({ ...current, ...localProfile }));
            } catch {
                // Ignore invalid local profile cache.
            }
        };
        window.addEventListener('storage', refreshLocalProfile);

        return () => {
            isMounted = false;
            window.removeEventListener('storage', refreshLocalProfile);
            subscription?.unsubscribe();
        };
    }, []);

    const filteredNotes = useMemo(() => {
        let docs = notes || [];
        
        // Filter by Nav
        if (activeNav === 'favorites') {
            docs = docs.filter(n => n.favorite && !n.deleted);
        } else if (activeNav === 'trash') {
            docs = docs.filter(n => n.deleted);
        } else if (activeNav?.startsWith?.('notebook:')) {
            const notebookId = activeNav.replace('notebook:', '');
            docs = docs.filter(n => !n.deleted && (n.notebookId || n.notebook_id || n.folder_id || 'all-notes') === notebookId);
        } else {
            docs = docs.filter(n => !n.deleted);
        }

        // Filter by Search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            docs = docs.filter(n => 
                n.title?.toLowerCase().includes(query) || 
                n.content?.toLowerCase().includes(query)
            );
        }

        return docs;
    }, [notes, activeNav, searchQuery]);

    const navNotesCount = useMemo(() => {
        if (activeNav === 'favorites') return notes.filter((n) => n.favorite && !n.deleted).length;
        if (activeNav === 'trash') return notes.filter((n) => n.deleted).length;
        if (activeNav?.startsWith?.('notebook:')) {
            const notebookId = activeNav.replace('notebook:', '');
            return notes.filter((n) => !n.deleted && (n.notebookId || n.notebook_id || n.folder_id || 'all-notes') === notebookId).length;
        }
        return notes.filter((n) => !n.deleted).length;
    }, [activeNav, notes]);

    // Grouping notes by date groups: "AUJOURD'HUI", "HIER", "PLUS TÔT"
    const groupedNotes = useMemo(() => {
        const today = [];
        const yesterday = [];
        const earlier = [];

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

        filteredNotes.forEach(note => {
            const time = note.updatedAt || note.createdAt;
            if (time >= startOfToday) {
                today.push(note);
            } else if (time >= startOfYesterday) {
                yesterday.push(note);
            } else {
                earlier.push(note);
            }
        });

        return { today, yesterday, earlier };
    }, [filteredNotes]);

    const NAV_ITEMS = [
        { id: 'home', icon: <Home size={16} />, label: t('nav.home', 'Accueil') },
        { id: 'favorites', icon: <Star size={16} />, label: t('nav.favorites', 'Favoris') },
        { id: 'trash', icon: <Trash2 size={16} />, label: t('nav.trash', 'Corbeille') },
    ];

    const renderTagIcon = (tag) => {
        const isExternal = typeof tag.icon === 'string' && tag.icon.includes(':');
        const colorClasses = getTagColorClasses(tag.color);
        if (isExternal) {
            return <IconifyIcon icon={tag.icon} className={`h-3 w-3 ${colorClasses.text}`} />;
        }
        const Icon = PRESET_ICONS[tag.icon] || PRESET_ICONS.Tag;
        return <Icon className={`h-3 w-3 ${colorClasses.text}`} />;
    };

    const renderNoteItem = (note) => {
        const isSelected = selectedNoteId === note.id;
        const noteTags = normalizeNoteTags(note.tags || []);
        const openContextMenu = (event) => {
            event.preventDefault();
            event.stopPropagation();
            onSelectNote(note.id);
            const menuWidth = 220;
            const menuHeight = activeNav === 'trash' ? 118 : 104;
            const x = Math.max(8, Math.min(event.clientX, window.innerWidth - menuWidth - 8));
            const y = Math.max(8, Math.min(event.clientY, window.innerHeight - menuHeight - 8));
            setContextMenu({ visible: true, x, y, noteId: note.id });
        };

        return (
            <button
                key={note.id}
                onClick={() => onSelectNote(note.id)}
                onContextMenu={openContextMenu}
                className={`w-full text-left px-3.5 py-3 rounded-xl border transition-all duration-200 group relative overflow-hidden flex flex-col gap-1 ${
                    isSelected 
                        ? 'bg-warm-sidebar-item-active border-warm-border-light dark:border-warm-border-dark shadow-sm' 
                        : 'bg-transparent border-transparent hover:bg-warm-sidebar-item-active/50'
                }`}
            >
                <div className="flex items-center justify-between">
                    <h4 className={`text-xs font-semibold truncate pr-4 ${isSelected ? 'text-warm-text-primary-light dark:text-warm-text-primary-dark' : 'text-warm-text-primary-light/80 dark:text-warm-text-primary-dark/80 group-hover:text-warm-text-primary-light dark:group-hover:text-warm-text-primary-dark'}`}>
                        {note.title || t('common.untitled', 'Sans titre')}
                    </h4>
                    {note.favorite && (
                        <Star size={10} className="fill-amber-500 text-amber-500 shrink-0" />
                    )}
                </div>
                <p className="text-[10px] text-warm-text-secondary-light/70 dark:text-warm-text-secondary-dark/70 line-clamp-2 leading-relaxed">
                    {note.content?.replace(/<[^>]*>/g, '') || t('common.no_content', 'Pas de contenu')}
                </p>
                <div className="flex items-center justify-between mt-1 text-[8px] font-semibold text-warm-text-muted-light">
                    <span>{new Date(note.updatedAt || note.createdAt).toLocaleDateString()}</span>
                    {noteTags.length > 0 && activeNav !== 'trash' && (
                        <div className="ml-auto flex items-center -space-x-1">
                            {noteTags.slice(0, 4).map((tag) => (
                                <span
                                    key={tag.id}
                                    title={tag.label}
                                    className="flex h-5 w-5 items-center justify-center rounded-full border border-warm-border-light bg-warm-card-light shadow-sm dark:border-white/10 dark:bg-[#111316]"
                                >
                                    {renderTagIcon(tag)}
                                </span>
                            ))}
                        </div>
                    )}
                    {activeNav === 'trash' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onRestoreNote(note.id); }}
                            className="text-amber-600 dark:text-amber-400 font-bold hover:underline"
                        >
                            Restaurer
                        </button>
                    )}
                </div>
            </button>
        );
    };

    useEffect(() => {
        if (!contextMenu.visible) return undefined;
        const close = () => setContextMenu((current) => ({ ...current, visible: false }));
        window.addEventListener('click', close);
        window.addEventListener('keydown', close);
        return () => {
            window.removeEventListener('click', close);
            window.removeEventListener('keydown', close);
        };
    }, [contextMenu.visible]);

    const contextNote = notes.find((note) => note.id === contextMenu.noteId);

    return (
        <aside className="w-80 h-full flex flex-col border-r border-warm-border-light dark:border-warm-border-dark bg-warm-sidebar-light/70 dark:bg-warm-sidebar-dark/70 backdrop-blur-2xl relative z-10 overflow-hidden select-none">
            {/* Header Area */}
            <div className="p-4 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tracking-tight">Fiip</span>
                </div>

                <NoteSearchBox
                    value={searchQuery}
                    onChange={setSearchQuery}
                    resultCount={filteredNotes.length}
                    totalCount={navNotesCount}
                    placeholder={t('common.search_notes', 'Rechercher une note...')}
                />

                {/* Main Nav */}
                <nav className="flex flex-col gap-0.5">
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-150 ${
                                activeNav === item.id 
                                    ? 'bg-warm-sidebar-item-active text-warm-text-primary-light dark:text-warm-text-primary-dark font-semibold' 
                                    : 'text-warm-text-secondary-light dark:text-warm-text-secondary-dark hover:bg-warm-sidebar-item-active/50'
                            }`}
                        >
                            <div className="flex items-center gap-2.5">
                                <span className={`${activeNav === item.id ? 'text-amber-600 dark:text-amber-400' : 'text-warm-text-muted-light'} transition-colors`}>{item.icon}</span>
                                <span className="text-xs font-semibold">{item.label}</span>
                            </div>
                        </button>
                    ))}
                </nav>

                <div className="space-y-2 rounded-2xl border border-warm-border-light bg-warm-card-light/60 p-2 dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-semibold text-warm-text-muted-light">Carnets</span>
                        <button
                            type="button"
                            onClick={onCreateNotebook}
                            className="rounded-lg p-1 text-warm-text-muted-light hover:bg-black/[0.04] hover:text-amber-600 dark:hover:bg-white/10"
                            title="Nouveau carnet"
                        >
                            <Plus size={12} />
                        </button>
                    </div>
                    <div className="max-h-28 space-y-0.5 overflow-y-auto pr-1">
                        {notebooks.map((notebook) => {
                            const id = notebook.id || notebook.notebook_id || 'all-notes';
                            const navId = `notebook:${id}`;
                            const isEditing = editingNotebookId === id;
                            const count = id === 'all-notes'
                                ? notes.filter((note) => !note.deleted).length
                                : notes.filter((note) => !note.deleted && (note.notebookId || note.notebook_id || note.folder_id || 'all-notes') === id).length;
                            return (
                                <div
                                    key={id}
                                    className={`group flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-[11px] font-bold transition-all ${
                                        activeNav === navId
                                            ? 'bg-amber-500/12 text-amber-700 dark:text-amber-300'
                                            : 'text-warm-text-secondary-light hover:bg-black/[0.04] dark:text-warm-text-secondary-dark dark:hover:bg-white/10'
                                    }`}
                                >
                                    {isEditing ? (
                                        <form
                                            className="min-w-0 flex-1"
                                            onSubmit={(event) => {
                                                event.preventDefault();
                                                const nextName = notebookDraft.trim();
                                                if (nextName) onRenameNotebook?.(notebook, nextName);
                                                setEditingNotebookId('');
                                            }}
                                        >
                                            <input
                                                autoFocus
                                                value={notebookDraft}
                                                onChange={(event) => setNotebookDraft(event.target.value)}
                                                onBlur={() => setEditingNotebookId('')}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Escape') setEditingNotebookId('');
                                                }}
                                                className="h-6 w-full rounded-lg border border-amber-500/30 bg-white px-2 text-[11px] font-bold outline-none dark:bg-[#111316]"
                                            />
                                        </form>
                                    ) : (
                                        <button type="button" onClick={() => onNavigate(navId)} className="min-w-0 flex-1 truncate text-left">
                                            {notebook.name || 'Toutes les notes'}
                                        </button>
                                    )}
                                    <span className="mr-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] leading-none text-warm-text-muted-light">{count}</span>
                                    {id !== 'all-notes' && !isEditing && (
                                        <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingNotebookId(id);
                                                    setNotebookDraft(notebook.name || '');
                                                }}
                                                className="rounded-md p-1 text-warm-text-muted-light hover:bg-black/5 hover:text-amber-600 dark:hover:bg-white/10"
                                                aria-label={`Renommer ${notebook.name}`}
                                                title="Renommer"
                                            >
                                                <Pencil size={11} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onDeleteNotebook?.(notebook)}
                                                className="rounded-md p-1 text-warm-text-muted-light hover:bg-red-500/10 hover:text-red-500"
                                                aria-label={`Supprimer ${notebook.name}`}
                                                title="Supprimer"
                                            >
                                                <Trash2 size={11} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-hide">
                <div className="flex items-center mt-2 justify-between px-2 mb-2">
                    <h3 className="text-[10px] font-semibold text-warm-text-muted-light dark:text-warm-text-muted-dark">
                        {activeNav === 'trash' ? 'Notes Supprimées' : 'Notes'}
                    </h3>
                    {activeNav === 'trash' && filteredNotes.length > 0 && (
                        <button 
                            onClick={onEmptyTrash}
                            className="text-[10px] text-red-500/80 hover:text-red-500 font-semibold transition-colors"
                        >
                            Vider
                        </button>
                    )}
                </div>

                <div className="space-y-4">
                    {/* TODAY */}
                    {groupedNotes.today.length > 0 && (
                        <div className="space-y-1">
                            <div className="px-2 text-[10px] font-semibold text-warm-text-muted-light/65 dark:text-warm-text-muted-dark/55">Aujourd'hui</div>
                            <div className="space-y-1">{groupedNotes.today.map(renderNoteItem)}</div>
                        </div>
                    )}

                    {/* YESTERDAY */}
                    {groupedNotes.yesterday.length > 0 && (
                        <div className="space-y-1">
                            <div className="px-2 text-[10px] font-semibold text-warm-text-muted-light/65 dark:text-warm-text-muted-dark/55">Hier</div>
                            <div className="space-y-1">{groupedNotes.yesterday.map(renderNoteItem)}</div>
                        </div>
                    )}

                    {/* EARLIER */}
                    {groupedNotes.earlier.length > 0 && (
                        <div className="space-y-1">
                            <div className="px-2 text-[10px] font-semibold text-warm-text-muted-light/65 dark:text-warm-text-muted-dark/55">Plus tôt</div>
                            <div className="space-y-1">{groupedNotes.earlier.map(renderNoteItem)}</div>
                        </div>
                    )}

                    {filteredNotes.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                            <div className="w-10 h-10 rounded-full bg-warm-sidebar-item-active flex items-center justify-center text-warm-text-muted-light mb-3">
                                <SearchX size={16} />
                            </div>
                            <p className="text-[11px] font-medium text-warm-text-muted-light leading-relaxed">
                                {searchQuery ? 'Aucun résultat' : 'Aucune note'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Area */}
            <div className="p-3 border-t border-warm-border-light dark:border-warm-border-dark bg-warm-sidebar-light/50 dark:bg-warm-sidebar-dark/30">
                <div className="flex items-center justify-between">
                    {user ? (
                        <button 
                            onClick={onOpenProfile}
                            className="flex items-center gap-2 p-1.5 hover:bg-warm-sidebar-item-active/50 rounded-xl transition-all group max-w-[65%]"
                        >
                            {avatarUrl ? (
                                <img src={avatarUrl} alt={getDisplayName()} className="h-7 w-7 rounded-lg border border-warm-border-light object-cover dark:border-white/10" />
                            ) : (
                                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[11px] font-semibold text-amber-700 dark:text-amber-300 shrink-0">
                                    {getDisplayName().slice(0, 2).toUpperCase()}
                                </div>
                            )}
                            <div className="flex flex-col text-left overflow-hidden">
                                <span className="text-[10px] font-bold text-warm-text-primary-light dark:text-warm-text-primary-dark leading-tight truncate">
                                    {getDisplayName()}
                                </span>
                                <span className="text-[8px] text-warm-text-muted-light font-semibold uppercase tracking-tighter">Premium</span>
                            </div>
                        </button>
                    ) : (
                        <button 
                            onClick={onOpenAuth}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C1C1E] hover:bg-[#2C2C2E] dark:bg-white dark:hover:bg-[#E5E5E3] text-white dark:text-black rounded-xl transition-all shadow-sm font-semibold text-[11px]"
                        >
                            <Plus size={12} />
                            <span>Connexion</span>
                        </button>
                    )}
                    
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={onOpenSettings}
                            className="p-2 text-warm-text-muted-light hover:text-warm-text-primary-light hover:bg-warm-sidebar-item-active/50 rounded-xl transition-all"
                            title="Réglages"
                        >
                            <Settings size={15} />
                        </button>
                        {user && (
                            <button 
                                onClick={() => authService.signOut()}
                                className="p-2 text-warm-text-muted-light hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
                                title="Déconnexion"
                            >
                                <LogOut size={15} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {contextMenu.visible && contextNote && createPortal(
                <div
                    className="fixed z-[10000] w-56 overflow-hidden rounded-2xl border border-black/10 bg-[#fbfaf6]/95 p-1.5 text-sm shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#111316]/95"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onContextMenu={(event) => event.preventDefault()}
                >
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onToggleFavorite?.(contextNote.id);
                            setContextMenu((current) => ({ ...current, visible: false }));
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-warm-text-secondary-light transition-all hover:bg-black/[0.04] dark:text-warm-text-secondary-dark dark:hover:bg-white/10"
                    >
                        <Star size={14} className={contextNote.favorite ? 'fill-amber-500 text-amber-500' : ''} />
                        {contextNote.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    </button>
                    {activeNav === 'trash' && (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onRestoreNote?.(contextNote.id);
                                setContextMenu((current) => ({ ...current, visible: false }));
                            }}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-emerald-600 transition-all hover:bg-emerald-500/10 dark:text-emerald-300"
                        >
                            <Plus size={14} />
                            Restaurer
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onDeleteNote?.(contextNote.id);
                            setContextMenu((current) => ({ ...current, visible: false }));
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-red-600 transition-all hover:bg-red-500/10 dark:text-red-300"
                    >
                        <Trash2 size={14} />
                        {activeNav === 'trash' ? 'Supprimer définitivement' : 'Supprimer'}
                    </button>
                </div>,
                document.body
            )}
        </aside>
    );
}
