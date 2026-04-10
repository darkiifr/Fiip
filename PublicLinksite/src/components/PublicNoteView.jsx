import { useEffect, useState } from 'react';
import { dataService } from '../services/supabase';
import { marked } from 'marked';
import html2pdf from 'html2pdf.js';
import TurndownService from 'turndown';
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
    const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
        ALLOWED_ATTR: ['style', 'class', 'href', 'target', 'rel', 'src', 'alt', 'width', 'height', 'align'],
    });
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
            if (err === "Configuration missing") {
                 setError("Erreur : Clés Supabase manquantes dans l'environnement.");
            } else if (err?.code === 'PGRST116') {
                 setError("Note introuvable ou privée."); // Standard Supabase "0 rows returned"
            } else if (err?.message) {
                 setError(`Erreur technique : ${err.message}`);
            } else {
                 setError("Note introuvable ou privée.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadFiin = () => {
        if (!note) return;
        const blob = new Blob([JSON.stringify(note, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${note.title || 'note'}.fiin`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
    };

    const handleDownloadMd = () => {
        if (!note) return;
        const turndownService = new TurndownService({ headingStyle: 'atx' });
        let mdContent = `# ${note.title || 'Nouvelle Note'}\n\n`;
        mdContent += turndownService.turndown(note.content || '');
        const blob = new Blob([mdContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${note.title || 'note'}.md`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
    };

    const handleDownloadPdf = () => {
        if (!note) return;
        const element = document.getElementById('note-print-area');
        if (!element) return;
        const opt = {
            margin: [0.5, 0.5, 0.5, 0.5],
            filename: `${note.title || 'note'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        
        // Use standard promesified html2pdf without awaiting it to avoid blocking React
        html2pdf().set(opt).from(element).save().catch(err => {
            console.error('Erreur PDF:', err);
            alert("Erreur lors de la génération du PDF.");
        });
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
                        <span className="font-semibold text-lg tracking-tight text-white">Fiip</span>
                    </a>
                    
                    <div className="flex items-center gap-3">
                        <a 
                            href={`fiip://note/${slug}`}
                            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-lg border border-white/5 transition-all"
                        >
                            <IconifyIcon icon="mingcute:external-link-line" />
                            Ouvrir dans l&apos;app
                        </a>
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
                    <a 
                        href={`fiip://note/${slug}`}
                        className="w-full sm:w-auto px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-sm font-medium rounded-lg transition-colors text-center"
                    >
                        Ouvrir maintenant
                    </a>
                </div>

                <div className="flex flex-wrap items-center gap-3 mb-8">
                    <button type="button" onClick={handleDownloadFiin} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-sm font-medium rounded-lg border border-indigo-500/20 transition-colors">
                        <IconifyIcon icon="mingcute:file-download-fill" />
                        .fiin
                    </button>
                    <button type="button" onClick={handleDownloadMd} className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-sm font-medium rounded-lg border border-yellow-500/20 transition-colors">
                        <IconifyIcon icon="mingcute:markdown-fill" />
                        .md
                    </button>
                    <button type="button" onClick={handleDownloadPdf} className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-medium rounded-lg border border-red-500/20 transition-colors">
                        <IconifyIcon icon="mingcute:pdf-fill" />
                        .pdf
                    </button>
                </div>

                <div id="note-print-area" className="bg-[#1C1C1E] p-4 sm:p-8 rounded-xl">
                    <article className="prose prose-invert max-w-none">
                        <div className="flex items-center gap-3 mb-4">
                        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">{note.title || "Sans titre"}</h1>
                        {(note.is_favorite || note.favorite) && (
                            <IconifyIcon icon="mingcute:bookmark-fill" className="text-yellow-500/80 w-7 h-7 drop-shadow-[0_0_8px_rgba(234,179,8,0.3)] ml-2 transition-transform hover:scale-105" title="Note Favorite" />
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-10 border-b border-white/5 pb-6">
                        {note.author_username && (
                            <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                <IconifyIcon icon="mingcute:user-3-fill" className="text-gray-400" />
                                {note.author_username}
                            </span>
                        )}
                        <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                            <IconifyIcon icon="mingcute:calendar-fill" className="text-gray-400" />
                            {new Date(note.updatedAt || note.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                        
                        {note.badges && note.badges.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {note.badges.map((badge, idx) => (
                                    <span key={idx} className="group relative flex items-center justify-center p-2 rounded-full border transition-all hover:scale-110 cursor-help" style={{ backgroundColor: badge.color + '20', borderColor: badge.color, color: badge.color }}>
                                        {badge.icon ? <IconifyIcon icon={badge.icon} className="w-4 h-4" /> : <span className="w-4 h-4 text-[10px] flex items-center justify-center font-bold">B</span>}
                                        {/* Tooltip */}
                                        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/90 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 shadow-xl border border-white/10 z-50">
                                            {badge.name}
                                        </span>
                                    </span>
                                ))}
                            </div>
                        )}

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

                {/* Media Attachments Inline */}
                {note.attachments && note.attachments.some(att => ['image', 'video', 'audio'].includes(att.type)) && (
                    <div className="mt-8 space-y-6">
                        {note.attachments.filter(att => ['image', 'video', 'audio'].includes(att.type)).map((att, index) => {
                            const src = att.url || att.data;
                            if (!src) return null;
                            
                            return (
                                <div key={index} className="flex flex-col items-center">
                                    {att.type === 'image' && (
                                        <img src={src} alt={att.name} className="max-w-full max-h-[600px] rounded-xl shadow-lg border border-white/10 object-contain" loading="lazy" />
                                    )}
                                    {att.type === 'video' && (
                                        <video src={src} controls className="max-w-full max-h-[600px] rounded-xl shadow-lg border border-white/10" />
                                    )}
                                    {att.type === 'audio' && (
                                        <div className="w-full max-w-md bg-[#2C2C2E] p-4 rounded-xl shadow-md border border-white/5">
                                            <div className="flex items-center gap-3 mb-2">
                                                <IconifyIcon icon="mingcute:music-fill" className="text-blue-400 w-5 h-5" />
                                                <span className="text-sm font-medium text-white truncate">{att.name || "Mémo vocal"}</span>
                                            </div>
                                            <audio src={src} controls className="w-full outline-none" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
                </div>
                {/* Attachments Section */}
                {note.attachments && note.attachments.length > 0 && (
                    <div className="mt-16 pt-8 border-t border-white/10">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-white">
                            <IconifyIcon icon="mingcute:attachment-fill" className="text-blue-500" />
                            Fichiers joints ({note.attachments.length})
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {note.attachments.map((att, index) => (
                                <a 
                                    key={index}
                                    href={att.url || att.data || '#'}
                                    download={att.name || 'Fichier'}
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
