import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Mic, Image as ImageIcon, StopCircle, Trash2, MoveLeft, MoveRight, Copy, ClipboardPaste } from 'lucide-react';
import { generateText } from '../services/ai';
import AudioPlayer from './AudioPlayer';
import { writeText, readImage, readText } from '@tauri-apps/plugin-clipboard-manager';
import { open } from '@tauri-apps/plugin-shell';

export default function Editor({ note, onUpdateNote, settings }) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [suggestion, setSuggestion] = useState(null);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const textareaRef = useRef(null);

    // Media Refs
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [note?.content]);

    // Smart Auto-completion (Debounced)
    useEffect(() => {
        if (!note?.content || !settings?.aiApiKey) return;

        const timer = setTimeout(() => {
            // Only suggest if cursor is at the end and content is long enough
            if (textareaRef.current && textareaRef.current.selectionStart === note.content.length && note.content.length > 20) {
                triggerSuggestion();
            }
        }, 1000); // Wait 1s after typing stops

        return () => clearTimeout(timer);
    }, [note?.content, settings?.aiApiKey]);

    if (!note) {
        return (
            <div className="flex-1 h-full flex items-center justify-center text-gray-400 bg-white/50 dark:bg-[#1e1e1e]/90 backdrop-blur-sm transition-all duration-300">
                <p className="animate-pulse font-medium">Sélectionnez ou créez une note</p>
                <div className="absolute top-0 left-0 right-0 h-8 z-10" data-tauri-drag-region />
            </div>
        );
    }

    const handleTitleChange = (e) => {
        onUpdateNote({ ...note, title: e.target.value, updatedAt: Date.now() });
    };

    const handleContentChange = async (e) => {
        const newContent = e.target.value;
        onUpdateNote({ ...note, content: newContent, updatedAt: Date.now() });
        setSuggestion(null); // Clear suggestion on type

        // Auto-completion logic (debounce could be added here)
        if (settings?.aiApiKey && newContent.length > 10 && !isSuggesting && newContent.endsWith(' ')) {
            // Only trigger if user pauses or ends a sentence (simplified)
            // For a real implementation, use a debounce hook
            // This is a placeholder for where you'd call the AI for a short completion
        }
    };

    // Handle keyboard shortcuts for suggestion
    const handleKeyDown = (e) => {
        if (e.key === 'ArrowRight' && suggestion) {
            e.preventDefault();
            const newContent = note.content + suggestion;
            onUpdateNote({ ...note, content: newContent, updatedAt: Date.now() });
            setSuggestion(null);
        }
    };

    // Open link in browser
    const handleOpenLink = async (url) => {
        try {
            await open(url);
        } catch (err) {
            console.error('Failed to open link:', err);
        }
    };

    // Render content with clickable links
    const renderContentWithLinks = (text) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);

        return parts.map((part, index) => {
            if (part.match(urlRegex)) {
                return (
                    <span
                        key={index}
                        onClick={() => handleOpenLink(part)}
                        className="text-blue-600 dark:text-blue-400 underline cursor-pointer hover:text-blue-700 dark:hover:text-blue-300"
                        title="Cliquer pour ouvrir"
                    >
                        {part}
                    </span>
                );
            }
            return part;
        });
    };

    // Helper: Add attachment
    const addAttachment = (type, data) => {
        const newAttachment = {
            id: Date.now().toString(),
            type, // 'image' or 'audio'
            data, // base64
            name: type === 'audio' ? `Memo ${new Date().toLocaleTimeString()}` : 'Image',
            width: type === 'image' ? 100 : undefined
        };
        const attachments = note.attachments || [];
        onUpdateNote({ ...note, attachments: [...attachments, newAttachment], updatedAt: Date.now() });
    };

    const removeAttachment = (id) => {
        const attachments = (note.attachments || []).filter(a => a.id !== id);
        onUpdateNote({ ...note, attachments, updatedAt: Date.now() });
    };

    const resizeAttachment = (id, newWidth) => {
        const attachments = (note.attachments || []).map(a =>
            a.id === id ? { ...a, width: newWidth } : a
        );
        onUpdateNote({ ...note, attachments, updatedAt: Date.now() });
    };

    const moveAttachment = (index, direction) => {
        const attachments = [...(note.attachments || [])];
        if (direction === 'left' && index > 0) {
            [attachments[index - 1], attachments[index]] = [attachments[index], attachments[index - 1]];
        } else if (direction === 'right' && index < attachments.length - 1) {
            [attachments[index + 1], attachments[index]] = [attachments[index], attachments[index + 1]];
        }
        onUpdateNote({ ...note, attachments, updatedAt: Date.now() });
    };

    const renameAttachment = (id, newName) => {
        const attachments = (note.attachments || []).map(a =>
            a.id === id ? { ...a, name: newName } : a
        );
        onUpdateNote({ ...note, attachments, updatedAt: Date.now() });
    };

    // --- Media Handlers ---

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            addAttachment('image', reader.result);
        };
        reader.readAsDataURL(file);
    };

    const toggleRecording = async () => {
        if (isRecording) {
            // STOP
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        } else {
            // START
            try {
                const constraints = {
                    audio: settings?.audioInputId ? { deviceId: { exact: settings.audioInputId } } : true
                };

                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                mediaRecorderRef.current = new MediaRecorder(stream);
                chunksRef.current = [];

                mediaRecorderRef.current.ondataavailable = (e) => {
                    chunksRef.current.push(e.data);
                };

                mediaRecorderRef.current.onstop = () => {
                    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        addAttachment('audio', reader.result);
                    };
                    reader.readAsDataURL(blob);

                    // Stop tracks
                    stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorderRef.current.start();
                setIsRecording(true);
            } catch (err) {
                console.error("Mic Error:", err);
                alert("Impossible d'accéder au micro : " + err.message);
            }
        }
    };

    // Clipboard Handlers
    const handleCopyNote = async () => {
        try {
            const content = `# ${note.title}\n\n${note.content}`;
            await writeText(content);
            alert('Note copiée dans le presse-papiers !');
        } catch (err) {
            console.error('Copy error:', err);
            alert('Erreur lors de la copie : ' + err.message);
        }
    };

    const handlePaste = async () => {
        try {
            // 1. Try to read Image
            try {
                const image = await readImage();
                if (image) {
                    const rgba = await image.rgba();
                    const size = await image.size();
                    
                    const canvas = document.createElement('canvas');
                    canvas.width = size.width;
                    canvas.height = size.height;
                    const ctx = canvas.getContext('2d');
                    const imageData = new ImageData(new Uint8ClampedArray(rgba), size.width, size.height);
                    ctx.putImageData(imageData, 0, 0);
                    
                    const base64 = canvas.toDataURL('image/png');
                    addAttachment('image', base64);
                    return; // Stop here if image found
                }
            } catch (e) {
                // Ignore image error, continue to text
                console.log("No image in clipboard or read error", e);
            }

            // 2. Try to read Text
            const text = await readText();
            if (text) {
                const textarea = textareaRef.current;
                if (textarea) {
                    const start = textarea.selectionStart || 0;
                    const end = textarea.selectionEnd || 0;
                    const currentContent = note.content || "";
                    
                    const newContent = currentContent.substring(0, start) + text + currentContent.substring(end);
                    
                    onUpdateNote({ ...note, content: newContent, updatedAt: Date.now() });
                    
                    // Optional: Update cursor position after render could be tricky here without effect, 
                    // but the content update is the priority.
                }
                return;
            }

            alert('Presse-papiers vide ou format non supporté');

        } catch (err) {
            console.error('Paste error:', err);
            const msg = err instanceof Error ? err.message : String(err);
            alert('Erreur lors du collage : ' + msg);
        }
    };

    const handleAiGenerate = async () => {
        if (!settings?.aiApiKey) {
            alert("Veuillez configurer votre clé API OpenRouter dans les paramètres.");
            return;
        }

        setIsGenerating(true);
        try {
            // Prompt : Amélioration globale (Modification/Suppression/Ajout)
            const prompt = note.content
                ? "Voici le contenu de la note :\n\n" + note.content + "\n\nAgis comme un éditeur expert. Améliore ce contenu : tu peux le corriger, le reformuler, le compléter, ou supprimer les parties superflues. Renvoie uniquement la version finale complète du texte."
                : "Écris une note détaillée, structurée et intéressante sur un sujet de culture générale ou technique, en incluant des liens vers des sources si pertinent.";

            const generated = await generateText({
                apiKey: settings.aiApiKey,
                model: settings.aiModel,
                prompt: prompt,
                context: note.title
            });

            // Typewriter effect (Rewrite mode)
            let currentText = "";
            const chars = generated.split("");
            
            // Speed depends on length to avoid waiting too long for long notes
            const delay = chars.length > 500 ? 1 : 5;
            const step = chars.length > 500 ? 5 : 2;

            for (let i = 0; i < chars.length; i++) {
                currentText += chars[i];
                if (i % step === 0 || i === chars.length - 1) {
                    onUpdateNote({ ...note, content: currentText, updatedAt: Date.now() });
                    await new Promise(r => setTimeout(r, delay));
                }
            }
            
        } catch (error) {
            alert("Erreur AI : " + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    // Trigger suggestion manually (or could be hooked to debounce)
    const triggerSuggestion = async () => {
        if (!settings?.aiApiKey || isSuggesting || !note.content) return;
        
        setIsSuggesting(true);
        try {
            // Context: Last 500 chars for better relevance
            const context = note.content.slice(-500);
            const generated = await generateText({
                apiKey: settings.aiApiKey,
                model: settings.aiModel,
                prompt: `Tu es un moteur d'autocomplétion. Propose une suite logique, courte et naturelle (max 15 mots) au texte suivant. Ne répète pas le texte. Texte : "${context}"`,
                context: note.title
            });
            
            if (generated && generated.trim()) {
                // Ensure we don't repeat the last word if it was partial (simple check)
                let cleanSuggestion = generated;
                if (cleanSuggestion.startsWith(context.split(' ').pop())) {
                    cleanSuggestion = cleanSuggestion.replace(context.split(' ').pop(), '');
                }
                setSuggestion(cleanSuggestion);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSuggesting(false);
        }
    };

    return (
        <div className="flex-1 h-full flex flex-col bg-white dark:bg-[#1e1e1e] relative transition-colors duration-300">
            {/* Invisible Drag Region at top - Only when titlebar is 'none' */}
            {(!settings?.titlebarStyle || settings.titlebarStyle === 'none') && (
                <div className="absolute top-0 left-0 right-0 h-8 z-10" data-tauri-drag-region />
            )}

            <div className="pt-12 px-8 pb-4 animate-in fade-in slide-in-from-bottom-2 duration-500 group relative">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mx-auto block text-center mb-4 transition-colors">
                    {new Date(note.updatedAt).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}
                </span>

                {/* AI Button - Visible on Hover or when generating */}
                {settings?.aiApiKey && (
                    <button
                        onClick={handleAiGenerate}
                        disabled={isGenerating}
                        className={`absolute right-8 top-12 p-2 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all duration-300 ${isGenerating ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        title="Assistant AI (Compléter/Améliorer)"
                    >
                        {isGenerating ? <Sparkles className="w-5 h-5 animate-pulse" /> : <Sparkles className="w-5 h-5" />}
                    </button>
                )}

                <input
                    type="text"
                    value={note.title}
                    onChange={handleTitleChange}
                    placeholder="Titre de la note"
                    className="w-full text-3xl font-bold bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-200"
                />
            </div>

            {/* EDITOR AREA */}
            <div className="flex-1 px-8 pb-4 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-75 scroll-pt-4 relative">
                <div className="relative w-full mb-8 min-h-[400px]">
                    <textarea
                        ref={textareaRef}
                        value={note.content}
                        onChange={handleContentChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Commencez à écrire..."
                        className="w-full h-auto overflow-hidden resize-none bg-transparent outline-none text-lg leading-relaxed text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 font-sans transition-colors duration-200 selection:bg-blue-200 dark:selection:bg-blue-900 relative z-10"
                        style={{ minHeight: '400px' }}
                    />
                    {/* Suggestion Overlay */}
                    {suggestion && (
                        <div className="absolute top-0 left-0 pointer-events-none z-0 whitespace-pre-wrap text-lg leading-relaxed font-sans text-transparent w-full">
                            {note.content}
                            <span className="text-gray-400 dark:text-gray-500 opacity-60">{suggestion}</span>
                        </div>
                    )}
                </div>

                {/* Attachments Section */}
                {(note.attachments && note.attachments.length > 0) && (
                    <div className="border-t border-gray-100 dark:border-white/5 pt-6 pb-20 mt-4">
                        <h3 className="text-xs font-bold uppercase text-gray-400 mb-6 tracking-wider pl-1">Pièces Jointes ({note.attachments.length})</h3>
                        <div className="flex flex-wrap items-start gap-6">
                            {note.attachments.map((att, index) => (
                                <div
                                    key={att.id}
                                    className={`relative group rounded-xl transition-all duration-300 ${att.type === 'image' ? '' : 'w-72'}`}
                                    style={{
                                        width: att.type === 'image' ? (att.width || 100) + '%' : undefined,
                                        maxWidth: att.type === 'image' ? '100%' : '320px',
                                        flexBasis: att.type === 'image' ? (att.width || 100) + '%' : 'auto'
                                    }}
                                >
                                    {/* --- Hover Controls (Glassmorphism) --- */}
                                    <div className="absolute -top-3 right-2 flex items-center justify-end gap-1 z-30 opacity-0 group-hover:opacity-100 transition-all duration-200 scale-95 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto">
                                        <div className="bg-black/60 backdrop-blur-md rounded-full p-1 flex items-center border border-white/10 shadow-xl">
                                            {/* Move Left */}
                                            {index > 0 && (
                                                <button
                                                    onClick={() => moveAttachment(index, 'left')}
                                                    className="p-1.5 text-gray-300 hover:text-white hover:bg-white/20 rounded-full transition-colors"
                                                    title="Gauche"
                                                >
                                                    <MoveLeft className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            {/* Move Right */}
                                            {index < note.attachments.length - 1 && (
                                                <button
                                                    onClick={() => moveAttachment(index, 'right')}
                                                    className="p-1.5 text-gray-300 hover:text-white hover:bg-white/20 rounded-full transition-colors"
                                                    title="Droite"
                                                >
                                                    <MoveRight className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            <div className="w-px h-3 bg-white/20 mx-1"></div>
                                            {/* Delete */}
                                            <button
                                                onClick={() => removeAttachment(att.id)}
                                                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-full transition-colors"
                                                title="Supprimer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>


                                    {att.type === 'image' ? (
                                        <div className="relative rounded-2xl overflow-hidden shadow-sm border border-gray-200 dark:border-white/10">
                                            <img src={att.data} alt="Attachment" className="w-full object-cover" style={{ maxHeight: '600px' }} />

                                            {/* Beautiful Resize Slider */}
                                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                                                <div className="bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 shadow-2xl flex items-center gap-3">
                                                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Size</span>
                                                    <input
                                                        type="range"
                                                        min="20"
                                                        max="100"
                                                        step="5"
                                                        value={att.width || 100}
                                                        onChange={(e) => resizeAttachment(att.id, parseInt(e.target.value))}
                                                        className="w-32 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
                                                    />
                                                    <span className="text-[10px] font-mono text-white w-8 text-right">{att.width || 100}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <AudioPlayer
                                            src={att.data}
                                            name={att.name}
                                            onRename={(newName) => renameAttachment(att.id, newName)}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Toolbar */}
            <div className="h-14 border-t border-gray-100 dark:border-white/5 bg-white/80 dark:bg-[#1e1e1e]/80 backdrop-blur-md px-6 flex items-center gap-4">
                <button
                    onClick={toggleRecording}
                    className={`p-2 rounded-full transition-all ${isRecording
                        ? 'bg-red-100 text-red-600 animate-pulse'
                        : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}
                    title={isRecording ? "Arrêter l'enregistrement" : "Enregistrer un mémo vocal"}
                >
                    {isRecording ? <StopCircle className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
                </button>

                <div className="relative">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        title="Insérer une image"
                    />
                    <div className="p-2 rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors pointer-events-none">
                        <ImageIcon className="w-5 h-5" />
                    </div>
                </div>

                <button
                    onClick={handlePaste}
                    className="p-2 rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                    title="Coller (Texte ou Image)"
                >
                    <ClipboardPaste className="w-5 h-5" />
                </button>

                <div className="flex-1" />

                <button
                    onClick={handleCopyNote}
                    className="p-2 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                    title="Copier la note"
                >
                    <Copy className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
