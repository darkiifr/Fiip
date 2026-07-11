import DOMPurify from 'dompurify';

function stripHtmlText(value = '') {
  return DOMPurify.sanitize(String(value || '').replace(/<\s*\/?(p|div|h[1-6]|li|ul|ol|br|blockquote|section|article)\b[^>]*>/gi, ' '), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildDexterNoteContext(currentNote) {
  if (!currentNote) {
    return 'Aucune note active.';
  }

  const attachmentOcr = (currentNote.attachments || [])
    .filter((attachment) => attachment?.ocrText)
    .slice(0, 8)
    .map((attachment, index) => {
      const name = attachment.name || `Piece jointe ${index + 1}`;
      const text = String(attachment.ocrText || '').replace(/\s+/g, ' ').trim().slice(0, 2500);
      return `- ${name}: ${text}`;
    })
    .join('\n');

  return [
    `Titre: ${currentNote.title || 'Sans titre'}`,
    `Contenu texte de la note:\n${stripHtmlText(currentNote.content || '') || '(vide)'}`,
    attachmentOcr ? `Textes OCR des pieces jointes:\n${attachmentOcr}` : 'Textes OCR des pieces jointes: aucun texte OCR disponible.',
  ].join('\n\n');
}
