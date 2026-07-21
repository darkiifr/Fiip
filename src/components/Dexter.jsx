import DOMPurify from 'dompurify';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import { marked } from 'marked';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { generateText } from '../services/ai';
import { buildDexterNoteContext } from '../services/dexterContext';

import {
    AIActionCard,
    AIComposer,
    AIFunctionsPanel,
    AIConversationViewport,
    AIMessageBubble,
    AIMessageRow,
    AIStarterPrompts,
    AIThinkingIndicator,
    AIWorkspaceFrame,
    AIWorkspaceHeader,
    AIWorkspaceSidebar,
} from './ui/AIWorkspace';

const getCurrentTimestamp = () => new Date().getTime();

const SYSTEM_PROMPT = [
    "Tu es Dexter, l'assistant de redaction de Fiip.",
    "Tu aides uniquement a ecrire, corriger, resumer, structurer, titrer et transformer des notes Fiip.",
    "Tu ne promets pas d'agir hors de l'application, tu ne lis pas de fichiers non fournis et tu n'inventes pas de faits.",
    "Quand une modification de note est demandee, reponds avec un JSON allowliste: create, create_note, update ou delete.",
    "Le JSON est toujours confirme par l'utilisateur avant application.",
].join(' ');

const QUICK_ACTIONS = [
    {
        id: 'correct',
        label: 'Corriger',
        description: 'Nettoie la note active.',
        requiresNote: true,
        fallbackAction: 'update',
        prompt: "Corrige l'orthographe, la ponctuation et les tournures lourdes de la note active sans changer le sens. Reponds uniquement avec un JSON valide: {\"action\":\"update\",\"mode\":\"replace\",\"title\":\"titre\",\"content\":\"contenu corrige\"}.",
    },
    {
        id: 'structure',
        label: 'Structurer',
        description: 'Transforme en plan lisible.',
        requiresNote: true,
        fallbackAction: 'update',
        prompt: "Reorganise la note active avec des titres courts, des paragraphes clairs et des listes si utile. Reponds uniquement avec un JSON valide: {\"action\":\"update\",\"mode\":\"replace\",\"title\":\"titre\",\"content\":\"contenu structure\"}.",
    },
    {
        id: 'summary',
        label: 'Resumer',
        description: "Fait ressortir l'essentiel.",
        requiresNote: true,
        prompt: "Resume la note active en 5 points utiles maximum. Termine par une ligne 'A retenir' si une conclusion ressort clairement.",
    },
    {
        id: 'title',
        label: 'Titre',
        description: 'Propose un titre net.',
        requiresNote: true,
        fallbackAction: 'update',
        prompt: "Propose un meilleur titre pour la note active. Garde le contenu intact. Reponds uniquement avec un JSON valide: {\"action\":\"update\",\"mode\":\"replace\",\"title\":\"nouveau titre\",\"content\":\"contenu original\"}.",
    },
    {
        id: 'tasks',
        label: 'Taches',
        description: 'Extrait les prochaines actions.',
        requiresNote: true,
        prompt: "Extrait les taches concretes de la note active. Si aucune tache n'est evidente, dis-le clairement et propose deux prochaines actions raisonnables.",
    },
    {
        id: 'new-note',
        label: 'Nouvelle note',
        description: 'Cree depuis la demande.',
        fallbackAction: 'create_note',
        prompt: "Cree une nouvelle note concise a partir de la prochaine demande utilisateur. Reponds avec un JSON valide: {\"action\":\"create_note\",\"title\":\"titre\",\"content\":\"contenu\"}.",
    },
];

const STARTER_PROMPTS = [
    {
        id: 'clarify-note',
        title: 'Clarifier la note',
        description: 'Repere les passages flous et propose une version plus nette.',
        requiresNote: true,
        text: "Analyse la note active. Liste les passages ambigus, puis propose une version plus claire sans inventer d'informations.",
    },
    {
        id: 'next-steps',
        title: 'Prochaines actions',
        description: "Transforme le contenu en suite d'actions concrete.",
        requiresNote: true,
        text: "A partir de la note active, propose les prochaines actions concretes, classees par priorite.",
    },
    {
        id: 'draft-from-scratch',
        title: 'Brouillon propre',
        description: 'Demarre une note structuree depuis une demande libre.',
        text: "Aide-moi a demarrer une nouvelle note. Demande-moi le sujet si la demande suivante n'est pas assez precise.",
    },
];

function stripNoteText(value = '') {
    const html = String(value || '');
    if (typeof DOMParser !== 'undefined') {
        const parsed = new DOMParser().parseFromString(html, 'text/html');
        parsed.querySelectorAll('script, style, iframe, object, embed').forEach((element) => element.remove());
        const pieces = [];
        const visit = (node) => {
            if (node.nodeType === 3 && node.nodeValue) {
                pieces.push(node.nodeValue);
            }
            node.childNodes?.forEach(visit);
        };
        visit(parsed.body);
        return pieces.join(' ').replace(/\s+/g, ' ').trim();
    }
    return html.replaceAll('<', ' ').replaceAll('>', ' ').replace(/\s+/g, ' ').trim();
}

