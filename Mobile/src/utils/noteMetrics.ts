const BLOCKED_TAGS = new Set(['script', 'style']);

function tagName(token: string): { closing: boolean; name: string } {
  let index = 0;
  while (token[index] === ' ' || token[index] === '\t' || token[index] === '\n') index += 1;
  const closing = token[index] === '/';
  if (closing) index += 1;
  while (token[index] === ' ' || token[index] === '\t' || token[index] === '\n') index += 1;
  let name = '';
  while (index < token.length) {
    const char = token[index].toLowerCase();
    const code = char.charCodeAt(0);
    const allowed = (code >= 97 && code <= 122) || (code >= 48 && code <= 57) || char === ':' || char === '-';
    if (!allowed) break;
    name += char;
    index += 1;
  }
  return { closing, name };
}

function findTagEnd(value: string, start: number): number {
  let quote = '';
  for (let index = start; index < value.length; index += 1) {
    const char = value[index];
    if (quote) {
      if (char === quote) quote = '';
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '>') {
      return index;
    }
  }
  return -1;
}

function stripHtml(content: string): string {
  let output = '';
  let blockedTag = '';
  let index = 0;
  while (index < content.length) {
    if (content[index] !== '<') {
      if (!blockedTag) output += content[index];
      index += 1;
      continue;
    }
    const end = findTagEnd(content, index + 1);
    if (end < 0) {
      if (!blockedTag) output += ' ';
      break;
    }
    const tag = tagName(content.slice(index + 1, end));
    if (tag.closing && tag.name === blockedTag) blockedTag = '';
    else if (!tag.closing && BLOCKED_TAGS.has(tag.name)) blockedTag = tag.name;
    if (!blockedTag) output += ' ';
    index = end + 1;
  }
  return output;
}

function decodeCommonEntities(value: string): string {
  const entities: Record<string, string> = {
    amp: '&', apos: "'", gt: '>', lt: '<', nbsp: ' ', quot: '"', '#39': "'",
  };
  return value.replace(/&([a-z]+|#39);/gi, (match, name: string) => entities[name.toLowerCase()] ?? match);
}

export function stripNoteMarkup(content = ''): string {
  return decodeCommonEntities(stripHtml(String(content || '')))
    .replace(/[#>*_`~\-[\]()]/g, ' ')
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
