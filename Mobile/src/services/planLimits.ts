export const PLAN_LEVELS = {
  FREE: 0,
  BASIC: 1,
  PRO: 2,
  AI: 3,
  FAMILY_PRO: 4,
} as const;

export const PLAN_LIMITS = {
  FREE: {
    notes: 5,
    notesStorageBytes: 5 * 1024 * 1024,
    attachmentStorageBytes: 5 * 1024 * 1024,
    maxNoteBytes: 512 * 1024,
    maxAttachmentBytes: 5 * 1024 * 1024,
    attachmentsPerNote: 1,
    publicShares: 0,
    collaborators: 0,
  },
  BASIC: {
    notes: 100,
    notesStorageBytes: 100 * 1024 * 1024,
    attachmentStorageBytes: 2 * 1024 * 1024 * 1024,
    maxNoteBytes: 5 * 1024 * 1024,
    maxAttachmentBytes: 250 * 1024 * 1024,
    attachmentsPerNote: 5,
    publicShares: 10,
    collaborators: 3,
  },
  PRO: {
    notes: 1000,
    notesStorageBytes: 1024 * 1024 * 1024,
    attachmentStorageBytes: 25 * 1024 * 1024 * 1024,
    maxNoteBytes: 25 * 1024 * 1024,
    maxAttachmentBytes: 2 * 1024 * 1024 * 1024,
    attachmentsPerNote: 25,
    publicShares: 100,
    collaborators: 25,
  },
  AI: {
    notes: 1000,
    notesStorageBytes: 1024 * 1024 * 1024,
    attachmentStorageBytes: 25 * 1024 * 1024 * 1024,
    maxNoteBytes: 25 * 1024 * 1024,
    maxAttachmentBytes: 2 * 1024 * 1024 * 1024,
    attachmentsPerNote: 25,
    publicShares: 100,
    collaborators: 25,
  },
  FAMILY_PRO: {
    notes: Number.POSITIVE_INFINITY,
    notesStorageBytes: 5 * 1024 * 1024 * 1024,
    attachmentStorageBytes: 100 * 1024 * 1024 * 1024,
    maxNoteBytes: 50 * 1024 * 1024,
    maxAttachmentBytes: 5 * 1024 * 1024 * 1024,
    attachmentsPerNote: Number.POSITIVE_INFINITY,
    publicShares: Number.POSITIVE_INFINITY,
    collaborators: Number.POSITIVE_INFINITY,
  },
} as const;

export function getPlanKey(level = 0) {
  const levelNum = Number(level) || 0;
  if (levelNum >= PLAN_LEVELS.FAMILY_PRO) return 'FAMILY_PRO';
  if (levelNum >= PLAN_LEVELS.AI) return 'AI';
  if (levelNum >= PLAN_LEVELS.PRO) return 'PRO';
  if (levelNum >= PLAN_LEVELS.BASIC) return 'BASIC';
  return 'FREE';
}

export function getPlanLimits(level = 0) {
  return PLAN_LIMITS[getPlanKey(level)];
}

export function getStorageLimit(level = 0) {
  return getPlanLimits(level).attachmentStorageBytes;
}

export function resolvePlanLevel(userOrProfile: any) {
  return Number(userOrProfile?.plan_level ?? userOrProfile?.subscription_level ?? userOrProfile?.user_metadata?.subscription_level ?? 0) || 0;
}

export function canCreateNote({ level = 0, currentNoteCount = 0, noteSize = 0 } = {}) {
  const limits = getPlanLimits(level);
  return currentNoteCount < limits.notes && noteSize <= limits.maxNoteBytes;
}

export function canAttachFile({ level = 0, currentUsage = 0, fileSize = 0, attachmentCount = 0 } = {}) {
  const limits = getPlanLimits(level);
  return currentUsage + fileSize <= limits.attachmentStorageBytes
    && fileSize <= limits.maxAttachmentBytes
    && attachmentCount < limits.attachmentsPerNote;
}
