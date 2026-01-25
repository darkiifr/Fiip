
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
// Import d'icônes plus "pro" / minimalistes
import {
    Bot, Send, X, Plus, Sparkles, History,
    FileText, Check, ChevronDown, Reply, Copy, RotateCcw,
    Trash2, Square, Volume2, Calendar, MessageCircle, PenTool, Paperclip
} from 'lucide-react';
import { generateText } from '../services/ai';
import { extractTextFromPdf } from '../services/pdf';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export default function Dexter({ isOpen, onClose, settings, onUpdateSettings, onCreateNote, onUpdateNote, onDeleteNote, currentNote }) {
    const { t } = useTranslation();
    const WIDGET_WIDTH = 450;
    const MARGIN_RIGHT = 30;

    // Initial position anchored to right
    const [position, setPosition] = useState({
        x: window.innerWidth - WIDGET_WIDTH - MARGIN_RIGHT,
        y: 60
    });

    // Dragging Logic with Pointer Capture (More robust)
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const dexterRef = useRef(null);
    const abortController = useRef(null);

    const [messages, setMessages] = useState([
        { role: 'system', content: t('dexter.welcome') }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [selectedModel, setSelectedModel] = useState('default');
    const [showModelSelector, setShowModelSelector] = useState(false);
    const [recentPrompts, setRecentPrompts] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSuggestion, setSelectedSuggestion] = useState(0);
    const [mode, setMode] = useState('agent'); // 'plan', 'ask', 'agent', 'edit'
    const [attachments, setAttachments] = useState([]);

    // Responsiveness: Keep anchored right on resize
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
        e.preventDefault(); // Prevent text selection
        setIsDragging(true);
        dragOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
        // Capture pointer to ensure we get the up event even outside
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (isDragging) {
            e.preventDefault();
            let newX = e.clientX - dragOffset.current.x;
            let newY = e.clientY - dragOffset.current.y;

            // Clamping to window bounds
            if (dexterRef.current) {
                const { width, height } = dexterRef.current.getBoundingClientRect();
                const maxX = window.innerWidth - width;
                const maxY = window.innerHeight - height;

                newX = Math.max(0, Math.min(newX, maxX));
                newY = Math.max(0, Math.min(newY, maxY));
            }

            setPosition({
                x: newX,
                y: newY
            });
        }
    };

    const handlePointerUp = (e) => {
        setIsDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    const speak = (text) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        if (settings?.voiceName) {
            const voices = window.speechSynthesis.getVoices();
            const voice = voices.find(v => v.name === settings.voiceName);
            if (voice) utterance.voice = voice;
        }
        window.speechSynthesis.speak(utterance);
    };

    const handleRegenerate = () => {
        const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
        if (lastUserMessage) {
            setInput(lastUserMessage.content);
        }
    };

    const handleAccept = useCallback((index, msg) => {
        const { data } = msg;

        if (data.action === 'create') {
            onCreateNote({ title: data.title, content: data.content });
            setMessages(prev => prev.map((m, i) =>
                i === index ? { ...m, type: 'action_create', data: { ...data } } : m
            ));
        } else if (data.action === 'update') {
            if (currentNote) {
                onUpdateNote({ ...currentNote, content: currentNote.content + '\n' + data.content });
            }
            setMessages(prev => prev.map((m, i) =>
                i === index ? { ...m, type: 'action_update', data: { ...data } } : m
            ));
        } else if (data.action === 'delete') {
            if (onDeleteNote) onDeleteNote();

            setMessages(prev => prev.map((m, i) =>
                i === index ? { ...m, type: 'action_delete_done', data: { title: data.title } } : m
            ));
        }
    }, [currentNote, onCreateNote, onUpdateNote, onDeleteNote]);

    // Global Tab handler for accepting actions
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if (e.key === 'Tab' && !e.shiftKey) {
                const lastMsgIndex = messages.length - 1;
                const lastMsg = messages[lastMsgIndex];
                
                // Only if we have a pending action and suggestions are not active
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
            i === index ? { ...m, type: 'action_denied', content: t('dexter.status.action_cancelled') } : m
        ));
    };

    const handleUpdatePendingContent = (index, newContent) => {
        setMessages(prev => prev.map((msg, i) => 
            i === index && msg.type === 'action_pending'
                ? { ...msg, data: { ...msg.data, content: newContent, lines: newContent.split('\n').length } }
                : msg
        ));
    };

    // Suggestions logic
    const baseSuggestions = [
        t('dexter.suggestions_list.create_note'),
        t('dexter.suggestions_list.update_note'),
        t('dexter.suggestions_list.summarize_note'),
        t('dexter.suggestions_list.generate_ideas'),
        t('dexter.suggestions_list.explain'),
    ];

    const getSuggestions = () => {
        const suggestions = [...baseSuggestions];
        // Add recent prompts
        recentPrompts.slice(0, 3).forEach(prompt => {
            if (!suggestions.includes(prompt)) {
                suggestions.push(prompt);
            }
        });

        // Filter based on input
        if (input.trim()) {
            return suggestions.filter(s =>
                s.toLowerCase().includes(input.toLowerCase())
            );
        }
        return suggestions;
    };

    const handleInputChange = (value) => {
        setInput(value);
        setShowSuggestions(value.length > 0);
        setSelectedSuggestion(0);
    };

    const handleSelectSuggestion = (suggestion) => {
        setInput(suggestion);
        setShowSuggestions(false);
    };

    const handleStop = () => {
        if (abortController.current) {
            abortController.current.abort();
            abortController.current = null;
        }
        setIsThinking(false);
    };

    const handleAttach = async () => {
        try {
            const selected = await open({
                multiple: true,
                filters: [{
                    name: 'PDF Files',
                    extensions: ['pdf']
                }]
            });

            if (selected) {
                const files = Array.isArray(selected) ? selected : [selected];
                
                for (const filePath of files) {
                    // Check if already attached
                    if (attachments.some(a => a.path === filePath)) continue;

                    try {
                        const content = await readFile(filePath);
                        const text = await extractTextFromPdf(content);
                        
                        // Extract filename from path
                        const fileName = filePath.split(/[\\/]/).pop();
                        
                        setAttachments(prev => [...prev, {
                            path: filePath,
                            name: fileName,
                            content: text
                        }]);
                    } catch (err) {
                        console.error(`Failed to read PDF ${filePath}:`, err);
                        // Optionally show error toast
                    }
                }
            }
        } catch (err) {
            console.error("Failed to open file dialog:", err);
        }
    };

    const removeAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    // AI Logic
    const handleSend = async () => {
        if (!input.trim() && attachments.length === 0) return;

        if (!settings?.aiApiKey) {
            setMessages(prev => [...prev, { 
                role: 'system', 
                content: "⚠️ Clé API manquante. Veuillez la configurer dans les paramètres (Settings > AI)." 
            }]);
            return;
        }

        let messageContent = input;
        
        // Append attachments to message content
        if (attachments.length > 0) {
            messageContent += "\n\n--- ATTACHMENTS ---\n";
            attachments.forEach(att => {
                messageContent += `\nFile: ${att.name}\nContent:\n${att.content}\n-------------------\n`;
            });
        }

        const userMsg = { role: 'user', content: messageContent, displayContent: input, attachments: attachments };

        // Add to recent prompts
        if (input.trim()) {
            setRecentPrompts(prev => {
                const updated = [input, ...prev.filter(p => p !== input)];
                return updated.slice(0, 10); // Keep only last 10
            });
        }

        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setAttachments([]);
        setShowSuggestions(false);
        setIsThinking(true);

        // Create new AbortController
        abortController.current = new AbortController();

        try {
            let systemPrompt = "";
            
            if (mode === 'plan') {
                systemPrompt = `You are Dexter, a strategic planning assistant.
                Your goal is to help the user organize thoughts, create outlines, and structure projects.
                Do not create or modify notes directly unless explicitly asked to "finalize" a plan.
                Focus on asking clarifying questions to build a solid plan.
                
                CONTEXT:
                Current Note Title: "${currentNote?.title || 'None'}"
                Current Note Content Preview: "${currentNote?.content?.slice(0, 500) || ''}..."`;
            } else if (mode === 'ask') {
                systemPrompt = `You are Dexter, a helpful and knowledgeable assistant.
                Answer questions, provide information, and explain concepts.
                Do NOT attempt to create, update, or delete notes. Just chat.
                
                CONTEXT:
                Current Note Title: "${currentNote?.title || 'None'}"
                Current Note Content Preview: "${currentNote?.content?.slice(0, 500) || ''}..."`;
            } else if (mode === 'edit') {
                systemPrompt = `You are Dexter, an expert editor.
                Your goal is to modify the current note based on the user's request.
                
                IMPORTANT:
                - You MUST return a JSON action to update the note.
                - Do NOT use Markdown code blocks (like \`\`\`json) for the JSON.
                - Return ONLY the JSON object.
                - Ensure the JSON is valid. Escape all newlines in strings as \\n. Escape double quotes as \\".
                
                TOOLS:
                - To UPDATE the note: Respond with JSON: { "action": "update_note", "content": "NEW CONTENT HERE" }
                
                CONTEXT:
                Current Note Title: "${currentNote?.title || 'None'}"
                Current Note Content: "${currentNote?.content || ''}"`;
            } else {
                // Default: 'agent'
                systemPrompt = `You are Dexter, an advanced AI agent in a note-taking app.
                You have a helpful, witty, and casual personality.
                
                IMPORTANT:
                - If you are unsure about what the user wants, ASK QUESTIONS to clarify.
                - Maintain a natural dialogue flow.
                - If you decide to perform an action (create/update/delete), output ONLY the JSON object. Do NOT wrap it in markdown code blocks.
                - CRITICAL: Ensure the JSON is strictly valid. 
                  - Escape ALL newlines in the 'content' string as \\n (double backslash n). 
                  - Escape double quotes inside strings as \\".
                  - Do not use real line breaks inside the JSON string values.
                
                TOOLS:
                - If user wants to CREATE a note: Respond ONLY with JSON: { "action": "create_note", "title": "...", "content": "Line 1\\nLine 2\\nLine 3" }
                - If user wants to UPDATE / APPEND to current note: Respond ONLY with JSON: { "action": "update_note", "content": "..." }
                - If user wants to DELETE the current note: Respond ONLY with JSON: { "action": "delete_note" }
                
                CONTEXT:
                Current Note Title: "${currentNote?.title || 'None'}"
                Current Note Content Preview: "${currentNote?.content?.slice(0, 500) || ''}..."`;
            }

            // Filter out internal UI types from history before sending to AI
            const apiMessages = [
                { role: 'system', content: systemPrompt },
                ...newMessages.filter(m => m.role !== 'system')
                    .map(m => ({ role: m.role, content: m.content }))
            ];

            const modelToSend = selectedModel === 'default' 
                ? (settings?.aiModel || 'openai/gpt-4o-mini') 
                : selectedModel;

            const responseText = await generateText({
                apiKey: settings.aiApiKey,
                model: modelToSend,
                messages: apiMessages,
                signal: abortController.current.signal,
                jsonMode: mode === 'edit' // Force JSON mode for edit, but not for agent (mixed)
            });

            let aiMsg = { role: 'assistant', content: responseText, type: 'text' };

            try {
                // Attempt to find JSON in the response (handling potential wrapper text or tokens)
                // Remove markdown code blocks if present
                const cleanText = responseText.replace(/```json\n?|```/g, '').trim();
                const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
                
                if (jsonMatch) {
                    let jsonString = jsonMatch[0];
                    // Attempt to fix common JSON errors (newlines in strings)
                    // This regex finds strings and replaces literal newlines with \n
                    // It handles escaped quotes correctly, but fails if quotes are NOT escaped.
                    try {
                         jsonString = jsonString.replace(/"((?:[^"\\]|\\.)*)"/g, (match) => {
                            return match.replace(/\n/g, '\\n');
                        });
                    } catch (e) {
                        // If regex fails (e.g. stack overflow), ignore
                    }

                    const actionData = JSON.parse(jsonString);

                    // Clean up content if it contains literal escaped newlines (double escaped)
                    if (actionData.content && typeof actionData.content === 'string') {
                        actionData.content = actionData.content.replace(/\\n/g, '\n');
                    }

                    if (actionData.action === 'create_note' || actionData.action === 'create') {
                        aiMsg = {
                            role: 'assistant',
                            content: responseText,
                            type: 'action_pending',
                            data: {
                                action: 'create',
                                title: actionData.title || "Nouvelle Note",
                                content: actionData.content,
                                lines: actionData.content.split('\n').length
                            }
                        };
                    } else if ((actionData.action === 'update_note' || actionData.action === 'update') && currentNote) {
                        aiMsg = {
                            role: 'assistant',
                            content: responseText,
                            type: 'action_pending',
                            data: {
                                action: 'update',
                                title: currentNote.title,
                                content: actionData.content,
                                lines: actionData.content.split('\n').length
                            }
                        };
                    } else if ((actionData.action === 'delete_note' || actionData.action === 'delete') && currentNote) {
                        aiMsg = {
                            role: 'assistant',
                            content: responseText,
                            type: 'action_pending',
                            data: {
                                action: 'delete',
                                title: currentNote.title,
                                lines: 0
                            }
                        };
                    }
                }
            } catch (e) {
                // Not JSON or invalid JSON, stay text
                console.log("Failed to parse potential JSON action:", e);
            }

            setMessages(prev => [...prev, aiMsg]);

        } catch (error) {
            if (error.name === 'AbortError') {
                setMessages(prev => [...prev, { role: 'assistant', content: "Stopped.", type: 'text' }]);
            } else {
                setMessages(prev => [...prev, { role: 'error', content: "Error: " + error.message }]);
            }
        } finally {
            setIsThinking(false);
            abortController.current = null;
        }
    };

    if (!isOpen) return null;

    // THEME: Dark IDE Style (Zinc-950 background)
    return (
        <div
            ref={dexterRef}
            style={{ left: position.x, top: position.y }}
            className="fixed w-[450px] h-[700px] max-h-[85vh] flex flex-col bg-[#18181b]/95 backdrop-blur-xl border border-[#27272a] rounded-xl shadow-2xl z-50 overflow-hidden font-dexter text-sm text-gray-300 animate-in fade-in zoom-in-95 duration-200"
        >
            {/* Header Minimaliste */}
            <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="bg-white/5 border-b border-[#27272a] flex flex-col px-4 py-2 cursor-move select-none touch-none gap-2"
            >
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        <span className="text-white font-medium text-xs tracking-wide font-dexter-mono">{t('dexter.dexter_name')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={handleRegenerate}
                            className="text-gray-500 hover:text-white transition-colors"
                            title={t('dexter.retry')}
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => setMessages([{ role: 'system', content: t('dexter.welcome') }])}
                            className="text-gray-500 hover:text-white transition-colors"
                            title={t('dexter.clear_history')}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={onClose}
                            className="text-gray-500 hover:text-white transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Mode Selector */}
                <div className="flex bg-black/20 p-0.5 rounded-lg border border-white/5" onPointerDown={(e) => e.stopPropagation()}>
                    {[
                        { id: 'plan', icon: Calendar, label: t('dexter.mode_plan') },
                        { id: 'ask', icon: MessageCircle, label: t('dexter.mode_ask') },
                        { id: 'agent', icon: Bot, label: t('dexter.mode_agent') },
                        { id: 'edit', icon: PenTool, label: t('dexter.mode_edit') }
                    ].map((m) => (
                        <button
                            key={m.id}
                            onClick={() => setMode(m.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                                mode === m.id 
                                ? 'bg-[#27272a] text-white shadow-sm border border-white/10' 
                                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                            }`}
                        >
                            <m.icon className="w-3 h-3" />
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-transparent">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col gap-1 animate-fade-in-up ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>

                        {/* Avatar / Name */}
                        {msg.role !== 'system' && (
                            <div className="flex items-center gap-2 mb-1 px-1">
                                {msg.role === 'assistant' ? (
                                    <>
                                        <Bot className="w-3 h-3 text-purple-400" />
                                        <span className="text-[10px] uppercase font-bold text-purple-400">{t('dexter.dexter_name')}</span>
                                    </>
                                ) : (
                                    <span className="text-[10px] uppercase font-bold text-gray-500">{t('dexter.you')}</span>
                                )}
                            </div>
                        )}

                        {/* Content Bubble / Card */}
                        {msg.type === 'action_pending' ? (
                            // REVIEW CARD
                            <div className={`w-full border rounded-md overflow-hidden animate-in slide-in-from-left-2 shadow-lg 
                                ${msg.data.action === 'delete' ? 'bg-[#27272a] border-red-500/30 shadow-red-900/10' : 'bg-[#27272a] border-blue-500/30 shadow-blue-900/10'}`}>

                                <div className={`px-3 py-2 border-b flex items-center justify-between
                                    ${msg.data.action === 'delete' ? 'bg-red-900/20 border-red-500/20' : 'bg-blue-900/20 border-blue-500/20'}`}>
                                    <div className="flex items-center gap-2">
                                        <Sparkles className={`w-3.5 h-3.5 ${msg.data.action === 'delete' ? 'text-red-400' : 'text-blue-400'}`} />
                                        <span className={`text-xs font-bold ${msg.data.action === 'delete' ? 'text-red-100' : 'text-blue-100'}`}>
                                            {msg.data.action === 'create' ? t('dexter.review.create') :
                                                msg.data.action === 'update' ? t('dexter.review.update') : t('dexter.review.delete')}
                                        </span>
                                    </div>
                                    {msg.data.action !== 'delete' && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-gray-400 hidden sm:inline-block">
                                                Press <kbd className="font-sans bg-white/10 px-1 rounded text-white">Tab</kbd> to accept
                                            </span>
                                            <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">
                                                {msg.data.lines} {msg.data.action === 'create' ? t('dexter.review.lines_created') : t('dexter.review.lines_added')}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="p-3 bg-[#1e1e20]">
                                    {msg.data.action === 'delete' ? (
                                        <div className="text-xs text-gray-300 font-medium">
                                            {t('dexter.review.delete_warning')} <span className="text-white font-bold">&quot;{msg.data.title}&quot;</span>?
                                            <br /><span className="text-red-400 text-[10px] uppercase tracking-wide mt-1 block">{t('dexter.review.delete_warning_sub')}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="text-xs text-gray-400 mb-1 font-medium">{t('dexter.review.proposed_content')}</div>
                                            <textarea
                                                value={msg.data.content}
                                                onChange={(e) => handleUpdatePendingContent(i, e.target.value)}
                                                className="w-full bg-black/30 text-xs font-mono text-gray-300 p-2 rounded border border-white/5 max-h-48 min-h-[100px] overflow-y-auto custom-scrollbar-thin resize-y focus:border-blue-500/50 outline-none"
                                            />
                                        </>
                                    )}
                                </div>

                                <div className="flex border-t border-white/5 divide-x divide-white/5">
                                    <button
                                        onClick={() => handleDeny(i)}
                                        className="flex-1 py-2 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors text-xs font-medium"
                                    >
                                        {t('dexter.review.deny')}
                                    </button>
                                    <button
                                        onClick={() => handleAccept(i, msg)}
                                        className={`flex-1 py-2 transition-colors text-xs font-bold flex items-center justify-center gap-1.5
                                            ${msg.data.action === 'delete'
                                                ? 'hover:bg-red-900/40 text-red-500 hover:text-red-300'
                                                : 'hover:bg-green-900/20 text-green-400 hover:text-green-300'} `}
                                    >
                                        <Check className="w-3 h-3" />
                                        {msg.data.action === 'delete' ? t('dexter.review.confirm_delete') : t('dexter.review.accept')}
                                    </button>
                                </div>
                            </div>
                        ) : msg.type === 'action_create' ? (
                            // Action Card: Create (Completed)
                            <div className="w-full bg-[#27272a] border border-[#3f3f46] rounded-md overflow-hidden animate-in slide-in-from-left-2 opacity-75">
                                <div className="bg-[#27272a] px-3 py-2 border-b border-[#3f3f46] flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                                        <span className="text-xs font-medium text-white">{t('dexter.status.note_created')}</span>
                                    </div>
                                    <Check className="w-3 h-3 text-green-500" />
                                </div>
                                <div className="p-3">
                                    <div className="text-xs text-gray-400 mb-1">Title</div>
                                    <div className="text-sm text-gray-200 font-medium mb-2">{msg.data.title}</div>
                                </div>
                            </div>
                        ) : msg.type === 'action_update' ? (
                            // Action Card: Update (Completed)
                            <div className="w-full bg-[#27272a] border border-[#3f3f46] rounded-md overflow-hidden animate-in slide-in-from-left-2 opacity-75">
                                <div className="bg-[#27272a] px-3 py-2 border-b border-[#3f3f46] flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-3.5 h-3.5 text-yellow-400" />
                                        <span className="text-xs font-medium text-white">{t('dexter.status.note_updated')}</span>
                                    </div>
                                    <Check className="w-3 h-3 text-green-500" />
                                </div>
                            </div>
                        ) : msg.type === 'action_delete_done' ? (
                            // Action Card: Delete (Completed)
                            <div className="w-full bg-[#27272a] border border-red-900/20 rounded-md overflow-hidden animate-in slide-in-from-left-2 opacity-75">
                                <div className="bg-[#27272a] px-3 py-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <X className="w-3.5 h-3.5 text-red-500" />
                                        <span className="text-xs font-medium text-red-100">{t('dexter.status.note_deleted')}</span>
                                    </div>
                                </div>
                            </div>
                        ) : msg.type === 'action_denied' ? (
                            // Action Card: Denied
                            <div className="w-full bg-[#27272a]/50 border border-red-900/30 rounded-md overflow-hidden animate-in slide-in-from-left-2 opacity-60">
                                <div className="px-3 py-2 flex items-center gap-2 text-red-400">
                                    <X className="w-3.5 h-3.5" />
                                    <span className="text-xs font-medium">{t('dexter.status.action_cancelled')}</span>
                                </div>
                            </div>
                        ) : (
                            // Standard Text
                            <div className={`max-w-[90%] text-sm leading-relaxed group relative ${msg.role === 'user'
                                ? 'text-gray-300'
                                : 'text-gray-300'
                                }`}>
                                <div 
                                    className="markdown-content space-y-2"
                                    dangerouslySetInnerHTML={{ 
                                        __html: DOMPurify.sanitize(marked.parse(msg.displayContent || msg.content || '')) 
                                    }}
                                />
                                {msg.attachments && msg.attachments.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {msg.attachments.map((att, idx) => (
                                            <div key={idx} className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded text-xs text-gray-300">
                                                <Paperclip className="w-3 h-3" />
                                                <span className="truncate max-w-[150px]">{att.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {msg.role === 'assistant' && settings?.voiceEnabled !== false && (
                                    <button
                                        onClick={() => speak(msg.content)}
                                        className="absolute -right-6 top-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-500 hover:text-white"
                                        title="Lire"
                                    >
                                        <Volume2 className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {isThinking && (
                    <div className="flex items-center gap-2 px-1">
                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" />
                        <span className="text-xs text-gray-500">{t('dexter.thinking')}</span>
                    </div>
                )}
            </div>

            {/* Input Footer */}
            <div className="p-4 bg-[#18181b] border-t border-[#27272a]">
                <div className="bg-[#27272a] border border-[#3f3f46] rounded-lg p-2 focus-within:ring-1 focus-within:ring-purple-500/50 transition-all flex flex-col gap-2 relative">
                    {/* Autocomplete Suggestions */}
                    {showSuggestions && getSuggestions().length > 0 && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#27272a] border border-[#3f3f46] rounded-lg overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
                            {getSuggestions().map((suggestion, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSelectSuggestion(suggestion)}
                                    className={`w-full px-3 py-2 text-left text-sm transition-colors ${index === selectedSuggestion
                                            ? 'bg-purple-900/30 text-purple-300'
                                            : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                                        }`}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Pending Attachments */}
                    {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2 px-1">
                            {attachments.map((att, idx) => (
                                <div key={idx} className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded text-xs text-gray-300 group">
                                    <Paperclip className="w-3 h-3" />
                                    <span className="truncate max-w-[150px]">{att.name}</span>
                                    <button 
                                        onClick={() => removeAttachment(idx)}
                                        className="ml-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <textarea
                        value={input}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyDown={(e) => {
                            // 1. Handle Suggestions Navigation
                            if (showSuggestions && getSuggestions().length > 0) {
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setSelectedSuggestion(prev =>
                                        Math.min(prev + 1, getSuggestions().length - 1)
                                    );
                                    return;
                                } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setSelectedSuggestion(prev => Math.max(prev - 1, 0));
                                    return;
                                } else if (e.key === 'Tab' || (e.key === 'Enter' && e.ctrlKey)) {
                                    e.preventDefault();
                                    handleSelectSuggestion(getSuggestions()[selectedSuggestion]);
                                    return;
                                } else if (e.key === 'Escape') {
                                    setShowSuggestions(false);
                                    return;
                                }
                            }

                            // 3. Handle Send
                            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder={t('dexter.placeholder')}
                        className="w-full bg-transparent border-none text-sm text-gray-200 placeholder-gray-600 outline-none resize-none font-dexter-mono"
                        rows="2"
                    />

                    <div className="flex items-center justify-between">
                        {/* Model Selector Badge */}
                        <div className="relative flex items-center gap-2">
                            <button
                                onClick={handleAttach}
                                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                                title={t('dexter.attach_file')}
                            >
                                <Paperclip className="w-3.5 h-3.5" />
                            </button>

                            <div className="relative">
                                <button
                                    onClick={() => setShowModelSelector(!showModelSelector)}
                                    className="flex items-center gap-1.5 bg-[#3f3f46]/30 hover:bg-[#3f3f46]/50 text-[10px] text-gray-400 hover:text-gray-200 rounded px-2 py-1 transition-colors max-w-[200px] border border-transparent hover:border-[#3f3f46]"
                                >
                                    <span className="truncate max-w-[140px]">
                                        {selectedModel === 'default'
                                            ? `${t('dexter.model_selector')} (${settings?.aiModel?.split('/').pop() || 'GPT-4o Mini'})`
                                            : selectedModel.split('/').pop()
                                        }
                                    </span>
                                    <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-200 ${showModelSelector ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Custom Dropdown */}
                                {showModelSelector && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowModelSelector(false)}
                                    />
                                    <div className="absolute bottom-full left-0 mb-2 w-56 bg-[#18181b] border border-[#3f3f46] rounded-lg shadow-2xl overflow-hidden z-20 flex flex-col max-h-64 animate-in fade-in zoom-in-95 duration-100">
                                        <div className="overflow-y-auto custom-scrollbar py-1">
                                            <div className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-[#27272a]/50">{t('dexter.model_categories.system')}</div>
                                            <button
                                                onClick={() => { setSelectedModel('default'); setShowModelSelector(false); }}
                                                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between group transition-colors ${selectedModel === 'default' ? 'bg-purple-500/10 text-purple-300' : 'text-gray-300 hover:bg-[#27272a]'}`}
                                            >
                                                <span className="truncate pr-2">{t('dexter.model_selector')} ({settings?.aiModel?.split('/').pop() || 'GPT-4o Mini'})</span>
                                                {selectedModel === 'default' && <Check className="w-3 h-3 shrink-0" />}
                                            </button>

                                            <div className="px-3 py-1.5 mt-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-[#27272a]/50">{t('dexter.model_categories.standard')}</div>
                                            {[
                                                { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
                                                { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' },
                                                { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5' }
                                            ].map(model => (
                                                <button
                                                    key={model.id}
                                                    onClick={() => { setSelectedModel(model.id); setShowModelSelector(false); }}
                                                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between group transition-colors ${selectedModel === model.id ? 'bg-purple-500/10 text-purple-300' : 'text-gray-300 hover:bg-[#27272a]'}`}
                                                >
                                                    <span>{model.name}</span>
                                                    {selectedModel === model.id && <Check className="w-3 h-3 shrink-0" />}
                                                </button>
                                            ))}

                                            {(settings?.customModels || []).length > 0 && (
                                                <>
                                                    <div className="px-3 py-1.5 mt-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-[#27272a]/50">{t('dexter.model_categories.custom')}</div>
                                                    {settings.customModels.map(model => (
                                                        <button
                                                            key={model}
                                                            onClick={() => { setSelectedModel(model); setShowModelSelector(false); }}
                                                            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between group transition-colors ${selectedModel === model ? 'bg-purple-500/10 text-purple-300' : 'text-gray-300 hover:bg-[#27272a]'}`}
                                                        >
                                                            <span className="truncate pr-2">{model.split('/').pop()}</span>
                                                            {selectedModel === model && <Check className="w-3 h-3 shrink-0" />}
                                                        </button>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                        {isThinking ? (
                            <button
                                onClick={handleStop}
                                className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-all animate-pulse"
                                title="Stop generating"
                            >
                                <Square className="w-3.5 h-3.5 fill-current" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() && attachments.length === 0}
                                className="p-1.5 bg-white text-black rounded hover:opacity-90 disabled:opacity-50 transition-all"
                            >
                                <Send className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
