import React, { useState, useRef, useEffect } from 'react';
// Import d'icônes plus "pro" / minimalistes
import {
    Bot, Send, X, Plus, Sparkles, History,
    FileText, Check, ChevronDown, Reply, Copy
} from 'lucide-react';
import { generateText } from '../services/ai';

export default function Dexter({ settings, onUpdateSettings, onCreateNote, onUpdateNote, currentNote }) {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ x: window.innerWidth - 380 - 20, y: 80 }); // Plus large
    const [messages, setMessages] = useState([
        { role: 'system', content: "Hello. I'm Dexter. Ready to code or write notes." }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [selectedModel, setSelectedModel] = useState(settings?.aiModel || 'openai/gpt-4o-mini');

    // Dragging Logic
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        setIsDragging(true);
        dragOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    const handleMouseMove = (e) => {
        if (isDragging) {
            setPosition({
                x: e.clientX - dragOffset.current.x,
                y: e.clientY - dragOffset.current.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    // AI Logic
    const handleSend = async () => {
        if (!input.trim() || !settings?.aiApiKey) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsThinking(true);

        try {
            const systemPrompt = `You are Dexter, an advanced AI assistant in a note-taking app.
            
            TOOLS:
            - If user wants to CREATE a note: Respond ONLY with JSON: {"action": "create_note", "title": "...", "content": "..."}
            - If user wants to UPDATE/APPEND to current note: Respond ONLY with JSON: {"action": "update_note", "content": "..."}
            
            CONTEXT:
            Current Note Title: "${currentNote?.title || 'None'}"
            Current Note Content Preview: "${currentNote?.content?.slice(0, 200) || ''}..."

            Be concise, helpful, and professional.
            `;

            const fullPrompt = `${systemPrompt}\n\nUser: ${userMsg.content}`;

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
                        onCreateNote({ title: actionData.title, content: actionData.content });
                        aiMsg = {
                            role: 'assistant',
                            type: 'action_create',
                            data: { title: actionData.title, content: actionData.content }
                        };
                    } else if (actionData.action === 'update_note' && currentNote) {
                        onUpdateNote({ ...currentNote, content: currentNote.content + '\n' + actionData.content });
                        aiMsg = {
                            role: 'assistant',
                            type: 'action_update',
                            data: { title: currentNote.title }
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

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 p-3 bg-[#18181b] hover:bg-[#27272a] text-white rounded-full shadow-2xl hover:scale-105 transition-all z-50 group border border-white/10"
            >
                <Bot className="w-6 h-6" />
            </button>
        );
    }

    // THEME: Dark IDE Style (Zinc-950 background)
    return (
        <div
            style={{ left: position.x, top: position.y }}
            className="fixed w-[400px] h-[600px] flex flex-col bg-[#18181b] border border-[#27272a] rounded-xl shadow-2xl z-50 overflow-hidden font-sans text-sm text-gray-300 animate-in fade-in zoom-in-95 duration-200"
        >
            {/* Header Minimaliste */}
            <div
                onMouseDown={handleMouseDown}
                className="h-10 bg-[#18181b] border-b border-[#27272a] flex items-center justify-between px-4 cursor-move select-none"
            >
                <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-xs tracking-wide">Dexter Assistant</span>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setMessages([{ role: 'system', content: 'Ready.' }])} className="text-gray-500 hover:text-white transition-colors" title="Clear History">
                        <History className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-[#18181b]">
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
                        {msg.type === 'action_create' ? (
                            // Action Card: Create
                            <div className="w-full bg-[#27272a] border border-[#3f3f46] rounded-md overflow-hidden animate-in slide-in-from-left-2">
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
                                    <div className="text-xs text-gray-500 truncate">{msg.data.content}</div>
                                </div>
                            </div>
                        ) : msg.type === 'action_update' ? (
                            // Action Card: Update
                            <div className="w-full bg-[#27272a] border border-[#3f3f46] rounded-md overflow-hidden animate-in slide-in-from-left-2">
                                <div className="bg-[#27272a] px-3 py-2 border-b border-[#3f3f46] flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-3.5 h-3.5 text-yellow-400" />
                                        <span className="text-xs font-medium text-white">Note Updated</span>
                                    </div>
                                    <Check className="w-3 h-3 text-green-500" />
                                </div>
                                <div className="p-3">
                                    <div className="text-xs text-gray-500">Updated contents of "{msg.data.title}"</div>
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
                <div className="bg-[#27272a] border border-[#3f3f46] rounded-lg p-2 focus-within:ring-1 focus-within:ring-purple-500/50 transition-all flex flex-col gap-2">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
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
                                className="appearance-none bg-[#3f3f46]/50 hover:bg-[#3f3f46] text-[10px] text-gray-400 hover:text-gray-200 rounded px-2 py-0.5 outline-none cursor-pointer transition-colors pr-4"
                            >
                                <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
                                <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
                                <option value={settings?.aiModel || 'custom'}>Custom Model</option>
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