function getWordCount(value = '') {
    const text = stripNoteText(value);
    return text ? text.split(/\s+/).length : 0;
}

function parseActionFromResponse(response, fallback) {
    const raw = String(response || '').trim();
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const jsonCandidate = fenced?.[1] || raw.match(/\{[\s\S]*\}/)?.[0];

    let parsed = null;
    if (jsonCandidate) {
        try {
            parsed = JSON.parse(jsonCandidate);
        } catch {
            parsed = null;
        }
    }

    if (parsed && ['create', 'create_note', 'update', 'delete'].includes(parsed.action)) {
        return {
            ...parsed,
            mode: parsed.mode || (parsed.action === 'update' ? 'append' : undefined),
        };
    }

    if (!fallback) {return null;}

    return {
        action: fallback.action,
        mode: fallback.mode,
        title: fallback.title,
        content: raw,
    };
}

function markdownToSafeHtml(content) {
    return DOMPurify.sanitize(marked.parse(content || ''));
}

export default function Dexter({
    isOpen,
    onClose,
    onCreateNote,
    onUpdateNote,
    onDeleteNote,
    currentNote,
    initialPrompt,
    onInitialPromptConsumed,
}) {
    const { t } = useTranslation();
    const shouldReduceMotion = useReducedMotion();
    const inputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const abortController = useRef(null);
    const consumedInitialPromptRef = useRef(null);

    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: t('dexter.welcome', "Bonjour. Ouvrez une note, choisissez une action ou demandez une modification precise.")
        }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [activeAction, setActiveAction] = useState(null);

    const notePlainText = useMemo(() => stripNoteText(currentNote?.content || ''), [currentNote?.content]);
    const noteWordCount = useMemo(() => getWordCount(currentNote?.content || ''), [currentNote?.content]);
    const noteContext = useMemo(() => buildDexterNoteContext(currentNote), [currentNote]);

    useEffect(() => {
        if (!isOpen) {return;}
        const id = window.setTimeout(() => inputRef.current?.focus(), 80);
        return () => window.clearTimeout(id);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {return;}
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {onClose?.();}
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
            messagesEndRef.current.scrollIntoView({ block: 'end' });
        }
    }, [messages, isThinking]);

    const updatePendingData = (index, patch) => {
        setMessages(prev => prev.map((msg, i) =>
            i === index && msg.type === 'action_pending'
                ? { ...msg, data: { ...msg.data, ...patch } }
                : msg
        ));
    };

    const handleAccept = useCallback((index, msg) => {
        const { data } = msg;
        if (!data) {return;}

        if (data.action === 'create' || data.action === 'create_note') {
            onCreateNote?.({ title: data.title || 'Nouvelle note', content: data.content || '' });
            setMessages(prev => prev.map((m, i) =>
                i === index ? { ...m, type: 'action_create', data: { ...data } } : m
            ));
            return;
        }

        if (data.action === 'update') {
            if (currentNote && onUpdateNote) {
                const currentContent = currentNote.content || '';
                const nextContent = data.mode === 'replace'
                    ? (data.content || '')
                    : `${currentContent}${currentContent ? '\n\n' : ''}${data.content || ''}`;

                onUpdateNote({
                    ...currentNote,
                    title: data.title || currentNote.title,
                    content: nextContent,
                    updatedAt: getCurrentTimestamp()
                });
            }
            setMessages(prev => prev.map((m, i) =>
                i === index ? { ...m, type: 'action_update', data: { ...data } } : m
            ));
            return;
        }

        if (data.action === 'delete') {
            onDeleteNote?.(currentNote?.id);
            setMessages(prev => prev.map((m, i) =>
                i === index ? { ...m, type: 'action_delete_done', data: { title: data.title || currentNote?.title } } : m
            ));
        }
    }, [currentNote, onCreateNote, onUpdateNote, onDeleteNote]);

    const handleDeny = (index) => {
        setMessages(prev => prev.map((m, i) =>
            i === index ? { ...m, type: 'action_denied', content: 'Action ignoree.' } : m
        ));
    };

    const handleStop = () => {
        abortController.current?.abort();
        abortController.current = null;
        setIsThinking(false);
        setActiveAction(null);
    };

    const runDexterRequest = useCallback(async ({ text, visibleText = text, fallbackAction = null, actionId = null }) => {
        const prompt = String(text || '').trim();
        if (!prompt || isThinking) {return;}

        setInput('');
        setActiveAction(actionId);
        setMessages(prev => [...prev, { role: 'user', content: visibleText }]);
        setIsThinking(true);

        const controller = new AbortController();
        abortController.current = controller;

        try {
            const response = await generateText({
                signal: controller.signal,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    {
                        role: 'user',
                        content: `${noteContext}\n\nDemande utilisateur:\n${prompt}`,
                    },
                ],
            });

            const action = parseActionFromResponse(response, fallbackAction);
            const displayContent = action
                ? String(response).replace(/```(?:json)?\s*[\s\S]*?```/i, '').replace(/\{[\s\S]*\}/, '').trim()
                : response;

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: response,
                displayContent,
                type: action ? 'action_pending' : undefined,
                data: action,
            }]);
        } catch (err) {
            if (err?.name !== 'AbortError') {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: err?.message || 'Generation impossible pour le moment.'
                }]);
            }
        } finally {
            setIsThinking(false);
            setActiveAction(null);
            abortController.current = null;
        }
    }, [isThinking, noteContext]);

    const handleQuickAction = (action) => {
        if (action.requiresNote && !currentNote) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Ouvrez une note pour utiliser cette action.'
            }]);
            return;
        }

        const fallback = action.fallbackAction ? {
            action: action.fallbackAction,
            mode: action.fallbackAction === 'update' ? 'replace' : undefined,
            title: currentNote?.title || 'Nouvelle note',
            content: action.id === 'title' ? currentNote?.content || '' : undefined,
        } : null;

        runDexterRequest({
            text: action.prompt,
            visibleText: action.label,
            fallbackAction: fallback,
            actionId: action.id,
        });
    };

    const handleStarterPrompt = (prompt) => {
        if (prompt.requiresNote && !currentNote) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Ouvrez une note pour utiliser cette suggestion.'
            }]);
            return;
        }

        runDexterRequest({
            text: prompt.text,
            visibleText: prompt.title,
            actionId: prompt.id,
        });
    };

    const handleSend = () => {
        const text = input.trim();
        if (!text) {return;}
        runDexterRequest({ text });
    };

    useEffect(() => {
        if (!isOpen || !initialPrompt?.text || consumedInitialPromptRef.current === initialPrompt.id) {return;}

        consumedInitialPromptRef.current = initialPrompt.id;
        runDexterRequest({ text: initialPrompt.text });
        onInitialPromptConsumed?.();
    }, [initialPrompt, isOpen, onInitialPromptConsumed, runDexterRequest]);

    return (
        <AnimatePresence>
            {isOpen && (
                <AIWorkspaceFrame shouldReduceMotion={shouldReduceMotion} onClose={onClose}>
                    <AIWorkspaceSidebar
                        title="Dexter"
                        noteTitle={currentNote?.title}
                        noteWordCount={noteWordCount}
                        attachmentsCount={currentNote?.attachments?.length || 0}
                        notePreview={notePlainText}
                        actions={QUICK_ACTIONS}
                        activeAction={activeAction}
                        isThinking={isThinking}
                        onAction={handleQuickAction}
                        onClose={onClose}
                    />

                    <div className="flex min-w-0 flex-1 flex-col">
                        <AIWorkspaceHeader isThinking={isThinking} onStop={handleStop} onClose={onClose} />

                        <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px]">
                            <main className="flex min-h-0 flex-col">
                                <AIConversationViewport>
                                        {messages.length === 1 && (
                                            <AIStarterPrompts
                                                prompts={STARTER_PROMPTS}
                                                onPrompt={handleStarterPrompt}
                                            />
                                        )}

                                        {messages.map((msg, i) => (
                                            <AIMessageRow
                                                key={`${msg.role}-${i}`}
                                                itemKey={`${msg.role}-${i}`}
                                                role={msg.role}
                                                shouldReduceMotion={shouldReduceMotion}
                                            >
                                                {msg.type === 'action_pending' ? (
                                                    <AIActionCard
                                                        message={msg}
                                                        index={i}
                                                        onAccept={handleAccept}
                                                        onDeny={handleDeny}
                                                        onChange={updatePendingData}
                                                    />
                                                ) : (
                                                    <AIMessageBubble
                                                        message={msg}
                                                        html={markdownToSafeHtml(msg.displayContent || msg.content || '')}
                                                    />
                                                )}
                                            </AIMessageRow>
                                        ))}

                                        {isThinking && <AIThinkingIndicator />}
                                        <div ref={messagesEndRef} />
                                </AIConversationViewport>

                                <AIComposer
                                    inputRef={inputRef}
                                    value={input}
                                    isThinking={isThinking}
                                    onChange={setInput}
                                    onSend={handleSend}
                                    onStop={handleStop}
                                />
                            </main>

                            <AIFunctionsPanel />
                        </div>
                    </div>
                </AIWorkspaceFrame>
            )}
        </AnimatePresence>
    );
}
