import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import { save as saveDialog, open as openDialog } from '@tauri-apps/plugin-dialog';

// Export note as Markdown
export async function exportNoteAsMarkdown(note) {
    try {
        const content = `# ${note.title}\n\n${note.content}\n\n---\n\n*Last updated: ${new Date(note.updatedAt).toLocaleString()}*`;

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
        return { success: false, error: error.message };
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
