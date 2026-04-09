
import { useState, useEffect, useRef } from 'react';
import { searchFonts } from '../services/fontStore';
import { open } from '@tauri-apps/plugin-shell';
import IconDownload from '~icons/mingcute/download-2-fill';
import IconDelete from '~icons/mingcute/delete-2-line';
import IconSearch from '~icons/mingcute/search-2-line';
import IconRefresh from '~icons/mingcute/refresh-3-fill';

export default function FontManager() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (q) => {
        setQuery(q);
        setLoading(true);
        const res = await searchFonts(q);
        setResults(res);
        setLoading(false);
    };

    // Initial load
    useEffect(() => {
        const init = async () => {
            await handleSearch('');
        };
        init();
    }, []);

    let searchTimeout = useRef(null);
    const onSearchChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            handleSearch(val);
        }, 500);
    };

    const onOpenBrowser = async (font) => {
        try {
            await open(`https://fonts.google.com/specimen/${font.family.replace(/\s+/g, '+')}`);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Catalogue Google Fonts</h3>
            <div className="bg-black/20 rounded-lg p-3 flex flex-col gap-3">
                <div className="relative">
                    <IconSearch className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Chercher sur les serveurs Google..."
                        value={query}
                        onChange={onSearchChange}
                        className="w-full bg-white/5 border border-white/10 rounded-md py-1.5 pl-9 pr-3 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500/50 focus:bg-white/10 transition-colors"
                    />
                    {loading && <IconRefresh className="absolute right-2.5 top-2.5 w-4 h-4 text-blue-400 animate-spin" />}
                </div>

                <div className="max-h-56 overflow-y-auto custom-scrollbar flex flex-col gap-2 relative">
                    {results.slice(0, 200).map(font => (
                        <div key={font.id} className="flex items-center justify-between p-2 bg-white/5 border border-white/5 rounded-md hover:bg-white/10 transition-colors group cursor-pointer" onClick={() => onOpenBrowser(font)}>
                            <div className="flex flex-col flex-1 pl-1">
                                <span className="text-sm font-medium text-gray-200">
                                    {font.family}
                                </span>
                                <span className="text-[10px] text-gray-500">{font.category}</span>
                            </div>
                            
                            <button 
                                className="px-2 py-1 bg-blue-600/80 hover:bg-blue-500 text-white text-xs font-medium rounded transition-colors flex items-center gap-1 shrink-0"
                            >
                                <IconDownload className="w-3 h-3"/>
                                Télécharger via Navigateur
                            </button>
                        </div>
                    ))}
                    {results.length > 200 && (
                        <div className="text-center text-[11px] text-gray-400 py-3 italic bg-white/5 border-t border-white/5">
                            Et {results.length - 200} autres polices disponibles.
                        </div>
                    )}
                    {results.length === 0 && !loading && (
                        <div className="text-center text-xs text-gray-500 py-4">Aucune police trouvée</div>
                    )}
                </div>
                <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                    Cliquez sur une police pour ouvrir sa page sur Google Fonts. Téléchargez-la, installez-la sur votre système (Windows/Mac) et relancez Fiip pour qu&apos;elle s&apos;intègre automatiquement à l&apos;éditeur !
                </p>
            </div>
        </div>
    );
}

