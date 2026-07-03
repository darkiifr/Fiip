import { save as saveDialog, open as openDialog } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile, stat } from '@tauri-apps/plugin-fs';

const FIIN_EXTENSION_PATTERN = /\.fiin$/i;

function sanitizeFileName(value = 'note') {
    return String(value || 'note')
        .split('')
        .map((char) => (char.charCodeAt(0) < 32 || /[<>:"/\\|?*]/.test(char) ? '-' : char))
        .join('')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80) || 'note';
}

function coerceTimestamp(value, fallback) {
    if (!value) {
        return fallback;
    }
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) {
        return numeric;
    }
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function normalizeFiinNotePayload(input, { now = Date.now, randomUUID = () => crypto.randomUUID() } = {}) {
    const raw = typeof input === 'string' ? JSON.parse(input) : input;
    const note = raw?.note && typeof raw.note === 'object' ? raw.note : raw;

    if (!note || typeof note !== 'object' || Array.isArray(note)) {
        throw new Error('Fichier .fiin invalide.');
    }

    const title = String(note.title || note.name || '').trim();
    const content = typeof note.content === 'string' ? note.content : '';

    if (!title && !content) {
        throw new Error('Le fichier .fiin ne contient pas de note lisible.');
    }

    const fallbackNow = now();
    const updatedAt = coerceTimestamp(note.updatedAt || note.updated_at || note.createdAt || note.created_at, fallbackNow);
    const createdAt = coerceTimestamp(note.createdAt || note.created_at, updatedAt);

    return {
        ...note,
        id: randomUUID(),
        title: title || 'Note importée',
        content,
        updatedAt,
        createdAt,
        favorite: Boolean(note.favorite),
        deleted: false,
        public_slug: null,
        public: false,
        tags: Array.isArray(note.tags) ? note.tags : [],
        attachments: Array.isArray(note.attachments) ? note.attachments : [],
    };
}

export function isFiinPath(path = '') {
    return FIIN_EXTENSION_PATTERN.test(String(path).split(/[?#]/)[0]);
}

export async function calculateTotalUsage(notes) {
    let totalSize = 0;
    
    if (!notes || !Array.isArray(notes)) {return 0;}

    for (const note of notes) {
        // Text content size (UTF-16 characters = 2 bytes usually, but simple length approximation)
        totalSize += (note.title ? note.title.length : 0);
        totalSize += (note.content ? note.content.length : 0);

        if (note.attachments && Array.isArray(note.attachments)) {
            for (const att of note.attachments) {
                if (att.data) {
                    if (att.data.startsWith('data:')) {
                        // Base64 string: Length * 0.75 is roughly bytes
                        totalSize += Math.ceil(att.data.length * 0.75); 
                    } else if (typeof att.data === 'string' && !att.data.startsWith('http')) {
                        // File path
                        try {
                            const fileStat = await stat(att.data);
                            totalSize += fileStat.size;
                        } catch {
                            // File might be missing, ignore size
                        }
                    }
                }
            }
        }
    }
    return totalSize;
}

export async function importFiinFromPath(filePath, { readText = readTextFile, now, randomUUID } = {}) {
    if (!isFiinPath(filePath)) {
        throw new Error('Seuls les fichiers .fiin peuvent être importés.');
    }

    const content = await readText(filePath);
    return normalizeFiinNotePayload(content, { now, randomUUID });
}

export async function exportNoteAsFiin(note, {
    save = saveDialog,
    writeText = writeTextFile,
    now = () => new Date(),
} = {}) {
    try {
        const timestamp = now().toISOString();
        const payload = {
            version: 1,
            exported_at: timestamp,
            note: {
                id: note.id,
                title: note.title || 'Sans titre',
                content: note.content || '',
                tags: Array.isArray(note.tags) ? note.tags : [],
                attachments: Array.isArray(note.attachments) ? note.attachments : [],
                favorite: Boolean(note.favorite),
                createdAt: note.createdAt || note.created_at || note.updatedAt || Date.now(),
                updatedAt: note.updatedAt || note.updated_at || Date.now(),
            },
        };

        const filePath = await save({
            defaultPath: `${sanitizeFileName(note.title || 'note')}.fiin`,
            filters: [{
                name: 'Fiip Note',
                extensions: ['fiin'],
            }],
        });

        if (!filePath) {
            return { success: false, cancelled: true };
        }

        await writeText(filePath, JSON.stringify(payload, null, 2));
        return { success: true, path: filePath };
    } catch (error) {
        console.error('Export .fiin error:', error);
        return { success: false, error: error.message || String(error) };
    }
}

// Export note as Markdown
export async function exportNoteAsMarkdown(note) {
    try {
        const content = `# ${note.title}\n\n${note.content}\n\n---\n\n*Dernière modification : ${new Date(note.updatedAt).toLocaleString()}*`;

        // Open save dialog
        const filePath = await saveDialog({
            defaultPath: `${note.title || 'note'}.md`,
            filters: [{
                name: 'Markdown',
                extensions: ['md']
            }]
        });

        if (filePath) {
            await writeTextFile(filePath, content);
            return { success: true, path: filePath };
        }
        return { success: false, cancelled: true };
    } catch (error) {
        console.error('Export error:', error);
        return { success: false, error: error.message || String(error) };
    }
}

// Export all notes
export async function exportAllNotes(notes) {
    try {
        let content = '# Mes Notes Fiip\n\n';
        content += `Exporté le ${new Date().toLocaleString()}\n\n`;
        content += `---\n\n`;

        notes.forEach((note, index) => {
            content += `## ${note.title || `Note ${index + 1}`}\n\n`;
            content += `${note.content}\n\n`;
            content += `*Dernière modification: ${new Date(note.updatedAt).toLocaleString()}*\n\n`;
            content += `---\n\n`;
        });

        const filePath = await saveDialog({
            defaultPath: 'toutes-mes-notes.md',
            filters: [{
                name: 'Markdown',
                extensions: ['md']
            }]
        });

        if (filePath) {
            await writeTextFile(filePath, content);
            return { success: true, path: filePath, count: notes.length };
        }
        return { success: false, cancelled: true };
    } catch (error) {
        console.error('Export all error:', error);
        return { success: false, error: error.message };
    }
}

// Import markdown file
export async function importMarkdownFile() {
    try {
        const filePath = await openDialog({
            multiple: false,
            filters: [{
                name: 'Markdown',
                extensions: ['md', 'txt']
            }]
        });

        if (filePath) {
            const content = await readTextFile(filePath);

            // Extract title from file name or first line
            const fileName = filePath.split(/[\\/]/).pop().replace(/\\.md$|\.txt$/, '');
            const lines = content.split('\n');
            let title = fileName;
            let noteContent = content;

            // Check if first line is a title (starts with #)
            if (lines[0]?.startsWith('# ')) {
                title = lines[0].replace('# ', '').trim();
                noteContent = lines.slice(1).join('\n').trim();
            }

            return {
                success: true,
                note: {
                    id: Date.now().toString(),
                    title,
                    content: noteContent,
                    updatedAt: Date.now()
                }
            };
        }
        return { success: false, cancelled: true };
    } catch (error) {
        console.error('Import error:', error);
        return { success: false, error: error.message };
    }
}
