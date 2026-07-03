import { HocuspocusProvider } from '@hocuspocus/provider';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import { Color } from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
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
import { getSafePublicUrl } from '../utils/safeUrl';

import { FontSize } from './FontSizeExtension';
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

const URL_PATTERN = /https?:\/\/[^\s<>"']+/i;

async function openExternalUrl(url) {
    try {
        const { openUrl } = await import('@tauri-apps/plugin-opener');
        await openUrl(url);
    } catch {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
}

export function normalizeOverextendedLinks(html = '') {
    if (!html || typeof DOMParser === 'undefined') return html;

    const document = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
    document.body.querySelectorAll('a[href]').forEach((link) => {
        const text = link.textContent || '';
        const match = text.match(URL_PATTERN);
        if (!match || match.index === undefined) return;

        const url = match[0].replace(/[.,;:!?)]$/, '');
        const href = link.getAttribute('href') || '';
        if (!href.includes(url) && !url.includes(href)) return;

        const prefix = text.slice(0, match.index);
        const suffix = text.slice(match.index + match[0].length);
        if (!suffix.trim()) return;

        const replacement = document.createDocumentFragment();
        if (prefix) replacement.append(document.createTextNode(prefix));

        const cleanLink = document.createElement('a');
        cleanLink.setAttribute('href', href);
        cleanLink.textContent = url;
        replacement.append(cleanLink);
        replacement.append(document.createTextNode(suffix));
        link.replaceWith(replacement);
    });

    return document.body.innerHTML;
}

export function handleEditorLinkClick(event) {
    const target = event.target?.nodeType === Node.ELEMENT_NODE ? event.target : event.target?.parentElement;
    const link = target?.closest?.('a[href]');
    if (!link) return false;

    event.preventDefault();
    event.stopPropagation();

    if (!event.ctrlKey && !event.metaKey) {
        return true;
    }

    const safeUrl = getSafePublicUrl(link.getAttribute('href') || '');
    if (safeUrl) {
        void openExternalUrl(safeUrl);
    }
    return true;
}

function ToolbarButton({ active, children, className = '', ...props }) {
    return (
        <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            className={`p-1.5 rounded-lg transition-all ${active ? 'bg-amber-500 text-white' : 'text-warm-text-muted-dark dark:text-warm-text-muted-dark hover:bg-warm-sidebar-item-active dark:hover:bg-white/10'} disabled:opacity-45 ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}

function ColorPickerPopover({ editor }) {
    const currentColor = editor.getAttributes('textStyle').color || '#1C1C1E';
    const selectionRef = React.useRef(null);

    const rememberSelection = () => {
        selectionRef.current = {
            from: editor.state.selection.from,
            to: editor.state.selection.to,
        };
    };

    const applyColor = (color) => {
        const selection = selectionRef.current;
        const chain = editor.chain();
        if (selection && selection.from !== selection.to) {
            chain.setTextSelection(selection);
        }
        chain.setColor(color).run();
    };

    const unsetColor = () => {
        const selection = selectionRef.current;
        const chain = editor.chain();
        if (selection && selection.from !== selection.to) {
            chain.setTextSelection(selection);
        }
        chain.unsetColor().run();
    };

    return (
        <div className="flex items-center gap-1">
            <label
                className="h-8 px-2 rounded-lg border border-warm-border-dark dark:border-warm-border-dark bg-warm-card-dark dark:bg-zinc-900 text-warm-text-primary-dark dark:text-warm-text-primary-dark hover:bg-warm-sidebar-item-active dark:hover:bg-zinc-800 transition-all flex items-center gap-2 cursor-pointer"
                title="Couleur du texte"
            >
                <input
                    type="color"
                    value={/^#[0-9a-f]{6}$/i.test(currentColor) ? currentColor : '#1C1C1E'}
                    onPointerDown={(event) => {
                        event.stopPropagation();
                        rememberSelection();
                    }}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => applyColor(event.target.value)}
                    className="h-4 w-4 cursor-pointer rounded-full border border-black/10 bg-transparent p-0 dark:border-white/10"
                    aria-label="Couleur du texte"
                />
                <Pipette size={14} />
            </label>
            <button
                type="button"
                onMouseDown={(event) => {
                    event.preventDefault();
                    rememberSelection();
                }}
                onClick={unsetColor}
                className="h-8 rounded-lg border border-warm-border-dark px-2 text-[10px] font-bold text-warm-text-muted-dark transition-all hover:bg-warm-sidebar-item-active dark:border-warm-border-dark dark:hover:bg-white/10"
            >
                Auto
            </button>
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
        <div className="flex flex-wrap items-center gap-1 p-2 bg-warm-card-dark dark:bg-zinc-900/70 border border-warm-border-dark dark:border-warm-border-dark rounded-xl mb-4">
            <ToolbarCombobox value={currentFont} onChange={handleFontChange} options={fonts} placeholder="Police" styleProp="fontFamily" dropdownWidth={220} />
            <ToolbarCombobox value={currentSize} onChange={handleSizeChange} options={FONT_SIZES} placeholder="Taille" />

            <div className="w-px h-5 bg-warm-border-dark dark:bg-warm-border-dark mx-2" />

            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Gras (Ctrl+B)">
                <Bold size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italique (Ctrl+I)">
                <Italic size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editor.can().chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Barré">
                <Strikethrough size={16} />
            </ToolbarButton>

            <div className="w-px h-5 bg-warm-border-dark dark:bg-warm-border-dark mx-2" />

            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Aligner à gauche">
                <AlignLeft size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Centrer">
                <AlignCenter size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Aligner à droite">
                <AlignRight size={16} />
            </ToolbarButton>

            <div className="w-px h-5 bg-warm-border-dark dark:bg-warm-border-dark mx-2" />

            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Liste à puces">
                <List size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Liste numérotée">
                <ListOrdered size={16} />
            </ToolbarButton>

            <div className="w-px h-5 bg-warm-border-dark dark:bg-warm-border-dark mx-2" />
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
    const suppressUpdateRef = React.useRef(true);
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
        suppressUpdateRef.current = true;
        const timer = window.setTimeout(() => {
            suppressUpdateRef.current = false;
        }, 0);
        return () => window.clearTimeout(timer);
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
            Link.configure({
                openOnClick: false,
                autolink: false,
                linkOnPaste: true,
                HTMLAttributes: {
                    rel: 'noopener noreferrer nofollow',
                    target: '_blank',
                },
            }),
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
        ],
        content: normalizeOverextendedLinks(value),
        onUpdate: ({ editor }) => {
            if (suppressUpdateRef.current) {
                return;
            }
            if (onChange) {
                onChange({ target: { value: normalizeOverextendedLinks(editor.getHTML()) } });
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
            },
            handleDOMEvents: {
                click: (_view, event) => handleEditorLinkClick(event),
            },
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
        const normalizedValue = normalizeOverextendedLinks(value);
        if (editor && normalizedValue !== undefined && normalizedValue !== editor.getHTML() && !editor.isFocused) {
            suppressUpdateRef.current = true;
            editor.commands.setContent(normalizedValue);
            window.setTimeout(() => {
                suppressUpdateRef.current = false;
            }, 0);
        }
    }, [value, editor]);

    return (
        <div className="w-full flex-1 flex flex-col relative z-10 font-sans">
            <MenuBar editor={editor} />
            <EditorContent editor={editor} className="flex-1" />
        </div>
    );
});
