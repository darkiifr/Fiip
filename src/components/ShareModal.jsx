import { open } from '@tauri-apps/plugin-shell';
import { IconDiscord, IconLinkedin, IconReddit, IconXTwitter } from 'nucleo-social-media';
import { useState, useEffect } from 'react';

import { FIIP_PUBLIC_SITE_URL, buildPublicNoteUrl } from '../config/links';
import { dataService, authService } from '../services/supabase';

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from './ui/Select';

// Icons Import
import IconCheck from '~icons/mingcute/check-fill';
import IconClose from '~icons/mingcute/close-fill';
import IconCopy from '~icons/mingcute/copy-fill';
import IconGlobe from '~icons/mingcute/earth-2-fill';
import IconFileText from '~icons/mingcute/file-fill';
import IconLoading from '~icons/mingcute/loading-fill';
import IconLock from '~icons/mingcute/lock-fill';

function getShareErrorMessage(error) {
    const message = typeof error === 'string' ? error : error?.message || error?.error || '';
    if (message === 'FREE_PUBLIC_SHARE_DISABLED') {
        return 'Le partage public demande une licence active.';
    }
    if (message === 'FREE_NOTE_LIMIT_EXCEEDED') {
        return 'Limite de notes cloud atteinte pour votre licence.';
    }
    if (/protegees|protégées|locked|encrypted/i.test(message)) {
        return 'Les notes protegees ne peuvent pas etre publiees.';
    }
    if (/not authenticated|auth/i.test(message)) {
        return 'Connectez-vous pour publier cette note.';
    }
    if (/row|single|not found|pgrst116|0 rows/i.test(message)) {
        return 'La note doit etre synchronisee avant publication. Reessayez dans un instant.';
    }
    return message || 'Erreur lors de la mise a jour.';
}

