export interface FiipTag {
  id: string;
  label: string;
  icon?: string;
  color?: number;
}

type NoteTagInput = FiipTag | { id?: unknown; label?: unknown; name?: unknown; icon?: unknown; color?: unknown } | string;

export function slugifyTagLabel(label = '') {
  return String(label || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'tag';
}

function isTagObject(tag: NoteTagInput): tag is Exclude<NoteTagInput, string> {
  return typeof tag === 'object' && tag !== null;
}

export function normalizeNoteTags(tags: NoteTagInput[] = [], legacyBadges: string[] = []): FiipTag[] {
  const result = new Map<string, FiipTag>();
  const inputs = Array.isArray(tags) && tags.length > 0 ? tags : legacyBadges;

  inputs.forEach((tag) => {
    const legacyName = isTagObject(tag) && 'name' in tag ? tag.name : '';
    const label = typeof tag === 'string' ? tag : String(tag.label || legacyName || '').trim();
    if (!label) return;

    const id = isTagObject(tag) && tag.id ? String(tag.id) : slugifyTagLabel(label);
    result.set(id, {
      id,
      label,
      icon: isTagObject(tag) && typeof tag.icon === 'string' ? tag.icon : undefined,
      color: isTagObject(tag) && typeof tag.color === 'number' ? tag.color : undefined,
    });
  });

  return Array.from(result.values());
}

export function serializeLegacyBadges(tags: FiipTag[] = []) {
  return tags.map((tag) => tag.label).filter(Boolean);
}
