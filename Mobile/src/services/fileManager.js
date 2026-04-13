import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import DocumentPicker, { types } from 'react-native-document-picker';

export async function calculateTotalUsage(notes) {
    let totalSize = 0;
    
    if (!notes || !Array.isArray(notes)) return 0;

    for (const note of notes) {
        // Text content size approximation
        totalSize += (note.title ? note.title.length : 0);
        totalSize += (note.content ? note.content.length : 0);

        if (note.attachments && Array.isArray(note.attachments)) {
            for (const att of note.attachments) {
                if (att.data) {
                    if (att.data.startsWith('data:')) {
                        // Base64 string estimation
                        totalSize += Math.ceil(att.data.length * 0.75); 
                    } else if (typeof att.data === 'string' && !att.data.startsWith('http')) {
                        // File path - size check with RNFS
                        try {
                            const fileStat = await RNFS.stat(att.data);
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

// Export note as Markdown
export async function exportNoteAsMarkdown(note) {
    try {
        const content = `# ${note.title}\n\n${note.content}\n\n---\n\n*Dernière modification : ${new Date(note.updatedAt).toLocaleString()}*`;
        const fileName = `${note.title ? note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'note'}.md`;
        const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

        await RNFS.writeFile(filePath, content, 'utf8');

        // Open share dialog
        await Share.open({
            title: `Exporter ${fileName}`,
            url: `file://${filePath}`,
            type: 'text/markdown',
        });

        return { success: true, path: filePath };
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

        const fileName = 'toutes-mes-notes.md';
        const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

        await RNFS.writeFile(filePath, content, 'utf8');

        await Share.open({
            title: 'Exporter toutes mes notes',
            url: `file://${filePath}`,
            type: 'text/markdown',
        });

        return { success: true, path: filePath, count: notes.length };
    } catch (error) {
        console.error('Export all error:', error);
        return { success: false, error: error.message };
    }
}

// Import markdown file
export async function importMarkdownFile() {
    try {
        const result = await DocumentPicker.pickSingle({
            type: [types.plainText, types.allFiles],
        });

        if (result && result.uri) {
            // DocumentPicker uri could point to cache or content resolver
            const content = await RNFS.readFile(result.uri, 'utf8');

            const fileName = result.name.replace(/\.md$|\.txt$/, '');
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
        if (DocumentPicker.isCancel(error)) {
            return { success: false, cancelled: true };
        }
        console.error('Import error:', error);
        return { success: false, error: error.message };
    }
}
