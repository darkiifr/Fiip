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
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">
                        F
                    </div>
                    <span className="font-semibold text-lg tracking-tight">Fiip Notes</span>
                </div>
                <a 
                    href="https://fiip-app.netlify.app" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                    Créer ma propre note
                </a>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-6 py-12">
                <article className="prose prose-invert max-w-none">
                    <h1 className="text-4xl font-bold mb-4 text-white">{note.title || "Sans titre"}</h1>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-8 border-b border-white/5 pb-6">
                        <span className="flex items-center gap-1">
                            <IconifyIcon icon="mingcute:calendar-fill" />
                            {new Date(note.created_at).toLocaleDateString()}
                        </span>
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

                {/* Attachments Section if needed */}
                {note.attachments && note.attachments.length > 0 && (
                    <div className="mt-12 pt-8 border-t border-white/10">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <IconifyIcon icon="mingcute:attachment-fill" className="text-gray-400" />
                            Pièces jointes
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {note.attachments.map((att, index) => (
                                <a 
                                    key={index}
                                    href={att.url || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-colors group"
                                >
                                    <div className="p-2 bg-blue-500/10 rounded text-blue-400 group-hover:text-blue-300">
                                        <IconifyIcon icon="mingcute:file-fill" className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate text-gray-200">{att.name}</p>
                                        <p className="text-xs text-gray-500">{att.size ? `${(att.size / 1024).toFixed(1)} KB` : 'Fichier'}</p>
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
