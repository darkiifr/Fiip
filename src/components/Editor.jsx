import { 
    ChevronLeft, 
    Share2, 
    Trash2, 
    Sparkles, 
    Type, 
    Mic, 
    Volume2, 
    Save,
    Image as ImageIcon,
    FileText,
    FileArchive,
    FileAudio,
    FileVideo,
    FileSpreadsheet,
    Presentation,
    Eye,
    EyeOff,
    History,
    CheckCircle2,
    Lock,
    Plus,
    Tag,
    X
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import RichTextEditor from './RichTextEditor';
import { aiService } from '../services/ai';
import { cacheAttachment, classifyAttachment, formatBytes, getAttachmentPreviewUrl } from '../services/attachmentCache';
import { soundManager } from '../services/soundManager';
import { getNoteStats, stripNoteText } from '../utils/notePresentation';

const getCurrentTimestamp = () => new Date().getTime();

const attachmentIcons = {
    image: ImageIcon,
    video: FileVideo,
    audio: FileAudio,
    spreadsheet: FileSpreadsheet,
    presentation: Presentation,
    archive: FileArchive,
    pdf: FileText,
    document: FileText,
    text: FileText,
    file: FileText,
};

const MediaAttachment = ({ type, url, name, size, mimeType, previewable, showPreview, onRemove }) => {
    const meta = classifyAttachment({ name, mimeType });
    const kind = type || meta.kind;
    const Icon = attachmentIcons[kind] || FileText;
    const canPreview = showPreview && previewable !== false && url;
    
    return (
        <div className="group relative w-36 h-32 rounded-2xl overflow-hidden border border-warm-border-light dark:border-warm-border-dark bg-warm-card-light dark:bg-warm-card-dark transition-all hover:border-amber-500/50 hover:-translate-y-0.5 shadow-md">
            {canPreview && kind === 'image' ? (
                <img src={url} alt={name} className="w-full h-full object-cover" />
            ) : canPreview && kind === 'video' ? (
                <video src={url} className="w-full h-full object-cover" muted />
            ) : canPreview && kind === 'audio' ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-3">
                    <Icon className="w-8 h-8 text-amber-600 dark:text-amber-400 mb-3" />
                    <audio src={url} controls className="w-full h-8" />
                </div>
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                    <Icon className="w-8 h-8 text-amber-600 dark:text-amber-400 mb-2" />
                    <span className="text-[10px] text-warm-text-secondary-light/75 dark:text-warm-text-secondary-dark/75 truncate w-full px-1 font-medium">{name}</span>
                    {size ? <span className="mt-1 text-[9px] text-warm-text-muted-light">{formatBytes(size)}</span> : null}
                </div>
            )}
            <button 
                onClick={onRemove}
                className="absolute top-1.5 right-1.5 p-1.5 bg-black/60 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-black/80"
            >
                <Trash2 size={12} />
            </button>
        </div>
    );
};

