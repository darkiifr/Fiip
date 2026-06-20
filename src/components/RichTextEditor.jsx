import { HocuspocusProvider } from '@hocuspocus/provider';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import { Color } from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
    Bold, Italic, Strikethrough,
    AlignLeft, AlignCenter, AlignRight,
    List, ListOrdered, Undo, Redo, Pipette
} from 'lucide-react';
import React, { useEffect } from 'react';
import * as Y from 'yjs';

import { getCollaborationEndpoint } from '../services/collaborationEndpoint';
import { getInstalledFonts } from '../services/fontStore';
import { detectLocalFonts } from '../utils/fontDetector';

import { FontSize } from './FontSizeExtension';
import { LanguageToolExtension } from './LanguageToolExtension';
import ToolbarCombobox from './ToolbarCombobox';

const BASE_FONTS = [
    { label: 'Défaut', value: 'Inter, sans-serif' },
    { label: 'Geist', value: 'Geist, Inter, sans-serif' },
    { label: 'Figtree', value: 'Figtree, Inter, sans-serif' },
    { label: 'Host Grotesk', value: '"Host Grotesk", Geist, sans-serif' },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Times New Roman', value: '"Times New Roman", serif' },
    { label: 'Consolas', value: 'Consolas, monospace' },
];

const FONT_SIZES = [
    { label: '12px', value: '12px' },
    { label: '14px', value: '14px' },
    { label: '16px', value: '16px' },
    { label: '18px', value: '18px' },
    { label: '20px', value: '20px' },
    { label: '24px', value: '24px' },
    { label: '30px', value: '30px' },
];

const COLOR_PRESETS = ['#1C1C1E', '#F5F5F7', '#D97706', '#2563EB', '#16A34A', '#DC2626', '#9333EA', '#0891B2'];

