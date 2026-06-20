
import { open } from '@tauri-apps/plugin-shell';
import { useState, useEffect, useRef, ChangeEvent, MouseEvent } from 'react';

import { installFont, searchFonts } from '../services/fontStore';

import IconDownload from '~icons/mingcute/download-2-fill';
import IconRefresh from '~icons/mingcute/refresh-3-fill';
import IconSearch from '~icons/mingcute/search-2-line';

export default function FontManager() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [installingId, setInstallingId] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);

    const handleSearch = async (q: string) => {
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

    const searchTimeout = useRef<any>(null);
    const onSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        if (searchTimeout.current) {clearTimeout(searchTimeout.current);}
        searchTimeout.current = setTimeout(() => {
            handleSearch(val);
        }, 500);
    };

    const onOpenBrowser = async (font: any) => {
        try {
            await open(`https://fonts.google.com/specimen/${font.family.replace(/\s+/g, '+')}`);
        } catch (e) {
            console.error(e);
        }
    };

    const onInstallFont = async (event: MouseEvent<HTMLButtonElement>, font: any) => {
        event.stopPropagation();
        setInstallingId(font.id);
        setStatus(null);
        const result = await installFont(font);
        setInstallingId(null);
        setStatus(result.success ? `${font.family} est disponible dans Fiip.` : result.error || 'Installation impossible.');
    };

    return (
        <div className="space-y-4">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Catalogue Google Fonts / Fontsource</h3>
            <div className="bg-white/5 border border-white/5 rounded-lg p-3 flex flex-col gap-3">
                <div className="relative">
                    <IconSearch className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Chercher une police installable..."
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
                                type="button"
                                onClick={(event) => onInstallFont(event, font)}
                                disabled={installingId === font.id}
                                className="px-2 py-1 bg-blue-600/80 hover:bg-blue-500 text-white text-xs font-medium rounded transition-colors flex items-center gap-1 shrink-0"
                            >
                                {installingId === font.id ? <IconRefresh className="w-3 h-3 animate-spin" /> : <IconDownload className="w-3 h-3"/>}
                                {installingId === font.id ? 'Installation' : 'Installer'}
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
                    Cliquez sur une police pour ouvrir sa fiche Google Fonts. Le bouton Installer télécharge la version Fontsource et l'active directement dans Fiip.
                </p>
                {status && (
                    <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium text-gray-200">
                        {status}
                    </p>
                )}
            </div>
        </div>
    );
}

