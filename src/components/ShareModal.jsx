import { useState, useEffect } from 'react';
import { dataService, authService } from '../services/supabase';
import CustomSelect from './CustomSelect';
import { Icon as IconifyIcon } from '@iconify/react';
import { open } from '@tauri-apps/plugin-shell';

// Icons Import (Pim's Edition)
import IconClose from '~icons/mingcute/close-fill';
import IconShare from '~icons/mingcute/share-2-fill';
import IconLock from '~icons/mingcute/lock-fill';
import IconGlobe from '~icons/mingcute/earth-2-fill'; // New icon for public
import IconLoading from '~icons/mingcute/loading-fill';
import IconCheck from '~icons/mingcute/check-fill';
import IconFileText from '~icons/mingcute/file-fill';
import IconCopy from '~icons/mingcute/copy-fill';

export default function ShareModal({ isOpen, onClose, note, notes = [], onUpdateNote }) {
    const [selectedNote, setSelectedNote] = useState(note);
    const [isSharing, setIsSharing] = useState(false); // For loading state
    const [isPublic, setIsPublic] = useState(false);
    const [publicUrl, setPublicUrl] = useState('');
    const [status, setStatus] = useState({ type: '', message: '' });

    // Collaboration state
    const [collaborators, setCollaborators] = useState([]);
    const [newCollabUsername, setNewCollabUsername] = useState('');
    const [isLoadingCollab, setIsLoadingCollab] = useState(false);
    
    // User validation 
    const [currentUser, setCurrentUser] = useState(null);
    const [isUserLoaded, setIsUserLoaded] = useState(false);

    const isOwner = selectedNote && currentUser 
        ? (selectedNote.user_id || selectedNote.userId) === currentUser.id
        : false;

    useEffect(() => {
        if (isOpen) {
            setIsUserLoaded(false);
            authService.getUser()
                .then(user => {
                    setCurrentUser(user);
                })
                .catch(err => {
                    console.error("Error loading user in ShareModal:", err);
                })
                .finally(() => {
                    setIsUserLoaded(true);
                });
        }
    }, [isOpen]);

    useEffect(() => {
        if (note) {
            setSelectedNote(note);
        }
    }, [note]);

    useEffect(() => {
        if (selectedNote) {
            // Check if already public
            if (selectedNote.public_slug) {
                setIsPublic(true);
                setPublicUrl(`https://fiip-app.netlify.app/n/${selectedNote.public_slug}`);
            } else {
                setIsPublic(false);
                setPublicUrl('');
            }
            fetchCollaborators(selectedNote.id);
        }
    }, [selectedNote]);

    const fetchCollaborators = async (id) => {
        setIsLoadingCollab(true);
        const { data, error } = await dataService.getCollaborators(id);
        if (!error && data) {
            setCollaborators(data);
        }
        setIsLoadingCollab(false);
    };

    const handleAddCollaborator = async (e) => {
        if (e) e.preventDefault();
        if (!newCollabUsername.trim() || !selectedNote) return;
        setIsLoadingCollab(true);
        setStatus({ type: '', message: '' });
        
        try {
            await dataService.saveNote(selectedNote); // ensure it's saved
            const res = await dataService.addCollaborator(selectedNote.id, newCollabUsername.trim());
            if (res.error) throw new Error(res.error);
            setStatus({ type: 'success', message: 'Collaborateur ajouté !' });
            setNewCollabUsername('');
            fetchCollaborators(selectedNote.id);
        } catch (err) {
            setStatus({ type: 'error', message: err.message || 'Erreur lors de l\'ajout' });
        } finally {
            setIsLoadingCollab(false);
        }
    };

    const handleRemoveCollaborator = async (userId) => {
        if (!selectedNote) return;
        setIsLoadingCollab(true);
        const { error } = await dataService.removeCollaborator(selectedNote.id, userId);
        if (!error) fetchCollaborators(selectedNote.id);
        setIsLoadingCollab(false);
    };

    const handleTogglePublic = async () => {
        if (!selectedNote) return;
        setIsSharing(true);
        setStatus({ type: '', message: '' });

        try {
            // S'assurer que la note est bien sauvegardée sur les serveurs de Supabase avant de vouloir la publier
            // Cela évite un bug où une note locale toute neuve n'a pas encore de ligne correspondante en BDD
            const saveRes = await dataService.saveNote(selectedNote);
            if (saveRes && saveRes.error) throw saveRes.error;

            if (isPublic) {
                // Unpublish
                const { error } = await dataService.unpublishNote(selectedNote.id);
                if (error) throw error;
                setIsPublic(false);
                setPublicUrl('');
                setStatus({ type: 'success', message: 'Note rendue privée.' });
                if (onUpdateNote) onUpdateNote({ ...selectedNote, public_slug: null, shared: false });
            } else {
                // Publish
                const { data, error } = await dataService.publishNote(selectedNote.id);
                if (error) throw error;
                setIsPublic(true);
                setPublicUrl(`https://fiip-app.netlify.app/n/${data.public_slug}`);
                setStatus({ type: 'success', message: 'Note publiée avec succès !' });
                if (onUpdateNote) onUpdateNote({ ...selectedNote, public_slug: data.public_slug, shared: true });
            }
        } catch (error) {
            console.error('Erreur Publish:', error);
            setStatus({ type: 'error', message: 'Erreur lors de la mise à jour.' });
        } finally {
            setIsSharing(false);
        }
    };

    const copyLink = () => {
        if (publicUrl) {
            navigator.clipboard.writeText(publicUrl);
            setStatus({ type: 'success', message: 'Lien copié !' });
            setTimeout(() => setStatus({ type: '', message: '' }), 2000);
        }
    };

    if (!isOpen) return null;

    const handleSocialShare = (platform) => {
        if (!selectedNote) return;
        const text = `Je partage cette note depuis Fiip: ${selectedNote.title || 'Sans titre'}`;
        const contentPreview = (selectedNote.content?.substring(0, 100) || '') + '...';
        
        let shareUrl = '';
        if (isPublic && publicUrl) {
            shareUrl = publicUrl;
        } else {
            // Fallback to homepage if not public
            shareUrl = 'https://fiip.app'; 
        }

        const encodedText = encodeURIComponent(text);
        const encodedUrl = encodeURIComponent(shareUrl);
        // const encodedPreview = encodeURIComponent(contentPreview);
        
        let url = '';
        switch (platform) {
            case 'twitter':
                url = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
                break;
            case 'reddit':
                url = `https://www.reddit.com/submit?title=${encodedText}&url=${encodedUrl}`;
                break;
            case 'discord': {
                const discordContent = `${text}\n${shareUrl}\n\n${contentPreview}`;
                navigator.clipboard.writeText(discordContent);
                setStatus({ type: 'success', message: 'Texte copié pour Discord !' });
                return;
            }
            case 'linkedin':
                url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
                break;
        }

        if (url) {
            open(url).catch(e => {
                console.error("Failed to open URL in browser", e);
                window.open(url, '_blank', 'noopener,noreferrer');
            });
        }
    };

    // handleShare implementation details removed as we are using handleTogglePublic now


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
                <div className="p-6 flex flex-col gap-6">
                    
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

                    {!isOwner && isUserLoaded && selectedNote && (
                         <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm flex items-start gap-3">
                             <IconLock className="w-5 h-5 shrink-0 mt-0.5" />
                             <p>
                                 Vous n&apos;êtes pas le propriétaire de cette note. Seul le créateur peut modifier les options de partage ou ajouter des collaborateurs.
                             </p>
                         </div>
                    )}

                    {!isUserLoaded && (
                         <div className="p-4 flex items-center justify-center text-gray-500 text-sm">
                             <IconLoading className="w-5 h-5 animate-spin mr-2" />
                             Vérification des droits...
                         </div>
                    )}

                    {isOwner && isUserLoaded && (
                        <>
                            {/* Public Sharing Section */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isPublic ? 'bg-green-500/20 text-green-400' : 'bg-gray-700/50 text-gray-400'}`}>
                                    <IconGlobe className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-white">Lien Public</h3>
                                    <p className="text-xs text-gray-400">
                                        {isPublic ? "Accessible via le lien ci-dessous" : "La note est actuellement privée"}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleTogglePublic}
                                disabled={!selectedNote || isSharing}
                                className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
                                    isPublic 
                                        ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' 
                                        : 'bg-blue-600 border-transparent text-white hover:bg-blue-500'
                                }`}
                            >
                                {isSharing ? (
                                    <IconLoading className="w-4 h-4 animate-spin" />
                                ) : (
                                    isPublic ? "Arrêter le partage" : "Publier"
                                )}
                            </button>
                        </div>

                        {isPublic && (
                            <div className="flex items-center gap-2 bg-[#121212] p-2 rounded-lg border border-white/10">
                                <span className="flex-1 text-xs text-gray-300 font-mono truncate px-2 selection:bg-blue-500/30">
                                    {publicUrl}
                                </span>
                                <button 
                                    onClick={copyLink}
                                    className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
                                    title="Copier le lien"
                                >
                                    <IconCopy className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => open(publicUrl)}
                                    className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
                                    title="Ouvrir dans le navigateur"
                                >
                                    <IconShare className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Collaborators Section */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                                    <IconLock className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-white">Collaborateurs</h3>
                                    <p className="text-xs text-gray-400">
                                        Partage privé avec d&apos;autres utilisateurs
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* List of collaborators */}
                        {collaborators.length > 0 && (
                            <div className="space-y-2 mb-3 max-h-32 overflow-y-auto pr-2">
                                {collaborators.map(collab => (
                                    <div key={collab.user_id} className="flex flex-row items-center justify-between bg-[#121212] p-2 rounded-lg border border-white/10">
                                        <div className="flex items-center gap-2">
                                            {collab.profiles?.avatar_url ? (
                                                <img src={collab.profiles.avatar_url} alt="avatar" className="w-6 h-6 rounded-full" />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-300">
                                                    {collab.profiles?.username?.[0] || '?'}
                                                </div>
                                            )}
                                            <span className="text-sm text-gray-200">{collab.profiles?.username || 'Utilisateur'}</span>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveCollaborator(collab.user_id)}
                                            className="text-red-400 hover:text-red-300 p-1 rounded-md hover:bg-red-500/10 transition-colors"
                                            title="Retirer"
                                        >
                                            <IconClose className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add collaborator form */}
                        <form onSubmit={handleAddCollaborator} className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Nom d'utilisateur"
                                value={newCollabUsername}
                                onChange={(e) => setNewCollabUsername(e.target.value)}
                                className="flex-1 bg-[#121212] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500/50"
                                disabled={isLoadingCollab}
                            />
                            <button
                                type="submit"
                                disabled={!newCollabUsername.trim() || isLoadingCollab}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                {isLoadingCollab ? <IconLoading className="w-4 h-4 animate-spin" /> : 'Ajouter'}
                            </button>
                        </form>

                        {/* Section pour partager son propre pseudo */}
                        {currentUser && currentUser.user_metadata?.username && (
                            <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-lg flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-400 font-medium tracking-wide">VOTRE PSEUDO POUR COLLABORER</span>
                                    <span className="text-sm text-white mt-0.5">@{currentUser.user_metadata.username}</span>
                                </div>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(currentUser.user_metadata.username);
                                        setStatus({ type: 'success', message: 'Pseudo copié !' });
                                        setTimeout(() => setStatus({ type: '', message: '' }), 2000);
                                    }}
                                    className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
                                >
                                    <IconCopy className="w-4 h-4" />
                                    <span>Copier</span>
                                </button>
                            </div>
                        )}
                    </div>
                        </>
                    )}

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
                </div>
            </div>
        </div>
    );
}