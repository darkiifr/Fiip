export const DEFAULT_TAG_ICON = 'Tag';
export const DEFAULT_TAG_COLOR = 4;

export const TAG_COLOR_CLASSES = [
  { bg: 'bg-red-500/15', text: 'text-red-600 dark:text-red-300', border: 'border-red-500/25', dot: 'bg-red-500' },
  { bg: 'bg-orange-500/15', text: 'text-orange-600 dark:text-orange-300', border: 'border-orange-500/25', dot: 'bg-orange-500' },
  { bg: 'bg-yellow-500/15', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-500/25', dot: 'bg-yellow-500' },
  { bg: 'bg-green-500/15', text: 'text-green-700 dark:text-green-300', border: 'border-green-500/25', dot: 'bg-green-500' },
  { bg: 'bg-blue-500/15', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-500/25', dot: 'bg-blue-500' },
  { bg: 'bg-indigo-500/15', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-500/25', dot: 'bg-indigo-500' },
  { bg: 'bg-purple-500/15', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-500/25', dot: 'bg-purple-500' },
  { bg: 'bg-pink-500/15', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-500/25', dot: 'bg-pink-500' },
  { bg: 'bg-zinc-500/15', text: 'text-zinc-700 dark:text-zinc-300', border: 'border-zinc-500/25', dot: 'bg-zinc-500' },
];

export const TAG_SOLID_COLOR_CLASSES = [
  'bg-red-500',
  'bg-orange-500',
  'bg-yellow-500',
  'bg-green-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-zinc-500',
];

export function slugifyTagLabel(label = '') {
  return String(label)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `tag-${Date.now()}`;
}

export function createTag(label, overrides = {}) {
  const cleanLabel = String(label || '').trim();
  if (!cleanLabel) {return null;}
  const color = overrides.color ?? DEFAULT_TAG_COLOR;
  return {
    id: overrides.id || `tag-${slugifyTagLabel(cleanLabel)}`,
    label: cleanLabel,
    icon: overrides.icon || DEFAULT_TAG_ICON,
    color,
  };
}

export function normalizeNoteTags(tags = []) {
  const source = Array.isArray(tags) ? tags : [];
  const seen = new Set();
  const normalized = [];

  for (const item of source) {
    const tag = typeof item === 'string'
      ? createTag(item)
      : createTag(item?.label || item?.name || item?.id, {
          id: item?.id,
          icon: item?.icon,
          color: item?.color,
        });

    if (!tag) {continue;}
    const key = tag.label.toLowerCase();
    if (seen.has(key)) {continue;}
    seen.add(key);
    normalized.push(tag);
  }

  return normalized;
}

export function serializeNoteTags(tags = []) {
  return normalizeNoteTags(tags).map((tag) => ({
    id: tag.id,
    label: tag.label,
    icon: tag.icon || DEFAULT_TAG_ICON,
    color: tag.color ?? DEFAULT_TAG_COLOR,
  }));
}

export function getTagColorClasses(color) {
  const index = Number.isInteger(Number(color)) ? Number(color) : DEFAULT_TAG_COLOR;
  return TAG_COLOR_CLASSES[index] || TAG_COLOR_CLASSES[DEFAULT_TAG_COLOR];
}
