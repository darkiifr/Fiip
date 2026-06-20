import { 
    Search, 
    Home, 
    Star, 
    Trash2, 
    Settings, 
    LogOut, 
    Plus,
    SearchX
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { authService, dataService } from '../services/supabase';

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
    onEmptyTrash
}) {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const isLocalMode = localStorage.getItem('fiip-mode-local') === 'true';

    const getDisplayName = () => (
        profile?.nickname ||
        profile?.username ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.user_metadata?.nickname ||
        user?.email?.split('@')[0] ||
        'Compte Fiip'
    );

    const avatarUrl = profile?.avatar_url || profile?.avatar || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '';

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

    const renderNoteItem = (note) => {
        const isSelected = selectedNoteId === note.id;
        return (
            <button
                key={note.id}
                onClick={() => onSelectNote(note.id)}
                className={`w-full text-left px-3.5 py-3 rounded-xl border transition-all duration-200 group relative overflow-hidden flex flex-col gap-1 ${
                    isSelected 
                        ? 'bg-warm-sidebar-item-active border-warm-border-light dark:border-warm-border-dark shadow-sm' 
                        : 'bg-transparent border-transparent hover:bg-warm-sidebar-item-active/50'
                }`}
            >
                <div className="flex items-center justify-between">
                    <h4 className={`text-xs font-bold truncate pr-4 ${isSelected ? 'text-warm-text-primary-light dark:text-warm-text-primary-dark font-extrabold' : 'text-warm-text-primary-light/80 dark:text-warm-text-primary-dark/80 group-hover:text-warm-text-primary-light dark:group-hover:text-warm-text-primary-dark'}`}>
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

    return (
        <aside className="w-80 h-full flex flex-col border-r border-warm-border-light dark:border-warm-border-dark bg-warm-sidebar-light/70 dark:bg-warm-sidebar-dark/70 backdrop-blur-2xl relative z-10 overflow-hidden select-none">
            {/* Header Area */}
            <div className="p-4 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm tracking-tight">Fiip</span>
                </div>

                {/* Search Pill */}
                <div className="relative group">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-warm-text-muted-light">
                        <Search size={13} />
                    </div>
                    <input 
                        type="text"
                        placeholder={t('common.search', 'Rechercher...')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-8 bg-warm-card-light dark:bg-warm-card-dark border border-warm-border-light dark:border-warm-border-dark rounded-xl pl-9 pr-3 text-xs text-warm-text-primary-light placeholder:text-warm-text-muted-light/60 dark:placeholder:text-warm-text-muted-dark/60 focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500/30 transition-all font-medium"
                    />
                </div>

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
            </div>

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-hide">
                <div className="flex items-center mt-2 justify-between px-2 mb-2">
                    <h3 className="text-[9px] font-black text-warm-text-muted-light dark:text-warm-text-muted-dark uppercase tracking-widest">
                        {activeNav === 'trash' ? 'Notes Supprimées' : 'Notes'}
                    </h3>
                    {activeNav === 'trash' && filteredNotes.length > 0 && (
                        <button 
                            onClick={onEmptyTrash}
                            className="text-[9px] text-red-500/80 hover:text-red-500 font-bold transition-colors uppercase tracking-wider"
                        >
                            Vider
                        </button>
                    )}
                </div>

                <div className="space-y-4">
                    {/* TODAY */}
                    {groupedNotes.today.length > 0 && (
                        <div className="space-y-1">
                            <div className="px-2 text-[9px] font-black text-warm-text-muted-light/60 dark:text-warm-text-muted-dark/50 tracking-wider">AUJOURD'HUI</div>
                            <div className="space-y-1">{groupedNotes.today.map(renderNoteItem)}</div>
                        </div>
                    )}

                    {/* YESTERDAY */}
                    {groupedNotes.yesterday.length > 0 && (
                        <div className="space-y-1">
                            <div className="px-2 text-[9px] font-black text-warm-text-muted-light/60 dark:text-warm-text-muted-dark/50 tracking-wider">HIER</div>
                            <div className="space-y-1">{groupedNotes.yesterday.map(renderNoteItem)}</div>
                        </div>
                    )}

                    {/* EARLIER */}
                    {groupedNotes.earlier.length > 0 && (
                        <div className="space-y-1">
                            <div className="px-2 text-[9px] font-black text-warm-text-muted-light/60 dark:text-warm-text-muted-dark/50 tracking-wider">PLUS TÔT</div>
                            <div className="space-y-1">{groupedNotes.earlier.map(renderNoteItem)}</div>
                        </div>
                    )}

                    {filteredNotes.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                            <div className="w-10 h-10 rounded-full bg-warm-sidebar-item-active flex items-center justify-center text-warm-text-muted-light mb-3">
                                <SearchX size={16} />
                            </div>
                            <p className="text-[10px] font-bold text-warm-text-muted-light uppercase tracking-widest leading-relaxed">
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
                                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[10px] font-black text-amber-700 dark:text-amber-300 shrink-0">
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
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C1C1E] hover:bg-[#2C2C2E] dark:bg-white dark:hover:bg-[#E5E5E3] text-white dark:text-black rounded-xl transition-all shadow-sm font-bold text-[10px] uppercase tracking-wider"
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
        </aside>
    );
}
