import DOMPurify from 'dompurify';

function getReadableText(root) {
  const pieces = [];
  const visit = (node) => {
    if (node.nodeType === 3 && node.nodeValue) {
      pieces.push(node.nodeValue);
    }
    node.childNodes?.forEach(visit);
  };
  visit(root);
  return pieces.join(' ').replace(/\s+/g, ' ').trim();
}

export function stripNoteText(content = '') {
  const sanitized = DOMPurify.sanitize(String(content), {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
    ALLOWED_ATTR: [],
  });
  if (typeof DOMParser === 'undefined') {
    return sanitized.replaceAll('<', ' ').replaceAll('>', ' ').replace(/\s+/g, ' ').trim();
  }
  const parsed = new DOMParser().parseFromString(sanitized, 'text/html');
  return getReadableText(parsed.body);
}

function countCjkCharacters(text = '') {
  return (String(text).match(/[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/g) || []).length;
}

function countMatches(content = '', pattern) {
  return (String(content).match(pattern) || []).length;
}

export function getNoteStats(note = {}) {
  const rawContent = String(note.content || '');
  const text = stripNoteText(rawContent);
  const latinText = text.replace(/[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/g, ' ');
  const words = latinText ? latinText.split(/\s+/).filter(Boolean) : [];
  const cjkCharacters = countCjkCharacters(text);
  const wordCount = words.length;
  const readableUnits = wordCount + Math.ceil(cjkCharacters / 2.2);
  const codeBlocks = countMatches(rawContent, /<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>/gi);
  const embeddedMediaCount = countMatches(rawContent, /<(img|video|audio)\b/gi);
  const attachmentCount = Array.isArray(note.attachments) ? note.attachments.length : 0;
  const mediaCount = embeddedMediaCount + attachmentCount;
  const headingCount = countMatches(rawContent, /<h[1-6]\b/gi);
  const seconds = readableUnits > 0
    ? Math.ceil((readableUnits / 230) * 60 + codeBlocks * 20 + mediaCount * 12 + headingCount * 3)
    : 0;
  const readTime = seconds > 0 ? Math.max(1, Math.ceil(seconds / 60)) : null;

  return {
    wordCount,
    characterCount: text.length,
    cjkCharacters,
    mediaCount,
    codeBlocks,
    readSeconds: seconds,
    readTime,
    readTimeLabel: readTime ? `${readTime} min de lecture` : '',
    hasReadableText: readableUnits > 0,
  };
}

export function pickFeaturedNote(notes = []) {
  const candidates = notes.filter((note) => note && !note.deleted);

  return candidates
    .map((note) => {
      const stats = getNoteStats(note);
      const updatedAt = Number(note.updatedAt || note.updated_at || note.createdAt || 0);
      const titleBonus = stripNoteText(note.title || '').length > 0 ? 15 : 0;
      const recencyAgeHours = updatedAt ? Math.max(0, (Date.now() - updatedAt) / 36e5) : 9999;
      const recencyScore = Math.max(0, 180 - recencyAgeHours);
      const contentScore = Math.min(stats.wordCount + stats.characterCount / 12, 600);
      const favoriteBonus = note.favorite || note.is_favorite ? 900 : 0;
      const attachmentBonus = Math.min((stats.mediaCount || 0) * 35, 140);
      const tagBonus = Array.isArray(note.tags) && note.tags.length ? Math.min(note.tags.length * 12, 60) : 0;

      return {
        note,
        score: favoriteBonus + titleBonus + contentScore + attachmentBonus + tagBonus + recencyScore,
      };
    })
    .filter(({ note }) => {
      const stats = getNoteStats(note);
      return stats.hasReadableText || stripNoteText(note.title || '').length > 0;
    })
    .sort((a, b) => b.score - a.score)[0]?.note || candidates[0] || null;
}
