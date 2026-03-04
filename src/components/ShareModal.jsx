import { useState, useEffect } from 'react';
import { authService, storageService } from '../services/supabase';
import CustomSelect from './CustomSelect';
import { Icon as IconifyIcon } from '@iconify/react';
import { open } from '@tauri-apps/plugin-shell';

// Icons Import (Pim's Edition)
import IconClose from '~icons/mingcute/close-fill';
import IconShare from '~icons/mingcute/share-2-fill';
import IconLock from '~icons/mingcute/lock-fill';
import IconLoading from '~icons/mingcute/loading-fill';
import IconCheck from '~icons/mingcute/check-fill';
import IconFileText from '~icons/mingcute/file-fill';

export default function ShareModal({ isOpen, onClose, note, notes = [] }) {
    const [selectedNote, setSelectedNote] = useState(note);
    const [isSharing, setIsSharing] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });

    useEffect(() => {
        if (note) setSelectedNote(note);
    }, [note]);

    if (!isOpen) return null;

    const handleSocialShare = (platform) => {
        if (!selectedNote) return;
        const text = `Je partage cette note depuis Fiip: ${selectedNote.title || 'Sans titre'}`;
        const contentPreview = (selectedNote.content?.substring(0, 100) || '') + '...';
        const contentToShare = `${text}\n\n${contentPreview}`;
        
        let url = '';
        switch (platform) {
            case 'twitter':
                url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(contentToShare)}`;
                break;
            case 'reddit':
                url = `https://www.reddit.com/submit?title=${encodeURIComponent(text)}&text=${encodeURIComponent(contentToShare)}`;
                break;
            case 'discord':
                navigator.clipboard.writeText(contentToShare);
                setStatus({ type: 'success', message: 'Texte copié pour Discord !' });
                return;
            case 'linkedin':
                url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://fiip.app')}`;
                break;
        }

        if (url) {
            open(url).catch(e => {
                console.error("Failed to open URL in browser", e);
                window.open(url, '_blank', 'noopener,noreferrer');
            });
        }
    };

    const handleShare = async (e) => {
        e.preventDefault();
        if (!selectedNote) return;

        setIsSharing(true);
        setStatus({ type: 'info', message: "Génération du lien de partage public..." });

        try {
            // Get user session
            const user = await authService.getUser();
            if (!user) {
                throw new Error("Vous devez être connecté avec votre profil pour partager.");
            }

            // 1. Create file from note
            const noteContent = JSON.stringify(selectedNote);
            const blob = new Blob([noteContent], { type: 'application/json' });
            const file = new File([blob], `${selectedNote.title || 'note'}.json`, { type: 'application/json' });

            // 2. Upload to Supabase Storage in shared/ folder
            const sharePath = `shared/${Date.now()}_${file.name}`;
            await storageService.uploadFile(user.id, file, sharePath);

            // 3. Get public URL
            const downloadUrl = storageService.getPublicUrl(user.id, sharePath);

            // Copy to clipboard
            await navigator.clipboard.writeText(downloadUrl);

            setStatus({ type: 'success', message: `Lien copié dans le presse-papiers !` });
            
            setTimeout(() => {
                onClose();
                setStatus({ type: '', message: '' });
            }, 3000);
        } catch (e) {
            console.error(e);
            setStatus({ type: 'error', message: e.message || "Une erreur est survenue" });
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-[#1C1C1E] font-dexter rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col animate-scale-in">
                {/* Header */}
                <div className="h-14 px-5 border-b border-white/10 flex items-center justify-between bg-[#2C2C2E]/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <IconShare className="w-5 h-5 text-blue-400" />
                        </div>
                        <h2 className="font-semibold text-white">Partager la note</h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                    >
                        <IconClose className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleShare} className="p-6 flex flex-col gap-6">
                    
                    {/* Note Selection */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Note à partager
                        </label>
                        <CustomSelect 
                            value={selectedNote?.id}
                            onChange={(id) => setSelectedNote(notes.find(n => n.id === id))}
                            options={notes.map(n => ({
                                value: n.id,
                                label: n.title || "Sans titre",
                                icon: <IconFileText className="w-4 h-4 text-gray-400" />
                            }))}
                            placeholder="Sélectionner une note..."
                        />
                        {selectedNote && (
                            <div className="flex items-center gap-2 px-1">
                                <IconLock className="w-3 h-3 text-gray-500" />
                                <span className="text-[10px] text-gray-500">Chiffrement de bout en bout activé</span>
                            </div>
                        )}
                    </div>

                    {/* Status Message */}
                    {status.message && (
                        <div className={`text-sm flex items-center gap-2 ${
                            status.type === 'error' ? 'text-red-400' : 
                            status.type === 'success' ? 'text-green-400' : 'text-blue-400'
                        }`}>
                            {status.type === 'error' && <IconClose className="w-4 h-4" />}
                            {status.type === 'success' && <IconCheck className="w-4 h-4" />}
                            {status.type === 'info' && <IconLoading className="w-4 h-4 animate-spin" />}
                            <span>{status.message}</span>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            disabled={isSharing}
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={!selectedNote || isSharing}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                        >
                            {isSharing ? (
                                <>
                                    <IconLoading className="w-4 h-4 animate-spin" />
                                    <span>Génération...</span>
                                </>
                            ) : (
                                <>
                                    <IconShare className="w-4 h-4" />
                                    <span>Générer un lien public</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Social Share Options */}
                    <div className="flex flex-col items-center gap-3 pt-4 border-t border-white/10 mt-2">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Ou partager sur d&apos;autres réseaux</span>
                        <div className="flex justify-center gap-4">
                            <button type="button" onClick={() => handleSocialShare('twitter')} className="p-2.5 bg-black/20 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-full transition-all duration-300 hover:scale-110" title="Partager sur Twitter">
                                <IconifyIcon icon="logos:twitter" className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => handleSocialShare('reddit')} className="p-2.5 bg-black/20 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-full transition-all duration-300 hover:scale-110" title="Partager sur Reddit">
                                <IconifyIcon icon="logos:reddit-icon" className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => handleSocialShare('discord')} className="p-2.5 bg-black/20 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-full transition-all duration-300 hover:scale-110" title="Copier pour Discord">
                                <IconifyIcon icon="logos:discord-icon" className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => handleSocialShare('linkedin')} className="p-2.5 bg-black/20 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-full transition-all duration-300 hover:scale-110" title="Partager sur LinkedIn">
                                <IconifyIcon icon="logos:linkedin-icon" className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}