import { useState, useRef, useEffect } from 'react';
import { Star, Heart, Flag, Bookmark, Tag, AlertCircle, Info, CheckCircle, Hash, X, Zap, Trophy, Flame, Plus } from 'lucide-react';

const PRESET_ICONS = {
    Star, Heart, Flag, Bookmark, Tag, AlertCircle, Info, CheckCircle, Hash, Zap, Trophy, Flame
};

// Helper to generate IDs (defined outside component to satisfy linter purity rules)
const generateId = () => Date.now().toString();

const PRESET_COLORS = [
    { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
    { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
    { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
    { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
    { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30' },
    { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
    { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30' },
    { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
];

const SOLID_COLORS = [
    'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-gray-500'
];

export default function NoteBadges({ badges = [], onUpdate }) {
    const [isAdding, setIsAdding] = useState(false);
    const [newLabel, setNewLabel] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('Tag');
    const [selectedColor, setSelectedColor] = useState(4); // Default Blue
    const containerRef = useRef(null);
    const [savedBadges, setSavedBadges] = useState(() => {
        const saved = localStorage.getItem('saved_custom_badges');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) { console.error(e); }
        }
        return [];
    });

    // Toggle Favorite (Quick Action)
    const isFavorite = badges.some(b => b.id === 'favorite');
    const toggleFavorite = () => {
        if (isFavorite) {
            onUpdate(badges.filter(b => b.id !== 'favorite'));
        } else {
            onUpdate([...badges, { 
                id: 'favorite', 
                label: 'Favori', 
                icon: 'Star', 
                color: 2 // Yellow
            }]);
        }
    };

    const handleAddBadge = () => {
        if (!newLabel.trim()) return;
        
        const newBadge = {
            id: generateId(),
            label: newLabel.trim(),
            icon: selectedIcon,
            color: selectedColor
        };
        
        // Save unique custom badges
        const exists = savedBadges.some(b => b.label === newBadge.label && b.icon === newBadge.icon && b.color === newBadge.color);
        if (!exists) {
            const newSaved = [...savedBadges, { ...newBadge, id: `saved-${generateId()}` }];
            setSavedBadges(newSaved);
            localStorage.setItem('saved_custom_badges', JSON.stringify(newSaved));
        }

        onUpdate([...badges, newBadge]);
        setNewLabel('');
        setIsAdding(false);
    };

    const handleSelectSaved = (b) => {
        onUpdate([...badges, { ...b, id: generateId() }]);
        setIsAdding(false);
    };

    const removeBadge = (id) => {
        onUpdate(badges.filter(b => b.id !== id));
    };

    // Close popover on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsAdding(false);
            }
        };
        if (isAdding) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isAdding]);

    return (
        <div className="absolute bottom-6 left-6 z-40 flex flex-wrap items-end gap-2 pointer-events-none">
            <div className="flex flex-wrap items-center gap-2 pointer-events-auto" ref={containerRef}>
                {/* Badges List */}
                {badges.map(badge => {
                    const Icon = PRESET_ICONS[badge.icon] || Tag;
                    const colorStyle = PRESET_COLORS[badge.color] || PRESET_COLORS[0];
                    
                    return (
                        <div 
                            key={badge.id}
                            className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-full border backdrop-blur-md shadow-sm transition-all duration-200 hover:scale-105 cursor-default ${colorStyle.bg} ${colorStyle.border} ${colorStyle.text}`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            <span className="text-xs font-semibold">{badge.label}</span>
                            <button 
                                onClick={(e) => { e.stopPropagation(); removeBadge(badge.id); }}
                                className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
                            >
                                <X className="w-2.5 h-2.5" />
                            </button>
                        </div>
                    );
                })}

                {/* Add Button */}
                <div className="relative">
                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-[#1e1e1e]/80 backdrop-blur-md text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all shadow-sm ${isAdding ? 'bg-white/10 text-white' : ''}`}
                        title="Ajouter un badge"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Badge</span>
                    </button>

                    {/* Add Popover */}
                    {isAdding && (
                        <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl p-3 animate-in slide-in-from-bottom-2 fade-in duration-200">
                            <div className="flex flex-col gap-3">
                                {savedBadges.length > 0 && (
                                    <div className="border-b border-white/10 pb-3">
                                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Récents</div>
                                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                                            {savedBadges.map(b => {
                                                const Icon = PRESET_ICONS[b.icon] || Tag;
                                                const colorStyle = PRESET_COLORS[b.color] || PRESET_COLORS[0];
                                                return (
                                                    <button
                                                        key={b.id}
                                                        onClick={() => handleSelectSaved(b)}
                                                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] hover:scale-105 transition-transform ${colorStyle.bg} ${colorStyle.border} ${colorStyle.text}`}
                                                    >
                                                        <Icon className="w-3 h-3" />
                                                        {b.label}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nouveau Badge</div>
                                
                                {/* Label Input */}
                                <input
                                    type="text"
                                    value={newLabel}
                                    onChange={(e) => setNewLabel(e.target.value)}
                                    placeholder="Nom du badge..."
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddBadge()}
                                />

                                {/* Icon Selection */}
                                <div>
                                    <div className="text-[10px] text-gray-500 font-bold mb-1.5">ICÔNE</div>
                                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar p-1 bg-black/20 rounded-lg border border-white/5">
                                        {Object.keys(PRESET_ICONS).map(iconName => {
                                            const Icon = PRESET_ICONS[iconName];
                                            return (
                                                <button
                                                    key={iconName}
                                                    onClick={() => setSelectedIcon(iconName)}
                                                    className={`p-1.5 rounded-md transition-colors ${selectedIcon === iconName ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                                                    title={iconName}
                                                >
                                                    <Icon className="w-4 h-4" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Color Selection */}
                                <div>
                                    <div className="text-[10px] text-gray-500 font-bold mb-1.5">COULEUR</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {PRESET_COLORS.map((c, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setSelectedColor(i)}
                                                className={`w-5 h-5 rounded-full border transition-transform hover:scale-110 ${selectedColor === i ? 'ring-2 ring-white scale-110' : 'border-transparent opacity-80 hover:opacity-100'} ${SOLID_COLORS[i]}`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-2 mt-1">
                                    <button 
                                        onClick={() => setIsAdding(false)}
                                        className="px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors"
                                    >
                                        Annuler
                                    </button>
                                    <button 
                                        onClick={handleAddBadge}
                                        disabled={!newLabel.trim()}
                                        className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg shadow hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Ajouter
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Quick Favorite Toggle (if not present) */}
                {!isFavorite && (
                    <button
                        onClick={toggleFavorite}
                        className="flex items-center justify-center w-7 h-7 rounded-full text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10 transition-all"
                        title="Marquer comme favori"
                    >
                        <Star className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}