import { useTranslation } from 'react-i18next';
import IconCalendar from '~icons/mingcute/calendar-line';
import IconFileText from '~icons/mingcute/file-fill';
import IconMore from '~icons/mingcute/more-2-line';
import IconSearch from '~icons/mingcute/search-line';
import IconTime from '~icons/mingcute/time-line';
import IconBook from '~icons/mingcute/book-line';

const getNoteTimestamp = (note) => note?.updatedAt || note?.createdAt || 0;

export default function HomeDashboard({ 
    featuredNote, 
    recentNotes = [], 
    onSelectNote,
    onSearchClick
}) {
    const { t } = useTranslation();

    const getNoteStats = (note) => {
        const text = note.content?.replace(/<[^>]*>/g, '') || '';
        const wordCount = text.split(/\s+/).filter(Boolean).length;
        const readTime = Math.max(1, Math.ceil(wordCount / 200));
        return { wordCount, readTime };
    };

    const handleFeaturedClick = () => {
        if (featuredNote) {
            onSelectNote(featuredNote.id);
        }
    };

    return (
        <div className="flex-1 h-full overflow-y-auto bg-warm-bg-light dark:bg-warm-bg-dark text-warm-text-primary-light dark:text-warm-text-primary-dark px-10 py-12 space-y-10 select-none scrollbar-hide">
            
            {/* Search Pill */}
            <button 
                type="button"
                onClick={onSearchClick}
                className="max-w-2xl mx-auto w-full relative group cursor-pointer text-left"
            >
                <div className="w-full h-12 px-5 bg-warm-card-light dark:bg-[#262625] border border-warm-border-light dark:border-warm-border-dark rounded-2xl flex items-center justify-between shadow-sm transition-all duration-300 hover:scale-[1.005] hover:bg-warm-sidebar-item-active/50">
                    <div className="flex items-center gap-3 text-warm-text-muted-light">
                        <IconSearch className="w-4 h-4" />
                        <span className="text-xs font-semibold">{t('home.search_placeholder', 'Rechercher dans vos notes ou tapez une commande...')}</span>
                    </div>
                    <div className="px-2 py-0.5 bg-warm-sidebar-item-active dark:bg-zinc-800 rounded-lg border border-warm-border-light dark:border-warm-border-dark text-[9px] font-bold text-warm-text-muted-light flex items-center gap-1">
                        <span>⌘</span>
                        <span>K</span>
                    </div>
                </div>
            </button>

            {/* Featured Note (Spotlight) Card */}
            {featuredNote ? (
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
                                    {new Date(getNoteTimestamp(featuredNote)).toLocaleDateString()}
                                </span>
                            </div>

                            {/* Note Title */}
                            <h2 className="text-3xl font-extrabold tracking-tight text-warm-text-primary-light dark:text-warm-text-primary-dark mb-4 leading-tight max-w-lg group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                {featuredNote.title || t('common.untitled', 'Sans titre')}
                            </h2>
                            
                            {/* Note Content preview */}
                            <p className="text-sm text-warm-text-secondary-light dark:text-warm-text-secondary-dark line-clamp-3 leading-relaxed max-w-md">
                                {featuredNote.content?.replace(/<[^>]*>/g, '') || t('common.no_content', 'Pas de contenu')}
                            </p>
                        </div>

                        {/* Stats Row */}
                        <div className="mt-8 pt-6 border-t border-warm-border-light dark:border-warm-border-dark flex items-center gap-6 text-[10px] font-bold text-warm-text-muted-light">
                            <div className="flex items-center gap-1.5">
                                <IconCalendar className="w-3.5 h-3.5" />
                                <span>Modifié le {new Date(getNoteTimestamp(featuredNote)).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <IconBook className="w-3.5 h-3.5" />
                                <span>{getNoteStats(featuredNote).wordCount} mots</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <IconTime className="w-3.5 h-3.5" />
                                <span>{getNoteStats(featuredNote).readTime} min de lecture</span>
                            </div>
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
                                    <h4 className="text-xs font-bold text-warm-text-primary-light dark:text-warm-text-primary-dark truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                        {note.title || t('common.untitled', 'Sans titre')}
                                    </h4>
                                    <p className="text-[11px] text-warm-text-secondary-light/80 dark:text-warm-text-secondary-dark/80 line-clamp-3 leading-relaxed">
                                        {note.content?.replace(/<[^>]*>/g, '') || t('common.no_content', 'Pas de contenu')}
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
