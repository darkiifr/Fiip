import React, { useState, useRef } from 'react';
import { Sparkles, Loader2, Mic, Image as ImageIcon, StopCircle, Trash2, MoveLeft, MoveRight } from 'lucide-react';
import { generateText } from '../services/ai';
import AudioPlayer from './AudioPlayer';

export default function Editor({ note, onUpdateNote, settings }) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isRecording, setIsRecording] = useState(false);

    // Media Refs
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

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

    const handleContentChange = (e) => {
        onUpdateNote({ ...note, content: e.target.value, updatedAt: Date.now() });
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

    const handleAiGenerate = async () => {
        if (!settings?.aiApiKey) {
            alert("Veuillez configurer votre clé API OpenRouter dans les paramètres.");
            return;
        }

        setIsGenerating(true);
        try {
            // Prompt simple : Continue ou Améliore
            const prompt = note.content
                ? "Continue ce texte ou améliore-le si c'est une ébauche : " + note.content.slice(-500)
                : "Écris une courte note sur un sujet intéressant.";

            const generated = await generateText({
                apiKey: settings.aiApiKey,
                model: settings.aiModel,
                prompt: prompt,
                context: note.title
            });

            // Append text
            const newContent = note.content ? note.content + "\n\n" + generated : generated;
            onUpdateNote({ ...note, content: newContent, updatedAt: Date.now() });
        } catch (error) {
            alert("Erreur AI : " + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex-1 h-full flex flex-col bg-white dark:bg-[#1e1e1e] relative transition-colors duration-300">
            {/* Invisible Drag Region at top - 30px height */}
            <div className="absolute top-0 left-0 right-0 h-8 z-10" data-tauri-drag-region />

            <div className="pt-12 px-8 pb-4 animate-in fade-in slide-in-from-bottom-2 duration-500 group relative">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mx-auto block text-center mb-4 transition-colors">
                    {new Date(note.updatedAt).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}
                </span>

                {/* AI Button - Visible on Hover or when generating */}
                <button
                    onClick={handleAiGenerate}
                    disabled={isGenerating}
                    className={`absolute right-8 top-12 p-2 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all duration-300 ${isGenerating ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    title="Assistant AI (Compléter/Améliorer)"
                >
                    {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                </button>

                <input
                    type="text"
                    value={note.title}
                    onChange={handleTitleChange}
                    placeholder="Titre de la note"
                    className="w-full text-3xl font-bold bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-200"
                />
            </div>

            {/* EDITOR AREA */}
            <div className="flex-1 px-8 pb-4 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-75 scroll-pt-4">
                <textarea
                    value={note.content}
                    onChange={handleContentChange}
                    placeholder="Commencez à écrire..."
                    className="w-full h-full resize-none bg-transparent outline-none text-lg leading-relaxed text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 font-sans transition-colors duration-200 selection:bg-blue-200 dark:selection:bg-blue-900 mb-8"
                    style={{ minHeight: '400px' }}
                />

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
            </div>
        </div>
    );
}
