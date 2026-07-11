import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { generateText } from '../services/ai';
import { buildDexterNoteContext } from '../services/dexterContext';

// Icons Import
import IconCheck from '~icons/mingcute/check-fill';
import IconClose from '~icons/mingcute/close-fill';
import IconTrash from '~icons/mingcute/delete-2-fill';
import IconPen from '~icons/mingcute/pen-fill';
import IconSend from '~icons/mingcute/send-plane-fill';
import IconSparkles from '~icons/mingcute/sparkles-fill';
import IconStop from '~icons/mingcute/stop-fill';

const getCurrentTimestamp = () => new Date().getTime();

export default function Dexter({ 
    isOpen, 
    onClose, 
    onCreateNote, 
    onUpdateNote, 
    onDeleteNote, 
    currentNote 
}) {
    const { t } = useTranslation();
    const WIDGET_WIDTH = 420;
    const MARGIN_RIGHT = 30;

    // Initial position anchored to right
    const [position, setPosition] = useState({
        x: typeof window !== 'undefined' ? window.innerWidth - WIDGET_WIDTH - MARGIN_RIGHT : 800,
        y: 60
    });

    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const dexterRef = useRef(null);
    const abortController = useRef(null);

    const [messages, setMessages] = useState([
        { role: 'assistant', content: t('dexter.welcome', "Bonjour. Je suis Dexter, l'assistant de rédaction de Fiip. Je peux clarifier une note, corriger un passage, résumer ou proposer une structure.") }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [, setRecentPrompts] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            if (typeof window !== 'undefined') {
                setPosition(prev => ({
                    ...prev,
                    x: window.innerWidth - WIDGET_WIDTH - MARGIN_RIGHT
                }));
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handlePointerDown = (e) => {
        const target = e.target;
        if (target.closest('button') || target.closest('input') || target.closest('textarea')) {
            return;
        }
        setIsDragging(true);
        dragOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (isDragging) {
            let newX = e.clientX - dragOffset.current.x;
            let newY = e.clientY - dragOffset.current.y;

            if (dexterRef.current) {
                const { width, height } = dexterRef.current.getBoundingClientRect();
                const maxX = window.innerWidth - width;
                const maxY = window.innerHeight - height;

                newX = Math.max(0, Math.min(newX, maxX));
                newY = Math.max(0, Math.min(newY, maxY));
            }

            setPosition({ x: newX, y: newY });
        }
    };

    const handlePointerUp = (e) => {
        setIsDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    const handleAccept = useCallback((index, msg) => {
        const { data } = msg;
        if (!data) return;

        if (data.action === 'create' || data.action === 'create_note') {
            onCreateNote({ title: data.title, content: data.content });
            setMessages(prev => prev.map((m, i) =>
                i === index ? { ...m, type: 'action_create', data: { ...data } } : m
            ));
        } else if (data.action === 'update') {
            if (currentNote) {
                onUpdateNote({ ...currentNote, content: currentNote.content + '\n' + data.content, updatedAt: getCurrentTimestamp() });
            }
            setMessages(prev => prev.map((m, i) =>
                i === index ? { ...m, type: 'action_update', data: { ...data } } : m
            ));
        } else if (data.action === 'delete') {
            onDeleteNote();
            setMessages(prev => prev.map((m, i) =>
                i === index ? { ...m, type: 'action_delete_done', data: { title: data.title } } : m
            ));
        }
    }, [currentNote, onCreateNote, onUpdateNote, onDeleteNote]);

    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if (e.key === 'Tab' && !e.shiftKey) {
                const lastMsgIndex = messages.length - 1;
                const lastMsg = messages[lastMsgIndex];
                if (lastMsg && lastMsg.type === 'action_pending' && !showSuggestions) {
                    e.preventDefault();
                    handleAccept(lastMsgIndex, lastMsg);
                }
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [messages, showSuggestions, handleAccept]);

    const handleDeny = (index) => {
        setMessages(prev => prev.map((m, i) =>
            i === index ? { ...m, type: 'action_denied', content: t('dexter.status.action_cancelled', 'Action annulée') } : m
        ));
    };

    const handleUpdatePendingContent = (index, newContent) => {
        setMessages(prev => prev.map((msg, i) => 
            i === index && msg.type === 'action_pending'
                ? { ...msg, data: { ...msg.data, content: newContent } }
                : msg
        ));
    };

    const handleStop = () => {
        if (abortController.current) {
            abortController.current.abort();
            abortController.current = null;
        }
        setIsThinking(false);
    };

    const handleSend = async () => {
        const text = input.trim();
        if (!text) return;

        setInput('');
        setShowSuggestions(false);
        setRecentPrompts(prev => [text, ...prev.filter(p => p !== text)].slice(0, 5));

        const userMsg = { role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setIsThinking(true);

        abortController.current = new AbortController();

        try {
            const noteContext = buildDexterNoteContext(currentNote);

            const response = await generateText({
                signal: abortController.current.signal,
                messages: [
                    {
                        role: 'system',
                        content: "Tu es Dexter, assistant de rédaction intégré à Fiip. Comprends d'abord l'intention de la demande utilisateur, puis réponds en utilisant uniquement le contexte fourni: titre, texte de note et textes OCR disponibles. Si la demande est ambiguë, pose une question courte. Si une information manque ou si un fichier/PDF n'a pas de texte OCR, dis-le clairement. Réponds en français clair par défaut, sois concis, n'invente pas de faits et ne promets pas de lire des fichiers directement.",
                    },
                    {
                        role: 'user',
                        content: `${noteContext}\n\nDemande utilisateur:\n${text}`,
                    },
                ],
            });
            
            // Check for JSON structural block for notes creation/updates
            let parsedAction = null;
            let displayContent = response;

            try {
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.action && ['create', 'create_note', 'update', 'delete'].includes(parsed.action)) {
                        parsedAction = parsed;
                        displayContent = response.replace(jsonMatch[0], '').trim();
                    }
                }
            } catch {
                // Not a structural command
            }

            const assistantMsg = {
                role: 'assistant',
                content: response,
                displayContent,
                type: parsedAction ? 'action_pending' : undefined,
                data: parsedAction
            };

            setMessages(prev => [...prev, assistantMsg]);
        } catch (err) {
            if (err.name !== 'AbortError') {
                setMessages(prev => [...prev, { role: 'assistant', content: err?.message || "Erreur lors de la génération. Veuillez réessayer." }]);
            }
        } finally {
            setIsThinking(false);
            abortController.current = null;
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            ref={dexterRef}
            style={{ left: `${position.x}px`, top: `${position.y}px` }}
            className="fixed z-50 w-[420px] h-[550px] flex flex-col rounded-2xl border border-warm-border-light dark:border-warm-border-dark bg-white/70 dark:bg-[#1E1E1ECC] backdrop-blur-2xl shadow-2xl overflow-hidden font-sans select-none animate-in fade-in zoom-in-95 duration-200"
        >
            {/* Header Draggable */}
            <div 
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="px-4 py-3 border-b border-warm-border-light dark:border-warm-border-dark bg-warm-sidebar-light/50 dark:bg-zinc-800/30 flex items-center justify-between cursor-move titlebar-drag-region"
            >
                <div className="flex items-center gap-2">
                    <IconSparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-black uppercase tracking-wider">Assistant Dexter IA</span>
                </div>
                <button 
                    onClick={onClose}
                    aria-label="Fermer Dexter"
                    title="Fermer Dexter"
                    className="p-1.5 rounded-lg hover:bg-warm-sidebar-item-active transition-all text-warm-text-muted-light"
                >
                    <IconClose className="w-4 h-4" />
                </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 custom-scrollbar">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        {/* Bubble */}
                        {msg.type === 'action_pending' ? (
                            // Draggable Action Card
                            <div className="w-full max-w-[95%] border border-amber-500/20 bg-amber-500/5 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                                <div className="px-4 py-2 border-b border-amber-500/20 bg-amber-500/10 flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400">
                                    <div className="flex items-center gap-2">
                                        {msg.data.action === 'delete' ? <IconTrash className="w-4 h-4" /> : <IconPen className="w-4 h-4" />}
                                        <span>
                                            {msg.data.action === 'create' || msg.data.action === 'create_note' ? 'Création de note suggérée' : 
                                             msg.data.action === 'update' ? 'Modification de note suggérée' : 'Suppression suggérée'}
                                        </span>
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest bg-amber-500/20 px-2 py-0.5 rounded-full">Appliquer (Tab)</span>
                                </div>
                                <div className="p-4 space-y-3">
                                    {(msg.data.action === 'create' || msg.data.action === 'create_note') && (
                                        <div className="space-y-1">
                                            <span className="text-[9px] uppercase tracking-wider text-warm-text-muted-light font-bold">Titre de la note</span>
                                            <input 
                                                type="text"
                                                value={msg.data.title || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setMessages(prev => prev.map((m, idx) => idx === i && m.type === 'action_pending' ? { ...m, data: { ...m.data, title: val } } : m));
                                                }}
                                                className="w-full bg-white dark:bg-zinc-800 border border-warm-border-light dark:border-warm-border-dark rounded-xl px-3 py-2 text-xs focus:outline-none"
                                            />
                                        </div>
                                    )}

                                    {msg.data.action === 'delete' ? (
                                        <div className="text-xs text-warm-text-secondary-light leading-relaxed">
                                            Souhaitez-vous vraiment supprimer <span className="font-bold">"{msg.data.title}"</span> ?
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            <span className="text-[9px] uppercase tracking-wider text-warm-text-muted-light font-bold">Contenu</span>
                                            <textarea
                                                value={msg.data.content || ''}
                                                onChange={(e) => handleUpdatePendingContent(i, e.target.value)}
                                                className="w-full bg-white dark:bg-zinc-800 border border-warm-border-light dark:border-warm-border-dark text-xs p-3 rounded-xl min-h-[100px] resize-none focus:outline-none font-mono"
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="flex border-t border-warm-border-light dark:border-warm-border-dark divide-x divide-warm-border-light dark:divide-warm-border-dark">
                                    <button 
                                        onClick={() => handleDeny(i)}
                                        className="flex-1 py-2.5 hover:bg-red-500/5 text-warm-text-muted-light hover:text-red-500 text-[10px] font-bold uppercase tracking-wider transition-colors"
                                    >
                                        Ignorer
                                    </button>
                                    <button 
                                        onClick={() => handleAccept(i, msg)}
                                        className="flex-1 py-2.5 hover:bg-green-500/5 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider transition-colors"
                                    >
                                        Appliquer
                                    </button>
                                </div>
                            </div>
                        ) : msg.type === 'action_create' ? (
                            <div className="w-full max-w-[95%] border border-green-500/20 bg-green-500/5 rounded-2xl p-3 flex items-center justify-between text-xs text-green-700 dark:text-green-400">
                                <div className="flex items-center gap-2">
                                    <IconCheck className="w-4 h-4" />
                                    <span>Note "{msg.data.title}" créée !</span>
                                </div>
                            </div>
                        ) : msg.type === 'action_update' ? (
                            <div className="w-full max-w-[95%] border border-green-500/20 bg-green-500/5 rounded-2xl p-3 flex items-center justify-between text-xs text-green-700 dark:text-green-400">
                                <div className="flex items-center gap-2">
                                    <IconCheck className="w-4 h-4" />
                                    <span>Note mise à jour avec succès !</span>
                                </div>
                            </div>
                        ) : msg.type === 'action_delete_done' ? (
                            <div className="w-full max-w-[95%] border border-red-500/20 bg-red-500/5 rounded-2xl p-3 flex items-center justify-between text-xs text-red-700 dark:text-red-400">
                                <div className="flex items-center gap-2">
                                    <IconClose className="w-4 h-4" />
                                    <span>Note supprimée !</span>
                                </div>
                            </div>
                        ) : msg.type === 'action_denied' ? (
                            <div className="w-full max-w-[95%] border border-warm-border-light dark:border-warm-border-dark bg-warm-sidebar-light/50 p-3 rounded-2xl text-xs text-warm-text-muted-light">
                                <span>Action ignorée.</span>
                            </div>
                        ) : (
                            <div className={`p-3 rounded-2xl text-[11px] leading-relaxed max-w-[85%] border shadow-sm ${
                                msg.role === 'user' 
                                    ? 'bg-[#1C1C1E] text-white dark:bg-white dark:text-zinc-950 border-transparent rounded-tr-none' 
                                    : 'bg-white text-warm-text-primary-light dark:bg-zinc-800 dark:text-warm-text-primary-dark border-warm-border-light dark:border-warm-border-dark rounded-tl-none'
                            }`}>
                                <div 
                                    className="dexter-markdown space-y-1.5"
                                    dangerouslySetInnerHTML={{ 
                                        __html: DOMPurify.sanitize(marked.parse(msg.displayContent || msg.content || '')) 
                                    }}
                                />
                            </div>
                        )}
                    </div>
                ))}

                {isThinking && (
                    <div className="flex items-center gap-2 px-1 py-2">
                        <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce delay-75" />
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce delay-150" />
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce delay-300" />
                        </div>
                    </div>
                )}
            </div>

            {/* Input Footer */}
            <div className="p-3 border-t border-warm-border-light dark:border-warm-border-dark bg-warm-sidebar-light/50 dark:bg-zinc-900/30 flex flex-col gap-2 relative">
                <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Posez une question ou demandez une correction..."
                            aria-label="Message pour Dexter"
                            className="w-full bg-white dark:bg-zinc-800 border border-warm-border-light dark:border-warm-border-dark rounded-xl px-3 py-2 text-xs focus:outline-none"
                        />
                    </div>

                    {isThinking ? (
                        <button 
                            onClick={handleStop}
                            className="p-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all shrink-0 animate-pulse"
                            title="Arrêter"
                        >
                            <IconStop className="w-4 h-4 fill-current" />
                        </button>
                    ) : (
                        <button 
                            onClick={handleSend}
                            disabled={!input.trim()}
                            aria-label="Envoyer à Dexter"
                            className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl disabled:opacity-50 transition-all shrink-0"
                        >
                            <IconSend className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div className="h-1" aria-hidden="true" />
            </div>
        </div>
    );
}