export default function Editor({ 
    note, 
    onUpdateNote, 
    settings, 
    onOpenShare, 
    onDeleteNote, 
    onBack,
    onOpenDexter,
    onOpenLicense,
    onCreateNote,
    tagSuggestions = []
}) {
    const { t } = useTranslation();
    const [title, setTitle] = useState(note.title);
    const [isSaving, setIsSaving] = useState(false);
    const [isAILoading, setIsAILoading] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [attachments, setAttachments] = useState(note.attachments || []);
    const [tags, setTags] = useState(note.tags || ['Réflexion']);
    const [newTagInput, setNewTagInput] = useState('');
    const [showTagInput, setShowTagInput] = useState(false);
    const [showAttachmentPreviews, setShowAttachmentPreviews] = useState(settings?.attachmentPreviews !== false);
    const [contextMenu, setContextMenu] = useState(null);
    
    const editorRef = useRef(null);
    const titleRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        setTitle(note.title);
        setAttachments(note.attachments || []);
        setTags(note.tags || ['Réflexion']);
    }, [note]);

    useEffect(() => {
        let cancelled = false;
        const hydrateAttachmentUrls = async () => {
            const hydrated = await Promise.all((note.attachments || []).map(async (attachment) => {
                if (attachment.url || !attachment.previewable) {
                    return attachment;
                }
                const url = await getAttachmentPreviewUrl(attachment);
                return url ? { ...attachment, url } : attachment;
            }));
            if (!cancelled) {
                setAttachments(hydrated);
            }
        };
        hydrateAttachmentUrls();
        return () => {
            cancelled = true;
        };
    }, [note.attachments]);

    useEffect(() => {
        if (!contextMenu) return undefined;
        const closeMenu = () => setContextMenu(null);
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') closeMenu();
        };
        window.addEventListener('click', closeMenu);
        window.addEventListener('scroll', closeMenu, true);
        window.addEventListener('keydown', closeOnEscape);
        return () => {
            window.removeEventListener('click', closeMenu);
            window.removeEventListener('scroll', closeMenu, true);
            window.removeEventListener('keydown', closeOnEscape);
        };
    }, [contextMenu]);

    const handleTitleChange = (e) => {
        const newTitle = e.target.value;
        setTitle(newTitle);
        onUpdateNote({ ...note, title: newTitle, updatedAt: getCurrentTimestamp() });
    };

    const handleContentChange = (e) => {
        onUpdateNote({ ...note, content: e.target.value, updatedAt: getCurrentTimestamp() });
        setIsSaving(true);
        setTimeout(() => setIsSaving(false), 1500);
    };

    const handleManualSave = () => {
        onUpdateNote({ ...note, title, tags, attachments, updatedAt: getCurrentTimestamp() });
        setIsSaving(false);
        soundManager.play('interaction').catch(console.error);
    };

    const addFiles = async (files) => {
        const newFiles = await Promise.all(Array.from(files).map(async (file) => {
            const cached = await cacheAttachment(file, note.id);
            const meta = classifyAttachment({ name: file.name, mimeType: file.type });
            return {
                ...cached,
                type: meta.kind,
                previewable: meta.previewable,
                url: URL.createObjectURL(file),
            };
        }));

        const updatedAttachments = [...attachments, ...newFiles];
        setAttachments(updatedAttachments);
        onUpdateNote({ ...note, attachments: updatedAttachments, updatedAt: getCurrentTimestamp() });
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragging(false);
        await addFiles(e.dataTransfer.files);
    };

    const handleAIEnhance = async () => {
        const readableText = stripNoteText(note.content || '');
        if (!readableText) return;
        setIsAILoading(true);
        try {
            const result = await aiService.enhanceNote({
                title: title || note.title,
                content: note.content,
                tags,
                goal: 'clarifier, corriger et améliorer la note sans inventer de faits',
            });
            if (result) {
                onUpdateNote({ ...note, content: result, updatedAt: getCurrentTimestamp() });
                soundManager.play('crystal-chime').catch(console.error);
            }
        } catch (error) {
            console.error("AI Error", error);
        } finally {
            setIsAILoading(false);
        }
    };

    const handleAIRegenSuggestions = async () => {
        setIsAILoading(true);
        try {
            const result = await aiService.getSmartSuggestions(note.content);
            setAiSuggestions(result || []);
        } catch (_) {
            console.error("AI Suggestion Error");
        } finally {
            setIsAILoading(false);
        }
    };

    const handleAddTag = (e) => {
        e.preventDefault();
        const tag = newTagInput.trim();
        if (tag && !tags.some((item) => item.toLowerCase() === tag.toLowerCase())) {
            const updatedTags = [...tags, tag].sort((a, b) => a.localeCompare(b, 'fr'));
            setTags(updatedTags);
            onUpdateNote({ ...note, tags: updatedTags, updatedAt: getCurrentTimestamp() });
        }
        setNewTagInput('');
        setShowTagInput(false);
    };

    const addTag = (tag) => {
        const normalized = String(tag || '').trim();
        if (!normalized || tags.some((item) => item.toLowerCase() === normalized.toLowerCase())) {
            return;
        }
        const updatedTags = [...tags, normalized].sort((a, b) => a.localeCompare(b, 'fr'));
        setTags(updatedTags);
        onUpdateNote({ ...note, tags: updatedTags, updatedAt: getCurrentTimestamp() });
        setNewTagInput('');
        setShowTagInput(false);
    };

    const handleRemoveTag = (tagToRemove) => {
        const updatedTags = tags.filter(t => t !== tagToRemove);
        setTags(updatedTags);
        onUpdateNote({ ...note, tags: updatedTags, updatedAt: getCurrentTimestamp() });
    };

    const handleContextMenu = (event) => {
        const editableTarget = event.target.closest?.('[contenteditable="true"], textarea, input');
        if (editableTarget) return;

        event.preventDefault();
        setContextMenu({
            x: Math.min(event.clientX, window.innerWidth - 220),
            y: Math.min(event.clientY, window.innerHeight - 250),
        });
    };

    const noteStats = getNoteStats(note);
    const hasContent = noteStats.hasReadableText;
    const availableTagSuggestions = tagSuggestions
        .filter((tag) => !tags.some((item) => item.toLowerCase() === String(tag).toLowerCase()))
        .filter((tag) => !newTagInput.trim() || String(tag).toLowerCase().includes(newTagInput.trim().toLowerCase()))
        .slice(0, 8);

    return (
        <div 
            className={`flex-1 flex flex-col h-full bg-warm-bg-light dark:bg-warm-bg-dark text-warm-text-primary-light dark:text-warm-text-primary-dark p-8 pb-28 overflow-hidden relative ${
                isDragging ? 'bg-amber-500/5 ring-4 ring-amber-500/10 ring-inset' : ''
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onContextMenu={handleContextMenu}
        >
            {/* Header Actions */}
            <header className="flex items-center justify-between mb-6 z-20 select-none border-b border-warm-border-light dark:border-warm-border-dark pb-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-warm-sidebar-light hover:bg-warm-sidebar-item-active dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-warm-border-light dark:border-warm-border-dark rounded-xl text-xs font-semibold transition-all"
                    >
                        <ChevronLeft size={14} />
                        <span>Retour</span>
                    </button>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                             <input
                                ref={titleRef}
                                type="text"
                                value={title}
                                onChange={handleTitleChange}
                                className="bg-transparent border-none text-xl font-extrabold text-warm-text-primary-light dark:text-warm-text-primary-dark placeholder:text-warm-text-muted-light/30 focus:outline-none focus:ring-0 p-0 m-0 w-64 md:w-80"
                                placeholder={t('editor.placeholder_title', 'Sans Titre')}
                            />
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-warm-text-muted-light">
                            <span className="flex items-center gap-1">
                                <History size={11} />
                                {new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isSaving ? (
                                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    Synchronisation...
                                </span>
                            ) : (
                                <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                                    <CheckCircle2 size={11} />
                                    Enregistré
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Tags Container */}
                    <div className="hidden sm:flex items-center gap-1.5 mr-2">
                        {[...tags].sort((a, b) => a.localeCompare(b, 'fr')).map(tag => (
                            <span 
                                key={tag} 
                                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-lg border border-amber-500/20"
                            >
                                {tag}
                                <button 
                                    onClick={() => handleRemoveTag(tag)}
                                    className="text-amber-700/50 dark:text-amber-300/60 hover:text-red-500"
                                    aria-label={`Supprimer le tag ${tag}`}
                                >
                                    <X size={10} />
                                </button>
                            </span>
                        ))}
                        {showTagInput ? (
                            <form onSubmit={handleAddTag} className="relative inline-block">
                                <input
                                    type="text"
                                    value={newTagInput}
                                    onChange={(e) => setNewTagInput(e.target.value)}
                                    onBlur={() => setShowTagInput(false)}
                                    placeholder="Nouveau tag"
                                    className="px-2 py-1 text-[10px] bg-white dark:bg-zinc-900 border border-warm-border-light dark:border-warm-border-dark rounded-lg outline-none w-28 text-warm-text-primary-light dark:text-warm-text-primary-dark"
                                    autoFocus
                                />
                                {availableTagSuggestions.length > 0 && (
                                    <div className="absolute right-0 top-7 z-50 w-40 rounded-xl border border-warm-border-light bg-white/95 p-1 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/95">
                                        {availableTagSuggestions.map((tag) => (
                                            <button
                                                key={tag}
                                                type="button"
                                                onMouseDown={(event) => event.preventDefault()}
                                                onClick={() => addTag(tag)}
                                                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[10px] font-semibold text-warm-text-primary-light hover:bg-amber-500/10 dark:text-warm-text-primary-dark"
                                            >
                                                <Tag size={10} className="text-amber-500" />
                                                <span className="truncate">{tag}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </form>
                        ) : (
                            <button 
                                onClick={() => setShowTagInput(true)}
                                className="p-1 rounded-lg border border-warm-border-light dark:border-warm-border-dark hover:bg-warm-sidebar-light"
                            >
                                <Tag size={10} className="text-warm-text-muted-light" />
                            </button>
                        )}
                    </div>

                    {onCreateNote && (
                        <button 
                            onClick={onCreateNote}
                            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-warm-sidebar-light hover:bg-warm-sidebar-item-active dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-warm-border-light dark:border-warm-border-dark rounded-xl text-xs font-semibold transition-all mr-2"
                        >
                            <Plus size={14} />
                            <span>Nouvelle note</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleManualSave}
                        className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 hover:bg-warm-sidebar-item-active dark:hover:bg-zinc-800 border border-warm-border-light dark:border-warm-border-dark rounded-xl text-xs font-semibold transition-all text-warm-text-primary-light dark:text-warm-text-primary-dark"
                    >
                        <Save size={13} />
                        <span>Enregistrer</span>
                    </button>

                    <button 
                        onClick={onOpenShare}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 border border-transparent rounded-xl text-xs font-semibold transition-all shadow-sm"
                    >
                        <Share2 size={13} />
                        <span>Partager</span>
                    </button>

                    <button 
                        onClick={() => onDeleteNote(note.id)}
                        className="p-1.5 rounded-xl border border-warm-border-light dark:border-warm-border-dark hover:bg-red-500/10 hover:border-red-500/30 transition-all text-warm-text-muted-light hover:text-red-500"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            </header>

            {/* Editor Area */}
            <div className="flex-1 overflow-y-auto pr-4 scrollbar-hide relative">
                {/* Attachments Rail */}
                {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-4 mb-6 z-10 relative">
                        <div className="w-full flex items-center justify-between mb-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-warm-text-muted-light">Pièces jointes</span>
                            <button
                                type="button"
                                onClick={() => setShowAttachmentPreviews((value) => !value)}
                                className="flex items-center gap-1.5 rounded-lg border border-warm-border-light dark:border-warm-border-dark px-2 py-1 text-[10px] font-bold text-warm-text-secondary-light dark:text-warm-text-secondary-dark hover:bg-warm-sidebar-item-active"
                            >
                                {showAttachmentPreviews ? <EyeOff size={12} /> : <Eye size={12} />}
                                {showAttachmentPreviews ? 'Masquer les aperçus' : 'Afficher les aperçus'}
                            </button>
                        </div>
                        {attachments.map(att => (
                            <MediaAttachment 
                                key={att.id} 
                                {...att} 
                                showPreview={showAttachmentPreviews}
                                onRemove={() => {
                                    const updatedAttachments = attachments.filter(a => a.id !== att.id);
                                    setAttachments(updatedAttachments);
                                    onUpdateNote({ ...note, attachments: updatedAttachments, updatedAt: getCurrentTimestamp() });
                                }} 
                            />
                        ))}
                    </div>
                )}

                <RichTextEditor 
                    ref={editorRef}
                    value={note.content} 
                    onChange={handleContentChange}
                    noteId={note.id}
                />
            </div>

            {/* Bottom Floating Bar (Dexter Quick Access) */}
            <div className="absolute bottom-5 right-5 z-40 w-[min(44rem,calc(100%-2.5rem))] select-none">
                <div className="p-2.5 rounded-2xl border border-black/10 dark:border-white/10 bg-[#fbfaf6]/82 dark:bg-[#171715]/88 backdrop-blur-3xl shadow-[0_20px_70px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_70px_rgba(0,0,0,0.42)] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={onOpenDexter}
                            className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-[0_10px_24px_rgba(245,158,11,0.35)] hover:-translate-y-0.5 active:translate-y-0 transition-all group"
                            aria-label="Ouvrir Dexter"
                        >
                            <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />
                        </button>
                        <div className="flex flex-col text-left">
                            <span className="text-[11px] font-black text-warm-text-primary-light dark:text-warm-text-primary-dark uppercase tracking-wider">Dexter IA</span>
                            <span className="text-[10px] text-warm-text-muted-light dark:text-warm-text-muted-dark truncate w-40 font-semibold font-sans">Corriger, résumer, réécrire</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 bg-warm-sidebar-light/50 dark:bg-zinc-800/50 p-1 rounded-xl border border-warm-border-light dark:border-warm-border-dark">
                        <button
                            type="button"
                            onClick={() => { soundManager.play('interaction').catch(console.error); onOpenDexter?.(); }}
                            className="p-2 rounded-lg text-warm-text-muted-light hover:text-warm-text-primary-light hover:bg-warm-sidebar-item-active transition-all"
                            title="Demander une dictée à Dexter"
                        >
                            <Mic size={15} />
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                soundManager.play('interaction').catch(console.error);
                                const text = stripNoteText(note.content || '');
                                if (!text || !window.speechSynthesis) return;
                                window.speechSynthesis.cancel();
                                window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
                            }}
                            disabled={!hasContent}
                            className="p-2 rounded-lg text-warm-text-muted-light hover:text-warm-text-primary-light hover:bg-warm-sidebar-item-active transition-all disabled:opacity-40"
                            title="Lire la note"
                        >
                            <Volume2 size={15} />
                        </button>
                        <button
                            type="button"
                            onClick={() => { soundManager.play('interaction').catch(console.error); editorRef.current?.getEditor()?.chain().focus().toggleHeading({ level: 2 }).run(); }}
                            className="p-2 rounded-lg text-warm-text-muted-light hover:text-warm-text-primary-light hover:bg-warm-sidebar-item-active transition-all"
                            title="Transformer en titre"
                        >
                            <Type size={15} />
                        </button>
                        <button
                            type="button"
                            onClick={() => { soundManager.play('interaction').catch(console.error); fileInputRef.current?.click(); }}
                            className="p-2 rounded-lg text-warm-text-muted-light hover:text-warm-text-primary-light hover:bg-warm-sidebar-item-active transition-all"
                            title="Joindre un fichier"
                        >
                            <ImageIcon size={15} />
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={async (event) => {
                                if (event.target.files?.length) {
                                    await addFiles(event.target.files);
                                    event.target.value = '';
                                }
                            }}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleAIEnhance}
                            disabled={isAILoading || !hasContent}
                            className={`flex items-center gap-1.5 px-4 py-2 bg-white/70 hover:bg-white dark:bg-white/[0.08] dark:hover:bg-white/[0.12] border border-black/10 dark:border-white/10 rounded-xl font-bold text-[10px] uppercase tracking-wider text-warm-text-primary-light dark:text-warm-text-primary-dark transition-all disabled:opacity-50`}
                        >
                            {isAILoading ? (
                                <div className="w-3.5 h-3.5 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                            ) : (
                                <Sparkles size={12} className="text-amber-500" />
                            )}
                            Améliorer
                        </button>
                        
                        <div className="h-6 w-px bg-warm-border-light dark:bg-warm-border-dark mx-1" />

                        <button 
                            onClick={onOpenLicense}
                            className="p-2 rounded-lg text-warm-text-muted-light hover:text-amber-500 hover:bg-amber-500/5 transition-all"
                            title="Licence Premium"
                        >
                            <Lock size={15} />
                        </button>
                    </div>
                </div>

                {/* Ghost AI Suggestions Bar */}
                {note.content?.length > 100 && aiSuggestions.length > 0 && (
                    <div className="absolute top-[-44px] left-0 w-full flex justify-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <button 
                            onClick={handleAIRegenSuggestions}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-md text-[9px] font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-all uppercase tracking-wider"
                        >
                            Refaire le plan
                        </button>
                        <button className="px-3.5 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 backdrop-blur-md text-[9px] font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-all uppercase tracking-wider">
                            Trouver des sources
                        </button>
                    </div>
                )}
            </div>

            {contextMenu && (
                <div
                    className="fixed z-[90] w-56 overflow-hidden rounded-2xl border border-warm-border-light/80 bg-white/92 p-1.5 text-sm text-warm-text-primary-light shadow-[0_22px_70px_rgba(20,17,12,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/88 dark:text-warm-text-primary-dark"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    role="menu"
                    tabIndex={-1}
                    onClick={(event) => event.stopPropagation()}
                >
                    <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold hover:bg-amber-500/10"
                        onClick={() => {
                            setContextMenu(null);
                            editorRef.current?.getEditor()?.commands.focus();
                        }}
                        role="menuitem"
                    >
                        <Type size={14} />
                        Focus éditeur
                    </button>
                    <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold hover:bg-amber-500/10"
                        onClick={() => {
                            setContextMenu(null);
                            onOpenShare?.();
                        }}
                        role="menuitem"
                    >
                        <Share2 size={14} />
                        Partager la note
                    </button>
                    <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold hover:bg-amber-500/10"
                        onClick={() => {
                            setContextMenu(null);
                            fileInputRef.current?.click();
                        }}
                        role="menuitem"
                    >
                        <ImageIcon size={14} />
                        Joindre un fichier
                    </button>
                    <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold hover:bg-amber-500/10"
                        onClick={() => {
                            setContextMenu(null);
                            setShowAttachmentPreviews((value) => !value);
                        }}
                        role="menuitem"
                    >
                        {showAttachmentPreviews ? <EyeOff size={14} /> : <Eye size={14} />}
                        {showAttachmentPreviews ? 'Masquer les aperçus' : 'Afficher les aperçus'}
                    </button>
                    <div className="my-1 h-px bg-warm-border-light dark:bg-white/10" />
                    <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-500/10 dark:text-red-300"
                        onClick={() => {
                            setContextMenu(null);
                            onDeleteNote?.(note.id);
                        }}
                        role="menuitem"
                    >
                        <Trash2 size={14} />
                        Supprimer la note
                    </button>
                </div>
            )}
            
            {/* Minimalist Save shortcut notification */}
            <div className="absolute top-20 right-6 flex flex-col gap-2 pointer-events-none select-none opacity-0 hover:opacity-100 transition-opacity">
                <div className="p-2 rounded-xl bg-black/40 backdrop-blur-xl border border-white/5 flex items-center gap-1.5">
                    <Save size={12} className="text-white/40" />
                    <span className="text-[9px] font-mono text-white/20">CTRL + S</span>
                </div>
            </div>
        </div>
    );
}
