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
    History,
    CheckCircle2,
    Lock,
    Plus,
    Tag
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import RichTextEditor from './RichTextEditor';
import { aiService } from '../services/ai';
import { soundManager } from '../services/soundManager';

const getCurrentTimestamp = () => new Date().getTime();

const MediaAttachment = ({ type, url, name, onRemove }) => {
    const isImage = type === 'image' || name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    
    return (
        <div className="group relative w-32 h-32 rounded-2xl overflow-hidden border border-warm-border-light dark:border-warm-border-dark bg-warm-card-light dark:bg-warm-card-dark transition-all hover:border-amber-500/50 hover:scale-105 shadow-md">
            {isImage ? (
                <img src={url} alt={name} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                    <FileText className="w-8 h-8 text-amber-600 dark:text-amber-400 mb-2" />
                    <span className="text-[10px] text-warm-text-secondary-light/75 dark:text-warm-text-secondary-dark/75 truncate w-full px-1 font-medium">{name}</span>
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
    onCreateNote
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
    
    const editorRef = useRef(null);
    const titleRef = useRef(null);

    useEffect(() => {
        setTitle(note.title);
        setAttachments(note.attachments || []);
        setTags(note.tags || ['Réflexion']);
    }, [note]);

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

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        
        const newFiles = files.map(file => {
            const url = URL.createObjectURL(file);
            return {
                id: crypto.randomUUID(),
                name: file.name,
                type: file.type.startsWith('image/') ? 'image' : 'file',
                url: url
            };
        });

        const updatedAttachments = [...attachments, ...newFiles];
        setAttachments(updatedAttachments);
        onUpdateNote({ ...note, attachments: updatedAttachments, updatedAt: getCurrentTimestamp() });
    };

    const handleAIEnhance = async () => {
        setIsAILoading(true);
        try {
            const result = await aiService.enhanceNote(note.content, settings.aiModel);
            if (result) {
                onUpdateNote({ ...note, content: result, updatedAt: getCurrentTimestamp() });
                soundManager.play('crystal-chime').catch(console.error);
            }
        } catch (_) {
            console.error("AI Error");
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
        if (tag && !tags.includes(tag)) {
            const updatedTags = [...tags, tag];
            setTags(updatedTags);
            onUpdateNote({ ...note, tags: updatedTags, updatedAt: getCurrentTimestamp() });
        }
        setNewTagInput('');
        setShowTagInput(false);
    };

    const handleRemoveTag = (tagToRemove) => {
        const updatedTags = tags.filter(t => t !== tagToRemove);
        setTags(updatedTags);
        onUpdateNote({ ...note, tags: updatedTags, updatedAt: getCurrentTimestamp() });
    };

    return (
        <div 
            className={`flex-1 flex flex-col h-full bg-warm-bg-light dark:bg-warm-bg-dark text-warm-text-primary-light dark:text-warm-text-primary-dark p-8 pb-28 overflow-hidden relative ${
                isDragging ? 'bg-amber-500/5 ring-4 ring-amber-500/10 ring-inset' : ''
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
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
                        {tags.map(tag => (
                            <span 
                                key={tag} 
                                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-warm-sidebar-light dark:bg-zinc-800 px-2 py-0.5 rounded-lg border border-warm-border-light dark:border-warm-border-dark"
                            >
                                {tag}
                                <button 
                                    onClick={() => handleRemoveTag(tag)}
                                    className="text-warm-text-muted-light hover:text-red-500 font-bold"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                        {showTagInput ? (
                            <form onSubmit={handleAddTag} className="inline-block">
                                <input
                                    type="text"
                                    value={newTagInput}
                                    onChange={(e) => setNewTagInput(e.target.value)}
                                    onBlur={() => setShowTagInput(false)}
                                    placeholder="Nouveau tag"
                                    className="px-2 py-0.5 text-[10px] bg-white dark:bg-zinc-900 border border-warm-border-light dark:border-warm-border-dark rounded-lg outline-none w-20"
                                    autoFocus
                                />
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
                            <span className="text-[9px] font-bold text-warm-text-muted-light bg-warm-card-light dark:bg-zinc-900 border border-warm-border-light dark:border-warm-border-dark px-1.5 py-0.2 rounded">⌘N</span>
                        </button>
                    )}

                    <button 
                        onClick={onOpenShare}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-warm-sidebar-light hover:bg-warm-sidebar-item-active dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-warm-border-light dark:border-warm-border-dark rounded-xl text-xs font-semibold transition-all text-warm-text-primary-light"
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
                        {attachments.map(att => (
                            <MediaAttachment 
                                key={att.id} 
                                {...att} 
                                onRemove={() => setAttachments(prev => prev.filter(a => a.id !== att.id))} 
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
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4 select-none">
                <div className="p-3 rounded-2xl border border-warm-border-light dark:border-warm-border-dark bg-white/70 dark:bg-[#1E1E1ECC] backdrop-blur-2xl shadow-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={onOpenDexter}
                            className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md hover:scale-105 active:scale-95 transition-all group"
                        >
                            <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />
                        </button>
                        <div className="flex flex-col text-left">
                            <span className="text-[10px] font-black text-warm-text-primary-light uppercase tracking-wider">Dexter IA</span>
                            <span className="text-[8px] text-warm-text-muted-light truncate w-32 font-semibold font-sans">"Corrige les fautes..."</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 bg-warm-sidebar-light/50 dark:bg-zinc-800/50 p-1 rounded-xl border border-warm-border-light dark:border-warm-border-dark">
                        <button className="p-2 rounded-lg text-warm-text-muted-light hover:text-warm-text-primary-light hover:bg-warm-sidebar-item-active transition-all" title="Dictée vocale">
                            <Mic size={15} />
                        </button>
                        <button className="p-2 rounded-lg text-warm-text-muted-light hover:text-warm-text-primary-light hover:bg-warm-sidebar-item-active transition-all" title="Synthèse vocale">
                            <Volume2 size={15} />
                        </button>
                        <button className="p-2 rounded-lg text-warm-text-muted-light hover:text-warm-text-primary-light hover:bg-warm-sidebar-item-active transition-all" title="Modifier le style">
                            <Type size={15} />
                        </button>
                        <button className="p-2 rounded-lg text-warm-text-muted-light hover:text-warm-text-primary-light hover:bg-warm-sidebar-item-active transition-all" title="Joindre un fichier">
                            <ImageIcon size={15} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleAIEnhance}
                            disabled={isAILoading}
                            className={`flex items-center gap-1.5 px-4 py-2 bg-warm-sidebar-light hover:bg-warm-sidebar-item-active dark:bg-zinc-800 border border-warm-border-light dark:border-warm-border-dark rounded-xl font-bold text-[10px] uppercase tracking-wider text-warm-text-primary-light transition-all disabled:opacity-50`}
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
