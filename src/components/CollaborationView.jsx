import { useState, useEffect } from 'react';
import { keyAuthService } from '../services/keyauth';
import { Mail, Send, Download, RefreshCw, Share2, AlertTriangle, FileText, User } from 'lucide-react';
import { encryptData, decryptData } from '../utils/crypto';

export default function CollaborationView({ notes, onImportNote }) {
    const [activeTab, setActiveTab] = useState('inbox'); // 'inbox' | 'share'
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    
    // Share Form
    const [selectedNoteId, setSelectedNoteId] = useState('');
    const [targetUsername, setTargetUsername] = useState('');
    const [isSharing, setIsSharing] = useState(false);

    // Poll for invites
    useEffect(() => {
        if (activeTab === 'inbox') {
            loadInvites();
            const interval = setInterval(loadInvites, 10000); // Poll every 10s
            return () => clearInterval(interval);
        }
    }, [activeTab]);

    const loadInvites = async () => {
        if (!keyAuthService.isAuthenticated) return;
        
        setLoading(true);
        try {
            // We use a global channel 'invites' and filter client-side
            // In a real secure app, this should be server-side filtered
            const res = await keyAuthService.getChatMessages('invites');
            
            if (res.success && Array.isArray(res.messages)) {
                const myUsername = keyAuthService.userData?.username;
                const myInvites = res.messages
                    .map(msg => {
                        try {
                            // Message format: JSON string
                            // { type: 'invite', to: 'username', from: 'sender', ... }
                            const payload = JSON.parse(msg.message);
                            return { ...payload, timestamp: msg.timestamp, id: msg.id || Math.random().toString() };
                        } catch {
                            return null;
                        }
                    })
                    .filter(p => p && p.type === 'invite' && p.to === myUsername)
                    .sort((a, b) => b.timestamp - a.timestamp); // Newest first
                
                // Remove duplicates based on noteId + from
                const uniqueInvites = [];
                const seen = new Set();
                myInvites.forEach(inv => {
                    const key = inv.from + '-' + inv.noteId;
                    if (!seen.has(key)) {
                        seen.add(key);
                        uniqueInvites.push(inv);
                    }
                });

                setInvites(uniqueInvites);
            }
        } catch (e) {
            console.error("Failed to load invites", e);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        if (!selectedNoteId || !targetUsername) {
            setStatus("Veuillez sélectionner une note et un destinataire.");
            return;
        }

        const note = notes.find(n => n.id === selectedNoteId);
        if (!note) return;

        setIsSharing(true);
        setStatus("Préparation de l'envoi...");

        try {
            // 1. Encrypt Note Content
            // We generate a random one-time key for this share
            const shareKey = Math.random().toString(36).substring(2) + Date.now().toString(36);
            const encryptedContent = await encryptData(note, shareKey);
            
            // 2. Upload as file (to handle size)
            // Create a Blob
            const blob = new Blob([JSON.stringify({ content: encryptedContent })], { type: 'application/json' });
            const file = new File([blob], `share_${Date.now()}.fiip`, { type: 'application/json' });
            
            setStatus("Upload sécurisé en cours...");
            const uploadRes = await keyAuthService.fileUpload(file, file.name);
            
            if (!uploadRes.success || !uploadRes.url) {
                throw new Error("Échec de l'upload: " + uploadRes.message);
            }

            // 3. Send Invite Message
            const invitePayload = {
                type: 'invite',
                to: targetUsername,
                from: keyAuthService.userData.username,
                noteId: note.id,
                noteTitle: note.title,
                url: uploadRes.url,
                key: shareKey, // Sending key in "plain text" inside the message (protected only by channel obscurity)
                sentAt: Date.now()
            };

            setStatus("Envoi de l'invitation...");
            const chatRes = await keyAuthService.sendChatMessage(JSON.stringify(invitePayload), 'invites');
            
            if (chatRes.success) {
                setStatus("Invitation envoyée avec succès !");
                setTargetUsername('');
                setSelectedNoteId('');
                setTimeout(() => setStatus(''), 3000);
            } else {
                throw new Error("Échec de l'envoi du message: " + chatRes.message);
            }

        } catch (e) {
            setStatus("Erreur: " + e.message);
        } finally {
            setIsSharing(false);
        }
    };

    const handleAccept = async (invite) => {
        if (!confirm(`Accepter la note "${invite.noteTitle}" de ${invite.from} ?`)) return;

        setStatus("Téléchargement...");
        try {
            // 1. Download File
            // Note: In browser, fetch might be blocked by CORS if KeyAuth doesn't allow it.
            // Using Tauri fetch/http if needed, but standard fetch usually works with KeyAuth URLs.
            const res = await fetch(invite.url);
            if (!res.ok) throw new Error("Impossible de télécharger le fichier partage.");
            
            const data = await res.json();
            
            // 2. Decrypt
            setStatus("Déchiffrement...");
            if (!data.content) throw new Error("Format de fichier invalide.");
            
            const decryptedNote = await decryptData(data.content, invite.key);
            
            // 3. Import
            // Generate new ID to avoid conflict
            const newNote = {
                ...decryptedNote,
                id: Date.now().toString(),
                title: `${decryptedNote.title} (Partagé par ${invite.from})`,
                sharedFrom: invite.from,
                sharedAt: Date.now()
            };
            
            onImportNote(newNote);
            setStatus("Note importée avec succès !");
            
            // Remove invite from local view (optimistic)
            setInvites(prev => prev.filter(i => i !== invite));
            
            setTimeout(() => setStatus(''), 3000);

        } catch (e) {
            console.error(e);
            setStatus("Erreur lors de l'import: " + e.message);
        }
    };

    if (!keyAuthService.isAuthenticated) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#1C1C1E] text-gray-400">
                <div className="bg-[#2C2C2E] p-8 rounded-2xl border border-white/10 text-center max-w-md">
                    <User className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                    <h2 className="text-xl font-bold text-white mb-2">Connexion Requise</h2>
                    <p className="text-sm mb-6">Vous devez être connecté à votre compte Fiip pour accéder aux fonctionnalités de collaboration et de partage.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-[#1C1C1E] text-gray-100 overflow-hidden">
            {/* Header */}
            <div className="h-[52px] px-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#1C1C1E]/50 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <Share2 className="w-5 h-5 text-blue-500" />
                    <h1 className="font-semibold text-sm">Centre de Collaboration</h1>
                </div>
                {status && <span className="text-xs text-blue-400 animate-pulse">{status}</span>}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/5 px-6">
                <button 
                    onClick={() => setActiveTab('inbox')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'inbox' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                >
                    <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Boîte de réception
                        {invites.length > 0 && <span className="bg-blue-600 text-white text-[10px] px-1.5 rounded-full">{invites.length}</span>}
                    </div>
                </button>
                <button 
                    onClick={() => setActiveTab('share')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'share' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                >
                    <div className="flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        Partager une note
                    </div>
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'inbox' ? (
                    <div className="space-y-4 max-w-3xl mx-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">Invitations reçues</h2>
                            <button onClick={loadInvites} disabled={loading} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                        
                        {invites.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 border border-dashed border-white/10 rounded-xl">
                                <Mail className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>Aucune invitation en attente</p>
                            </div>
                        ) : (
                            invites.map((invite, idx) => (
                                <div key={idx} className="bg-[#2C2C2E] border border-white/10 rounded-xl p-4 flex items-center gap-4 hover:border-blue-500/30 transition-colors">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold uppercase">
                                        {invite.from.substring(0, 2)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-white">{invite.from}</span>
                                            <span className="text-gray-400 text-xs">vous a envoyé une note</span>
                                        </div>
                                        <div className="font-medium text-blue-400 mt-0.5">{invite.noteTitle}</div>
                                        <div className="text-[10px] text-gray-500 mt-1">
                                            {new Date(invite.sentAt).toLocaleString()}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleAccept(invite)}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg flex items-center gap-2 transition-colors"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Accepter
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="max-w-xl mx-auto space-y-6">
                        <div className="bg-[#2C2C2E] border border-white/10 rounded-xl p-6 space-y-6">
                            <div>
                                <h2 className="text-lg font-bold mb-1">Partager une note</h2>
                                <p className="text-xs text-gray-400">Envoyez une copie sécurisée de votre note à un autre utilisateur.</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Note à partager</label>
                                    <div className="relative">
                                        <FileText className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                        <select 
                                            value={selectedNoteId}
                                            onChange={(e) => setSelectedNoteId(e.target.value)}
                                            className="w-full bg-[#1C1C1E] border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 appearance-none text-white"
                                        >
                                            <option value="">Sélectionner une note...</option>
                                            {notes.map(note => (
                                                <option key={note.id} value={note.id}>{note.title || "Sans titre"}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Nom d&apos;utilisateur du destinataire</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                        <input 
                                            type="text"
                                            value={targetUsername}
                                            onChange={(e) => setTargetUsername(e.target.value)}
                                            placeholder="Ex: Vins"
                                            className="w-full bg-[#1C1C1E] border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-gray-600"
                                        />
                                    </div>
                                </div>

                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex gap-3">
                                    <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
                                    <p className="text-[11px] text-yellow-200/80">
                                        Note : Le partage utilise le système de chat public sécurisé. Bien que le contenu soit chiffré, les métadonnées de l&apos;invitation sont visibles sur le canal système. Assurez-vous d&apos;avoir confiance en votre destinataire.
                                    </p>
                                </div>

                                <button 
                                    onClick={handleShare}
                                    disabled={isSharing || !selectedNoteId || !targetUsername}
                                    className={`w-full py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                                        isSharing || !selectedNoteId || !targetUsername
                                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20'
                                    }`}
                                >
                                    {isSharing ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Envoi en cours...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Envoyer l&apos;invitation
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
