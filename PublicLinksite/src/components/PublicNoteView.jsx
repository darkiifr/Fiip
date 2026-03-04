import { useEffect, useState } from 'react';
import { dataService } from '../services/supabase';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Icon as IconifyIcon } from '@iconify/react';
import 'katex/dist/katex.min.css';
// import katex from 'katex';

// Simple parser for LaTeX in markdown
const renderMarkdown = (text) => {
    if (!text) return { __html: '' };
    
    // Configure marked options if needed
    // marked.setOptions({ ... });

    const rawHtml = marked.parse(text);
    const sanitizedHtml = DOMPurify.sanitize(rawHtml);
    return { __html: sanitizedHtml };
};

export default function PublicNoteView() {
    const [slug, setSlug] = useState('');
    const [note, setNote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Extract slug from URL: /n/:slug (case insensitive split)
        const path = window.location.pathname;
        const parts = path.toLowerCase().split('/n/');
        // If the split fails due to casing mismatch not handled by toLowerCase (e.g. mixed path parts?), 
        // we rely on lowercasing the whole path which is safe for the keyword '/n/' but might affect the slug casing?
        // Slugs should generally be case-insensitive or handled carefully.
        // If slugs are case-sensitive (e.g. base64), lowercasing the whole path destroys the slug!
        
        // BETTER: Regex match to preserve slug casing
        const match = path.match(/^\/n\/(.+)$/i);
        
        if (match && match[1]) {
            const currentSlug = match[1];
            setSlug(currentSlug);
            fetchNote(currentSlug);
        } else {
            console.warn("Invalid note URL format:", path);
            setError("Lien invalide");
            setLoading(false);
        }
    }, []);

    const fetchNote = async (slug) => {
        try {
            setLoading(true);
            const { data, error } = await dataService.getPublicNote(slug);
            if (error) throw error;
            setNote(data);
        } catch (err) {
            console.error(err);
            setError("Note introuvable ou privée.");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenInFiip = () => {
        if (!slug) return;
        // Attempt to open custom protocol
        window.location.href = `fiip://note/${slug}`;
        
        // Optional: Set a timeout to check if it failed? 
        // Browsers make this hard to detect reliably.
        // Usually we just let the user click "Download" if nothing happens.
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#1C1C1E] text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                <p>Chargement de la note...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#1C1C1E] text-white p-4">
                <IconifyIcon icon="mingcute:sad-fill" className="w-16 h-16 text-gray-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Oups !</h1>
                <p className="text-gray-400">{error}</p>
                <div className="flex gap-4 mt-6">
                    <a href="https://fiip.netlify.app" className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors text-white font-medium">
                        Aller à l&apos;accueil
                    </a>
                </div>
            </div>
        );
    }

    if (!note) return null;

    return (
        <div className="min-h-screen bg-[#1C1C1E] text-[#E0E0E0] font-dexter selection:bg-blue-500/30">
            {/* Header / Nav */}
            <header className="sticky top-0 z-50 bg-[#1C1C1E]/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <a href="https://fiip.netlify.app" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
                            F
                        </div>
                        <span className="font-semibold text-lg tracking-tight text-white">Fiip</span>
                    </a>
                    
                    <div className="flex items-center gap-3">
                         <button 
                            onClick={handleOpenInFiip}
                            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-lg border border-white/5 transition-all"
                        >
                            <IconifyIcon icon="mingcute:external-link-line" />
                            Ouvrir dans l&apos;app
                        </button>
                        <a 
                            href="https://fiip.netlify.app" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-blue-500/20 transition-all"
                        >
                            <IconifyIcon icon="mingcute:download-fill" />
                            Télécharger Fiip
                        </a>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-6 py-12">
                
                {/* Banner for non-app users (mobile/web) */}
                <div className="mb-8 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 mt-1 sm:mt-0">
                            <IconifyIcon icon="mingcute:information-line" className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-white">Vous avez Fiip installé ?</h3>
                            <p className="text-xs text-gray-400 mt-1">Ouvrez cette note directement dans l&apos;application pour une meilleure expérience.</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleOpenInFiip}
                        className="w-full sm:w-auto px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-sm font-medium rounded-lg transition-colors text-center"
                    >
                        Ouvrir maintenant
                    </button>
                </div>

                <article className="prose prose-invert max-w-none">
                    <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-white tracking-tight">{note.title || "Sans titre"}</h1>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-10 border-b border-white/5 pb-6">
                        <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                            <IconifyIcon icon="mingcute:calendar-fill" className="text-gray-400" />
                            {new Date(note.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                        {note.tags && note.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {note.tags.map(tag => (
                                    <span key={tag} className="px-3 py-1 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-full text-xs font-medium">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div 
                        className="markdown-body space-y-6 text-lg leading-relaxed text-gray-300 font-light"
                        dangerouslySetInnerHTML={renderMarkdown(note.content)}
                    />
                </article>

                {/* Attachments Section */}
                {note.attachments && note.attachments.length > 0 && (
                    <div className="mt-16 pt-8 border-t border-white/10">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-white">
                            <IconifyIcon icon="mingcute:attachment-fill" className="text-blue-500" />
                            Pièces jointes ({note.attachments.length})
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {note.attachments.map((att, index) => (
                                <a 
                                    key={index}
                                    href={att.url || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-4 p-4 bg-[#2C2C2E] hover:bg-[#3A3A3C] rounded-xl border border-white/5 transition-all group hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20"
                                >
                                    <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 group-hover:bg-blue-500/20 group-hover:text-blue-300 transition-colors">
                                        <IconifyIcon icon="mingcute:file-fill" className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate text-gray-100 group-hover:text-white">{att.name}</p>
                                        <p className="text-xs text-gray-500">{att.size ? `${(att.size / 1024).toFixed(1)} KB` : 'Fichier'}</p>
                                    </div>
                                    <IconifyIcon icon="mingcute:download-2-line" className="text-gray-500 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-white/10 py-12 mt-12 bg-[#1C1C1E]">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 mx-auto mb-6">
                        F
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Vos idées. Instantanément.</h2>
                    <p className="text-gray-400 mb-8 max-w-sm mx-auto">Fiip est l&apos;outil de prise de notes conçu pour la simplicité et la performance.</p>
                    <a 
                        href="https://fiip.netlify.app" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-colors"
                    >
                        Découvrir Fiip
                        <IconifyIcon icon="mingcute:arrow-right-line" />
                    </a>
                    
                    <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-600">
                        <p>© 2026 Fiip. Tous droits réservés.</p>
                        <div className="flex gap-4">
                            <a href="https://github.com/darkiifr/Fiip" className="hover:text-gray-400 transition-colors">GitHub</a>
                            <a href="#" className="hover:text-gray-400 transition-colors">Twitter</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
