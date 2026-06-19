import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { dataService } from '../services/supabase';

import GlassSurface from './GlassSurface';

import IconClose from '~icons/mingcute/close-fill';
import IconMessage from '~icons/mingcute/message-3-fill';
import IconSend from '~icons/mingcute/send-fill';


export default function CommentsPanel({ noteId, isOpen, onClose }) {
    const { t } = useTranslation();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const scrollRef = useRef(null);

    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }, 100);
    };

    useEffect(() => {
        if (!noteId || !isOpen) {
            return;
        }

        const loadComments = async () => {
            setLoading(true);
            const { data, error } = await dataService.fetchComments(noteId);
            if (!error) {
                setComments(data);
            }
            setLoading(false);
            scrollToBottom();
        };

        loadComments();

        const channel = dataService.subscribeToComments(noteId, (comment) => {
            setComments(prev => [...prev, comment]);
            scrollToBottom();
        });

        return () => {
            channel.unsubscribe();
        };
    }, [noteId, isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || sending) {return;}

        setSending(true);
        const { error } = await dataService.addComment(noteId, newComment);
        if (!error) {
            setNewComment('');
        }
        setSending(false);
    };

    if (!isOpen) {return null;}

    return (
        <>
            {/* Backdrop */}
            <div 
                role="button"
                tabIndex={0}
                onClick={onClose}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        onClose();
                    }
                }}
                className="fixed inset-0 bg-black/40 backdrop-blur-md z-[60] transition-opacity duration-300"
            />
            
            {/* Panel */}
            <div
                className="fixed right-0 top-0 bottom-0 w-full max-w-[380px] z-[70] flex flex-col transition-transform duration-300 animate-in slide-in-from-right"
            >
                <GlassSurface
                    width="100%"
                    height="100%"
                    borderRadius={0}
                    borderWidth={0}
                    backgroundOpacity={0.05}
                    blur={50}
                    className="h-full border-l border-white/10"
                >
                    <div className="flex flex-col h-full w-full">
                        {/* Header */}
                        <div className="p-5 border-b border-white/10 flex items-center justify-between glass-surface rounded-none border-t-0 border-r-0 border-l-0 shadow-none">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-blue-500/20 rounded-2xl text-blue-400 border border-blue-500/30">
                                    <IconMessage className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-[15px] font-bold text-white tracking-tight">{t('editor.collaboration', 'Collaboration')}</h2>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse"></span>
                                        <p className="text-[11px] text-white/50 font-medium uppercase tracking-widest">{comments.length} Messages</p>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={onClose}
                                className="glass-button p-2 rounded-xl text-white/60 hover:text-white"
                            >
                                <IconClose className="w-5 h-5" />
                            </button>
                        </div>
                        
                        {/* Users Online Section */}
                        <div className="px-5 py-4 border-b border-white/5 bg-black/20">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">Actifs maintenant</span>
                            </div>
                            <div className="flex -space-x-2.5">
                                <div className="w-9 h-9 rounded-full border border-white/20 bg-blue-500/40 backdrop-blur-md flex items-center justify-center text-[11px] font-bold text-white shadow-lg z-30">MOI</div>
                                <div className="w-9 h-9 rounded-full border border-white/20 bg-indigo-500/40 backdrop-blur-md flex items-center justify-center text-[11px] font-bold text-white shadow-lg z-20">JD</div>
                                <div className="w-9 h-9 rounded-full border border-white/20 bg-purple-500/40 backdrop-blur-md flex items-center justify-center text-[11px] font-bold text-white shadow-lg z-10">AL</div>
                                <div className="w-9 h-9 rounded-full border border-white/10 bg-white/5 backdrop-blur-xl flex items-center justify-center text-[10px] font-medium text-white/60 shadow-lg z-0 border-dashed">+2</div>
                            </div>
                        </div>

                        {/* Comments List */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar bg-transparent">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4">
                                    <div className="w-6 h-6 border-2 border-white/20 border-t-blue-500 rounded-full animate-spin" />
                                    <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">Synchronisation...</span>
                                </div>
                            ) : comments.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
                                    <div className="w-14 h-14 rounded-2xl glass-card flex items-center justify-center">
                                        <IconMessage className="w-6 h-6 text-white/20" />
                                    </div>
                                    <div>
                                        <p className="text-[14px] text-white/80 font-medium mb-1">Aucun message</p>
                                        <p className="text-[12px] text-white/40 leading-relaxed">Lancez la discussion en ajoutant un premier commentaire.</p>
                                    </div>
                                </div>
                            ) : (
                                comments.map((comment) => (
                                    <div key={comment.id} className="group flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="w-9 h-9 rounded-2xl glass-card flex items-center justify-center shrink-0 overflow-hidden">
                                            {comment.profiles?.avatar_url ? (
                                                <img src={comment.profiles.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                                            ) : (
                                                <span className="text-[12px] font-bold text-white/80">{(comment.profiles?.username || 'A').substring(0,2).toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[12px] font-bold text-white/90">@{comment.profiles?.username || 'Anonyme'}</span>
                                                <span className="text-[10px] font-medium text-white/40">
                                                    {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <div className="text-[13.5px] text-white/80 leading-relaxed bg-white/5 backdrop-blur-xl p-3.5 rounded-2xl rounded-tl-sm border border-white/10 shadow-lg transition-colors">
                                                {comment.content}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-5 border-t border-white/10 glass-surface rounded-none border-b-0 border-r-0 border-l-0 shadow-none">
                            <form onSubmit={handleSend} className="relative">
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder={t('editor.write_comment', 'Votre message...')}
                                    className="w-full bg-black/20 hover:bg-black/30 border border-white/10 rounded-2xl p-4 pr-12 text-[13.5px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 focus:bg-white/5 transition-all duration-300 resize-none custom-scrollbar min-h-[90px] font-medium backdrop-blur-sm"
                                    rows="3"
                                />
                                <button 
                                    type="submit"
                                    disabled={!newComment.trim() || sending}
                                    className={`absolute right-3 bottom-3 p-2.5 rounded-xl transition-all duration-300 ${newComment.trim() && !sending ? 'bg-blue-600/80 backdrop-blur-md border border-blue-500/50 text-white shadow-lg shadow-blue-900/20 hover:bg-blue-500 active:scale-95' : 'text-white/20'}`}
                                >
                                    <IconSend className={`w-5 h-5 ${sending ? 'animate-pulse' : ''}`} />
                                </button>
                            </form>
                            <p className="mt-3 text-[10px] text-white/30 font-medium text-center">Appuyez sur Entrée pour envoyer</p>
                        </div>
                    </div>
                </GlassSurface>
            </div>
        </>
    );
}
