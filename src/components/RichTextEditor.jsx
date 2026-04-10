import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import {
    Bold, Italic, Strikethrough,
    AlignLeft, AlignCenter, AlignRight,
    List, ListOrdered, Undo, Redo
} from 'lucide-react';
import React, { useEffect } from 'react';
import ToolbarCombobox from './ToolbarCombobox';

import FontFamily from '@tiptap/extension-font-family';
import { FontSize } from './FontSizeExtension';
import { detectLocalFonts } from '../utils/fontDetector';
import { getInstalledFonts } from '../services/fontStore';
import { LanguageToolExtension } from './LanguageToolExtension';






const MenuBar = ({ editor }) => {
    const [fonts, setFonts] = React.useState([
        { label: 'Défaut', value: 'Inter, sans-serif' },
        { label: 'Arial', value: 'Arial, sans-serif' },
        { label: 'Verdana', value: 'Verdana, sans-serif' },
        { label: 'Tahoma', value: 'Tahoma, sans-serif' },
        { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
        { label: 'Times New Roman', value: '"Times New Roman", serif' },
        { label: 'Georgia', value: 'Georgia, serif' },
        { label: 'Garamond', value: 'Garamond, serif' },
        { label: 'Courier New', value: '"Courier New", monospace' },
        { label: 'Consolas', value: 'Consolas, monospace' },
        { label: 'Comic Sans MS', value: '"Comic Sans MS", cursive' },
        { label: 'Impact', value: 'Impact, fantasy' },
        // Nouvelles polices
        { label: 'Helvetica', value: 'Helvetica, sans-serif' },
        { label: 'Roboto', value: 'Roboto, sans-serif' },
        { label: 'Open Sans', value: '"Open Sans", sans-serif' },
        { label: 'Lato', value: 'Lato, sans-serif' },
        { label: 'Montserrat', value: 'Montserrat, sans-serif' },
        { label: 'Poppins', value: 'Poppins, sans-serif' },
        { label: 'Source Sans Pro', value: '"Source Sans Pro", sans-serif' },
        { label: 'Raleway', value: 'Raleway, sans-serif' },
        { label: 'Playfair Display', value: '"Playfair Display", serif' },
        { label: 'Merriweather', value: 'Merriweather, serif' }
    ]);

    useEffect(() => {
        const loadAllFonts = async () => {
            const allFonts = [...fonts];
            const existingLabels = new Set(allFonts.map(f => f.label));

            // Load Custom .fiif fonts
            try {
                const fiifFonts = await getInstalledFonts();
                fiifFonts.forEach(f => {
                    if (!existingLabels.has(f.family)) {
                        allFonts.push({ label: f.family + ' (Fiip)', value: `'${f.family}', sans-serif` });
                        existingLabels.add(f.family);
                    }
                });
            } catch(e) {
                console.error("Failed to load embedded fonts in Editor:", e);
            }

            // Detect common fonts locally installed automatically without permission prompts
            const detected = detectLocalFonts();
            if (detected.length > 0) {
                const systemFonts = detected.map(font => ({ label: font, value: `"${font}", sans-serif` }));
                systemFonts.forEach(sysF => {
                    if (!existingLabels.has(sysF.label)) {
                        allFonts.push(sysF);
                    }
                });
            }
            setTimeout(() => setFonts(allFonts), 0);
        };
        loadAllFonts();
    }, [fonts]);

    const FONT_SIZES = [
        { label: '10px', value: '10px' },
        { label: '12px', value: '12px' },
        { label: '14px', value: '14px' },
        { label: '16px', value: '16px' },
        { label: '18px', value: '18px' },
        { label: '20px', value: '20px' },
        { label: '24px', value: '24px' },
        { label: '30px', value: '30px' },
        { label: '36px', value: '36px' },
    ];

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
        let size = val;
        if (/^\d+$/.test(size)) size += 'px';
        editor.chain().focus().setFontSize(size).run();
    };

    return (
        <div className="flex flex-wrap items-center gap-1 p-2 bg-white/5 border border-white/10 rounded-lg mb-4">
            <ToolbarCombobox 
                value={currentFont}
                onChange={handleFontChange}
                options={fonts}
                placeholder="Police..."
                styleProp="fontFamily"
                dropdownWidth={200}
            />
            
            <ToolbarCombobox 
                value={currentSize}
                onChange={handleSizeChange}
                options={FONT_SIZES}
                placeholder="Taille"
            />

            <div className="w-px h-5 bg-white/10 mx-2" />

            <button onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={!editor.can().chain().focus().toggleBold().run()}
                className={`p-1.5 rounded ${editor.isActive('bold') ? 'bg-indigo-500 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                title="Gras (Ctrl+B)"
            >
                <Bold size={16} />
            </button>
            <button onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={!editor.can().chain().focus().toggleItalic().run()}
                className={`p-1.5 rounded ${editor.isActive('italic') ? 'bg-indigo-500 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                title="Italique (Ctrl+I)"
            >
                <Italic size={16} />
            </button>
            <button onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().toggleStrike().run()}
                disabled={!editor.can().chain().focus().toggleStrike().run()}
                className={`p-1.5 rounded ${editor.isActive('strike') ? 'bg-indigo-500 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                title="Barré"
            >
                <Strikethrough size={16} />
            </button>

            <div className="w-px h-5 bg-white/10 mx-2" />

            <button onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className={`p-1.5 rounded ${editor.isActive({ textAlign: 'left' }) ? 'bg-indigo-500 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                title="Aligner � gauche"
            >
                <AlignLeft size={16} />
            </button>
            <button onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className={`p-1.5 rounded ${editor.isActive({ textAlign: 'center' }) ? 'bg-indigo-500 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                title="Centrer"
            >
                <AlignCenter size={16} />
            </button>
            <button onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                className={`p-1.5 rounded ${editor.isActive({ textAlign: 'right' }) ? 'bg-indigo-500 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                title="Aligner � droite"
            >
                <AlignRight size={16} />
            </button>

            <div className="w-px h-5 bg-white/10 mx-2" />

            <button onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-1.5 rounded ${editor.isActive('bulletList') ? 'bg-indigo-500 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                title="Liste � puces"
            >
                <List size={16} />
            </button>
            <button onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`p-1.5 rounded ${editor.isActive('orderedList') ? 'bg-indigo-500 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                title="Liste numérotée"
            >
                <ListOrdered size={16} />
            </button>

            <div className="w-px h-5 bg-white/10 mx-2" />

            <input
                type="color"
                onInput={event => editor.chain().focus().setColor(event.target.value).run()}
                value={editor.getAttributes('textStyle').color || '#ffffff'}
                className="w-8 h-8 p-0 border-0 rounded cursor-pointer bg-transparent"
                title="Couleur du texte"
            />
            <button onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().unsetColor().run()}
                className="p-1.5 rounded text-gray-300 hover:bg-white/10 text-xs font-medium"
                title="Couleur par défaut"
            >
                Auto
            </button>

            <div className="flex-1" />

            <button onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().chain().focus().undo().run()}
                className="p-1.5 rounded text-gray-300 hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-transparent"
                title="Annuler (Ctrl+Z)"
            >
                <Undo size={16} />
            </button>
            <button onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().chain().focus().redo().run()}
                className="p-1.5 rounded text-gray-300 hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-transparent"
                title="Rétablir (Ctrl+Y)"
            >
                <Redo size={16} />
            </button>
        </div>
    );
};


export default function RichTextEditor({ value, onChange, onKeyDown }) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
            FontFamily,
            FontSize,
            LanguageToolExtension,
        ],
        content: value,
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            if (onChange) {
                onChange({ target: { value: html } });
            }
        },
        editorProps: {
            attributes: {
                class: 'prose prose-invert max-w-none focus:outline-none min-h-[500px] text-gray-200 tiptap px-2 py-1'
            },
            handleKeyDown: (view, event) => {
                if (onKeyDown) {
                    onKeyDown(event);
                }
                return false; // let tiptap handle it too
            }
        }
    });

    // Handle external external value changes safely (e.g., when switching notes)
    useEffect(() => {
        if (editor && value !== undefined && value !== editor.getHTML()) {
            editor.commands.setContent(value);
        }
    }, [value, editor]);

    return (
        <div className="w-full flex-1 flex flex-col relative z-10 font-sans">
            <MenuBar editor={editor} />
            <EditorContent editor={editor} className="flex-1" />
        </div>
    );
}