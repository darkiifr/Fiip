import { message } from '@tauri-apps/plugin-dialog';
import { 
    ChevronLeft, 
    Share2, 
    Trash2, 
    Type, 
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
    Plus,
    X,
    LockKeyhole,
    UnlockKeyhole,
    CheckSquare,
    FileDown,
    ScanLine,
    PenLine,
    CalendarDays,
    Clock,
    AlertCircle,
    ChevronRight,
    ChevronDown
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import AttachmentViewer from './AttachmentViewer';
import CanvasDraw from './CanvasDraw';
import DocumentScanner from './DocumentScanner';
import EditorActionBar from './EditorActionBar';
import RichTextEditor from './RichTextEditor';
import { exportNoteAsFiin } from '../services/fileManager';
import { createTask } from '../services/fiipV1';
import { cacheAttachment, classifyAttachment, formatBytes, getAttachmentPreviewUrl } from '../services/attachmentCache';
import { extractImageOcr } from '../services/ocr';
import { getAttachmentLimitAlert, getStorageLimitAlert } from '../services/planLimits';
import { dataService } from '../services/supabase';
import { soundManager } from '../services/soundManager';
import { decryptData, encryptData } from '../utils/crypto';
import { getTagColorClasses, normalizeNoteTags, serializeNoteTags } from '../utils/noteTags';
import { getNoteStats } from '../utils/notePresentation';

const getCurrentTimestamp = () => new Date().getTime();

const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

function buildDateTimeLocal(dateValue = '', timeValue = '') {
    if (!dateValue) return '';
    const time = /^\d{2}:\d{2}$/.test(timeValue) ? timeValue : '09:00';
    return `${dateValue}T${time}`;
}

function formatDateInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDateInput(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
}

function TaskDatePicker({ value, onChange }) {
    const selectedDate = parseDateInput(value);
    const [open, setOpen] = useState(false);
    const [visibleMonth, setVisibleMonth] = useState(() => selectedDate || new Date());
    const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const gridStart = new Date(monthStart);
    gridStart.setDate(gridStart.getDate() - ((gridStart.getDay() + 6) % 7));
    const days = Array.from({ length: 42 }, (_, index) => {
        const date = new Date(gridStart);
        date.setDate(gridStart.getDate() + index);
        return date;
    });

    const shiftMonth = (amount) => {
        setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
    };

    const pickDate = (date) => {
        onChange(formatDateInput(date));
        setOpen(false);
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-warm-border-light bg-white px-3 text-xs font-semibold dark:border-white/10 dark:bg-[#111316]"
            >
                <CalendarDays size={13} className="text-warm-text-muted-light" />
                <span className={value ? '' : 'text-warm-text-muted-light'}>{value || 'Date'}</span>
                <ChevronDown size={12} className="text-warm-text-muted-light" />
            </button>
            {open && (
                <div className="absolute left-0 top-11 z-[80] w-72 rounded-3xl border border-black/10 bg-[#fbfaf6]/96 p-3 shadow-[0_22px_70px_rgba(0,0,0,0.24)] backdrop-blur-3xl dark:border-white/10 dark:bg-[#111316]/96">
                    <div className="mb-3 flex items-center justify-between">
                        <button type="button" onClick={() => shiftMonth(-1)} className="rounded-xl p-2 hover:bg-black/[0.04] dark:hover:bg-white/10" aria-label="Mois précédent">
                            <ChevronLeft size={16} />
                        </button>
                        <p className="text-sm font-semibold">
                            {visibleMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                        </p>
                        <button type="button" onClick={() => shiftMonth(1)} className="rounded-xl p-2 hover:bg-black/[0.04] dark:hover:bg-white/10" aria-label="Mois suivant">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-warm-text-muted-light">
                        {['lu', 'ma', 'me', 'je', 've', 'sa', 'di'].map((day) => <span key={day}>{day}</span>)}
                    </div>
                    <div className="mt-1 grid grid-cols-7 gap-1">
                        {days.map((date) => {
                            const key = formatDateInput(date);
                            const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
                            const isSelected = value === key;
                            const isToday = key === formatDateInput(new Date());
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => pickDate(date)}
                                    className={`flex h-8 items-center justify-center rounded-xl text-xs font-semibold transition-all ${
                                        isSelected
                                            ? 'bg-emerald-600 text-white'
                                            : isToday
                                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                                : isCurrentMonth
                                                    ? 'hover:bg-black/[0.04] dark:hover:bg-white/10'
                                                    : 'text-warm-text-muted-light/45 hover:bg-black/[0.03] dark:hover:bg-white/5'
                                    }`}
                                >
                                    {date.getDate()}
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-3 flex justify-between border-t border-black/10 pt-3 dark:border-white/10">
                        <button type="button" onClick={() => onChange('')} className="rounded-xl px-3 py-2 text-xs font-semibold text-warm-text-muted-light hover:bg-black/[0.04] dark:hover:bg-white/10">
                            Effacer
                        </button>
                        <button type="button" onClick={() => pickDate(new Date())} className="rounded-xl px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300">
                            Aujourd'hui
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

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

const MediaAttachment = ({ type, url, name, size, mimeType, previewable, showPreview, ocrStatus, ocrLabel, ocrConfidence, onRemove, onOpen }) => {
    const meta = classifyAttachment({ name, mimeType });
    const kind = type || meta.kind;
    const Icon = attachmentIcons[kind] || FileText;
    const canPreview = showPreview && previewable !== false && url;
    
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpen();
                }
            }}
            className="group relative h-32 w-36 overflow-hidden rounded-2xl border border-warm-border-light bg-warm-card-light text-left shadow-md transition-all hover:-translate-y-0.5 hover:border-amber-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/35 dark:border-warm-border-dark dark:bg-warm-card-dark"
        >
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
            {ocrStatus && !['skipped', 'skipped-protected'].includes(ocrStatus) ? (
                <div className="absolute bottom-1.5 left-1.5 right-1.5 rounded-lg border border-black/10 bg-white/88 px-2 py-1 text-[8px] font-semibold text-zinc-700 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/78 dark:text-zinc-200">
                    <span className="block truncate">{ocrLabel || 'OCR terminé'}</span>
                    {ocrConfidence ? <span className="text-[7px] text-warm-text-muted-light">{Math.round(ocrConfidence)}% fiable</span> : null}
                </div>
            ) : null}
            <button 
                onClick={(event) => {
                    event.stopPropagation();
                    onRemove();
                }}
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
    tagSuggestions = [],
    notebooks = [],
    tasks = [],
    onSaveTask,
    storageUsage,
    planLevel = 0
}) {
    const { t } = useTranslation();
    const [title, setTitle] = useState(note.title);
    const [isSaving, setIsSaving] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [attachments, setAttachments] = useState(note.attachments || []);
    const [tags, setTags] = useState(() => normalizeNoteTags(note.tags || ['Réflexion']));
    const [showAttachmentPreviews, setShowAttachmentPreviews] = useState(settings?.attachmentPreviews !== false);
    const [contextMenu, setContextMenu] = useState(null);
    const [selectedAttachment, setSelectedAttachment] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDueDate, setTaskDueDate] = useState('');
    const [taskDueTime, setTaskDueTime] = useState('');
    const [passwordDialog, setPasswordDialog] = useState(null);
    const [passwordValue, setPasswordValue] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isDictating, setIsDictating] = useState(false);
    const recognitionRef = useRef(null);
    
    const editorRef = useRef(null);
    const titleRef = useRef(null);
    const fileInputRef = useRef(null);

    const showLimitAlert = async (limitAlert) => {
        if (!limitAlert) return;
        if (window.__TAURI_INTERNALS__) {
            await message(limitAlert.message, { title: limitAlert.title, kind: 'warning' });
            return;
        }
        window.alert(`${limitAlert.title}\n\n${limitAlert.message}`);
    };

    useEffect(() => {
        setTitle(note.title);
        setAttachments(note.attachments || []);
        setTags(normalizeNoteTags(note.tags || ['Réflexion']));
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
        onUpdateNote({ ...note, title, tags: serializeNoteTags(tags), attachments, updatedAt: getCurrentTimestamp() });
        setIsSaving(false);
        soundManager.play('interaction').catch(console.error);
    };

    const handleExportPdf = () => {
        const printWindow = window.open('', '_blank', 'popup,width=900,height=1100');
        if (!printWindow) return;
        const sanitizedContent = DOMPurify.sanitize(note.content || '', {
            USE_PROFILES: { html: true },
            FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
            FORBID_ATTR: ['onerror', 'onload', 'onclick'],
        });
        printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(title || 'Fiip note')}</title><style>body{font-family:Inter,Arial,sans-serif;max-width:760px;margin:40px auto;line-height:1.6;color:#171717}h1{font-size:32px}.meta{color:#777;font-size:12px;margin-bottom:24px}img,video{max-width:100%;height:auto}pre{white-space:pre-wrap}</style></head><body><h1>${escapeHtml(title || 'Sans titre')}</h1><p class="meta">Export Fiip - ${new Date().toLocaleString()}</p>${sanitizedContent}<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),120));</script></body></html>`);
        printWindow.document.close();
        printWindow.focus();
    };

    const handleExportFiin = async () => {
        const result = await exportNoteAsFiin({
            ...note,
            title,
            tags: serializeNoteTags(tags),
            attachments,
            updatedAt: getCurrentTimestamp(),
        });

        if (result.cancelled) return;

        if (result.success) {
            await message('Note exportée en .fiin.', { title: 'Fiip', kind: 'info' }).catch(console.error);
            return;
        }

        await message(result.error || 'Impossible d’exporter cette note en .fiin.', {
            title: 'Fiip',
            kind: 'error',
        }).catch(console.error);
    };

    const submitPasswordDialog = async (event) => {
        event?.preventDefault();
        if (!passwordDialog || !passwordValue) return;
        setPasswordError('');
        const password = passwordValue;
        if (passwordDialog.mode === 'unlock') {
            try {
                const decrypted = await decryptData(note.encryptedContent || note.encrypted_content, password);
                onUpdateNote({
                    ...note,
                    title: decrypted.title || note.title,
                    content: decrypted.content || '',
                    attachments: decrypted.attachments || [],
                    encryptedContent: null,
                    encrypted_content: null,
                    isProtected: false,
                    is_locked: false,
                    security: { protected: false, locked: false },
                    updatedAt: getCurrentTimestamp(),
                });
                setPasswordDialog(null);
                setPasswordValue('');
            } catch (error) {
                setPasswordError(error.message || 'Impossible de deverrouiller la note.');
            }
            return;
        }

        const encrypted = await encryptData({ title, content: note.content, attachments }, password);
        onUpdateNote({
            ...note,
            content: '',
            attachments: [],
            encryptedContent: encrypted,
            encrypted_content: encrypted,
            isProtected: true,
            is_locked: true,
            public_slug: null,
            shared: false,
            security: { protected: true, locked: true, algorithm: 'AES-GCM-256' },
            updatedAt: getCurrentTimestamp(),
        });
        setPasswordDialog(null);
        setPasswordValue('');
    };

    const handleProtectNote = () => {
        if (note.isProtected || note.is_locked) {
            setPasswordDialog({ mode: 'unlock' });
            setPasswordValue('');
            setPasswordError('');
            return;
        }

        setPasswordDialog({ mode: 'lock' });
        setPasswordValue('');
        setPasswordError('');
    };

    const handleAddTask = async (event) => {
        event.preventDefault();
        if (!taskTitle.trim()) return;
        await onSaveTask?.(createTask({
            noteId: note.id,
            title: taskTitle,
            dueAt: buildDateTimeLocal(taskDueDate, taskDueTime) ? new Date(buildDateTimeLocal(taskDueDate, taskDueTime)).toISOString() : null,
        }));
        setTaskTitle('');
        setTaskDueDate('');
        setTaskDueTime('');
    };

    const handleStartDictation = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setPasswordDialog({ mode: 'notice', title: 'Dictée indisponible', message: "La reconnaissance vocale n'est pas disponible dans ce moteur WebView. Activez la dictée système ou utilisez Chrome/Edge pour la version web." });
            return;
        }
        if (recognitionRef.current && isDictating) {
            recognitionRef.current.stop();
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = navigator.language || 'fr-FR';
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .slice(event.resultIndex)
                .map((result) => result[0]?.transcript || '')
                .join(' ')
                .trim();
            if (!transcript) return;
            editorRef.current?.insertText(`<p>${escapeHtml(transcript)}</p>`);
        };
        recognition.onend = () => setIsDictating(false);
        recognition.onerror = () => setIsDictating(false);
        recognitionRef.current = recognition;
        setIsDictating(true);
        recognition.start();
    };

    const handleSaveDrawing = async (blob) => {
        const file = new File([blob], `croquis-${Date.now()}.png`, { type: 'image/png' });
        await addFiles([file]);
        setIsDrawing(false);
    };

    const handleSaveScan = async (blob) => {
        const file = new File([blob], `scan-webcam-${Date.now()}.png`, { type: 'image/png' });
        await addFiles([file]);
        setIsScannerOpen(false);
    };

    const addFiles = async (files) => {
        const incomingFiles = Array.from(files || []);
        if (!incomingFiles.length) return;

        const attachmentLimitAlert = getAttachmentLimitAlert({
            level: planLevel,
            currentAttachmentCount: attachments.length,
            incomingFileCount: incomingFiles.length,
        });
        if (attachmentLimitAlert) {
            await showLimitAlert(attachmentLimitAlert);
            return;
        }

        const incomingBytes = incomingFiles.reduce((total, file) => total + Number(file.size || 0), 0);
        const storageLimitAlert = getStorageLimitAlert({
            level: planLevel,
            currentUsage: Number(storageUsage?.used || 0),
            incomingBytes,
        });
        if (storageLimitAlert) {
            await showLimitAlert(storageLimitAlert);
            return;
        }

        const newFiles = await Promise.all(incomingFiles.map(async (file) => {
            const cached = await cacheAttachment(file, note.id);
            const meta = classifyAttachment({ name: file.name, mimeType: file.type });
            const ocr = await extractImageOcr(file, { protectedNote: Boolean(note.is_locked || note.encrypted_content) });
            return {
                ...cached,
                type: meta.kind,
                previewable: meta.previewable,
                ocrText: ocr.text,
                ocrStatus: ocr.status,
                ocrConfidence: ocr.confidence,
                ocrKind: ocr.classification.kind,
                ocrLabel: ocr.classification.label,
                url: URL.createObjectURL(file),
            };
        }));

        const updatedAttachments = [...attachments, ...newFiles];
        setAttachments(updatedAttachments);
        const updatedNote = { ...note, attachments: updatedAttachments, updatedAt: getCurrentTimestamp() };
        onUpdateNote(updatedNote);

        if (!updatedNote.is_locked && !updatedNote.encrypted_content) {
            const attachmentTexts = updatedAttachments
                .filter((attachment) => attachment.ocrText)
                .map((attachment) => ({ id: attachment.id, text: attachment.ocrText }));
            await Promise.allSettled([
                ...newFiles.map((attachment) => dataService.upsertAttachmentMetadata(updatedNote.id, attachment)),
                dataService.upsertSearchIndex(updatedNote, { attachmentTexts }),
            ]);
        }
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragging(false);
        await addFiles(e.dataTransfer.files);
    };

    const handlePaste = async (event) => {
        const files = Array.from(event.clipboardData?.files || []);
        if (!files.length) return;
        event.preventDefault();
        await addFiles(files);
    };

    const handleTagsChange = (nextTags) => {
        const updatedTags = serializeNoteTags(nextTags);
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
    const visibleTags = normalizeNoteTags(tags).sort((a, b) => a.label.localeCompare(b.label, 'fr'));

    return (
        <div 
            className={`fiip-light-editor-view flex-1 flex flex-col h-full bg-warm-bg-light dark:bg-warm-bg-dark text-warm-text-primary-light dark:text-warm-text-primary-dark p-8 pb-28 overflow-hidden relative ${
                isDragging ? 'bg-amber-500/5 ring-4 ring-amber-500/10 ring-inset' : ''
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onPaste={handlePaste}
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
                                className="fiip-light-editor-title bg-transparent border-none text-lg font-semibold text-warm-text-primary-light dark:text-warm-text-primary-dark placeholder:text-warm-text-muted-light/30 focus:outline-none focus:ring-0 p-0 m-0 w-64 md:w-80"
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
                    <div className="hidden max-w-[24rem] items-center gap-1.5 overflow-hidden sm:flex">
                        {visibleTags.slice(0, 4).map(tag => {
                            const colorClasses = getTagColorClasses(tag.color);
                            return (
                            <span 
                                key={tag.id} 
                                className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold ${colorClasses.bg} ${colorClasses.border} ${colorClasses.text}`}
                            >
                                <span className={`h-1.5 w-1.5 rounded-full ${colorClasses.dot}`} />
                                {tag.label}
                                <button 
                                    onClick={() => handleTagsChange(visibleTags.filter((item) => item.id !== tag.id))}
                                    className="opacity-55 hover:text-red-500 hover:opacity-100"
                                    aria-label={`Supprimer le tag ${tag.label}`}
                                >
                                    <X size={10} />
                                </button>
                            </span>
                        )})}
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
                        disabled={note.isProtected || note.is_locked}
                        className="fiip-light-editor-share-button flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 border border-transparent rounded-xl text-xs font-semibold transition-all shadow-sm"
                        title={note.isProtected || note.is_locked ? 'Les notes protegees ne peuvent pas etre partagees.' : 'Partager'}
                    >
                        <Share2 size={13} />
                        <span>Partager</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleProtectNote}
                        className="p-1.5 rounded-xl border border-warm-border-light dark:border-warm-border-dark hover:bg-amber-500/10 hover:border-amber-500/30 transition-all text-warm-text-muted-light hover:text-amber-600"
                        title={note.isProtected || note.is_locked ? 'Deverrouiller la note' : 'Proteger par mot de passe'}
                    >
                        {note.isProtected || note.is_locked ? <UnlockKeyhole size={15} /> : <LockKeyhole size={15} />}
                    </button>

                    <button
                        type="button"
                        onClick={handleExportPdf}
                        className="p-1.5 rounded-xl border border-warm-border-light dark:border-warm-border-dark hover:bg-blue-500/10 hover:border-blue-500/30 transition-all text-warm-text-muted-light hover:text-blue-600"
                        title="Exporter en PDF"
                    >
                        <FileDown size={15} />
                    </button>

                    <button
                        type="button"
                        onClick={handleExportFiin}
                        className="p-1.5 rounded-xl border border-warm-border-light dark:border-warm-border-dark hover:bg-blue-500/10 hover:border-blue-500/30 transition-all text-warm-text-muted-light hover:text-blue-600"
                        title="Exporter en .fiin"
                    >
                        <FileArchive size={15} />
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
                            <span className="text-[11px] font-semibold text-warm-text-muted-light">Pièces jointes</span>
                            <button
                                type="button"
                                onClick={() => setShowAttachmentPreviews((value) => !value)}
                                className="flex items-center gap-1.5 rounded-lg border border-warm-border-light dark:border-warm-border-dark px-2 py-1 text-[11px] font-semibold text-warm-text-secondary-light dark:text-warm-text-secondary-dark hover:bg-warm-sidebar-item-active"
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
                                onOpen={() => setSelectedAttachment(att)}
                                onRemove={() => {
                                    const updatedAttachments = attachments.filter(a => a.id !== att.id);
                                    setAttachments(updatedAttachments);
                                    onUpdateNote({ ...note, attachments: updatedAttachments, updatedAt: getCurrentTimestamp() });
                                }} 
                            />
                        ))}
                    </div>
                )}

                {(note.isProtected || note.is_locked) && !note.content ? (
                    <div className="mb-6 rounded-3xl border border-amber-500/25 bg-amber-500/10 p-6 text-sm text-amber-800 dark:text-amber-200">
                        <div className="flex items-center gap-2 font-semibold">
                            <LockKeyhole size={18} />
                            Note protegee
                        </div>
                        <p className="mt-2 leading-6 text-amber-800/80 dark:text-amber-100/75">
                            Le contenu, les pieces jointes, l'IA, la recherche cloud, le partage public et la collaboration sont bloques tant que la note reste verrouillee.
                        </p>
                    </div>
                ) : null}

                <div className="mb-6 grid gap-3 rounded-3xl border border-warm-border-light bg-warm-card-light/86 p-4 text-warm-text-primary-light shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-warm-text-primary-dark md:grid-cols-[1fr_auto]">
                    <form onSubmit={handleAddTask} className="flex flex-wrap items-center gap-2">
                        <CheckSquare size={16} className="text-emerald-500" />
                        <input
                            value={taskTitle}
                            onChange={(event) => setTaskTitle(event.target.value)}
                            placeholder="Ajouter une tache liee a cette note"
                            className="h-9 min-w-44 flex-1 rounded-xl border border-warm-border-light bg-warm-card-light px-3 text-xs font-semibold text-warm-text-primary-light outline-none placeholder:text-warm-text-muted-light dark:border-white/10 dark:bg-[#111316] dark:text-warm-text-primary-dark"
                        />
                        <TaskDatePicker value={taskDueDate} onChange={setTaskDueDate} />
                        <label className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-warm-border-light bg-warm-card-light px-3 text-xs font-semibold text-warm-text-primary-light dark:border-white/10 dark:bg-[#111316] dark:text-warm-text-primary-dark">
                            <Clock size={13} className="text-warm-text-muted-light" />
                            <input
                                type="text"
                                inputMode="numeric"
                                value={taskDueTime}
                                onChange={(event) => setTaskDueTime(event.target.value)}
                                placeholder="09:00"
                                pattern="\d{2}:\d{2}"
                                className="w-12 bg-transparent outline-none"
                                aria-label="Heure d'echeance"
                            />
                        </label>
                        <button type="submit" className="h-9 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white">
                            Ajouter
                        </button>
                    </form>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-warm-border-light px-3 text-xs font-semibold text-warm-text-secondary-light hover:bg-black/[0.04] hover:text-warm-text-primary-light dark:border-white/10 dark:text-warm-text-secondary-dark dark:hover:bg-white/10 dark:hover:text-warm-text-primary-dark">
                            <ScanLine size={14} />
                            Importer
                        </button>
                        <button type="button" onClick={() => setIsScannerOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-warm-border-light px-3 text-xs font-semibold text-warm-text-secondary-light hover:bg-black/[0.04] hover:text-warm-text-primary-light dark:border-white/10 dark:text-warm-text-secondary-dark dark:hover:bg-white/10 dark:hover:text-warm-text-primary-dark">
                            <ScanLine size={14} />
                            Webcam
                        </button>
                        <button type="button" onClick={() => setIsDrawing(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-warm-border-light px-3 text-xs font-semibold text-warm-text-secondary-light hover:bg-black/[0.04] hover:text-warm-text-primary-light dark:border-white/10 dark:text-warm-text-secondary-dark dark:hover:bg-white/10 dark:hover:text-warm-text-primary-dark">
                            <PenLine size={14} />
                            Croquis
                        </button>
                    </div>
                    {tasks.length > 0 && (
                        <div className="md:col-span-2 flex flex-wrap gap-2">
                            {tasks.map((task) => (
                                <span key={task.id} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                                    <CheckSquare size={12} />
                                    {task.title}
                                    {task.due_at ? <span className="text-emerald-700/60 dark:text-emerald-200/60">{new Date(task.due_at).toLocaleDateString()}</span> : null}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <RichTextEditor 
                    ref={editorRef}
                    value={note.isProtected || note.is_locked ? '' : note.content} 
                    onChange={handleContentChange}
                    noteId={note.id}
                />
            </div>

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

            <EditorActionBar
                note={{ ...note, tags }}
                hasContent={hasContent}
                onOpenDexter={onOpenDexter}
                onOpenLicense={onOpenLicense}
                onAttachFile={() => {
                    soundManager.play('interaction').catch(console.error);
                    fileInputRef.current?.click();
                }}
                onStartDictation={handleStartDictation}
                isDictating={isDictating}
                onUpdateTags={handleTagsChange}
                tagSuggestions={tagSuggestions}
                editorRef={editorRef}
            />

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

            <AttachmentViewer attachment={selectedAttachment} onClose={() => setSelectedAttachment(null)} />
            {passwordDialog && (
                <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/45 p-4 backdrop-blur-xl" role="dialog" aria-modal="true">
                    <form onSubmit={submitPasswordDialog} className="w-[min(420px,92vw)] overflow-hidden rounded-[28px] border border-[color:var(--border-color)] bg-[color:var(--bg-card)] p-5 text-[color:var(--text-primary)] shadow-[0_28px_90px_rgba(0,0,0,0.34)] backdrop-blur-3xl">
                        <div className="flex items-start gap-3">
                            <div className="rounded-2xl bg-amber-500/12 p-2 text-amber-600 dark:text-amber-300">
                                {passwordDialog.mode === 'notice' ? <AlertCircle size={20} /> : <LockKeyhole size={20} />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-base font-semibold">
                                    {passwordDialog.title || (passwordDialog.mode === 'unlock' ? 'Déverrouiller la note' : 'Protéger cette note')}
                                </h2>
                                <p className="mt-1 text-sm leading-6 text-warm-text-secondary-light dark:text-warm-text-secondary-dark">
                                    {passwordDialog.message || (passwordDialog.mode === 'unlock'
                                        ? 'Saisissez le mot de passe de cette note.'
                                        : 'Choisissez un mot de passe local. Fiip ne pourra pas le récupérer pour vous.')}
                                </p>
                            </div>
                        </div>
                        {passwordDialog.mode !== 'notice' && (
                            <input
                                autoFocus
                                type="password"
                                value={passwordValue}
                                onChange={(event) => setPasswordValue(event.target.value)}
                                className="mt-5 h-11 w-full rounded-2xl border border-warm-border-light bg-white px-4 text-sm font-semibold outline-none focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 dark:border-white/10 dark:bg-white/[0.06]"
                            />
                        )}
                        {passwordError && (
                            <p className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-200">{passwordError}</p>
                        )}
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setPasswordDialog(null);
                                    setPasswordValue('');
                                    setPasswordError('');
                                }}
                                className="rounded-2xl border border-warm-border-light px-4 py-2 text-xs font-semibold hover:bg-black/[0.04] dark:border-white/10 dark:hover:bg-white/10"
                            >
                                {passwordDialog.mode === 'notice' ? 'Fermer' : 'Annuler'}
                            </button>
                            {passwordDialog.mode !== 'notice' && (
                                <button type="submit" className="rounded-2xl bg-zinc-950 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-zinc-950" disabled={!passwordValue}>
                                    {passwordDialog.mode === 'unlock' ? 'Déverrouiller' : 'Protéger'}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            )}
            {isDrawing && (
                <div className="fixed inset-0 z-[130] bg-black/70">
                    <CanvasDraw onSave={handleSaveDrawing} onClose={() => setIsDrawing(false)} />
                </div>
            )}
            {isScannerOpen && (
                <DocumentScanner onSave={handleSaveScan} onClose={() => setIsScannerOpen(false)} />
            )}
        </div>
    );
}
