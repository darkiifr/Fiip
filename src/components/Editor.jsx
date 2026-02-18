import { useState, useRef, useEffect } from 'react';
import LanguageToolHighlightTextarea from './LanguageToolHighlightTextarea';
import CanvasDraw from './CanvasDraw';
import NoteBadges from './NoteBadges';
import { Sparkles, Mic, MicOff, Image as ImageIcon, StopCircle, Trash2, MoveLeft, MoveRight, Copy, ClipboardPaste, Volume2, Check, X, Paperclip, FileText, Download, Lock, PenTool } from 'lucide-react';
import { generateText } from '../services/ai';
import AudioPlayer from './AudioPlayer';
import { writeText, readImage, readText } from '@tauri-apps/plugin-clipboard-manager';
import { writeFile, mkdir, exists, readFile } from '@tauri-apps/plugin-fs';
import { save } from '@tauri-apps/plugin-dialog';
import { appDataDir, join } from '@tauri-apps/api/path';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import { keyAuthService } from '../services/keyauth';

const MediaAttachment = ({ att, index, note, moveAttachment, removeAttachment, resizeAttachment, renameAttachment, handleDownloadAttachment, onAnnotate }) => {
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
                if (att.data && (att.data.startsWith('data:') || att.data.startsWith('blob:'))) {
                    if (active) setSrc(att.data);
                } else {
                    // Try standard convertFileSrc first
                    const assetUrl = convertFileSrc(att.data);
                    if (active) setSrc(assetUrl);
                }
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
            const blob = new Blob([content], { 
                type: att.mimeType || (att.type === 'audio' ? 'audio/mpeg' : (att.type === 'video' ? 'video/mp4' : 'image/jpeg')) 
            });
            const blobUrl = URL.createObjectURL(blob);
            setSrc(blobUrl);
        } catch (e) {
            console.error("Fallback loading failed:", e);
            setIsError(true);
        }
    };

    return (
        <div
            className={`relative group rounded-xl transition-all duration-[250ms] ease-in-out animate-scale-in ${att.type === 'image' || att.type === 'video' ? '' : 'w-72'}`}
            style={{
                width: (att.type === 'image' || att.type === 'video') ? (att.width || 100) + '%' : undefined,
                maxWidth: (att.type === 'image' || att.type === 'video') ? '100%' : '320px',
                flexBasis: (att.type === 'image' || att.type === 'video') ? (att.width || 100) + '%' : 'auto'
            }}
        >
            {/* --- Hover Controls (Glassmorphism) --- */}
            <div className="absolute -top-3 right-2 flex items-center justify-end gap-1 z-30 opacity-0 group-hover:opacity-100 transition-all duration-[150ms] ease-out scale-95 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto">
                <div className="bg-black/60 backdrop-blur-md rounded-full p-1 flex items-center border border-white/10 shadow-xl">
                    {/* Move Left */}
                    {index > 0 && (
                        <button
                            onClick={() => moveAttachment(index, 'left')}
                            className="p-1.5 text-gray-300 hover:text-white hover:bg-white/20 rounded-full transition-colors duration-[150ms] ease-out"
                            title={t('editor.move_left')}
                        >
                            <MoveLeft className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {/* Move Right */}
                    {index < note.attachments.length - 1 && (
                        <button
                            onClick={() => moveAttachment(index, 'right')}
                            className="p-1.5 text-gray-300 hover:text-white hover:bg-white/20 rounded-full transition-colors duration-[150ms] ease-out"
                            title={t('editor.move_right')}
                        >
                            <MoveRight className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <div className="w-px h-3 bg-white/20 mx-1"></div>
                    {/* Delete */}
                    <button
                        onClick={() => removeAttachment(att.id)}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-full transition-colors duration-[150ms] ease-out"
                        title={t('editor.delete')}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Annotate Button for Images */}
            {att.type === 'image' && !isError && (
                <div className="absolute top-2 left-2 z-30 opacity-0 group-hover:opacity-100 transition-all duration-[150ms] ease-out scale-95 group-hover:scale-100">
                     <button
                        onClick={() => onAnnotate(att)}
                        className="p-2 bg-black/60 backdrop-blur-md text-white hover:bg-blue-600 rounded-full shadow-xl border border-white/10 transition-colors"
                        title="Annoter l'image"
                    >
                        <PenTool className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}


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
                            className="w-full object-cover transition-opacity duration-[250ms] ease-in-out"
                            style={{ maxHeight: '600px', opacity: isLoading ? 0 : 1 }}
                        />
                    ) : (
                        <video
                            src={src}
                            controls 
                            onError={handleLoadError}
                            className="w-full object-cover transition-opacity duration-[250ms] ease-in-out" 
                            style={{ maxHeight: '600px', opacity: isLoading ? 0 : 1 }} 
                        />
                    )}

                    {/* Beautiful Resize Slider */}
                    {!isError && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-[150ms] ease-out translate-y-2 group-hover:translate-y-0 z-20">
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
                <div className="flex items-center gap-4 bg-[#1e1e1e] p-4 rounded-xl border border-white/10 group/pdf hover:border-blue-500/30 transition-colors duration-[150ms] ease-out">
                    <div className="p-3 bg-red-500/10 rounded-xl text-red-400 group-hover/pdf:bg-red-500/20 transition-colors duration-[150ms] ease-out">
                        <FileText className="w-8 h-8" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-200 truncate mb-0.5">{att.name}</div>
                        <div className="text-xs text-gray-500">{t('editor.pdf_document')}</div>
                    </div>
                    <button 
                        onClick={() => handleDownloadAttachment(att)}
                        className="p-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors duration-[150ms] ease-out"
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
                    onError={handleLoadError}
                />
            )}
        </div>
    );
};

