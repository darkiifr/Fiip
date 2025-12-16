import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Mic, MicOff, Image as ImageIcon, StopCircle, Trash2, MoveLeft, MoveRight, Copy, ClipboardPaste, Volume2, Check, X, Video, Paperclip, FileText, Download } from 'lucide-react';
import { generateText } from '../services/ai';
import AudioPlayer from './AudioPlayer';
import { writeText, readImage, readText } from '@tauri-apps/plugin-clipboard-manager';
import { open } from '@tauri-apps/plugin-shell';
import { writeFile, mkdir, exists, readFile } from '@tauri-apps/plugin-fs';
import { save } from '@tauri-apps/plugin-dialog';
import { appDataDir, join } from '@tauri-apps/api/path';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';

const MediaAttachment = ({ att, index, note, moveAttachment, removeAttachment, resizeAttachment, renameAttachment, handleDownloadAttachment }) => {
    const { t } = useTranslation();
    const [src, setSrc] = useState('');
    const [isError, setIsError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let active = true;
        const loadSrc = async () => {
            setIsLoading(true);
            setIsError(false);
            try {
                // Try standard convertFileSrc first
                const assetUrl = convertFileSrc(att.data);
                if (active) setSrc(assetUrl);
            } catch (e) {
                console.error("Error generating src:", e);
                if (active) setIsError(true);
            } finally {
                if (active) setIsLoading(false);
            }
        };
        loadSrc();
        return () => { active = false; };
    }, [att.data]);

    const handleLoadError = async () => {
        if (src.startsWith('blob:')) return; // Already tried blob

        console.warn(`Failed to load resource: ${att.data}. Trying fallback...`);
        try {
            const content = await readFile(att.data);
            const blob = new Blob([content], { type: att.mimeType || (att.type === 'video' ? 'video/mp4' : 'image/jpeg') });
            const blobUrl = URL.createObjectURL(blob);
            setSrc(blobUrl);
        } catch (e) {
            console.error("Fallback loading failed:", e);
            setIsError(true);
        }
    };

    return (
        <div
            className={`relative group rounded-xl transition-all duration-300 animate-scale-in ${att.type === 'image' || att.type === 'video' ? '' : 'w-72'}`}
            style={{
                width: (att.type === 'image' || att.type === 'video') ? (att.width || 100) + '%' : undefined,
                maxWidth: (att.type === 'image' || att.type === 'video') ? '100%' : '320px',
                flexBasis: (att.type === 'image' || att.type === 'video') ? (att.width || 100) + '%' : 'auto'
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
                            title={t('editor.move_left')}
                        >
                            <MoveLeft className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {/* Move Right */}
                    {index < note.attachments.length - 1 && (
                        <button
                            onClick={() => moveAttachment(index, 'right')}
                            className="p-1.5 text-gray-300 hover:text-white hover:bg-white/20 rounded-full transition-colors"
                            title={t('editor.move_right')}
                        >
                            <MoveRight className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <div className="w-px h-3 bg-white/20 mx-1"></div>
                    {/* Delete */}
                    <button
                        onClick={() => removeAttachment(att.id)}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-full transition-colors"
                        title={t('editor.delete')}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>


            {att.type === 'image' || att.type === 'video' ? (
                <div className="relative rounded-2xl overflow-hidden shadow-sm border border-white/10 bg-black/20 min-h-[200px] flex items-center justify-center">
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                    
                    {isError ? (
                        <div className="flex flex-col items-center gap-2 text-red-400 p-4">
                            <ImageIcon className="w-8 h-8 opacity-50" />
                            <span className="text-xs font-medium">{t('editor.loading_error')}</span>
                        </div>
                    ) : att.type === 'image' ? (
                        <img 
                            src={src} 
                            alt={att.name} 
                            onError={handleLoadError}
                            className="w-full object-cover transition-opacity duration-300" 
                            style={{ maxHeight: '600px', opacity: isLoading ? 0 : 1 }} 
                        />
                    ) : (
                        <video 
                            src={src} 
                            controls 
                            onError={handleLoadError}
                            className="w-full object-cover transition-opacity duration-300" 
                            style={{ maxHeight: '600px', opacity: isLoading ? 0 : 1 }} 
                        />
                    )}

                    {/* Beautiful Resize Slider */}
                    {!isError && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-20">
                            <div className="bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 shadow-2xl flex items-center gap-3">
                                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{t('editor.size')}</span>
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
                    )}
                </div>
            ) : att.type === 'pdf' ? (
                <div className="flex items-center gap-4 bg-[#1e1e1e] p-4 rounded-xl border border-white/10 group/pdf hover:border-blue-500/30 transition-colors">
                    <div className="p-3 bg-red-500/10 rounded-xl text-red-400 group-hover/pdf:bg-red-500/20 transition-colors">
                        <FileText className="w-8 h-8" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-200 truncate mb-0.5">{att.name}</div>
                        <div className="text-xs text-gray-500">{t('editor.pdf_document')}</div>
                    </div>
                    <button 
                        onClick={() => handleDownloadAttachment(att)}
                        className="p-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                        title={t('editor.download')}
                    >
                        <Download className="w-5 h-5" />
                    </button>
                </div>
            ) : (
                <AudioPlayer
                    src={src}
                    name={att.name}
                    onRename={(newName) => renameAttachment(att.id, newName)}
                />
            )}
        </div>
    );
};

export default function Editor({ note, onUpdateNote, settings }) {
    const { t } = useTranslation();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isWaiting, setIsWaiting] = useState(false);
    const [pendingAiContent, setPendingAiContent] = useState(null); // Store AI content for review
    const [isRecording, setIsRecording] = useState(false);
    const [suggestion, setSuggestion] = useState(null);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [isDragging, setIsDragging] = useState(false); // Drag & Drop state
    const textareaRef = useRef(null);
    const editorContainerRef = useRef(null);
    const dragCounter = useRef(0);

    // TTS & STT State
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const isListeningRef = useRef(false); // Track intent to listen
    const lastSpeechStartRef = useRef(0);
    const [interimTranscript, setInterimTranscript] = useState('');
    const recognitionRef = useRef(null);
    const noteRef = useRef(note);

    // Keep note ref updated, but respect local optimistic updates
    useEffect(() => { 
        if (!note) return;
        if (!noteRef.current || note.id !== noteRef.current.id || note.updatedAt >= noteRef.current.updatedAt) {
            noteRef.current = note; 
        }
    }, [note]);

    // Initialize Speech Recognition
    useEffect(() => {
        if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'fr-FR';

            recognitionRef.current.onstart = () => {
                lastSpeechStartRef.current = Date.now();
            };

            recognitionRef.current.onresult = (event) => {
                let finalTranscript = '';
                let interim = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interim += event.results[i][0].transcript;
                    }
                }

                if (finalTranscript) {
                    const currentNote = noteRef.current;
                    if (!currentNote) return;

                    const currentContent = currentNote.content || '';
                    const separator = currentContent.length > 0 && !currentContent.endsWith(' ') && !currentContent.endsWith('\n') ? ' ' : '';
                    const newContent = currentContent + separator + finalTranscript;
                    
                    const updatedNote = { ...currentNote, content: newContent, updatedAt: Date.now() };
                    
                    // Optimistic update to prevent race conditions
                    noteRef.current = updatedNote;
                    onUpdateNote(updatedNote);
                    setInterimTranscript('');
                } else {
                    setInterimTranscript(interim);
                }
            };

            recognitionRef.current.onend = () => {
                // Auto-restart logic with crash prevention
                if (isListeningRef.current) {
                    const timeSinceStart = Date.now() - lastSpeechStartRef.current;
                    if (timeSinceStart < 1000) {
                        console.warn("Speech recognition stopped too quickly. Preventing restart loop.");
                        setIsListening(false);
                        isListeningRef.current = false;
                        return;
                    }

                    try {
                        recognitionRef.current.start();
                    } catch (e) {
                        console.warn("Failed to restart speech recognition:", e);
                        setIsListening(false);
                        isListeningRef.current = false;
                    }
                } else {
                    setIsListening(false);
                }
            };
            
            recognitionRef.current.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                if (event.error === 'not-allowed') {
                    setIsListening(false);
                    isListeningRef.current = false;
                    alert(t('editor.mic_access_denied'));
                } else if (event.error === 'aborted') {
                    // Ignore aborted errors (manual stop)
                } else {
                    // For other errors, we might want to stop or retry
                    // If it's a network error, maybe stop
                    if (event.error === 'network') {
                         setIsListening(false);
                         isListeningRef.current = false;
                    }
                }
            };
        }
        
        return () => {
            if (recognitionRef.current) recognitionRef.current.stop();
            window.speechSynthesis.cancel();
        };
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert(t('editor.speech_not_supported'));
            return;
        }

        if (isListening) {
            isListeningRef.current = false;
            setIsListening(false);
            recognitionRef.current.stop();
        } else {
            isListeningRef.current = true;
            setIsListening(true);
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.error(e);
                setIsListening(false);
                isListeningRef.current = false;
            }
        }
    };

    const toggleSpeaking = () => {
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        } else {
            if (!note?.content) return;
            
            const utterance = new SpeechSynthesisUtterance(note.content);
            if (settings?.voiceName) {
                const voices = window.speechSynthesis.getVoices();
                const voice = voices.find(v => v.name === settings.voiceName);
                if (voice) utterance.voice = voice;
            }
            
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);
            
            window.speechSynthesis.speak(utterance);
            setIsSpeaking(true);
        }
    };

    // Media Refs
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            // Preserve scroll position to prevent jumping to top
            const scrollContainer = editorContainerRef.current;
            const currentScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';

            if (scrollContainer) {
                scrollContainer.scrollTop = currentScrollTop;
            }
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
            <div className="flex-1 h-full flex items-center justify-center text-gray-400 bg-[#1e1e1e]/90 backdrop-blur-sm transition-all duration-300">
                <p className="animate-pulse font-medium">{t('editor.select_note')}</p>
                <div className="absolute top-0 left-0 right-0 h-8 z-10" data-tauri-drag-region />
            </div>
        );
    }

    const handleTitleChange = (e) => {
        onUpdateNote({ ...note, title: e.target.value, updatedAt: Date.now() });
    };

    const handleContentChange = async (e) => {
        const newContent = e.target.value;
        const updatedNote = { ...note, content: newContent, updatedAt: Date.now() };
        
        // Optimistic update to prevent STT race conditions
        noteRef.current = updatedNote;
        onUpdateNote(updatedNote);
        
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

    const handleDownloadAttachment = async (att) => {
        try {
            // 1. Ask user where to save
            const filePath = await save({
                defaultPath: att.name,
                filters: [{
                    name: 'PDF Files',
                    extensions: ['pdf']
                }]
            });

            if (!filePath) return;

            if (att.data.startsWith('data:')) {
                // 2. Convert base64 to Uint8Array
                // att.data is "data:application/pdf;base64,..."
                const base64Data = att.data.split(',')[1];
                const binaryString = atob(base64Data);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                await writeFile(filePath, bytes);
            } else {
                // It's a file path
                const fileData = await readFile(att.data);
                await writeFile(filePath, fileData);
            }
            
        } catch (err) {
            console.error("Failed to download file:", err);
            alert("Erreur lors du téléchargement : " + (err.message || JSON.stringify(err)));
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
                        className="text-blue-400 underline cursor-pointer hover:text-blue-300"
                        title={t('editor.click_to_open')}
                    >
                        {part}
                    </span>
                );
            }
            return part;
        });
    };

    // Helper: Add attachment
    const addAttachment = (type, data, fileName, mimeType) => {
        const newAttachment = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            type, // 'image', 'audio', 'video', 'pdf'
            data, // path
            name: fileName || (type === 'audio' ? `Memo ${new Date().toLocaleTimeString()}` : (type === 'video' ? 'Video' : (type === 'pdf' ? 'Document PDF' : 'Image'))),
            width: (type === 'image' || type === 'video') ? 100 : undefined,
            mimeType
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

    const saveAttachmentToDisk = async (file) => {
        try {
            const appDataDirPath = await appDataDir();
            const attachmentsDir = await join(appDataDirPath, 'attachments');
            
            // Check if directory exists
            const dirExists = await exists(attachmentsDir);
            if (!dirExists) {
                await mkdir(attachmentsDir, { recursive: true });
            }

            const ext = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
            const filePath = await join(attachmentsDir, fileName);

            const buffer = await file.arrayBuffer();
            await writeFile(filePath, new Uint8Array(buffer));

            return filePath;
        } catch (error) {
            console.error("Failed to save attachment to disk:", error);
            throw error;
        }
    };

    const processFile = async (file) => {
        if (!file) return;
        
        try {
            // Save to disk to avoid localStorage quota and performance issues
            const filePath = await saveAttachmentToDisk(file);
            
            if (file.type.startsWith('image/')) {
                addAttachment('image', filePath, file.name, file.type);
            } else if (file.type.startsWith('video/')) {
                addAttachment('video', filePath, file.name, file.type);
            } else if (file.type.startsWith('audio/')) {
                addAttachment('audio', filePath, file.name, file.type);
            } else if (file.type === 'application/pdf') {
                addAttachment('pdf', filePath, file.name, file.type);
            }
        } catch (e) {
            console.error("Error processing file:", e);
            const errorMessage = e instanceof Error ? e.message : String(e);
            alert("Erreur lors de l'ajout du fichier : " + errorMessage);
        }
    };

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            files.forEach(file => processFile(file));
        }
    };

    // Drag & Drop Handlers
    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        // Check if we are dragging files
        if (e.dataTransfer.types && e.dataTransfer.types.length > 0) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounter.current = 0;
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            files.forEach(file => processFile(file));
        }
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
                        // Use noteRef.current to get the latest note state
                        const currentNote = noteRef.current;
                        const newAttachment = {
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                            type: 'audio',
                            data: reader.result,
                            name: `Memo ${new Date().toLocaleTimeString()}`,
                            width: undefined
                        };
                        const attachments = currentNote.attachments || [];
                        const updatedNote = { ...currentNote, attachments: [...attachments, newAttachment], updatedAt: Date.now() };
                        
                        noteRef.current = updatedNote;
                        onUpdateNote(updatedNote);
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
        setIsWaiting(true);
        try {
            // Prompt : Amélioration globale (Modification/Suppression/Ajout)
            const hasContent = note.content && note.content.trim().length > 0;
            
            const prompt = hasContent
                ? `Voici le contenu d'une note utilisateur :\n\n"${note.content}"\n\nTa mission est d'améliorer ce texte tout en conservant son sens et ses informations clés.
                
                Consignes strictes :
                1. Corrige l'orthographe, la grammaire et la syntaxe.
                2. Améliore la fluidité et le style.
                3. NE AJOUTE PAS de commentaires, d'introduction (ex: "Voici le texte amélioré") ou de conclusion.
                4. NE UTILISE PAS de balises Markdown pour le code (pas de \`\`\`).
                5. Renvoie UNIQUEMENT le texte final amélioré.`
                : "Écris une note détaillée, structurée et intéressante sur un sujet de culture générale ou technique, en incluant des liens vers des sources si pertinent.";

            const messages = [
                { role: "system", content: "Tu es un expert en écriture. Tu transformes des textes brouillons ou moyens en textes clairs, fluides et bien écrits. Tu ne parles jamais, tu ne fais que réécrire le texte." },
                { role: "user", content: prompt }
            ];

            const generated = await generateText({
                apiKey: settings.aiApiKey,
                model: settings.aiModel,
                messages: messages,
                context: note.title
            });

            let cleanGenerated = generated;
            // Remove markdown code blocks if present
            cleanGenerated = cleanGenerated.replace(/```(?:markdown|text)?\n?/g, '').replace(/```/g, '');
            // Remove common prefixes if the AI ignores instructions
            cleanGenerated = cleanGenerated.replace(/^(Voici|Here is|Sure|Certainly).+?:\s*/i, '');

            setIsWaiting(false);
            setPendingAiContent(cleanGenerated.trim());
            
        } catch (error) {
            alert("Erreur AI : " + error.message);
        } finally {
            setIsGenerating(false);
            setIsWaiting(false);
        }
    };

    // Trigger suggestion manually (or could be hooked to debounce)
    const triggerSuggestion = async () => {
        if (!settings?.aiApiKey || isSuggesting || !note.content) return;
        
        setIsSuggesting(true);
        try {
            // Context: Last 500 chars for better relevance
            const context = note.content.slice(-500);
            const prompt = `Tu es un moteur d'autocomplétion. Propose une suite logique, courte et naturelle (max 15 mots) au texte suivant. Si le texte se termine par un mot complet, commence impérativement ta réponse par une espace. Texte : "${context}"`;
            
            const messages = [{ role: "user", content: prompt }];

            const generated = await generateText({
                apiKey: settings.aiApiKey,
                model: settings.aiModel,
                messages: messages,
                context: note.title
            });
            
            if (generated && generated.trim()) {
                // Ensure we don't repeat the last word if it was partial (simple check)
                let cleanSuggestion = generated;
                const lastWord = context.split(' ').pop();
                
                if (lastWord && cleanSuggestion.startsWith(lastWord)) {
                    cleanSuggestion = cleanSuggestion.replace(lastWord, '');
                }
                
                // Safety: If context ends with a letter and suggestion starts with a letter, ensure space
                if (context.length > 0 && !/\s$/.test(context) && /^[a-zA-Z0-9À-ÿ]/.test(cleanSuggestion)) {
                     // Check if it looks like a suffix (short and lowercase)
                     // This is a heuristic. If it's > 3 chars or Capitalized, assume it's a new word.
                     if (cleanSuggestion.length > 3 || /^[A-Z]/.test(cleanSuggestion)) {
                         cleanSuggestion = ' ' + cleanSuggestion;
                     }
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
        <div 
            className={`flex-1 h-full flex flex-col bg-transparent relative transition-colors duration-300 ${isDragging ? 'bg-blue-500/10' : ''}`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Drag Overlay */}
            {isDragging && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-500/20 backdrop-blur-sm border-2 border-blue-500 border-dashed m-4 rounded-xl pointer-events-none">
                    <div className="text-blue-200 font-bold text-xl flex flex-col items-center gap-2">
                        <Paperclip className="w-12 h-12" />
                        <span>Déposer ici</span>
                    </div>
                </div>
            )}

            {/* Invisible Drag Region at top - Only when titlebar is 'none' */}
            {(!settings?.titlebarStyle || settings.titlebarStyle === 'none') && (
                <div className="absolute top-0 left-0 right-0 h-8 z-10" data-tauri-drag-region />
            )}

            <div className="pt-12 px-8 pb-4 animate-in fade-in slide-in-from-bottom-2 duration-500 group relative">
                <span className="text-xs font-medium text-gray-400 mx-auto block text-center mb-4 transition-colors">
                    {(() => {
                        try {
                            return new Date(note.updatedAt).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });
                        } catch (e) {
                            return "";
                        }
                    })()}
                </span>

                {/* AI & Accessibility Toolbar */}
                {(settings?.aiEnabled !== false || settings?.voiceEnabled !== false || settings?.dictationEnabled !== false) && (
                    <div className={`absolute right-8 top-12 flex gap-2 transition-all duration-300 ${isGenerating || isListening || isSpeaking ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        {/* TTS */}
                        {(settings?.voiceEnabled !== false) && (
                            <button
                                onClick={toggleSpeaking}
                                className={`p-2 rounded-full transition-all duration-300 ${isSpeaking ? 'bg-green-500/20 text-green-400 animate-pulse' : 'bg-blue-900/20 text-blue-400 hover:bg-blue-900/40'}`}
                                title={isSpeaking ? "Arrêter la lecture" : "Lire la note"}
                            >
                                {isSpeaking ? <StopCircle className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </button>
                        )}

                        {/* STT */}
                        {(settings?.dictationEnabled !== false) && (
                            <button
                                onClick={toggleListening}
                                className={`p-2 rounded-full transition-all duration-300 ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-blue-900/20 text-blue-400 hover:bg-blue-900/40'}`}
                                title={isListening ? "Arrêter la dictée" : "Dicter"}
                            >
                                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                            </button>
                        )}

                        {/* AI Generation */}
                        {(settings?.aiEnabled !== false) && (
                            <button
                                onClick={handleAiGenerate}
                                disabled={isGenerating}
                                className={`p-2 rounded-full bg-blue-900/20 text-blue-400 hover:bg-blue-900/40 transition-all duration-300`}
                                title="Assistant AI (Compléter/Améliorer)"
                            >
                                {isGenerating ? <Sparkles className="w-5 h-5 animate-pulse" /> : <Sparkles className="w-5 h-5" />}
                            </button>
                        )}
                    </div>
                )}

                <input
                    type="text"
                    value={note.title}
                    onChange={handleTitleChange}
                    placeholder={t('editor.title_placeholder')}
                    className="w-full text-3xl font-bold bg-transparent outline-none text-white placeholder-gray-500 transition-colors duration-200"
                />
            </div>

            {/* EDITOR AREA */}
            <div 
                key={note.id} 
                ref={editorContainerRef}
                className="flex-1 px-8 pb-4 overflow-y-auto animate-fade-in scroll-pt-4 relative"
            >
                <div className="relative w-full mb-8 min-h-[400px]">
                    <textarea
                        ref={textareaRef}
                        value={note.content}
                        onChange={handleContentChange}
                        onKeyDown={handleKeyDown}
                        placeholder={suggestion ? "" : t('editor.placeholder')}
                        className="w-full h-auto overflow-hidden resize-none bg-transparent outline-none text-lg leading-relaxed text-gray-100 placeholder-gray-600 font-sans transition-colors duration-200 selection:bg-blue-900 relative z-10"
                        style={{ minHeight: '400px' }}
                    />
                    {/* Suggestion Overlay */}
                    {suggestion && (
                        <div className="absolute top-0 left-0 pointer-events-none z-0 whitespace-pre-wrap text-lg leading-relaxed font-sans text-transparent w-full">
                            {note.content}
                            <span className="text-gray-500 opacity-60">{suggestion}</span>
                        </div>
                    )}

                    {/* Shimmer Loading Overlay */}
                    {isWaiting && (
                        <div className="absolute inset-0 z-20 bg-[#1e1e1e]/40 backdrop-blur-[1px] flex flex-col gap-4 pt-2 animate-in fade-in duration-300 pointer-events-none">
                            <div className="h-4 w-3/4 bg-white/5 rounded animate-shimmer"></div>
                            <div className="h-4 w-full bg-white/5 rounded animate-shimmer"></div>
                            <div className="h-4 w-5/6 bg-white/5 rounded animate-shimmer"></div>
                            <div className="h-4 w-4/5 bg-white/5 rounded animate-shimmer"></div>
                            <div className="h-4 w-2/3 bg-white/5 rounded animate-shimmer"></div>
                        </div>
                    )}

                    {/* AI Review Overlay */}
                    {pendingAiContent && (
                        <div className="absolute inset-0 z-30 bg-[#1e1e1e] flex flex-col animate-in fade-in slide-in-from-bottom-4 rounded-lg border border-blue-500/30 shadow-2xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 bg-blue-900/20 border-b border-blue-500/20 shrink-0">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-blue-400" />
                                    <span className="text-sm font-bold text-blue-100">{t('editor.ai_suggestion')}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPendingAiContent(null)}
                                        className="px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors flex items-center gap-1"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                        {t('editor.cancel')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            onUpdateNote({ ...note, content: pendingAiContent, updatedAt: Date.now() });
                                            setPendingAiContent(null);
                                        }}
                                        className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded shadow-lg transition-colors flex items-center gap-1"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        {t('editor.accept')}
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                                <div className="whitespace-pre-wrap text-lg leading-relaxed text-gray-100 font-sans">
                                    {pendingAiContent}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Attachments Section */}
                {(note.attachments && note.attachments.length > 0) && (
                    <div className="border-t border-white/5 pt-6 pb-20 mt-4">
                        <h3 className="text-xs font-bold uppercase text-gray-400 mb-6 tracking-wider pl-1">{t('editor.attachments')} ({note.attachments.length})</h3>
                        <div className="flex flex-wrap items-start gap-6">
                            {note.attachments.map((att, index) => (
                                <MediaAttachment
                                    key={att.id}
                                    att={att}
                                    index={index}
                                    note={note}
                                    moveAttachment={moveAttachment}
                                    removeAttachment={removeAttachment}
                                    resizeAttachment={resizeAttachment}
                                    renameAttachment={renameAttachment}
                                    handleDownloadAttachment={handleDownloadAttachment}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Toolbar */}
            <div className="h-12 border-t border-white/5 bg-[#1e1e1e]/80 backdrop-blur-md px-6 flex items-center gap-4 relative z-20">
                {/* STT Interim Preview */}
                {isListening && (
                    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 pointer-events-none w-full max-w-2xl px-4 flex justify-center">
                        <div className={`bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-3 text-sm text-gray-200 shadow-2xl transition-all duration-300 flex items-start gap-3 max-h-32 overflow-hidden ${interimTranscript ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0 mt-1.5" />
                            <span className="font-medium whitespace-pre-wrap break-words text-left line-clamp-4">
                                {interimTranscript || t('editor.listening')}
                            </span>
                        </div>
                    </div>
                )}

                <button
                    onClick={toggleRecording}
                    className={`p-2 rounded-full transition-all ${isRecording
                        ? 'bg-red-500/20 text-red-400 animate-pulse'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                    title={isRecording ? "Arrêter l'enregistrement" : "Enregistrer un mémo vocal"}
                >
                    {isRecording ? <StopCircle className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
                </button>

                <div className="relative">
                    <input
                        type="file"
                        multiple
                        accept="image/*,video/*,audio/*,application/pdf"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        title="Insérer un fichier (Image, Vidéo, Audio, PDF)"
                    />
                    <div className="p-2 rounded-full bg-white/5 text-gray-400 hover:bg-white/10 transition-colors pointer-events-none">
                        <ImageIcon className="w-5 h-5" />
                    </div>
                </div>

                <button
                    onClick={handlePaste}
                    className="p-2 rounded-full bg-white/5 text-gray-400 hover:bg-white/10 transition-colors"
                    title="Coller (Texte ou Image)"
                >
                    <ClipboardPaste className="w-5 h-5" />
                </button>

                <div className="flex-1" />

                <button
                    onClick={handleCopyNote}
                    className="p-2 rounded-full bg-blue-900/20 text-blue-400 hover:bg-blue-900/40 transition-colors"
                    title="Copier la note"
                >
                    <Copy className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
