import { writeTextFile, readTextFile, stat } from '@tauri-apps/plugin-fs';
import { save as saveDialog, open as openDialog } from '@tauri-apps/plugin-dialog';

export async function calculateTotalUsage(notes) {
    let totalSize = 0;
    
    if (!notes || !Array.isArray(notes)) return 0;

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
                        } catch (e) {
                            // File might be missing, ignore size
                        }
                    }
                }
            }
        }
    }
    return totalSize;
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
