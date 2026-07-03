import { appDataDir, join } from '@tauri-apps/api/path';
import { openPath, openUrl } from '@tauri-apps/plugin-opener';
import { Download, ExternalLink, FileText, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { classifyAttachment, formatBytes, getAttachmentPreviewUrl } from '../services/attachmentCache';
import { getSafePublicUrl } from '../utils/safeUrl';

export async function resolveAttachmentOpenTarget(attachment, previewUrl = '') {
    if (!attachment) return '';
    if (window.__TAURI_INTERNALS__ && attachment.cachePath) {
        try {
            return await join(await appDataDir(), attachment.cachePath);
        } catch {
            return attachment.cachePath;
        }
    }
    return getSafePublicUrl(previewUrl || attachment.url || '', {
        allowDataMedia: true,
        allowSvg: classifyAttachment({ name: attachment.name, mimeType: attachment.mimeType }).kind === 'image',
    });
}

export default function AttachmentViewer({ attachment, onClose }) {
    const [url, setUrl] = useState('');
    const [openTarget, setOpenTarget] = useState('');
    const [textContent, setTextContent] = useState('');
    const [error, setError] = useState('');

    const meta = classifyAttachment({ name: attachment?.name, mimeType: attachment?.mimeType });
    const kind = attachment?.type || meta.kind;

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setTextContent('');
            setError('');
            if (!attachment) return;

            const previewUrl = await getAttachmentPreviewUrl(attachment);
            if (cancelled) return;
            const safeUrl = getSafePublicUrl(previewUrl || attachment.url || '', {
                allowDataMedia: true,
                allowSvg: kind === 'image',
            });
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

    if (!attachment) return null;

    const title = attachment.name || 'Piece jointe';
    const canRender = ['image', 'video', 'audio', 'text', 'pdf'].includes(kind) && url;

    const handleOpenExternal = () => {
        const target = openTarget || url;
        if (!target) return;
        const opener = /^[a-z][a-z0-9+.-]*:/i.test(target) ? openUrl : openPath;
        opener(target).catch(() => window.open(target, '_blank', 'noopener,noreferrer'));
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
                        <div className="flex h-full items-center justify-center">
                            <img src={url} alt={title} className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl" />
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
