
import React, { useState, useRef, useEffect } from 'react';
// Import d'icônes plus "pro" / minimalistes
import {
    Bot, Send, X, Plus, Sparkles, History,
    FileText, Check, ChevronDown, Reply, Copy, RotateCcw,
    Trash2
} from 'lucide-react';
import { generateText } from '../services/ai';

export default function Dexter({ isOpen, onClose, settings, onUpdateSettings, onCreateNote, onUpdateNote, onDeleteNote, currentNote }) {
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

    const [messages, setMessages] = useState([
        { role: 'system', content: "Hello. I'm Dexter. Ready to code or write notes." }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [selectedModel, setSelectedModel] = useState(settings?.aiModel || 'openai/gpt-4o-mini');
    const [recentPrompts, setRecentPrompts] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSuggestion, setSelectedSuggestion] = useState(0);

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

    const handleRegenerate = () => {
        const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
        if (lastUserMessage) {
            setInput(lastUserMessage.content);
        }
    };

    const handleAccept = (index, msg) => {
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
    };

    const handleDeny = (index) => {
        setMessages(prev => prev.map((m, i) =>
            i === index ? { ...m, type: 'action_denied', content: "Action cancelled by user." } : m
        ));
    };

    // Suggestions logic
    const baseSuggestions = [
        "Create a note about...",
        "Update the current note with...",
        "Summarize the current note",
        "Generate ideas for...",
        "Write a detailed explanation of...",
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

    // AI Logic
    const handleSend = async () => {
        if (!input.trim() || !settings?.aiApiKey) return;

        const userMsg = { role: 'user', content: input };

        // Add to recent prompts
        setRecentPrompts(prev => {
            const updated = [input, ...prev.filter(p => p !== input)];
            return updated.slice(0, 10); // Keep only last 10
        });

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setShowSuggestions(false);
        setIsThinking(true);

        try {
            const systemPrompt = `You are Dexter, an advanced AI assistant in a note - taking app.

    TOOLS:
- If user wants to CREATE a note: Respond ONLY with JSON: { "action": "create_note", "title": "...", "content": "..." }
- If user wants to UPDATE / APPEND to current note: Respond ONLY with JSON: { "action": "update_note", "content": "..." }
- If user wants to DELETE the current note: Respond ONLY with JSON: { "action": "delete_note" }

CONTEXT:
            Current Note Title: "${currentNote?.title || 'None'}"
            Current Note Content Preview: "${currentNote?.content?.slice(0, 200) || ''}..."

            Be concise, helpful, and professional.
            `;

            const fullPrompt = `${systemPrompt} \n\nUser: ${userMsg.content} `;

            const responseText = await generateText({
                apiKey: settings.aiApiKey,
                model: selectedModel,
                prompt: fullPrompt
            });

            let aiMsg = { role: 'assistant', content: responseText, type: 'text' };

            try {
                if (responseText.trim().startsWith('{') && responseText.trim().endsWith('}')) {
                    const actionData = JSON.parse(responseText);

                    if (actionData.action === 'create_note') {
                        aiMsg = {
                            role: 'assistant',
                            type: 'action_pending',
                            data: {
                                action: 'create',
                                title: actionData.title,
                                content: actionData.content,
                                lines: actionData.content.split('\n').length
                            }
                        };
                    } else if (actionData.action === 'update_note' && currentNote) {
                        aiMsg = {
                            role: 'assistant',
                            type: 'action_pending',
                            data: {
                                action: 'update',
                                title: currentNote.title,
                                content: actionData.content,
                                lines: actionData.content.split('\n').length
                            }
                        };
                    } else if (actionData.action === 'delete_note' && currentNote) {
                        aiMsg = {
                            role: 'assistant',
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
                // Not JSON, stay text
            }

            setMessages(prev => [...prev, aiMsg]);

        } catch (error) {
            setMessages(prev => [...prev, { role: 'error', content: "Error: " + error.message }]);
        } finally {
            setIsThinking(false);
        }
    };

    if (!isOpen) return null;

    // THEME: Dark IDE Style (Zinc-950 background)
    return (
        <div
            ref={dexterRef}
            style={{ left: position.x, top: position.y }}
            className="fixed w-[450px] h-[700px] max-h-[85vh] flex flex-col bg-[#18181b]/95 backdrop-blur-xl border border-[#27272a] rounded-xl shadow-2xl z-50 overflow-hidden font-sans text-sm text-gray-300 animate-in fade-in zoom-in-95 duration-200"
        >
            {/* Header Minimaliste */}
            <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="h-10 bg-white/5 border-b border-[#27272a] flex items-center justify-between px-4 cursor-move select-none touch-none"
            >
                <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-xs tracking-wide">Dexter Assistant</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={handleRegenerate}
                        className="text-gray-500 hover:text-white transition-colors"
                        title="Reload Last Prompt"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => setMessages([{ role: 'system', content: 'Ready.' }])}
                        className="text-gray-500 hover:text-white transition-colors"
                        title="Clear History"
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

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-transparent">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>

                        {/* Avatar / Name */}
                        {msg.role !== 'system' && (
                            <div className="flex items-center gap-2 mb-1 px-1">
                                {msg.role === 'assistant' ? (
                                    <>
                                        <Bot className="w-3 h-3 text-purple-400" />
                                        <span className="text-[10px] uppercase font-bold text-purple-400">Dexter</span>
                                    </>
                                ) : (
                                    <span className="text-[10px] uppercase font-bold text-gray-500">You</span>
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
                                            {msg.data.action === 'create' ? 'Review: Create Note' :
                                                msg.data.action === 'update' ? 'Review: Update Note' : 'Review: DELETE Note'}
                                        </span>
                                    </div>
                                    {msg.data.action !== 'delete' && (
                                        <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">
                                            +{msg.data.lines} lines
                                        </span>
                                    )}
                                </div>

                                <div className="p-3 bg-[#1e1e20]">
                                    {msg.data.action === 'delete' ? (
                                        <div className="text-xs text-gray-300 font-medium">
                                            Are you sure you want to delete <span className="text-white font-bold">"{msg.data.title}"</span>?
                                            <br /><span className="text-red-400 text-[10px] uppercase tracking-wide mt-1 block">This action cannot be undone by Dexter.</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="text-xs text-gray-400 mb-1 font-medium">Proposed Content:</div>
                                            <div className="text-xs font-mono text-gray-300 bg-black/30 p-2 rounded border border-white/5 max-h-32 overflow-y-auto custom-scrollbar-thin">
                                                {msg.data.content}
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="flex border-t border-white/5 divide-x divide-white/5">
                                    <button
                                        onClick={() => handleDeny(i)}
                                        className="flex-1 py-2 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors text-xs font-medium"
                                    >
                                        Deny
                                    </button>
                                    <button
                                        onClick={() => handleAccept(i, msg)}
                                        className={`flex-1 py-2 transition-colors text-xs font-bold flex items-center justify-center gap-1.5
                                            ${msg.data.action === 'delete'
                                                ? 'hover:bg-red-900/40 text-red-500 hover:text-red-300'
                                                : 'hover:bg-green-900/20 text-green-400 hover:text-green-300'} `}
                                    >
                                        <Check className="w-3 h-3" />
                                        {msg.data.action === 'delete' ? 'Confirm Delete' : 'Accept'}
                                    </button>
                                </div>
                            </div>
                        ) : msg.type === 'action_create' ? (
                            // Action Card: Create (Completed)
                            <div className="w-full bg-[#27272a] border border-[#3f3f46] rounded-md overflow-hidden animate-in slide-in-from-left-2 opacity-75">
                                <div className="bg-[#27272a] px-3 py-2 border-b border-[#3f3f46] flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                                        <span className="text-xs font-medium text-white">Note Created</span>
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
                                        <span className="text-xs font-medium text-white">Note Updated</span>
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
                                        <span className="text-xs font-medium text-red-100">Note Deleted</span>
                                    </div>
                                </div>
                            </div>
                        ) : msg.type === 'action_denied' ? (
                            // Action Card: Denied
                            <div className="w-full bg-[#27272a]/50 border border-red-900/30 rounded-md overflow-hidden animate-in slide-in-from-left-2 opacity-60">
                                <div className="px-3 py-2 flex items-center gap-2 text-red-400">
                                    <X className="w-3.5 h-3.5" />
                                    <span className="text-xs font-medium">Action Cancelled</span>
                                </div>
                            </div>
                        ) : (
                            // Standard Text
                            <div className={`max-w-[90%] text-sm leading-relaxed ${msg.role === 'user'
                                ? 'text-gray-300'
                                : 'text-gray-300'
                                }`}>
                                {msg.content}
                            </div>
                        )}
                    </div>
                ))}

                {isThinking && (
                    <div className="flex items-center gap-2 px-1">
                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" />
                        <span className="text-xs text-gray-500">Dexter is thinking...</span>
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

                    <textarea
                        value={input}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (showSuggestions && getSuggestions().length > 0) {
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setSelectedSuggestion(prev =>
                                        Math.min(prev + 1, getSuggestions().length - 1)
                                    );
                                } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setSelectedSuggestion(prev => Math.max(prev - 1, 0));
                                } else if (e.key === 'Tab' || (e.key === 'Enter' && e.ctrlKey)) {
                                    e.preventDefault();
                                    handleSelectSuggestion(getSuggestions()[selectedSuggestion]);
                                    return;
                                } else if (e.key === 'Escape') {
                                    setShowSuggestions(false);
                                    return;
                                }
                            }

                            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Ask anything (e.g., 'Create a note about React hooks')..."
                        className="w-full bg-transparent border-none text-sm text-gray-200 placeholder-gray-600 outline-none resize-none font-sans"
                        rows="2"
                    />

                    <div className="flex items-center justify-between">
                        {/* Model Selector Badge */}
                        <div className="relative group">
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="appearance-none bg-[#3f3f46]/50 hover:bg-[#3f3f46] text-[10px] text-gray-400 hover:text-gray-200 rounded px-2 py-0.5 outline-none cursor-pointer transition-colors pr-4 max-w-[150px] truncate"
                            >
                                <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
                                <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
                                <option value="google/gemini-flash-1.5">Gemini Flash 1.5</option>
                                {(settings?.customModels || []).map(model => (
                                    <option key={model} value={model}>{model.split('/').pop()}</option>
                                ))}
                            </select>
                            <ChevronDown className="w-2.5 h-2.5 text-gray-500 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isThinking}
                            className="p-1.5 bg-white text-black rounded hover:opacity-90 disabled:opacity-50 transition-all"
                        >
                            <Send className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
