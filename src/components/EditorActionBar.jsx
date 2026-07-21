import { Icon as IconifyIcon } from '@iconify/react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bot, Image as ImageIcon, Lock, Mic, Palette, Pause, Play, Plus, Tag, Type, Volume2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { soundManager } from '../services/soundManager';
import { stripNoteText } from '../utils/notePresentation';
import { getTagColorClasses, normalizeNoteTags, serializeNoteTags, TAG_SOLID_COLOR_CLASSES } from '../utils/noteTags';

import { PRESET_ICONS } from './NoteBadges';

function TagIcon({ icon, className = 'h-3.5 w-3.5' }) {
    const isExternal = typeof icon === 'string' && (icon.includes(':') || icon.startsWith('logos'));
    if (isExternal) {return <IconifyIcon icon={icon} className={className} />;}
    const Icon = PRESET_ICONS[icon] || Tag;
    return <Icon className={className} />;
}

function TagPicker({ tags, suggestions, onChange }) {
    const [open, setOpen] = useState(false);
    const [label, setLabel] = useState('');
    const [icon, setIcon] = useState('Tag');
    const [color, setColor] = useState(4);
    const shouldReduceMotion = useReducedMotion();

    const normalizedTags = normalizeNoteTags(tags);
    const availableSuggestions = normalizeNoteTags(suggestions)
        .filter((tag) => !normalizedTags.some((item) => item.label.toLowerCase() === tag.label.toLowerCase()))
        .slice(0, 8);

    const iconNames = useMemo(() => Object.keys(PRESET_ICONS).slice(0, 32), []);

    const commitTag = (baseTag) => {
        const next = baseTag || { label, icon, color };
        const created = serializeNoteTags([...normalizedTags, next]);
        onChange(created);
        setLabel('');
        setOpen(false);
    };

    const updateTag = (tag, patch) => {
        onChange(serializeNoteTags(normalizedTags.map((item) => item.id === tag.id ? { ...item, ...patch } : item)));
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-3 text-xs font-black text-warm-text-primary-light shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/[0.08] dark:text-warm-text-primary-dark dark:hover:bg-white/[0.12]"
            >
                <Tag size={14} className="text-amber-500" />
                Tags
            </button>

            <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10, scale: shouldReduceMotion ? 1 : 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 8, scale: shouldReduceMotion ? 1 : 0.98 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.16, ease: 'easeOut' }}
                    className="absolute bottom-12 right-0 z-[9999] flex max-h-[min(35rem,calc(100vh-8rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-black/10 bg-[#fbfaf6]/95 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-3xl dark:border-white/10 dark:bg-[#111316]/95"
                >
                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-black uppercase tracking-wider text-warm-text-muted-light">Tags de la note</p>
                        <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-black/5 dark:hover:bg-white/10">
                            <X size={14} />
                        </button>
                    </div>

                    <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto pr-1">
                        {normalizedTags.length === 0 && (
                            <p className="text-xs text-warm-text-muted-light">Aucun tag pour cette note.</p>
                        )}
                        {normalizedTags.map((tag) => {
                            const colorClasses = getTagColorClasses(tag.color);
                            return (
                                <div key={tag.id} className={`group inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-bold ${colorClasses.bg} ${colorClasses.border} ${colorClasses.text}`}>
                                    <TagIcon icon={tag.icon} />
                                    <span>{tag.label}</span>
                                    <button type="button" onClick={() => updateTag(tag, { color: (Number(tag.color || 0) + 1) % TAG_SOLID_COLOR_CLASSES.length })} title="Changer la couleur">
                                        <Palette size={11} />
                                    </button>
                                    <button type="button" onClick={() => onChange(normalizedTags.filter((item) => item.id !== tag.id))} aria-label={`Supprimer ${tag.label}`}>
                                        <X size={11} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {availableSuggestions.length > 0 && (
                        <div className="mt-3 border-t border-black/10 pt-3 dark:border-white/10">
                            <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-warm-text-muted-light">Recents</p>
                            <div className="flex flex-wrap gap-1.5">
                                {availableSuggestions.map((tag) => (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        onClick={() => commitTag(tag)}
                                        className="rounded-full border border-black/10 px-2 py-1 text-[11px] font-bold hover:bg-black/[0.04] dark:border-white/10 dark:hover:bg-white/10"
                                    >
                                        {tag.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-3 min-h-0 overflow-y-auto border-t border-black/10 pt-3 dark:border-white/10">
                        <input
                            value={label}
                            onChange={(event) => setLabel(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' && label.trim()) {commitTag();}
                            }}
                            placeholder="Nouveau tag"
                            className="h-9 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold outline-none focus:border-amber-500/50 dark:border-white/10 dark:bg-white/[0.06]"
                        />
                        <div className="mt-3 grid grid-cols-8 gap-1">
                            {iconNames.map((name) => (
                                <button
                                    key={name}
                                    type="button"
                                    onClick={() => setIcon(name)}
                                    className={`flex h-7 items-center justify-center rounded-lg ${icon === name ? 'bg-amber-500 text-white' : 'hover:bg-black/[0.04] dark:hover:bg-white/10'}`}
                                    title={name}
                                >
                                    <TagIcon icon={name} />
                                </button>
                            ))}
                        </div>
                        <div className="mt-3 space-y-3">
                            <div className="flex flex-wrap gap-1.5">
                                {TAG_SOLID_COLOR_CLASSES.map((className, index) => (
                                    <button
                                        key={className}
                                        type="button"
                                        onClick={() => setColor(index)}
                                        className={`h-5 w-5 rounded-full ${className} ${color === index ? 'ring-2 ring-zinc-950 ring-offset-2 dark:ring-white dark:ring-offset-[#111316]' : ''}`}
                                    />
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={() => label.trim() && commitTag()}
                                disabled={!label.trim()}
                                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[color:var(--accent)] px-3 py-2 text-xs font-black text-white transition-colors disabled:cursor-not-allowed disabled:bg-white/[0.09] disabled:text-[color:var(--text-secondary)] dark:bg-[color:var(--accent)] dark:text-white"
                            >
                                <Plus size={13} />
                                Ajouter
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
}

export default function EditorActionBar({
    note,
    hasContent,
    onOpenDexter,
    onOpenLicense,
    onAttachFile,
    onStartDictation,
    isDictating = false,
    dictationPreview = '',
    onToggleHeading,
    onUpdateTags,
    tagSuggestions,
    editorRef,
}) {
    const [speechState, setSpeechState] = useState('idle');
    const utteranceRef = useRef(null);

    useEffect(() => () => {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    }, []);

    const speakNote = () => {
        soundManager.play('interaction').catch(console.error);
        if (!window.speechSynthesis) {return;}
        if (speechState === 'playing') {
            window.speechSynthesis.pause();
            setSpeechState('paused');
            return;
        }
        if (speechState === 'paused') {
            window.speechSynthesis.resume();
            setSpeechState('playing');
            return;
        }
        const text = stripNoteText(note.content || '');
        if (!text) {return;}
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => setSpeechState('idle');
        utterance.onerror = () => setSpeechState('idle');
        utteranceRef.current = utterance;
        setSpeechState('playing');
        window.speechSynthesis.speak(utterance);
    };

    const SpeechIcon = speechState === 'paused' ? Play : speechState === 'playing' ? Pause : Volume2;

    return (
        <div className="fiip-light-editor-actionbar absolute bottom-5 right-5 z-40 w-[min(46rem,calc(100%-2.5rem))] select-none">
            <div className="flex items-center justify-between gap-2 rounded-[22px] border border-warm-border-light bg-warm-card-light/92 p-2 text-warm-text-primary-light shadow-[0_20px_70px_rgba(15,23,42,0.16)] backdrop-blur-3xl dark:border-white/10 dark:bg-[#111316]/90 dark:text-warm-text-primary-dark dark:shadow-[0_20px_70px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-1 rounded-2xl border border-warm-border-light bg-white/75 p-1 dark:border-white/10 dark:bg-white/[0.05]">
                    <button type="button" onClick={onStartDictation} className={`fiip-light-editor-action rounded-xl p-2 transition-all hover:bg-black/[0.04] dark:hover:bg-white/10 ${isDictating ? 'bg-red-500/12 text-red-600 dark:text-red-300' : 'text-warm-text-secondary-light hover:text-amber-600'}`} title={isDictating ? 'Arrêter la dictée' : 'Dicter du texte'}>
                        <Mic size={16} />
                    </button>
                    <button type="button" onClick={onOpenDexter} className="fiip-light-editor-action rounded-xl p-2 text-warm-text-secondary-light transition-all hover:bg-black/[0.04] hover:text-amber-600 dark:hover:bg-white/10" title="Ouvrir Dexter">
                        <Bot size={16} />
                    </button>
                    <button type="button" onClick={speakNote} disabled={!hasContent} className={`fiip-light-editor-action rounded-xl p-2 transition-all hover:bg-black/[0.04] disabled:opacity-40 dark:hover:bg-white/10 ${speechState !== 'idle' ? 'bg-amber-500/12 text-amber-700 dark:text-amber-300' : 'text-warm-text-secondary-light hover:text-warm-text-primary-light dark:hover:text-white'}`} title={speechState === 'playing' ? "Mettre l'écoute en pause" : speechState === 'paused' ? "Reprendre l'écoute" : 'Lire la note'}>
                        <SpeechIcon size={16} />
                    </button>
                    <button type="button" onClick={() => { soundManager.play('interaction').catch(console.error); editorRef.current?.getEditor()?.chain().focus().toggleHeading({ level: 2 }).run(); onToggleHeading?.(); }} className="fiip-light-editor-action rounded-xl p-2 text-warm-text-secondary-light transition-all hover:bg-black/[0.04] hover:text-warm-text-primary-light dark:hover:bg-white/10 dark:hover:text-white" title="Transformer en titre">
                        <Type size={16} />
                    </button>
                    <button type="button" onClick={onAttachFile} className="fiip-light-editor-action rounded-xl p-2 text-warm-text-secondary-light transition-all hover:bg-black/[0.04] hover:text-warm-text-primary-light dark:hover:bg-white/10 dark:hover:text-white" title="Joindre un fichier">
                        <ImageIcon size={16} />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    {isDictating && (
                        <div className="hidden max-w-56 truncate rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[10px] font-semibold text-red-600 dark:text-red-200 sm:block">
                            {dictationPreview || 'Dictée en direct...'}
                        </div>
                    )}
                    <TagPicker tags={note.tags || []} suggestions={tagSuggestions} onChange={onUpdateTags} />
                    <button type="button" onClick={onOpenLicense} className="fiip-light-editor-action rounded-xl p-2 text-warm-text-secondary-light transition-all hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-300" title="Licence Premium">
                        <Lock size={16} />
                    </button>
                </div>
            </div>

        </div>
    );
}
