export function stripNoteMarkup(content = ''): string {
  return String(content || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`~\-[\]()]/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getNoteMetrics(content = '') {
  const plainText = stripNoteMarkup(content);
  const words = plainText.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) || [];
  const wordCount = words.length;
  const readingTimeMinutes = wordCount === 0 ? 0 : Math.ceil(wordCount / 220);

  return {
    plainText,
    wordCount,
    readingTimeMinutes,
    readTimeLabel: `${readingTimeMinutes} min`,
  };
}
