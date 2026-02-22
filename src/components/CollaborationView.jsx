import { useState, useEffect, useCallback } from 'react';
import { keyAuthService } from '../services/keyauth';
import { Mail, Share2, User, Download, RefreshCw, Loader2 } from 'lucide-react';

export default function CollaborationView({ onImportNote }) {
    const [inbox, setInbox] = useState([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    
    const myUsername = keyAuthService.userData?.username;

    const loadInbox = useCallback(async () => {
        if (!keyAuthService.isAuthenticated) return;
        setLoading(true);
        try {
            // Fetch from 'invites' channel
            const res = await keyAuthService.getChatMessages('invites');
            if (res.success && Array.isArray(res.messages)) {
                const messages = res.messages
                    .map(msg => {
                        try {
                            const payload = JSON.parse(msg.message);
                            return { ...payload, timestamp: msg.timestamp, id: msg.id || Math.random().toString() };
                        } catch { return null; }
                    })
                    .filter(p => p && p.type === 'shared_note' && p.to === myUsername)
                    .sort((a, b) => b.timestamp - a.timestamp); // Newest first
                
                // Deduplicate by noteId + sentAt
                const unique = [];
                const seen = new Set();
                messages.forEach(m => {
                    const key = m.noteId + '-' + m.sentAt;
                    if (!seen.has(key)) {
                        seen.add(key);
                        unique.push(m);
                    }
                });
                setInbox(unique);
            }
        } catch (e) {
            console.error("Failed to load inbox", e);
        } finally {
            setLoading(false);
        }
    }, [myUsername]);

    // Poll for shared notes
    useEffect(() => {
        loadInbox();
        const interval = setInterval(loadInbox, 10000);
        return () => clearInterval(interval);
    }, [loadInbox]);

    const handleDownload = async (item) => {
        if (!item.downloadUrl) return;
        setStatus(`Téléchargement de "${item.noteTitle}"...`);
        
        try {
            const response = await fetch(item.downloadUrl);
            if (!response.ok) throw new Error("Erreur téléchargement");
            
            const noteData = await response.json();
            
            // Clean up note data for import
            const newNote = {
                ...noteData,
                id: Date.now().toString(), // New ID to avoid conflicts
                owner: myUsername, // I become the owner of my copy
                sharedWith: [], // Reset sharing
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            onImportNote(newNote);
            setStatus(`Note "${item.noteTitle}" importée avec succès !`);
            setTimeout(() => setStatus(''), 3000);
        } catch (e) {
            console.error(e);
            setStatus("Erreur: " + e.message);
        }
    };

    if (!keyAuthService.isAuthenticated) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#1C1C1E] text-gray-400">
                <div className="bg-[#2C2C2E] p-8 rounded-2xl border border-white/10 text-center max-w-md">
                    <User className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                    <h2 className="text-xl font-bold text-white mb-2">Connexion Requise</h2>
                    <p className="text-sm mb-6">Vous devez être connecté à votre compte Fiip pour accéder aux fonctionnalités de collaboration.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-[#1C1C1E] text-gray-200 p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Centre de Partage</h1>
                    <p className="text-gray-400">Recevez des notes partagées par d&apos;autres utilisateurs via KeyAuth.</p>
                </div>
                <button 
                    onClick={loadInbox}
                    disabled={loading}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                    <RefreshCw className={`w-5 h-5 text-blue-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {status && (
                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {status}
                </div>
            )}

            <div className="bg-[#2C2C2E]/50 rounded-xl border border-white/10 flex-1 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-white/10 bg-[#2C2C2E]">
                    <h3 className="font-medium text-white flex items-center gap-2">
                        <Mail className="w-4 h-4 text-blue-400" />
                        Boîte de réception ({inbox.length})
                    </h3>
                </div>
                
                <div className="overflow-y-auto p-4 space-y-3">
                    {inbox.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Share2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Aucune note partagée pour le moment.</p>
                        </div>
                    ) : (
                        inbox.map((item) => (
                            <div key={item.id} className="bg-[#1C1C1E] border border-white/5 rounded-lg p-4 flex items-center justify-between hover:border-white/10 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold uppercase">
                                        {item.from.substring(0, 2)}
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-white">{item.noteTitle || "Note sans titre"}</h4>
                                        <p className="text-xs text-gray-400">
                                            Partagé par <span className="text-blue-400">@{item.from}</span> • {new Date(item.sentAt).toLocaleDateString()}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1 italic">&quot;{item.message}&quot;</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDownload(item)}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Importer
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}