import { useEffect, useState } from 'react';
import { dataService } from '../services/supabase';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Icon as IconifyIcon } from '@iconify/react';
import 'katex/dist/katex.min.css';

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
    const [note, setNote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Extract slug from URL: /n/:slug
        const path = window.location.pathname;
        const parts = path.split('/n/');
        if (parts.length > 1) {
            const currentSlug = parts[1];
            // setSlug(currentSlug);
            fetchNote(currentSlug);
        } else {
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
                <a href="/" className="mt-6 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors">
                    Retour à l&apos;accueil
                </a>
            </div>
        );
    }

    if (!note) return null;

    return (
        <div className="min-h-screen bg-[#1C1C1E] text-[#E0E0E0] font-dexter selection:bg-blue-500/30">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-[#1C1C1E]/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="font-semibold text-lg tracking-tight">Fiip</span>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => { window.location.href = `fiip://note/${note.public_slug || ''}`; }}
                        className="text-sm px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg transition-colors border border-blue-500/20 flex items-center gap-2"
                    >
                        <IconifyIcon icon="mingcute:external-link-line" />
                        Ouvrir dans l&apos;app
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-12">
                <article className="prose prose-invert max-w-none">
                    <div className="flex items-center gap-3 mb-4">
                        <h1 className="text-4xl font-bold text-white tracking-tight">{note.title || "Sans titre"}</h1>
                        {(note.is_favorite || note.favorite) && (
                            <IconifyIcon icon="mingcute:star-fill" className="text-yellow-500 w-8 h-8 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                        )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-8 border-b border-white/5 pb-6">
                        <span className="flex items-center gap-1">
                            <IconifyIcon icon="mingcute:calendar-fill" />
                            {new Date(note.updatedAt || note.created_at).toLocaleDateString()}
                        </span>

                        {note.badges && note.badges.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {note.badges.map((badge, idx) => (
                                    <span key={idx} className={`px-2 py-0.5 text-white border rounded-full text-xs font-medium`} style={{ backgroundColor: badge.color + '40', borderColor: badge.color, color: badge.color }}>
                                        {badge.icon && <IconifyIcon icon={badge.icon} className="inline-block mr-1" />}
                                        {badge.name}
                                    </span>
                                ))}
                            </div>
                        )}

                        {note.tags && note.tags.length > 0 && (
                            <div className="flex gap-2">
                                {note.tags.map(tag => (
                                    <span key={tag} className="px-2 py-0.5 bg-white/5 rounded-full text-xs">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div 
                        className="markdown-body space-y-4 text-lg leading-relaxed text-gray-300"
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

                {/* Attachments Section if needed */}
                {note.attachments && note.attachments.length > 0 && (
                    <div className="mt-12 pt-8 border-t border-white/10">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <IconifyIcon icon="mingcute:attachment-fill" className="text-gray-400" />
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
                                    className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-colors group"
                                >
                                    <div className="p-2 bg-blue-500/10 rounded text-blue-400 group-hover:text-blue-300">
                                        <IconifyIcon icon="mingcute:file-fill" className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate text-gray-200">{att.name || "Fichier"}</p>
                                        <p className="text-xs text-gray-500">{att.size ? `${(att.size / 1024).toFixed(1)} KB` : ''}</p>
                                    </div>
                                    <IconifyIcon icon="mingcute:download-2-line" className="text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-white/10 py-8 text-center text-sm text-gray-500">
                <p>Publié avec <a href="https://fiip-app.netlify.app" className="text-blue-400 hover:text-blue-300">Fiip</a> - L&apos;application de prise de notes sécurisée.</p>
            </footer>
        </div>
    );
}
