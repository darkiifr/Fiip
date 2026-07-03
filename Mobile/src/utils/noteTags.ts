export interface FiipTag {
  id: string;
  label: string;
  icon?: string;
  color?: number;
}

export function slugifyTagLabel(label = '') {
  return String(label || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'tag';
}

export function normalizeNoteTags(tags: any[] = [], legacyBadges: string[] = []): FiipTag[] {
  const result = new Map<string, FiipTag>();
  const inputs = Array.isArray(tags) && tags.length > 0 ? tags : legacyBadges;

  inputs.forEach((tag) => {
    const label = typeof tag === 'string' ? tag : String(tag?.label || tag?.name || '').trim();
    if (!label) return;

    const id = typeof tag === 'object' && tag?.id ? String(tag.id) : slugifyTagLabel(label);
    result.set(id, {
      id,
      label,
      icon: typeof tag === 'object' ? tag.icon : undefined,
      color: typeof tag === 'object' ? tag.color : undefined,
    });
  });

  return Array.from(result.values());
}

export function serializeLegacyBadges(tags: FiipTag[] = []) {
  return tags.map((tag) => tag.label).filter(Boolean);
}
