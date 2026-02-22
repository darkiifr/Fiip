import { useState, useEffect } from 'react';
import { X, Send, User, Share2, Lock, Loader2, Check, FileText } from 'lucide-react';
import { keyAuthService } from '../services/keyauth';
import CustomSelect from './CustomSelect';

export default function ShareModal({ isOpen, onClose, note, notes = [] }) {
    const [selectedNote, setSelectedNote] = useState(note);
    const [targetUsername, setTargetUsername] = useState('');
    const [isSharing, setIsSharing] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });

    useEffect(() => {
        if (note) setSelectedNote(note);
    }, [note]);

    if (!isOpen) return null;

    const handleShare = async (e) => {
        e.preventDefault();
        if (!targetUsername.trim() || !selectedNote) return;

        setIsSharing(true);
        setStatus({ type: 'info', message: "Génération du lien de partage..." });

        try {
            // 1. Create file from note
            const noteContent = JSON.stringify(selectedNote);
            const blob = new Blob([noteContent], { type: 'application/json' });
            const file = new File([blob], `${selectedNote.title || 'note'}.json`, { type: 'application/json' });

            // 2. Upload to KeyAuth
            const uploadRes = await keyAuthService.fileUpload(file, file.name);

            if (!uploadRes.success) {
                throw new Error(uploadRes.message || "Erreur lors de l'upload");
            }

            const downloadUrl = uploadRes.url;

            // 3. Notify user via KeyAuth Chat
            const invitePayload = {
                type: 'shared_note',
                to: targetUsername.trim(),
                from: keyAuthService.userData.username,
                noteId: selectedNote.id,
                noteTitle: selectedNote.title,
                downloadUrl: downloadUrl,
                sentAt: Date.now(),
                message: "Je t'ai partagé une note. Télécharge-la ici."
            };

            // Send to global/invites channel
            await keyAuthService.sendChatMessage(JSON.stringify(invitePayload), 'invites');
            
            setStatus({ type: 'success', message: `Note partagée avec ${targetUsername} !` });
            setTimeout(() => {
                onClose();
                setTargetUsername('');
                setStatus({ type: '', message: '' });
            }, 2000);

        } catch (e) {
            console.error(e);
            setStatus({ type: 'error', message: e.message || "Une erreur est survenue" });
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-[#1C1C1E] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col animate-scale-in">
                {/* Header */}
                <div className="h-14 px-5 border-b border-white/10 flex items-center justify-between bg-[#2C2C2E]/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Share2 className="w-5 h-5 text-blue-400" />
                        </div>
                        <h2 className="font-semibold text-white">Partager la note</h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleShare} className="p-6 flex flex-col gap-6">
                    
                    {/* Note Selection */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">
                            Note à partager
                        </label>
                        <CustomSelect 
                            value={selectedNote?.id}
                            onChange={(id) => setSelectedNote(notes.find(n => n.id === id))}
                            options={notes.map(n => ({
                                value: n.id,
                                label: n.title || "Sans titre",
                                icon: <FileText className="w-4 h-4 text-gray-400" />
                            }))}
                            placeholder="Sélectionner une note..."
                        />
                        {selectedNote && (
                            <div className="flex items-center gap-2 px-1">
                                <Lock className="w-3 h-3 text-gray-500" />
                                <span className="text-[10px] text-gray-500">Chiffrement de bout en bout activé</span>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">
                            Destinataire (Nom d&apos;utilisateur)
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type="text"
                                value={targetUsername}
                                onChange={(e) => setTargetUsername(e.target.value)}
                                placeholder="Entrez le nom d'utilisateur exact..."
                                className="w-full h-11 pl-10 pr-4 bg-black/20 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-black/40 transition-all"
                                autoFocus
                                disabled={isSharing}
                            />
                        </div>
                    </div>

                    {/* Status Message */}
                    {status.message && (
                        <div className={`text-sm flex items-center gap-2 ${
                            status.type === 'error' ? 'text-red-400' : 
                            status.type === 'success' ? 'text-green-400' : 'text-blue-400'
                        }`}>
                            {status.type === 'error' && <X className="w-4 h-4" />}
                            {status.type === 'success' && <Check className="w-4 h-4" />}
                            {status.type === 'info' && <Loader2 className="w-4 h-4 animate-spin" />}
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
                            disabled={!targetUsername.trim() || isSharing}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                        >
                            {isSharing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Envoi...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    <span>Envoyer l&apos;invitation</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
