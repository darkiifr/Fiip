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
import { useTranslation } from 'react-i18next';

import { authService, dataService } from '../services/supabase';
import { stripNoteText } from '../utils/notePresentation';
import { getTagColorClasses, normalizeNoteTags } from '../utils/noteTags';
import { getSafeImageUrl, sanitizeDomText } from '../utils/safeUrl';

import { PRESET_ICONS } from './NoteBadges';

function NoteSearchBox({ value, onChange, resultCount, totalCount, placeholder, clearLabel, resultLabel }) {
    const hasQuery = value.trim().length > 0;

    return (
        <div className="rounded-2xl border border-warm-border-dark bg-warm-card-dark/80 p-2 shadow-sm transition-all focus-within:border-amber-500/35 focus-within:ring-4 focus-within:ring-amber-500/10 dark:border-white/10 dark:bg-white/[0.06]">
            <div className="flex items-center gap-2">
                <Search size={14} className="shrink-0 text-warm-text-muted-dark dark:text-warm-text-muted-dark" />
                <input
                    type="text"
                    placeholder={placeholder}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="h-7 min-w-0 flex-1 bg-transparent text-xs font-semibold text-warm-text-primary-dark outline-none placeholder:text-warm-text-muted-dark/60 dark:text-warm-text-primary-dark dark:placeholder:text-warm-text-muted-dark/60"
                />
                {hasQuery && (
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        className="rounded-lg p-1 text-warm-text-muted-dark transition-all hover:bg-black/[0.04] hover:text-warm-text-primary-dark dark:hover:bg-white/10 dark:hover:text-white"
                        aria-label={clearLabel}
                    >
                        <X size={13} />
                    </button>
                )}
            </div>
            {hasQuery && (
                <p className="mt-1 px-6 text-[10px] font-bold text-warm-text-muted-dark dark:text-warm-text-muted-dark">
                    {resultLabel}
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
    onCreateNote,
    onRestoreNote,
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
    const [editingNotebookId, setEditingNotebookId] = useState('');
    const [notebookDraft, setNotebookDraft] = useState('');

    const getRawDisplayName = () => (
        profile?.nickname ||
        profile?.username ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.user_metadata?.nickname ||
        user?.email?.split('@')[0] ||
        'Compte Fiip'
    );

    const displayName = sanitizeDomText(getRawDisplayName(), 'Compte Fiip');
    const avatarUrl = getSafeImageUrl(profile?.avatar_url || profile?.avatar || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '');

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
            docs = notebookId === 'all-notes'
                ? docs.filter(n => !n.deleted)
                : docs.filter(n => !n.deleted && (n.notebookId || n.notebook_id || n.folder_id || 'all-notes') === notebookId);
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
            if (notebookId === 'all-notes') return notes.filter((n) => !n.deleted).length;
            return notes.filter((n) => !n.deleted && (n.notebookId || n.notebook_id || n.folder_id || 'all-notes') === notebookId).length;
        }
        return notes.filter((n) => !n.deleted).length;
    }, [activeNav, notes]);

    const notebookStats = useMemo(() => {
        const stats = new Map();
        const ensure = (id) => {
            if (!stats.has(id)) {
                stats.set(id, { notes: 0, favorites: 0, lastUpdatedAt: 0 });
            }
            return stats.get(id);
        };

        notes.forEach((note) => {
            if (note.deleted) return;
            const id = note.notebookId || note.notebook_id || note.folder_id || 'all-notes';
            const item = ensure(id);
            item.notes += 1;
            if (note.favorite) item.favorites += 1;
            item.lastUpdatedAt = Math.max(item.lastUpdatedAt, Number(note.updatedAt || Date.parse(note.updated_at || '') || 0));

            const allNotes = ensure('all-notes');
            if (id !== 'all-notes') {
                allNotes.notes += 1;
                if (note.favorite) allNotes.favorites += 1;
                allNotes.lastUpdatedAt = Math.max(allNotes.lastUpdatedAt, item.lastUpdatedAt);
            }
        });

        return stats;
    }, [notes]);

    const activeNotebookId = activeNav?.startsWith?.('notebook:') ? activeNav.replace('notebook:', '') : 'all-notes';
    const canCreateNoteInCurrentView = activeNav !== 'trash' && activeNav !== 'favorites';

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
        return (
            <button
                key={note.id}
                onClick={() => onSelectNote(note.id)}
                className={`w-full text-left px-3.5 py-3 rounded-xl border transition-all duration-200 group relative overflow-hidden flex flex-col gap-1 ${
                    isSelected 
                        ? 'bg-warm-card-dark/86 border-warm-border-dark dark:border-warm-border-dark shadow-sm dark:bg-white/[0.07]' 
                        : 'bg-transparent border-transparent hover:bg-warm-sidebar-item-active/70'
                }`}
            >
                <div className="flex items-center justify-between">
                    <h4 className={`fiip-dark-note-title text-xs font-semibold truncate pr-4 ${isSelected ? 'text-warm-text-primary-dark dark:text-warm-text-primary-dark' : 'text-warm-text-primary-dark/95 dark:text-warm-text-primary-dark/80 group-hover:text-warm-text-primary-dark dark:group-hover:text-warm-text-primary-dark'}`}>
                        {note.title || t('common.untitled', 'Sans titre')}
                    </h4>
                    {note.favorite && (
                        <Star size={10} className="fill-amber-500 text-amber-500 shrink-0" />
                    )}
                </div>
                <p className="text-[10px] text-warm-text-secondary-dark/85 dark:text-warm-text-secondary-dark/70 line-clamp-2 leading-relaxed">
                    {stripNoteText(note.content) || t('common.no_content', 'Pas de contenu')}
                </p>
                <div className="flex items-center justify-between mt-1 text-[8px] font-semibold text-warm-text-muted-dark dark:text-warm-text-muted-dark">
                    <span>{new Date(note.updatedAt || note.createdAt).toLocaleDateString()}</span>
                    {noteTags.length > 0 && activeNav !== 'trash' && (
                        <div className="ml-auto flex items-center -space-x-1">
                            {noteTags.slice(0, 4).map((tag) => (
                                <span
                                    key={tag.id}
                                    title={tag.label}
                                    className="flex h-5 w-5 items-center justify-center rounded-full border border-warm-border-dark bg-warm-card-dark shadow-sm dark:border-white/10 dark:bg-[#111316]"
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
                            {t('sidebar.restore', 'Restore')}
                        </button>
                    )}
                </div>
            </button>
        );
    };

    const formatCount = (key, count) => t(key, '{{count}}', { count });
    const emptyDateLabel = t('sidebar.no_note_date', 'No note');
    const newNoteLabel = activeNotebookId === 'all-notes'
        ? t('sidebar.new_note', 'New note')
        : t('sidebar.new_note_in_notebook', 'New note in this notebook');

    return (
        <aside className="fiip-dark-sidebar w-80 h-full flex flex-col border-r border-warm-border-dark dark:border-warm-border-dark bg-warm-sidebar-dark/90 dark:bg-warm-sidebar-dark/82 backdrop-blur-2xl relative z-10 overflow-hidden select-none text-warm-text-primary-dark dark:text-warm-text-primary-dark">
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
                    clearLabel={t('common.clear_search', 'Clear search')}
                    resultLabel={t('common.search_results_count', '{{count}} result(s) out of {{total}}', { count: filteredNotes.length, total: navNotesCount })}
                />

                {/* Main Nav */}
                <nav className="flex flex-col gap-0.5">
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className={`fiip-dark-nav-item flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-150 ${
                                activeNav === item.id 
                                    ? 'fiip-dark-nav-item-active bg-warm-sidebar-item-active text-warm-text-primary-dark dark:text-warm-text-primary-dark font-semibold' 
                                    : 'text-warm-text-primary-dark/90 dark:text-warm-text-secondary-dark hover:bg-warm-sidebar-item-active/50 hover:text-warm-text-primary-dark'
                            }`}
                        >
                            <div className="flex items-center gap-2.5">
                                <span className={`${activeNav === item.id ? 'text-amber-600 dark:text-amber-400' : 'text-warm-text-secondary-dark dark:text-warm-text-muted-dark'} transition-colors`}>{item.icon}</span>
                                <span className="text-xs font-semibold">{item.label}</span>
                            </div>
                        </button>
                    ))}
                </nav>

                <div className="space-y-2 rounded-2xl border border-warm-border-dark bg-warm-card-dark/60 p-2 dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-semibold text-warm-text-secondary-dark dark:text-warm-text-muted-dark">{t('sidebar.notebooks', 'Notebooks')}</span>
                        <button
                            type="button"
                            onClick={onCreateNotebook}
                            className="rounded-lg p-1 text-warm-text-muted-dark hover:bg-black/[0.04] hover:text-amber-600 dark:hover:bg-white/10"
                            title={t('sidebar.new_notebook', 'New notebook')}
                        >
                            <Plus size={12} />
                        </button>
                    </div>
                    <div className="max-h-28 space-y-0.5 overflow-y-auto pr-1">
                        {notebooks.map((notebook) => {
                            const id = notebook.id || notebook.notebook_id || 'all-notes';
                            const navId = `notebook:${id}`;
                            const isEditing = editingNotebookId === id;
                            const stats = notebookStats.get(id) || { notes: 0, favorites: 0, lastUpdatedAt: 0 };
                            const lastUpdated = stats.lastUpdatedAt ? new Date(stats.lastUpdatedAt).toLocaleDateString() : emptyDateLabel;
                            return (
                                <div
                                    key={id}
                                    title={t('sidebar.notebook_stats_title', '{{notes}} note(s) · {{favorites}} favorite(s) · Last activity: {{date}}', { notes: stats.notes, favorites: stats.favorites, date: lastUpdated })}
                                    className={`group flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-[11px] font-bold transition-all ${
                                        activeNav === navId
                                            ? 'bg-amber-500/12 text-amber-700 dark:text-amber-300'
                                            : 'text-warm-text-primary-dark/85 hover:bg-black/[0.04] hover:text-warm-text-primary-dark dark:text-warm-text-secondary-dark dark:hover:bg-white/10'
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
                                        <button type="button" onClick={() => onNavigate(navId)} className="min-w-0 flex-1 text-left">
                                            <span className="block truncate">{notebook.name || t('sidebar.all_notes', 'All notes')}</span>
                                            <span className="mt-0.5 block truncate text-[9px] font-semibold text-warm-text-secondary-dark dark:text-warm-text-muted-dark">
                                                {formatCount('sidebar.notes_count', stats.notes)}{stats.favorites ? ` · ${formatCount('sidebar.favorites_count', stats.favorites)}` : ''}
                                            </span>
                                        </button>
                                    )}
                                    <span className="mr-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] leading-none text-warm-text-secondary-dark dark:text-warm-text-muted-dark">{stats.notes}</span>
                                    {id !== 'all-notes' && !isEditing && (
                                        <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingNotebookId(id);
                                                    setNotebookDraft(notebook.name || '');
                                                }}
                                                className="rounded-md p-1 text-warm-text-muted-dark hover:bg-black/5 hover:text-amber-600 dark:hover:bg-white/10"
                                                aria-label={t('sidebar.rename_notebook_label', 'Rename {{name}}', { name: notebook.name })}
                                                title={t('common.rename', 'Rename')}
                                            >
                                                <Pencil size={11} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onDeleteNotebook?.(notebook)}
                                                className="rounded-md p-1 text-warm-text-muted-dark hover:bg-red-500/10 hover:text-red-500"
                                                aria-label={t('sidebar.delete_notebook_label', 'Delete {{name}}', { name: notebook.name })}
                                                title={t('common.delete', 'Delete')}
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
                    <h3 className="text-[10px] font-semibold text-warm-text-secondary-dark dark:text-warm-text-muted-dark">
                        {activeNav === 'trash' ? t('sidebar.deleted_notes', 'Deleted notes') : t('sidebar.notes', 'Notes')}
                    </h3>
                    <div className="flex items-center gap-1">
                    {canCreateNoteInCurrentView && (
                        <button
                            type="button"
                            onClick={() => onCreateNote?.({ notebookId: activeNotebookId })}
                            className="rounded-lg p-1 text-warm-text-muted-dark transition-colors hover:bg-black/[0.04] hover:text-amber-600 dark:hover:bg-white/10"
                            title={newNoteLabel}
                            aria-label={newNoteLabel}
                        >
                            <Plus size={12} />
                        </button>
                    )}
                    {activeNav === 'trash' && filteredNotes.length > 0 && (
                        <button 
                            onClick={onEmptyTrash}
                            className="text-[10px] text-red-500/80 hover:text-red-500 font-semibold transition-colors"
                        >
                            {t('sidebar.empty', 'Empty')}
                        </button>
                    )}
                    </div>
                </div>

                <div className="space-y-4">
                    {/* TODAY */}
                    {groupedNotes.today.length > 0 && (
                        <div className="space-y-1">
                            <div className="px-2 text-[10px] font-semibold text-warm-text-secondary-dark dark:text-warm-text-muted-dark/55">{t('date.today', 'Today')}</div>
                            <div className="space-y-1">{groupedNotes.today.map(renderNoteItem)}</div>
                        </div>
                    )}

                    {/* YESTERDAY */}
                    {groupedNotes.yesterday.length > 0 && (
                        <div className="space-y-1">
                            <div className="px-2 text-[10px] font-semibold text-warm-text-secondary-dark dark:text-warm-text-muted-dark/55">{t('date.yesterday', 'Yesterday')}</div>
                            <div className="space-y-1">{groupedNotes.yesterday.map(renderNoteItem)}</div>
                        </div>
                    )}

                    {/* EARLIER */}
                    {groupedNotes.earlier.length > 0 && (
                        <div className="space-y-1">
                            <div className="px-2 text-[10px] font-semibold text-warm-text-secondary-dark dark:text-warm-text-muted-dark/55">{t('date.earlier', 'Earlier')}</div>
                            <div className="space-y-1">{groupedNotes.earlier.map(renderNoteItem)}</div>
                        </div>
                    )}

                    {filteredNotes.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                            <div className="w-10 h-10 rounded-full bg-warm-sidebar-item-active flex items-center justify-center text-warm-text-muted-dark mb-3">
                                <SearchX size={16} />
                            </div>
                            <p className="text-[11px] font-medium text-warm-text-secondary-dark dark:text-warm-text-muted-dark leading-relaxed">
                                {searchQuery ? t('sidebar.no_results', 'No results') : t('sidebar.no_notes', 'No notes')}
                            </p>
                            {canCreateNoteInCurrentView && !searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => onCreateNote?.({ notebookId: activeNotebookId })}
                                    className="mt-4 rounded-xl bg-zinc-950 px-3 py-2 text-[11px] font-bold text-white shadow-sm transition-all hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
                                >
                                    {activeNotebookId === 'all-notes' ? t('sidebar.create_note', 'Create note') : t('sidebar.create_note_in_notebook', 'Create note in this notebook')}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Area */}
            <div className="fiip-dark-sidebar-footer p-3 border-t border-warm-border-dark dark:border-warm-border-dark bg-warm-sidebar-dark/50 text-warm-text-primary-dark dark:bg-warm-sidebar-dark/30 dark:text-warm-text-primary-dark">
                <div className="flex items-center justify-between">
                    {user ? (
                        <button 
                            onClick={onOpenProfile}
                            className="flex items-center gap-2 p-1.5 hover:bg-warm-sidebar-item-active/50 rounded-xl transition-all group max-w-[65%]"
                        >
                            {avatarUrl ? (
                                <img src={avatarUrl} alt={displayName} className="h-7 w-7 rounded-lg border border-warm-border-dark object-cover dark:border-white/10" />
                            ) : (
                                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[11px] font-semibold text-amber-700 dark:text-amber-300 shrink-0">
                                    {displayName.slice(0, 2).toUpperCase()}
                                </div>
                            )}
                            <div className="flex flex-col text-left overflow-hidden">
                                <span className="fiip-dark-user-name text-[10px] font-bold text-warm-text-primary-dark dark:text-warm-text-primary-dark leading-tight truncate">
                                    {displayName}
                                </span>
                                <span className="text-[8px] text-warm-text-secondary-dark dark:text-warm-text-muted-dark font-semibold uppercase tracking-tighter">{t('license.premium', 'Premium')}</span>
                            </div>
                        </button>
                    ) : (
                        <button 
                            onClick={onOpenAuth}
                            className="flex items-center gap-1.5 rounded-xl border border-warm-border-dark bg-warm-card-dark px-3 py-1.5 text-[11px] font-semibold text-warm-text-primary-dark shadow-sm transition-all hover:bg-warm-sidebar-item-active dark:border-white/10 dark:bg-white dark:text-black dark:hover:bg-[#E5E5E3]"
                        >
                            <Plus size={12} />
                            <span>{t('auth.login_action', 'Sign in')}</span>
                        </button>
                    )}
                    
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={onOpenSettings}
                            className="p-2 text-warm-text-muted-dark hover:text-warm-text-primary-dark hover:bg-warm-sidebar-item-active/50 rounded-xl transition-all"
                            title={t('sidebar.settings', 'Settings')}
                        >
                            <Settings size={15} />
                        </button>
                        {user && (
                            <button 
                                onClick={() => authService.signOut()}
                                className="p-2 text-warm-text-muted-dark hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
                                title={t('sidebar.logout', 'Sign out')}
                            >
                                <LogOut size={15} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

        </aside>
    );
}
