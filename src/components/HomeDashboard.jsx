import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import IconCalendar from '~icons/mingcute/calendar-line';
import IconSearch from '~icons/mingcute/search-line';
import IconTime from '~icons/mingcute/time-line';
import IconBook from '~icons/mingcute/book-line';
import IconCheck from '~icons/mingcute/check-circle-line';
import IconSparkles from '~icons/mingcute/sparkles-line';
import { generateText } from '../services/ai';
import { getDueTasks } from '../services/fiipV1';
import { getNoteStats, pickFeaturedNote, stripNoteText } from '../utils/notePresentation';

const getNoteTimestamp = (note) => note?.updatedAt || note?.createdAt || 0;
const EMPTY_LIST = [];

export default function HomeDashboard({ 
    featuredNote, 
    recentNotes = EMPTY_LIST,
    onSelectNote,
    notebooks = EMPTY_LIST,
    tasks = EMPTY_LIST,
    widgets = EMPTY_LIST,
    settings = {},
    onAdvancedSearch
}) {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [aiComment, setAiComment] = useState('');
    const [aiCommentStatus, setAiCommentStatus] = useState('idle');
    const spotlightNote = pickFeaturedNote(featuredNote ? [featuredNote, ...recentNotes] : recentNotes);
    const searchableNotes = useMemo(() => {
        const searchableNotesMap = new Map();
        [featuredNote, ...recentNotes].filter(Boolean).forEach((note) => searchableNotesMap.set(note.id, note));
        return [...searchableNotesMap.values()];
    }, [featuredNote, recentNotes]);
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();
    const dueTasks = getDueTasks(tasks, { now: new Date() }).slice(0, 5);
    const enabledWidgets = useMemo(() => {
        return new Set((widgets || []).filter((widget) => widget.enabled !== false).map((widget) => widget.id));
    }, [widgets]);
    const dexterEnabled = settings?.aiEnabled !== false;
    const aiNotesContext = useMemo(() => {
        return searchableNotes
            .filter((note) => !note.isProtected && !note.is_locked)
            .slice(0, 4)
            .map((note) => {
                const title = note.title || 'Sans titre';
                const excerpt = stripNoteText(note.content).slice(0, 240) || 'Note vide';
                return `- ${title}: ${excerpt}`;
            })
            .join('\n');
    }, [searchableNotes]);
    const searchResults = normalizedSearchQuery
        ? searchableNotes.filter((note) => (
            (note.title || '').toLowerCase().includes(normalizedSearchQuery) ||
            stripNoteText(note.content).toLowerCase().includes(normalizedSearchQuery)
        )).slice(0, 6)
        : [];

    useEffect(() => {
        if (!dexterEnabled || !enabledWidgets.has('ai-suggestions')) {
            setAiComment('');
            setAiCommentStatus('idle');
            return;
        }

        const controller = new AbortController();
        setAiCommentStatus('loading');

        generateText({
            signal: controller.signal,
            messages: [
                {
                    role: 'system',
                    content: 'Tu es Dexter, assistant Fiip. Génère un seul commentaire court, utile et naturel en français pour guider le travail de rédaction. Ne mentionne pas le modèle, OpenRouter, les tags de recherche, ni les permissions.',
                },
                {
                    role: 'user',
                    content: aiNotesContext
                        ? `Notes récentes non protégées:\n${aiNotesContext}\n\nÉcris un commentaire personnalisé en une phrase, maximum 26 mots.`
                        : 'Aucune note non protégée disponible. Écris un commentaire d’accueil utile en une phrase, maximum 22 mots.',
                },
            ],
        })
            .then((comment) => {
                if (!controller.signal.aborted) {
                    setAiComment(String(comment || '').trim());
                    setAiCommentStatus('ready');
                }
            })
            .catch((error) => {
                if (error?.name !== 'AbortError') {
                    setAiComment('');
                    setAiCommentStatus('error');
                }
            });

        return () => controller.abort();
    }, [aiNotesContext, dexterEnabled, enabledWidgets]);

    const runAdvancedSearch = () => {
        if (!searchQuery.trim()) return;
        onAdvancedSearch?.(searchQuery);
    };

    const handleFeaturedClick = () => {
        if (spotlightNote) {
            onSelectNote(spotlightNote.id);
        }
    };

    return (
        <div className="flex-1 h-full overflow-y-auto bg-warm-bg-light dark:bg-warm-bg-dark text-warm-text-primary-light dark:text-warm-text-primary-dark px-10 py-12 space-y-10 select-none scrollbar-hide">
            
            <div className="max-w-2xl mx-auto w-full relative">
                <div className="w-full min-h-12 px-5 bg-warm-card-light dark:bg-[#262625] border border-warm-border-light dark:border-warm-border-dark rounded-2xl flex items-center justify-between shadow-sm transition-all duration-300 focus-within:border-amber-500/40 focus-within:ring-4 focus-within:ring-amber-500/10">
                    <div className="flex items-center gap-3 text-warm-text-muted-light">
                        <IconSearch className="w-4 h-4" />
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    runAdvancedSearch();
                                }
                            }}
                            placeholder={t('home.search_placeholder', 'Rechercher dans vos notes...')}
                            className="h-11 w-full bg-transparent text-xs font-semibold text-warm-text-primary-light outline-none placeholder:text-warm-text-muted-light dark:text-warm-text-primary-dark"
                        />
                    </div>
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={runAdvancedSearch}
                            className="shrink-0 rounded-lg border border-warm-border-light bg-warm-sidebar-item-active px-2 py-0.5 text-[9px] font-bold text-warm-text-muted-light transition-all hover:text-amber-600 dark:border-warm-border-dark dark:bg-zinc-800"
                        >
                            {searchResults.length} résultat{searchResults.length > 1 ? 's' : ''}
                        </button>
                    )}
                </div>
                {searchQuery && (
                    <div className="absolute left-0 right-0 top-full z-[10000] mt-2 overflow-hidden rounded-2xl border border-warm-border-light bg-warm-card-light shadow-[0_24px_80px_rgba(0,0,0,0.2)] dark:border-white/10 dark:bg-[#16181d]">
                        {searchResults.length > 0 ? searchResults.map((note) => (
                            <button
                                key={note.id}
                                type="button"
                                onClick={() => onSelectNote(note.id)}
                                className="block w-full px-4 py-3 text-left transition-all hover:bg-warm-sidebar-item-active/70 dark:hover:bg-white/10"
                            >
                                <span className="block text-xs font-black text-warm-text-primary-light dark:text-warm-text-primary-dark">{note.title || t('common.untitled', 'Sans titre')}</span>
                                <span className="mt-1 line-clamp-1 block text-[11px] text-warm-text-muted-light dark:text-warm-text-muted-dark">{stripNoteText(note.content) || t('common.no_content', 'Pas de contenu')}</span>
                            </button>
                        )) : (
                            <p className="px-4 py-4 text-center text-xs font-bold text-warm-text-muted-light">Aucune note trouvée.</p>
                        )}
                    </div>
                )}
            </div>

            <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-3">
                {enabledWidgets.has('due-tasks') && (
                    <section className="rounded-2xl border border-warm-border-light bg-warm-card-light p-4 dark:border-warm-border-dark dark:bg-warm-card-dark">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-warm-text-muted-light">Taches</h3>
                            <IconCheck className="h-4 w-4 text-emerald-500" />
                        </div>
                        {dueTasks.length > 0 ? dueTasks.map((task) => (
                            <button
                                key={task.id}
                                type="button"
                                onClick={() => task.note_id && onSelectNote(task.note_id)}
                                className="block w-full rounded-xl px-2 py-2 text-left text-xs font-bold hover:bg-black/[0.04] dark:hover:bg-white/10"
                            >
                                <span className="block truncate">{task.title}</span>
                                <span className="mt-1 block text-[10px] text-warm-text-muted-light">{new Date(task.due_at).toLocaleString()}</span>
                            </button>
                        )) : (
                            <p className="text-xs leading-5 text-warm-text-muted-light">Aucune tache en retard ou due maintenant.</p>
                        )}
                    </section>
                )}

                {enabledWidgets.has('notebooks') && (
                    <section className="rounded-2xl border border-warm-border-light bg-warm-card-light p-4 dark:border-warm-border-dark dark:bg-warm-card-dark">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-warm-text-muted-light">Carnets</h3>
                            <IconBook className="h-4 w-4 text-amber-500" />
                        </div>
                        <div className="space-y-1">
                            {notebooks.slice(0, 5).map((notebook) => (
                                <div key={notebook.id} className="flex items-center justify-between rounded-xl px-2 py-1.5 text-xs">
                                    <span className="truncate font-bold">{notebook.name}</span>
                                    <span className="text-[10px] text-warm-text-muted-light">
                                        {notebook.id === 'all-notes'
                                            ? recentNotes.length
                                            : recentNotes.filter((note) => (note.notebookId || note.notebook_id || note.folder_id || 'all-notes') === notebook.id).length}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {enabledWidgets.has('ai-suggestions') && dexterEnabled && (
                    <section className="rounded-2xl border border-warm-border-light bg-warm-card-light p-4 dark:border-warm-border-dark dark:bg-warm-card-dark">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-warm-text-muted-light">IA utile</h3>
                            <IconSparkles className="h-4 w-4 text-blue-500" />
                        </div>
                        <p className="text-xs leading-5 text-warm-text-secondary-light dark:text-warm-text-secondary-dark">
                            {aiCommentStatus === 'loading'
                                ? 'Dexter analyse vos notes...'
                                : aiComment || 'Dexter est actif, mais aucun commentaire n’a pu être généré pour le moment.'}
                        </p>
                    </section>
                )}
            </div>

            {/* Featured Note (Spotlight) Card */}
            {spotlightNote ? (
                <button 
                    type="button"
                    onClick={handleFeaturedClick}
                    className="max-w-4xl mx-auto w-full group cursor-pointer outline-none rounded-[28px] overflow-hidden border border-warm-border-light dark:border-warm-border-dark bg-gradient-to-br from-[#FCFBF9] to-[#FAF8F5] dark:from-[#262625] dark:to-[#1E1E1E] shadow-sm hover:shadow-md transition-all duration-300 relative min-h-[300px] flex flex-col justify-between text-left"
                >
                    {/* Organic stone-sprout illustration overlay */}
                    <div className="absolute top-0 right-0 w-[45%] h-full pointer-events-none z-0 overflow-hidden select-none opacity-90 dark:opacity-40">
                        <img 
                            src="/assets/stone_sprout.png" 
                            alt="Stone Sprout Illustration" 
                            className="w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-700"
                        />
                        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#FAF8F5] via-transparent to-transparent dark:from-[#1E1E1E]" />
                    </div>

                    <div className="relative z-10 p-8 flex flex-col justify-between h-full flex-1">
                        <div>
                            {/* Date & Tag row */}
                            <div className="flex items-center gap-3 mb-6">
                                <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
                                    Mise en vedette
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-warm-text-muted-light">
                                    {new Date(getNoteTimestamp(spotlightNote)).toLocaleDateString()}
                                </span>
                            </div>

                            {/* Note Title */}
                            <h2 className="fiip-light-home-note-title text-3xl font-extrabold tracking-tight text-warm-text-primary-light dark:text-warm-text-primary-dark mb-4 leading-tight max-w-lg group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                {spotlightNote.title || t('common.untitled', 'Sans titre')}
                            </h2>
                            
                            {/* Note Content preview */}
                            <p className="text-sm text-warm-text-secondary-light dark:text-warm-text-secondary-dark line-clamp-3 leading-relaxed max-w-md">
                                {stripNoteText(spotlightNote.content) || t('common.no_content', 'Pas de contenu')}
                            </p>
                        </div>

                        {/* Stats Row */}
                        <div className="mt-8 pt-6 border-t border-warm-border-light dark:border-warm-border-dark flex items-center gap-6 text-[10px] font-bold text-warm-text-muted-light">
                            <div className="flex items-center gap-1.5">
                                <IconCalendar className="w-3.5 h-3.5" />
                                <span>Modifié le {new Date(getNoteTimestamp(spotlightNote)).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <IconBook className="w-3.5 h-3.5" />
                                <span>{getNoteStats(spotlightNote).wordCount} mots</span>
                            </div>
                            {getNoteStats(spotlightNote).readTimeLabel ? (
                                <div className="flex items-center gap-1.5">
                                    <IconTime className="w-3.5 h-3.5" />
                                    <span>{getNoteStats(spotlightNote).readTimeLabel}</span>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </button>
            ) : (
                <div className="max-w-4xl mx-auto w-full p-12 text-center border border-dashed border-warm-border-light dark:border-warm-border-dark rounded-[28px] bg-warm-card-light dark:bg-warm-card-dark">
                    <p className="text-xs text-warm-text-muted-light font-semibold uppercase tracking-wider">Aucune note mise en avant pour le moment.</p>
                </div>
            )}

            {/* Reprendre Recent Grid */}
            <div className="max-w-4xl mx-auto w-full space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-warm-text-muted-light">
                        Reprendre la rédaction
                    </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                    {recentNotes.map((note) => {
                        const stats = getNoteStats(note);
                        return (
                            <button 
                                type="button"
                                key={note.id}
                                onClick={() => onSelectNote(note.id)}
                                className="group cursor-pointer p-5 rounded-2xl border border-warm-border-light dark:border-warm-border-dark bg-warm-card-light dark:bg-warm-card-dark hover:bg-warm-sidebar-item-active/50 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between min-h-[160px] text-left"
                            >
                                <div className="space-y-2">
                                    <h4 className="fiip-light-home-note-title text-xs font-bold text-warm-text-primary-light dark:text-warm-text-primary-dark truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                        {note.title || t('common.untitled', 'Sans titre')}
                                    </h4>
                                    <p className="text-[11px] text-warm-text-secondary-light/80 dark:text-warm-text-secondary-dark/80 line-clamp-3 leading-relaxed">
                                        {stripNoteText(note.content) || t('common.no_content', 'Pas de contenu')}
                                    </p>
                                </div>
                                
                                <div className="mt-4 pt-3 border-t border-warm-border-light dark:border-warm-border-dark flex items-center justify-between text-[9px] text-warm-text-muted-light font-semibold">
                                    <span>{new Date(getNoteTimestamp(note)).toLocaleDateString()}</span>
                                    <span>{stats.wordCount} mots</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