export default function Editor({ note, onUpdateNote, settings, onOpenLicense, checkStorageLimit }) {
    const { t, i18n } = useTranslation();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isWaiting, setIsWaiting] = useState(false);
    const [pendingAiContent, setPendingAiContent] = useState(null); // Store AI content for review
    const [isRecording, setIsRecording] = useState(false);
    const [suggestion, setSuggestion] = useState(null);
    const [isDragging, setIsDragging] = useState(false); // Drag & Drop state
    const [drawingSession, setDrawingSession] = useState(null); // { type: 'standard' | 'overlay' | 'image', data: string | null }
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
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    // Keep note ref updated, but respect local optimistic updates
    useEffect(() => { 
        if (!note) return;
        if (!noteRef.current || note.id !== noteRef.current.id || note.updatedAt >= noteRef.current.updatedAt) {
            noteRef.current = note; 
        }
    }, [note]);

    const onUpdateNoteRef = useRef(onUpdateNote);
    useEffect(() => {
        onUpdateNoteRef.current = onUpdateNote;
    }, [onUpdateNote]);

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
                    if (onUpdateNoteRef.current) {
                        onUpdateNoteRef.current(updatedNote);
                    }
                    
                    // Also clear interim since we committed final
                    setInterimTranscript('');
                } else {
                    setInterimTranscript(interim);
                }
            };

            recognitionRef.current.onerror = (event) => {
                console.error("Speech error:", event.error);
                if (event.error === 'not-allowed') {
                    setIsListening(false);
                    isListeningRef.current = false;
                    alert("Accès au microphone refusé.");
                }
            };

            recognitionRef.current.onend = () => {
                // Auto-restart if we intended to keep listening
                if (isListeningRef.current) {
                    const duration = Date.now() - lastSpeechStartRef.current;
                    if (duration < 1000) {
                        // Prevent rapid loops
                        setTimeout(() => {
                            if (isListeningRef.current && recognitionRef.current) {
                                try { recognitionRef.current.start(); } catch { /* ignore */ }
                            }
                        }, 1000);
                    } else {
                        try { recognitionRef.current.start(); } catch { /* ignore */ }
                    }
                } else {
                    setIsListening(false);
                }
            };
        }
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert("La reconnaissance vocale n'est pas supportée par ce navigateur/système.");
            return;
        }

        if (isListening) {
            isListeningRef.current = false;
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            isListeningRef.current = true;
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (e) {
                console.error("Failed to start recognition:", e);
                isListeningRef.current = false;
            }
        }
    };

    const toggleSpeaking = () => {
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        } else {
            if (!note.content) return;
            const utterance = new SpeechSynthesisUtterance(note.content);
            utterance.lang = 'fr-FR';
            utterance.onend = () => setIsSpeaking(false);
            window.speechSynthesis.speak(utterance);
            setIsSpeaking(true);
        }
    };

    // Auto-save title/content handlers
    const handleTitleChange = (e) => {
        const newTitle = e.target.value;
        const updatedNote = { ...note, title: newTitle, updatedAt: Date.now() };
        noteRef.current = updatedNote;
        onUpdateNote(updatedNote);
    };

    const handleContentChange = (e) => {
        const newContent = e.target.value;
        const updatedNote = { ...note, content: newContent, updatedAt: Date.now() };
        noteRef.current = updatedNote;
        onUpdateNote(updatedNote);
        
        // Clear suggestion if typing
        if (suggestion) setSuggestion(null);
    };

    const handleKeyDown = (e) => {
        // Tab to accept suggestion
        if (e.key === 'Tab' && suggestion) {
            e.preventDefault();
            const newContent = (note.content || '') + suggestion;
            onUpdateNote({ ...note, content: newContent, updatedAt: Date.now() });
            setSuggestion(null);
        }
        
        // Trigger AI on pause or specific key could go here
    };

    const handleDownloadAttachment = async (att) => {
        try {
            // Ask user where to save
            const filePath = await save({
                defaultPath: att.name,
                filters: [{
                    name: 'Fichier',
                    extensions: [att.name.split('.').pop() || '*']
                }]
            });

            if (!filePath) return; // Cancelled

            if (att.data.startsWith('data:')) {
                // It's a base64 string
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

    const handleSaveDrawing = async (blob) => {
        try {
            const fileName = `drawing-${Date.now()}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });
            
            const filePath = await saveAttachmentToDisk(file);
            
            // Create the new attachment object
            const newAttachment = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                type: 'image',
                data: filePath,
                name: fileName,
                width: 100,
                mimeType: 'image/png'
            };

            // Get current attachments
            const currentAttachments = note.attachments || [];
            const newAttachments = [...currentAttachments, newAttachment];
            
            // Append image to content so it is linked in the note
            const assetUrl = convertFileSrc(filePath);
            const imageMarkdown = `\n![Dessin](${assetUrl})\n`;
            
            // Update note with BOTH new attachment and new content in a single update
            onUpdateNote({
                ...note,
                attachments: newAttachments,
                content: (note.content || "") + imageMarkdown,
                updatedAt: Date.now()
            });

            setDrawingSession(null);
        } catch (err) {
            console.error("Failed to save drawing:", err);
            alert("Erreur lors de l'enregistrement du dessin.");
        }
    };

    const handleAnnotate = async (att) => {
        let src = att.data;
        if (!src.startsWith('data:') && !src.startsWith('blob:')) {
             src = convertFileSrc(src);
        }
        setDrawingSession({ type: 'image', data: src });
    };

    const processFile = async (file) => {
        if (!file) return;
        
        try {
            // Save to disk to avoid localStorage quota and performance issues
            // Check limits first
            if (checkStorageLimit) {
                const canAdd = await checkStorageLimit(file.size);
                if (!canAdd) {
                    alert(t('storage.limit_exceeded', "Espace de stockage insuffisant pour votre abonnement."));
                    return;
                }
            }

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
                    if (e.data.size > 0) {
                        chunksRef.current.push(e.data);
                    }
                };

                mediaRecorderRef.current.onstop = () => {
                    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        // Use noteRef.current to get the latest note state
                        const currentNote = noteRef.current;
                        
                        // Check storage limit for audio blob (approx size)
                        if (checkStorageLimit) {
                             // Blob size is available in blob.size
                             checkStorageLimit(blob.size).then(canAdd => {
                                 if (!canAdd) {
                                     alert(t('storage.limit_exceeded', "Espace de stockage insuffisant pour votre abonnement."));
                                     return;
                                 }
                                 
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
                             });
                             return;
                        }

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

                mediaRecorderRef.current.start(200);
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
        // License Check
        if (!keyAuthService.hasAIAccess()) {
             alert(t('license.features_locked', "Cette fonctionnalité nécessite une licence active avec l'option AI."));
             return;
        }

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

    // Sync favorite badge with note.favorite state
    useEffect(() => {
        if (!note) return;
        const hasFavBadge = (note.badges || []).some(b => b.id === 'favorite');
        
        // If note is favorite but misses badge, add it
        if (note.favorite && !hasFavBadge) {
             const newBadges = [...(note.badges || []), { id: 'favorite', label: 'Favori', icon: 'Star', color: 2 }];
             // Avoid triggering update if not needed (though here we must update to persist badge)
             onUpdateNote({ ...note, badges: newBadges, updatedAt: Date.now() });
        } 
        // If note is NOT favorite but has badge, remove it
        else if (!note.favorite && hasFavBadge) {
             const newBadges = (note.badges || []).filter(b => b.id !== 'favorite');
             onUpdateNote({ ...note, badges: newBadges, updatedAt: Date.now() });
        }
    }, [note, onUpdateNote]);

    const handleUpdateBadges = (newBadges) => {
        const isFavorite = newBadges.some(b => b.id === 'favorite');
        onUpdateNote({ ...note, badges: newBadges, favorite: isFavorite, updatedAt: Date.now() });
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

            {/* Sticky Toolbar */}
            <div className="sticky top-0 z-40 h-[44px] px-3 flex items-center gap-1 bg-[#1C1C1E]/90 backdrop-blur-xl border-b border-white/5 transition-all duration-[250ms] ease-in-out">
                {/* STT Interim Preview */}
                {isListening && (
                    <div className="absolute top-12 left-1/2 -translate-x-1/2 pointer-events-none w-full max-w-2xl px-4 flex justify-center z-50">
                        <div className={`bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-3 text-sm text-gray-200 shadow-2xl transition-all duration-[250ms] ease-in-out flex items-start gap-3 max-h-32 overflow-hidden ${interimTranscript ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0 mt-1.5" />
                            <span className="font-medium whitespace-pre-wrap break-words text-left line-clamp-4">
                                {interimTranscript || t('editor.listening')}
                            </span>
                        </div>
                    </div>
                )}
                
                {/* AI & Accessibility Tools */}
                {(settings?.aiEnabled !== false || settings?.voiceEnabled !== false || settings?.dictationEnabled !== false) && (
                    <div className="flex items-center gap-1 mr-2 border-r border-white/10 pr-2">
                        {/* TTS */}
                        {(settings?.voiceEnabled !== false) && (
                            <button
                                onClick={toggleSpeaking}
                                className={`p-1.5 rounded-md transition-all duration-[250ms] ease-in-out hover:duration-[150ms] w-8 h-8 flex items-center justify-center ${isSpeaking ? 'bg-green-500/20 text-green-400 animate-pulse' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                                title={isSpeaking ? "Arrêter la lecture" : "Lire la note"}
                            >
                                {isSpeaking ? <StopCircle className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </button>
                        )}

                        {/* STT */}
                        {(settings?.dictationEnabled !== false) && (
                            <button
                                onClick={toggleListening}
                                className={`p-1.5 rounded-md transition-all duration-[250ms] ease-in-out hover:duration-[150ms] w-8 h-8 flex items-center justify-center ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
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
                                className={`p-1.5 rounded-md transition-all duration-[250ms] ease-in-out hover:duration-[150ms] w-8 h-8 flex items-center justify-center text-blue-400 hover:bg-blue-900/40 hover:text-blue-300`}
                                title="Assistant AI (Compléter/Améliorer)"
                            >
                                {isGenerating ? <Sparkles className="w-5 h-5 animate-pulse" /> : <Sparkles className="w-5 h-5" />}
                            </button>
                        )}
                    </div>
                )}

                {/* Editor Tools */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => keyAuthService.hasProAccess() ? toggleRecording() : onOpenLicense()}
                        className={`p-1.5 rounded-md transition-all duration-[250ms] ease-in-out hover:duration-[150ms] w-8 h-8 flex items-center justify-center relative ${isRecording
                            ? 'bg-red-500/20 text-red-400 animate-pulse'
                            : keyAuthService.hasProAccess() ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-600 opacity-50 hover:bg-white/10'}`}
                        title={keyAuthService.hasProAccess() ? (isRecording ? "Arrêter l'enregistrement" : "Enregistrer un mémo vocal") : "Fonctionnalité Pro (Verrouillée)"}
                    >
                        {isRecording ? <StopCircle className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
                        {!keyAuthService.hasProAccess() && (
                            <Lock className="w-2.5 h-2.5 absolute -top-0.5 -right-0.5 text-orange-500 bg-[#1e1e1e] rounded-full" />
                        )}
                    </button>

                    <div className="relative w-8 h-8 flex items-center justify-center">
                        <input
                            type="file"
                            multiple
                            accept="image/*,video/*,audio/*,application/pdf"
                            onChange={handleFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            title="Insérer un fichier (Image, Vidéo, Audio, PDF)"
                        />
                        <div className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-[250ms] ease-in-out hover:duration-[150ms] w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="flex items-center gap-0.5 bg-white/5 rounded-md p-0.5">
                        <button
                            onClick={() => setDrawingSession({ type: 'standard' })}
                            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-[250ms] ease-in-out w-8 h-8 flex items-center justify-center"
                            title="Dessiner"
                        >
                            <PenTool className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setDrawingSession({ type: 'overlay' })}
                            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-[250ms] ease-in-out w-8 h-8 flex items-center justify-center"
                            title="Dessiner sur la note"
                        >
                            <PenTool className="w-5 h-5 opacity-50" />
                        </button>
                    </div>

                    <button
                        onClick={handlePaste}
                        className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-[250ms] ease-in-out hover:duration-[150ms] w-8 h-8 flex items-center justify-center"
                        title="Coller (Texte ou Image)"
                    >
                        <ClipboardPaste className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1" />

                <button
                    onClick={handleCopyNote}
                    className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-[250ms] ease-in-out hover:duration-[150ms] w-8 h-8 flex items-center justify-center"
                    title="Copier la note"
                >
                    <Copy className="w-5 h-5" />
                </button>
            </div>

            {/* Invisible Drag Region at top - Only when titlebar is 'none' */}
            {(!settings?.titlebarStyle || settings.titlebarStyle === 'none') && (
                <div className="absolute top-0 left-0 right-0 h-2 z-50 pointer-events-none" data-tauri-drag-region />
            )}

            {/* EDITOR AREA */}
            <div 
                key={note.id} 
                ref={editorContainerRef}
                className="flex-1 overflow-y-auto animate-fade-in scroll-pt-4 relative custom-scrollbar"
            >
                <div className="w-full max-w-5xl mx-0 px-6 py-5 lg:px-10 lg:py-8 pb-20"> {/* Responsive Padding: 20px 24px (tablet) -> 32px 40px (desktop) */}
                    {/* Metadata (Date) */}
                    <div className="text-[11px] text-gray-500 mb-6 font-medium tracking-wide">
                        {(() => {
                            try {
                                return new Date(note.updatedAt).toLocaleString(i18n.language, { dateStyle: 'long', timeStyle: 'short' });
                            } catch {
                                return "";
                            }
                        })()}
                    </div>

                    {/* Title Input */}
                    <input
                        type="text"
                        value={note.title}
                        onChange={handleTitleChange}
                        placeholder={t('editor.title_placeholder')}
                        className="w-full bg-transparent border-none outline-none text-[28px] font-bold text-white leading-9 mb-6 placeholder-gray-600 p-0"
                    />

                    <div className="relative w-full min-h-[500px]">
                        <LanguageToolHighlightTextarea
                            ref={textareaRef}
                            value={note.content}
                            onChange={handleContentChange}
                            onKeyDown={handleKeyDown}
                            placeholder={suggestion ? "" : t('editor.placeholder')}
                            className="w-full h-auto overflow-y-auto custom-scrollbar resize-none bg-transparent outline-none text-[16px] leading-7 text-gray-200 placeholder-gray-600 font-sans transition-colors duration-200 selection:bg-blue-900 relative z-10"
                            style={{ minHeight: '500px' }}
                            language="auto"
                            enabled={settings?.enableCorrection !== false}
                        />
                        {/* Suggestion Overlay */}
                        {suggestion && (
                            <div className="absolute top-0 left-0 pointer-events-none z-0 whitespace-pre-wrap text-[16px] leading-7 font-sans text-transparent w-full">
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
                            <div className="absolute inset-0 z-30 bg-[#1e1e1e] flex flex-col animate-in fade-in slide-in-from-bottom-4 rounded-lg border border-blue-500/30 shadow-2xl overflow-hidden min-h-[400px]">
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
                                    <div className="whitespace-pre-wrap text-[16px] leading-7 text-gray-100 font-sans">
                                        {pendingAiContent}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Attachments Section */}
                    {(note.attachments && note.attachments.length > 0) && (
                        <div className="border-t border-white/5 pt-6 pb-20 mt-12">
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
                                        onAnnotate={handleAnnotate}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Note Badges (Fixed Bottom Left) */}
            {!drawingSession && (
                <NoteBadges badges={note.badges || []} onUpdate={handleUpdateBadges} />
            )}

            {drawingSession && (
                <div className={`absolute left-0 right-0 bottom-0 animate-in fade-in duration-200 ${drawingSession.type === 'overlay' ? 'top-[44px] z-30 pointer-events-none' : 'top-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8'}`}>
                    {drawingSession.type === 'overlay' ? (
                        <div className="w-full h-full pointer-events-auto">
                            <CanvasDraw 
                                onSave={handleSaveDrawing} 
                                onClose={() => setDrawingSession(null)}
                                initialImage={null}
                                isOverlay={true}
                            />
                        </div>
                    ) : (
                        <ResizableModal
                            initialSize={{ width: 1200, height: 800 }}
                            onClose={() => setDrawingSession(null)}
                        >
                            <CanvasDraw 
                                onSave={handleSaveDrawing} 
                                onClose={() => setDrawingSession(null)}
                                initialImage={drawingSession.type === 'image' ? drawingSession.data : null}
                                isOverlay={false}
                            />
                        </ResizableModal>
                    )}
                </div>
            )}
        </div>
    );
}

// Helper component for resizable modal
const ResizableModal = ({ children, initialSize }) => {
    const ref = useRef(null);
    
    // Lazy initialization of state to avoid setState in useEffect
    const [size] = useState(() => {
        const saved = localStorage.getItem('drawing_modal_size');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to parse drawing modal size:', e);
            }
        }
        return initialSize;
    });

    useEffect(() => {
        if (!ref.current) return;
        const ro = new ResizeObserver(entries => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 100 && height > 100) {
                     localStorage.setItem('drawing_modal_size', JSON.stringify({ width, height }));
                }
            }
        });
        ro.observe(ref.current);
        return () => ro.disconnect();
    }, []);

    return (
        <div 
            ref={ref}
            style={{ 
                width: size.width, 
                height: size.height,
                maxWidth: '95vw', 
                maxHeight: '95vh',
                resize: 'both',
                overflow: 'hidden',
                minWidth: '320px',
                minHeight: '300px'
            }} 
            className="bg-[#1e1e1e] rounded-xl shadow-2xl relative flex flex-col"
        >
            {children}
            
            {/* Custom Resize Handle Indicator (Visual only, browser handles interaction) */}
            <div className="absolute bottom-0 right-0 p-1 pointer-events-none text-white/20">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v6" />
                    <path d="M15 21h6" />
                    <path d="M21 3v6" />
                    <path d="M3 21h6" />
                    <path d="M14.5 9.5 21 3" />
                    <path d="M3 21l6.5-6.5" />
                </svg>
            </div>
        </div>
    );
};