export default function ShareModal({ isOpen, onClose, note, notes = [], onUpdateNote }) {
    const [selectedNote, setSelectedNote] = useState(note);
    const [isSharing, setIsSharing] = useState(false);
    const [isPublic, setIsPublic] = useState(false);
    const [publicUrl, setPublicUrl] = useState('');
    const [status, setStatus] = useState({ type: '', message: '' });

    const [collaborators, setCollaborators] = useState([]);
    const [newCollabUsername, setNewCollabUsername] = useState('');
    const [isLoadingCollab, setIsLoadingCollab] = useState(false);
    
    const [currentUser, setCurrentUser] = useState(null);
    const [isUserLoaded, setIsUserLoaded] = useState(false);

    const isOwner = selectedNote && currentUser 
        ? (selectedNote.user_id || selectedNote.userId) === currentUser.id
        : false;
    const isProtectedNote = Boolean(selectedNote?.isProtected || selectedNote?.is_locked || selectedNote?.encryptedContent || selectedNote?.encrypted_content);

    const fetchCollaborators = async (id) => {
        setIsLoadingCollab(true);
        const { data, error } = await dataService.getCollaborators(id);
        if (!error && data) {
            setCollaborators(data);
        }
        setIsLoadingCollab(false);
    };

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
            if (selectedNote.public_slug) {
                setIsPublic(true);
                setPublicUrl(buildPublicNoteUrl(selectedNote.public_slug));
            } else {
                setIsPublic(false);
                setPublicUrl('');
            }
            fetchCollaborators(selectedNote.id);
        }
    }, [selectedNote]);

    const handleAddCollaborator = async (e) => {
        e.preventDefault();
        if (!newCollabUsername.trim() || !selectedNote) return;
        if (isProtectedNote) {
            setStatus({ type: 'error', message: 'Les notes protegees ne peuvent pas etre partagees en collaboration.' });
            return;
        }
        setIsLoadingCollab(true);
        setStatus({ type: '', message: '' });
        
        try {
            await dataService.saveNote(selectedNote);
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
        if (isProtectedNote) {
            setStatus({ type: 'error', message: 'Les notes protegees ne peuvent pas etre publiees.' });
            return;
        }
        setIsSharing(true);
        setStatus({ type: '', message: '' });

        try {
            const saveRes = await dataService.saveNote(selectedNote);
            if (saveRes && saveRes.error) throw saveRes.error;
            const syncedNote = {
                ...selectedNote,
                id: saveRes?.data?.id || selectedNote.id,
                user_id: saveRes?.data?.user_id || selectedNote.user_id || currentUser?.id,
            };

            if (isPublic) {
                const { error } = await dataService.unpublishNote(syncedNote.id);
                if (error) throw error;
                setIsPublic(false);
                setPublicUrl('');
                setStatus({ type: 'success', message: 'Note rendue privée.' });
                onUpdateNote({ ...syncedNote, public_slug: null, shared: false });
            } else {
                const { data, error } = await dataService.publishNote(syncedNote.id);
                if (error) throw error;
                if (!data?.public_slug) throw new Error('NOTE_NOT_READY_FOR_SHARE');
                setIsPublic(true);
                setPublicUrl(buildPublicNoteUrl(data.public_slug));
                setStatus({ type: 'success', message: 'Note publiée avec succès !' });
                onUpdateNote({ ...syncedNote, public_slug: data.public_slug, shared: true });
            }
        } catch (error) {
            console.error('Erreur Publish:', error);
            setStatus({ type: 'error', message: getShareErrorMessage(error) });
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

    const handleSocialShare = (platform) => {
        if (!selectedNote) return;
        const text = `Je partage cette note depuis Fiip: ${selectedNote.title || 'Sans titre'}`;
        const contentPreview = (selectedNote.content?.substring(0, 100) || '') + '...';
        
        const shareUrl = isPublic && publicUrl ? publicUrl : FIIP_PUBLIC_SITE_URL;
        const encodedText = encodeURIComponent(text);
        const encodedUrl = encodeURIComponent(shareUrl);
        
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-xl animate-fade-in font-sans select-none">
            <div className="fiip-light-share-modal flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[30px] border border-[color:var(--border-color)] bg-[color:var(--bg-card)] text-[color:var(--text-primary)] shadow-[0_32px_110px_rgba(0,0,0,0.34)] animate-scale-in">
                {/* Header */}
                <div className="px-6 py-5 border-b border-warm-border-light dark:border-white/10 flex items-start justify-between bg-white/45 dark:bg-white/[0.035]">
                    <div className="flex items-center gap-2.5">
                        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-2 text-amber-600 dark:text-amber-300">
                            <IconGlobe className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="fiip-light-share-heading text-lg font-black tracking-tight">Partager la note</h2>
                            <p className="mt-1 text-xs font-medium text-warm-text-muted-light dark:text-warm-text-muted-dark">Publiez la note ou invitez des collaborateurs prives.</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        aria-label="Fermer"
                        className="p-2 rounded-xl text-warm-text-muted-dark hover:bg-white/10 hover:text-white"
                    >
                        <IconClose className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex flex-col gap-5 overflow-y-auto p-6">
                    
                    {/* Note Selection */}
                    <div className="rounded-3xl border border-warm-border-light bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.05] space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-warm-text-muted-light">
                            Sélectionner une note
                        </label>
                        <Select
                            value={selectedNote?.id}
                            onValueChange={(id) => setSelectedNote(notes.find(n => n.id === id))}
                        >
                            <SelectTrigger className="w-full rounded-2xl border border-warm-border-light bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#111316]">
                                <div className="flex min-w-0 items-center gap-2">
                                    <IconFileText className="w-4 h-4 shrink-0 text-warm-text-muted-light" />
                                    <SelectValue placeholder="Choisir une note..." />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {notes.map((n) => (
                                        <SelectItem key={n.id} value={n.id}>
                                            {n.title || "Sans titre"}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        {selectedNote && isProtectedNote && (
                            <div className="flex items-center gap-1.5 px-1 mt-1 text-[9px] font-semibold text-warm-text-muted-light">
                                <IconLock className="w-3 h-3" />
                                <span>Note chiffrée de bout en bout</span>
                            </div>
                        )}
                    </div>

                    {!isOwner && isUserLoaded && selectedNote && (
                         <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-xs flex items-start gap-2.5">
                             <IconLock className="w-4 h-4 shrink-0 mt-0.5" />
                             <p className="leading-relaxed font-medium">
                                 Vous n'êtes pas le propriétaire de cette note. Seul le propriétaire peut configurer les options de partage ou ajouter des collaborateurs.
                             </p>
                         </div>
                    )}

                    {!isUserLoaded && (
                         <div className="p-6 flex items-center justify-center text-warm-text-muted-light text-xs font-semibold">
                             <IconLoading className="w-4 h-4 animate-spin mr-2" />
                             Vérification des droits...
                         </div>
                    )}

                    {isOwner && isUserLoaded && (
                        <>
                            {/* Public Link */}
                            <div className="bg-white/70 dark:bg-white/[0.05] rounded-3xl p-4 border border-warm-border-light dark:border-white/10 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl border ${isPublic ? 'bg-green-500/15 border-green-500/10 text-green-600 dark:text-green-400' : 'bg-warm-sidebar-light dark:bg-zinc-800 border-warm-border-light dark:border-warm-border-dark text-warm-text-muted-light dark:text-warm-text-muted-dark'}`}>
                                            <IconGlobe className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-bold">Lien Public</h3>
                                            <p className="text-[10px] text-warm-text-muted-light font-medium">
                                                {isPublic ? "Accessible en ligne" : "La note est actuellement privée"}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleTogglePublic}
                                        disabled={!selectedNote || isSharing}
                                        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all border ${
                                            isPublic 
                                                ? 'bg-red-500/10 border-red-500/25 text-red-600 dark:text-red-400 hover:bg-red-500/20' 
                                                : 'fiip-light-share-action bg-[#1C1C1E] dark:bg-white text-white dark:text-black hover:opacity-90 border-transparent'
                                        }`}
                                    >
                                        {isSharing ? (
                                            <IconLoading className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            isPublic ? "Désactiver" : "Publier"
                                        )}
                                    </button>
                                </div>

                                {isPublic && (
                                    <div className="flex items-center gap-2 bg-[#fbfaf6] dark:bg-[#111316] p-2 rounded-2xl border border-warm-border-light dark:border-white/10">
                                        <span className="flex-1 text-[10px] text-warm-text-primary-light dark:text-warm-text-primary-dark font-mono truncate px-1 select-all">
                                            {publicUrl}
                                        </span>
                                        <button 
                                            onClick={copyLink}
                                            className="p-1.5 hover:bg-warm-sidebar-item-active rounded-lg text-warm-text-muted-light transition-colors"
                                            title="Copier le lien"
                                        >
                                            <IconCopy className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => open(publicUrl)}
                                            className="p-1.5 hover:bg-warm-sidebar-item-active rounded-lg text-warm-text-muted-light transition-colors"
                                            title="Ouvrir dans le navigateur"
                                        >
                                            <IconGlobe className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Collaborators */}
                            <div className="bg-white/70 dark:bg-white/[0.05] rounded-3xl p-4 border border-warm-border-light dark:border-white/10 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/25">
                                        <IconLock className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold">Collaborateurs</h3>
                                        <p className="text-[10px] text-warm-text-muted-light font-medium">
                                            Partager en privé avec d'autres utilisateurs
                                        </p>
                                    </div>
                                </div>

                                {/* List */}
                                {collaborators.length > 0 && (
                                    <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                                        {collaborators.map(collab => (
                                            <div key={collab.user_id} className="flex items-center justify-between bg-white dark:bg-zinc-800 p-2 rounded-xl border border-warm-border-light dark:border-warm-border-dark">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] font-bold text-amber-600">
                                                        {collab.profiles?.username?.[0]?.toUpperCase() || '?'}
                                                    </div>
                                                    <span className="text-xs font-semibold">{collab.profiles?.username}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveCollaborator(collab.user_id)}
                                                    className="text-red-500 hover:bg-red-500/10 p-1 rounded-lg transition-colors"
                                                    title="Retirer"
                                                >
                                                    <IconClose className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Form */}
                                <form onSubmit={handleAddCollaborator} className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Nom d'utilisateur"
                                        value={newCollabUsername}
                                        onChange={(e) => setNewCollabUsername(e.target.value)}
                                        className="flex-1 bg-white dark:bg-zinc-800 border border-warm-border-light dark:border-warm-border-dark rounded-xl px-3 py-1.5 text-xs text-warm-text-primary-light dark:text-warm-text-primary-dark focus:outline-none"
                                        disabled={isLoadingCollab}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newCollabUsername.trim() || isLoadingCollab}
                                        className="fiip-light-share-action px-3.5 py-1.5 bg-[#1C1C1E] dark:bg-white text-white dark:text-black hover:opacity-90 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                                    >
                                        {isLoadingCollab ? <IconLoading className="w-3.5 h-3.5 animate-spin" /> : 'Ajouter'}
                                    </button>
                                </form>

                                {/* Your Username */}
                                {currentUser && currentUser.user_metadata?.username && (
                                    <div className="mt-2 p-2.5 bg-white dark:bg-zinc-800 border border-warm-border-light dark:border-warm-border-dark rounded-xl flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] text-warm-text-muted-light font-bold uppercase tracking-wider">Votre pseudo pour collaborer</span>
                                            <span className="text-xs font-bold mt-0.5">@{currentUser.user_metadata.username}</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(currentUser.user_metadata.username);
                                                setStatus({ type: 'success', message: 'Pseudo copié !' });
                                                setTimeout(() => setStatus({ type: '', message: '' }), 2000);
                                            }}
                                            className="px-2.5 py-1 bg-warm-sidebar-light hover:bg-warm-sidebar-item-active dark:bg-zinc-900 border border-warm-border-light dark:border-warm-border-dark rounded-lg transition-colors flex items-center gap-1.5 text-[9px] font-bold"
                                        >
                                            <IconCopy className="w-3 h-3" />
                                            <span>Copier</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Status Message */}
                    {status.message && (
                        <div className={`text-xs font-semibold flex items-center gap-1.5 ${
                            status.type === 'error' ? 'text-red-500' : 
                            status.type === 'success' ? 'text-green-600' : 'text-blue-500'
                        }`}>
                            {status.type === 'error' && <IconClose className="w-3.5 h-3.5" />}
                            {status.type === 'success' && <IconCheck className="w-3.5 h-3.5" />}
                            {status.type === 'info' && <IconLoading className="w-3.5 h-3.5 animate-spin" />}
                            <span>{status.message}</span>
                        </div>
                    )}

                    {/* Social Share */}
                    <div className="flex flex-col items-center gap-2.5 pt-4 border-t border-warm-border-light dark:border-warm-border-dark mt-2 select-none">
                        <span className="text-[9px] font-bold text-warm-text-muted-light uppercase tracking-widest">Partager sur les réseaux</span>
                        <div className="flex justify-center gap-3">
                            {['twitter', 'reddit', 'discord', 'linkedin'].map(platform => {
                                const SocialIcon = {
                                    twitter: IconXTwitter,
                                    reddit: IconReddit,
                                    discord: IconDiscord,
                                    linkedin: IconLinkedin
                                }[platform];
                                return (
                                    <button 
                                        key={platform}
                                        type="button" 
                                        onClick={() => handleSocialShare(platform)} 
                                        className="p-2.5 bg-warm-sidebar-light hover:bg-warm-sidebar-item-active dark:bg-zinc-800 border border-warm-border-light dark:border-warm-border-dark rounded-xl transition-all duration-200 hover:scale-105"
                                        title={`Partager sur ${platform}`}
                                    >
                                        <SocialIcon size={15} className="text-warm-text-primary-light dark:text-warm-text-primary-dark" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
