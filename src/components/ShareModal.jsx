import { useState } from 'react';
import { X, Send, User, Share2, Lock, Loader2, Check } from 'lucide-react';
import { keyAuthService } from '../services/keyauth';
import { encryptData } from '../utils/crypto';

export default function ShareModal({ isOpen, onClose, note }) {
    const [targetUsername, setTargetUsername] = useState('');
    const [isSharing, setIsSharing] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });

    if (!isOpen || !note) return null;

    const handleShare = async (e) => {
        e.preventDefault();
        if (!targetUsername.trim()) return;

        setIsSharing(true);
        setStatus({ type: 'info', message: "Préparation de l'envoi..." });

        try {
            // 1. Encrypt Note Content
            const shareKey = Math.random().toString(36).substring(2) + Date.now().toString(36);
            const encryptedContent = await encryptData(note, shareKey);
            
            // 2. Upload as file
            const blob = new Blob([JSON.stringify({ content: encryptedContent })], { type: 'application/json' });
            const file = new File([blob], `share_${Date.now()}.fiip`, { type: 'application/json' });
            
            setStatus({ type: 'info', message: "Envoi sécurisé..." });
            const uploadRes = await keyAuthService.fileUpload(file, file.name);
            
            if (!uploadRes.success || !uploadRes.url) {
                throw new Error(uploadRes.message || "Échec de l'upload");
            }

            // 3. Send Invite Message
            const invitePayload = {
                type: 'invite',
                to: targetUsername.trim(),
                from: keyAuthService.userData.username,
                noteId: note.id,
                noteTitle: note.title,
                url: uploadRes.url,
                key: shareKey,
                sentAt: Date.now()
            };

            const chatRes = await keyAuthService.sendChatMessage(JSON.stringify(invitePayload), 'invites');
            
            if (chatRes.success) {
                setStatus({ type: 'success', message: `Invitation envoyée à ${targetUsername} !` });
                setTimeout(() => {
                    onClose();
                    setTargetUsername('');
                    setStatus({ type: '', message: '' });
                }, 2000);
            } else {
                throw new Error(chatRes.message || "Échec de l'envoi du message");
            }

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
                    
                    {/* Note Info */}
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                        <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center shrink-0">
                            <Lock className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-white truncate">{note.title || "Note sans titre"}</h3>
                            <p className="text-xs text-gray-500">Chiffrement de bout en bout activé</p>
                        </div>
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
