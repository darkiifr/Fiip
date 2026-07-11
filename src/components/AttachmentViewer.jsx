import { openPath, openUrl } from '@tauri-apps/plugin-opener';
import { Clipboard, Download, ExternalLink, FileText, ScanText, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { classifyAttachment, formatBytes, getAttachmentPreviewUrl, resolveAttachmentCachePath } from '../services/attachmentCache';
import { getSafePublicUrl } from '../utils/safeUrl';

function isAppPreviewBlob(value = '') {
    return typeof value === 'string' && value.startsWith('blob:');
}

function isFilesystemPath(value = '') {
    return /^[a-z]:[\\/]/i.test(value) || value.startsWith('/') || value.startsWith('\\\\');
}

export async function resolveAttachmentOpenTarget(attachment, previewUrl = '') {
    if (!attachment) return '';
    if (attachment.cachePath || attachment.path || attachment.filePath || attachment.localPath || attachment.absolutePath) {
        return resolveAttachmentCachePath(attachment);
    }
    if (isAppPreviewBlob(previewUrl)) return previewUrl;
    return getSafePublicUrl(previewUrl || attachment.url || '', {
        allowDataMedia: true,
        allowSvg: classifyAttachment({ name: attachment.name, mimeType: attachment.mimeType }).kind === 'image',
    });
}

function getSafeAttachmentPreviewUrl(attachment, previewUrl, kind) {
    if (isAppPreviewBlob(previewUrl)) {
        return previewUrl;
    }

    return getSafePublicUrl(previewUrl || attachment?.url || '', {
        allowDataMedia: true,
        allowSvg: kind === 'image',
    });
}

function getOcrWordLayout(words = []) {
    const cleanWords = (Array.isArray(words) ? words : [])
        .map((word) => {
            const text = String(word?.text || '').trim();
            const box = word?.bbox || {};
            const sourceWidth = Number(word?.sourceWidth || word?.source_width || 0);
            const sourceHeight = Number(word?.sourceHeight || word?.source_height || 0);
            const x = Number(box.x || 0);
            const y = Number(box.y || 0);
            const width = Number(box.width || 0);
            const height = Number(box.height || 0);
            if (!text || width <= 0 || height <= 0) {
                return null;
            }
            return { text, x, y, width, height, sourceWidth, sourceHeight };
        })
        .filter(Boolean);

    const inferredWidth = Math.max(...cleanWords.map((word) => word.x + word.width), 0);
    const inferredHeight = Math.max(...cleanWords.map((word) => word.y + word.height), 0);

    return cleanWords.map((word) => {
        const sourceWidth = word.sourceWidth || inferredWidth || 1;
        const sourceHeight = word.sourceHeight || inferredHeight || 1;
        return {
            ...word,
            left: (word.x / sourceWidth) * 100,
            top: (word.y / sourceHeight) * 100,
            widthPercent: (word.width / sourceWidth) * 100,
            heightPercent: (word.height / sourceHeight) * 100,
            fontSize: Math.max(10, Math.min(28, (word.height / sourceHeight) * 620)),
        };
    });
}

function getOcrLineLayout(words = []) {
    const wordLayout = getOcrWordLayout(words).sort((a, b) => (a.y - b.y) || (a.x - b.x));
    const lines = [];

    wordLayout.forEach((word) => {
        const centerY = word.y + (word.height / 2);
        const line = lines.find((candidate) => {
            const candidateCenter = candidate.y + (candidate.height / 2);
            return Math.abs(centerY - candidateCenter) <= Math.max(word.height, candidate.height) * 0.72;
        });

        if (line) {
            line.words.push(word);
            line.x = Math.min(line.x, word.x);
            line.y = Math.min(line.y, word.y);
            line.right = Math.max(line.right, word.x + word.width);
            line.bottom = Math.max(line.bottom, word.y + word.height);
            line.width = line.right - line.x;
            line.height = line.bottom - line.y;
            return;
        }

        lines.push({
            x: word.x,
            y: word.y,
            right: word.x + word.width,
            bottom: word.y + word.height,
            width: word.width,
            height: word.height,
            sourceWidth: word.sourceWidth,
            sourceHeight: word.sourceHeight,
            words: [word],
        });
    });

    return lines
        .map((line) => {
            const sortedWords = line.words.sort((a, b) => a.x - b.x);
            const sourceWidth = sortedWords[0]?.sourceWidth || Math.max(line.right, 1);
            const sourceHeight = sortedWords[0]?.sourceHeight || Math.max(line.bottom, 1);
            return {
                text: sortedWords.map((word) => word.text).join(' '),
                left: (line.x / sourceWidth) * 100,
                top: (line.y / sourceHeight) * 100,
                widthPercent: (line.width / sourceWidth) * 100,
                heightPercent: (line.height / sourceHeight) * 100,
                fontSize: Math.max(10, Math.min(28, (line.height / sourceHeight) * 620)),
            };
        })
        .filter((line) => line.text.trim())
        .sort((a, b) => a.top - b.top);
}

export default function AttachmentViewer({ attachment, onClose }) {
    const [url, setUrl] = useState('');
    const [openTarget, setOpenTarget] = useState('');
    const [textContent, setTextContent] = useState('');
    const [error, setError] = useState('');
    const [showOcrText, setShowOcrText] = useState(true);

    const meta = classifyAttachment({ name: attachment?.name, mimeType: attachment?.mimeType });
    const kind = attachment?.type || meta.kind;

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setTextContent('');
            setError('');
            if (!attachment) {
                return;
            }

            const previewUrl = await getAttachmentPreviewUrl(attachment);
            if (cancelled) {
                return;
            }
            const safeUrl = getSafeAttachmentPreviewUrl(attachment, previewUrl, kind);
            setUrl(safeUrl);
            setOpenTarget(await resolveAttachmentOpenTarget(attachment, safeUrl));

            if (kind === 'text' && previewUrl) {
                try {
                    const response = await fetch(previewUrl);
                    const text = await response.text();
                    if (!cancelled) setTextContent(text);
                } catch {
                    if (!cancelled) setError('Impossible de lire ce fichier texte.');
                }
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [attachment, kind]);

    if (!attachment) {
        return null;
    }

    const title = attachment.name || 'Piece jointe';
    const canRender = ['image', 'video', 'audio', 'text', 'pdf'].includes(kind) && url;
    const ocrText = String(attachment.ocrText || '').trim();
    const canShowOcrText = kind === 'image' && Boolean(ocrText);
    const ocrLineLayout = getOcrLineLayout(attachment.ocrWords || attachment.ocr_words || []);
    const hasPositionedOcr = ocrLineLayout.length > 0;

    const handleOpenExternal = () => {
        const target = openTarget || url;
        if (!target) {
            return;
        }
        if (isAppPreviewBlob(target)) {
            window.open(target, '_blank', 'noopener,noreferrer');
            return;
        }
        const opener = /^[a-z][a-z0-9+.-]*:/i.test(target) && !isFilesystemPath(target) ? openUrl : openPath;
        Promise.resolve(opener(target)).catch(() => window.open(target, '_blank', 'noopener,noreferrer'));
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label={`Apercu de ${title}`}>
            <div className="flex h-[min(760px,92vh)] w-[min(960px,94vw)] flex-col overflow-hidden rounded-[28px] border border-black/10 bg-[#fbfaf6] text-warm-text-primary-dark shadow-[0_30px_100px_rgba(0,0,0,0.35)] dark:border-white/10 dark:bg-[#111316] dark:text-warm-text-primary-dark">
                <header className="flex items-center justify-between border-b border-black/10 px-5 py-4 dark:border-white/10">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-black">{title}</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-warm-text-muted-dark dark:text-warm-text-muted-dark">
                            {kind.toUpperCase()} {attachment.size ? `- ${formatBytes(attachment.size)}` : ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {openTarget && (
                            <button
                                type="button"
                                onClick={handleOpenExternal}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 px-3 py-2 text-xs font-bold hover:bg-black/[0.04] dark:border-white/10 dark:hover:bg-white/10"
                            >
                                <ExternalLink size={14} />
                                Ouvrir
                            </button>
                        )}
                        {canShowOcrText && (
                            <button
                                type="button"
                                onClick={() => setShowOcrText((value) => !value)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 px-3 py-2 text-xs font-bold hover:bg-black/[0.04] dark:border-white/10 dark:hover:bg-white/10"
                                aria-pressed={showOcrText}
                            >
                                <ScanText size={14} />
                                Texte OCR
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl p-2 text-warm-text-muted-dark hover:bg-black/[0.04] hover:text-warm-text-primary-dark dark:text-warm-text-muted-dark dark:hover:bg-white/10 dark:hover:text-white"
                            aria-label="Fermer l'apercu"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-auto bg-white/55 p-4 dark:bg-black/20">
                    {kind === 'image' && url ? (
                        <div className="relative flex h-full min-h-[420px] items-center justify-center">
                            <div className="relative inline-block max-h-full max-w-full">
                                <img src={url} alt={title} draggable={false} className="block max-h-full max-w-full rounded-2xl object-contain shadow-2xl" />
                                {canShowOcrText && showOcrText && hasPositionedOcr ? (
                                    <div
                                        className="absolute inset-0 cursor-text select-text overflow-hidden rounded-2xl"
                                        aria-label="Texte OCR sélectionnable sur l'image"
                                        onMouseDown={(event) => event.stopPropagation()}
                                        onPointerDown={(event) => event.stopPropagation()}
                                        style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                                    >
                                        {ocrLineLayout.map((line, index) => (
                                            <span
                                                key={`${line.text}-${index}-${line.left}-${line.top}`}
                                                className="absolute block cursor-text select-text rounded-[3px] bg-zinc-950/38 px-[2px] font-bold text-white outline outline-1 outline-amber-300/42 [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]"
                                                style={{
                                                    left: `${line.left}%`,
                                                    top: `${line.top}%`,
                                                    minWidth: `${line.widthPercent}%`,
                                                    minHeight: `${line.heightPercent}%`,
                                                    fontSize: `${line.fontSize}px`,
                                                    lineHeight: 1.05,
                                                    userSelect: 'text',
                                                    WebkitUserSelect: 'text',
                                                }}
                                            >
                                                {line.text}
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                            {canShowOcrText && showOcrText ? (
                                <section
                                    className={`${hasPositionedOcr ? 'bottom-4 left-4 right-4 max-h-[32%] opacity-90 md:right-auto md:w-80' : 'bottom-4 left-4 right-4 max-h-[42%] md:left-auto md:max-h-[calc(100%-2rem)] md:w-80'} absolute overflow-auto rounded-2xl border border-white/18 bg-zinc-950/78 p-4 text-left text-white shadow-2xl backdrop-blur-2xl`}
                                    aria-label="Texte OCR sélectionnable"
                                >
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <ScanText size={16} className="shrink-0 text-amber-300" />
                                            <p className="truncate text-xs font-black uppercase tracking-wide">Texte détecté</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => navigator.clipboard?.writeText(ocrText).catch(() => {})}
                                            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-[10px] font-bold text-white/86 hover:bg-white/10"
                                        >
                                            <Clipboard size={12} />
                                            Copier
                                        </button>
                                    </div>
                                    <p className="select-text whitespace-pre-wrap text-sm leading-6 text-white/92">{ocrText}</p>
                                </section>
                            ) : null}
                        </div>
                    ) : kind === 'video' && url ? (
                        <video src={url} controls className="h-full w-full rounded-2xl bg-black object-contain" />
                    ) : kind === 'audio' && url ? (
                        <div className="flex h-full items-center justify-center">
                            <div className="w-full max-w-xl rounded-3xl border border-black/10 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-white/[0.06]">
                                <FileText className="mb-5 h-8 w-8 text-amber-500" />
                                <p className="mb-4 text-sm font-bold">{title}</p>
                                <audio src={url} controls className="w-full" />
                            </div>
                        </div>
                    ) : kind === 'text' && url ? (
                        <pre className="min-h-full whitespace-pre-wrap rounded-2xl border border-black/10 bg-white p-5 font-mono text-xs leading-6 text-zinc-800 dark:border-white/10 dark:bg-[#0b0d10] dark:text-zinc-100">
                            {error || textContent || 'Chargement...'}
                        </pre>
                    ) : kind === 'pdf' && url ? (
                        <iframe src={url} title={title} className="h-full min-h-[620px] w-full rounded-2xl border border-black/10 bg-white dark:border-white/10" />
                    ) : (
                        <div className="flex h-full items-center justify-center text-center">
                            <div className="max-w-sm rounded-3xl border border-dashed border-black/15 bg-white/70 p-8 dark:border-white/15 dark:bg-white/[0.05]">
                                <Download className="mx-auto mb-4 h-8 w-8 text-warm-text-muted-dark" />
                                <p className="text-sm font-black">Apercu indisponible</p>
                                <p className="mt-2 text-sm leading-6 text-warm-text-secondary-dark dark:text-warm-text-secondary-dark">
                                    Ce type de fichier doit etre ouvert avec une application externe.
                                </p>
                                {openTarget && (
                                    <button
                                        type="button"
                                        onClick={handleOpenExternal}
                                        className="mt-5 rounded-2xl bg-zinc-950 px-4 py-2 text-xs font-black text-white dark:bg-white dark:text-zinc-950"
                                    >
                                        Ouvrir le fichier
                                    </button>
                                )}
                                {!canRender && !url && (
                                    <p className="mt-4 text-xs text-warm-text-muted-dark">Le fichier local n'est pas disponible dans le cache, et aucune URL sure n'est associee.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