function ToolbarButton({ active, children, className = '', ...props }) {
    return (
        <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            className={`p-1.5 rounded-lg transition-all ${active ? 'bg-amber-500 text-white' : 'text-warm-text-muted-light dark:text-warm-text-muted-dark hover:bg-warm-sidebar-item-active dark:hover:bg-white/10'} disabled:opacity-45 ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}

function ColorPickerPopover({ editor }) {
    const [open, setOpen] = React.useState(false);
    const currentColor = editor.getAttributes('textStyle').color || '#1C1C1E';
    const [draft, setDraft] = React.useState(currentColor);

    React.useEffect(() => {
        setDraft(currentColor);
    }, [currentColor]);

    const recentColors = (() => {
        try {
            return JSON.parse(localStorage.getItem('fiip-recent-colors') || '[]');
        } catch {
            return [];
        }
    })();

    const applyColor = (color) => {
        setDraft(color);
        editor.chain().focus().setColor(color).run();
        localStorage.setItem('fiip-recent-colors', JSON.stringify([color, ...recentColors.filter((item) => item !== color)].slice(0, 8)));
    };

    return (
        <div className="relative">
            <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setOpen((value) => !value)}
                className="h-8 px-2 rounded-lg border border-warm-border-light dark:border-warm-border-dark bg-warm-card-light dark:bg-zinc-900 text-warm-text-primary-light dark:text-warm-text-primary-dark hover:bg-warm-sidebar-item-active dark:hover:bg-zinc-800 transition-all flex items-center gap-2"
                title="Couleur du texte"
            >
                <span className="h-4 w-4 rounded-full border border-black/10 dark:border-white/10" style={{ backgroundColor: currentColor }} />
                <Pipette size={14} />
            </button>
            {open && (
                <div className="absolute top-10 left-0 z-50 w-52 rounded-2xl border border-warm-border-light dark:border-warm-border-dark bg-white/95 dark:bg-zinc-950/95 p-2.5 shadow-2xl backdrop-blur-2xl">
                    <div className="grid grid-cols-8 gap-1">
                        {COLOR_PRESETS.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => applyColor(color)}
                                className="h-5 w-5 rounded-full border border-black/10 dark:border-white/10 transition-transform hover:scale-110"
                                style={{ backgroundColor: color }}
                                aria-label={`Appliquer ${color}`}
                            />
                        ))}
                    </div>
                    {recentColors.length > 0 && (
                        <div className="mt-3 border-t border-warm-border-light dark:border-warm-border-dark pt-2">
                            <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-warm-text-muted-light">Récentes</p>
                            <div className="flex flex-wrap gap-1.5">
                                {recentColors.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => applyColor(color)}
                                        className="h-5 w-5 rounded-full border border-black/10 dark:border-white/10"
                                        style={{ backgroundColor: color }}
                                        aria-label={`Réutiliser ${color}`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                        <input
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            className="min-w-0 flex-1 rounded-lg border border-warm-border-light dark:border-warm-border-dark bg-warm-card-light dark:bg-zinc-900 px-2 py-1.5 text-xs font-mono text-warm-text-primary-light dark:text-warm-text-primary-dark outline-none"
                            placeholder="#D97706"
                        />
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => /^#[0-9a-f]{6}$/i.test(draft) && applyColor(draft)}
                            className="rounded-lg bg-zinc-950 px-2.5 py-1.5 text-[10px] font-bold text-white dark:bg-white dark:text-zinc-950"
                        >
                            OK
                        </button>
                    </div>
                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                            editor.chain().focus().unsetColor().run();
                            setOpen(false);
                        }}
                        className="mt-2 w-full rounded-lg border border-warm-border-light dark:border-warm-border-dark px-2 py-1.5 text-[10px] font-bold text-warm-text-secondary-light dark:text-warm-text-secondary-dark hover:bg-warm-sidebar-item-active"
                    >
                        Couleur automatique
                    </button>
                </div>
            )}
        </div>
    );
}

const MenuBar = ({ editor }) => {
    const [fonts, setFonts] = React.useState(BASE_FONTS);

    useEffect(() => {
        const loadAllFonts = async () => {
            const allFonts = [...BASE_FONTS];
            const existingLabels = new Set(allFonts.map(f => f.label));

            try {
                const fiifFonts = await getInstalledFonts();
                fiifFonts.forEach(f => {
                    if (!existingLabels.has(f.family)) {
                        allFonts.push({ label: `${f.family} (Fiip)`, value: `"${f.family} (Fiip)", sans-serif` });
                        existingLabels.add(f.family);
                    }
                });
            } catch(e) {
                console.error("Failed to load embedded fonts in Editor:", e);
            }

            detectLocalFonts().forEach(font => {
                if (!existingLabels.has(font)) {
                    allFonts.push({ label: font, value: `"${font}", sans-serif` });
                    existingLabels.add(font);
                }
            });
            setFonts(allFonts);
        };
        loadAllFonts();
    }, []);

    if (!editor) {
        return null;
    }

    const currentFont = editor.getAttributes('textStyle').fontFamily || 'Inter, sans-serif';
    const currentSize = editor.getAttributes('textStyle').fontSize || '16px';

    const handleFontChange = (val) => {
        if (val === 'Inter, sans-serif' || !val) {
            editor.chain().focus().unsetFontFamily().run();
        } else {
            editor.chain().focus().setFontFamily(val).run();
        }
    };

    const handleSizeChange = (val) => {
        if (!val) {
            editor.chain().focus().unsetFontSize().run();
            return;
        }
        editor.chain().focus().setFontSize(/^\d+$/.test(val) ? `${val}px` : val).run();
    };

    return (
        <div className="flex flex-wrap items-center gap-1 p-2 bg-warm-card-light dark:bg-zinc-900/70 border border-warm-border-light dark:border-warm-border-dark rounded-xl mb-4">
            <ToolbarCombobox value={currentFont} onChange={handleFontChange} options={fonts} placeholder="Police" styleProp="fontFamily" dropdownWidth={220} />
            <ToolbarCombobox value={currentSize} onChange={handleSizeChange} options={FONT_SIZES} placeholder="Taille" />

            <div className="w-px h-5 bg-warm-border-light dark:bg-warm-border-dark mx-2" />

            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Gras (Ctrl+B)">
                <Bold size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italique (Ctrl+I)">
                <Italic size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editor.can().chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Barré">
                <Strikethrough size={16} />
            </ToolbarButton>

            <div className="w-px h-5 bg-warm-border-light dark:bg-warm-border-dark mx-2" />

            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Aligner à gauche">
                <AlignLeft size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Centrer">
                <AlignCenter size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Aligner à droite">
                <AlignRight size={16} />
            </ToolbarButton>

            <div className="w-px h-5 bg-warm-border-light dark:bg-warm-border-dark mx-2" />

            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Liste à puces">
                <List size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Liste numérotée">
                <ListOrdered size={16} />
            </ToolbarButton>

            <div className="w-px h-5 bg-warm-border-light dark:bg-warm-border-dark mx-2" />
            <ColorPickerPopover editor={editor} />
            <div className="flex-1" />

            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().chain().focus().undo().run()} title="Annuler (Ctrl+Z)">
                <Undo size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().chain().focus().redo().run()} title="Rétablir (Ctrl+Y)">
                <Redo size={16} />
            </ToolbarButton>
        </div>
    );
};

export default React.forwardRef(function RichTextEditor({ value, onChange, onKeyDown, spellcheck = true, noteId, user }, ref) {
    const { ydoc, provider } = React.useMemo(() => {
        const doc = new Y.Doc();
        const endpoint = getCollaborationEndpoint(import.meta.env.VITE_HOCUSPOCUS_URL);
        const prov = endpoint ? new HocuspocusProvider({
            url: endpoint,
            name: `fiip-v2-${noteId || 'default'}`,
            document: doc,
        }) : null;
        return { ydoc: doc, provider: prov };
    }, [noteId]);

    useEffect(() => {
        return () => {
            provider?.destroy();
            ydoc?.destroy();
        };
    }, [provider, ydoc]);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ history: false }),
            Underline,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
            FontFamily,
            FontSize,
            Collaboration.configure({ document: ydoc }),
            ...(provider ? [CollaborationCaret.configure({
                provider,
                user: {
                    name: user?.user_metadata?.username || 'Anonyme',
                    color: user?.user_metadata?.accent_color || '#00bfff'
                }
            })] : []),
            ...(spellcheck ? [LanguageToolExtension] : []),
        ],
        content: value,
        onUpdate: ({ editor }) => {
            if (onChange) {
                onChange({ target: { value: editor.getHTML() } });
            }
        },
        editorProps: {
            attributes: {
                class: 'prose max-w-none focus:outline-none min-h-[500px] tiptap px-2 py-1',
                spellcheck: spellcheck ? 'true' : 'false',
                lang: 'fr-FR'
            },
            handleKeyDown: (_view, event) => {
                if (onKeyDown) {
                    onKeyDown(event);
                }
                return false;
            }
        }
    });

    React.useImperativeHandle(ref, () => ({
        getEditor: () => editor,
        insertText: (text) => {
            if (editor) {
                editor.commands.insertContent(text);
            }
        }
    }), [editor]);

    useEffect(() => {
        if (editor && value !== undefined && value !== editor.getHTML() && !editor.isFocused) {
            editor.commands.setContent(value);
        }
    }, [value, editor]);

    return (
        <div className="w-full flex-1 flex flex-col relative z-10 font-sans">
            <MenuBar editor={editor} />
            <EditorContent editor={editor} className="flex-1" />
        </div>
    );
});
