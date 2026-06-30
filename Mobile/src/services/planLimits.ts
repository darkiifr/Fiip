export const PLAN_LEVELS = {
  FREE: 0,
  BASIC: 1,
  AI: 1.5,
  PRO: 2,
  ENTERPRISE: 4,
} as const;

export const PLAN_LIMITS = {
  FREE: {
    notes: 5,
    storageBytes: 5 * 1024 * 1024,
    attachmentsPerNote: 1,
    publicShares: 0,
    collaborators: 0,
  },
  BASIC: {
    notes: 100,
    storageBytes: 100 * 1024 * 1024,
    attachmentsPerNote: 5,
    publicShares: 10,
    collaborators: 3,
  },
  PRO: {
    notes: 1000,
    storageBytes: 250 * 1024 * 1024,
    attachmentsPerNote: 25,
    publicShares: 100,
    collaborators: 25,
  },
  ENTERPRISE: {
    notes: Number.POSITIVE_INFINITY,
    storageBytes: 500 * 1024 * 1024,
    attachmentsPerNote: Number.POSITIVE_INFINITY,
    publicShares: Number.POSITIVE_INFINITY,
    collaborators: Number.POSITIVE_INFINITY,
  },
} as const;

export function getPlanKey(level = 0) {
  const levelNum = Number(level) || 0;
  if (levelNum >= PLAN_LEVELS.ENTERPRISE) return 'ENTERPRISE';
  if (levelNum >= PLAN_LEVELS.PRO) return 'PRO';
  if (levelNum >= PLAN_LEVELS.BASIC) return 'BASIC';
  return 'FREE';
}

export function getPlanLimits(level = 0) {
  return PLAN_LIMITS[getPlanKey(level)];
}

export function getStorageLimit(level = 0) {
  return getPlanLimits(level).storageBytes;
}

export function resolvePlanLevel(userOrProfile: any) {
  return Number(userOrProfile?.plan_level ?? userOrProfile?.subscription_level ?? userOrProfile?.user_metadata?.subscription_level ?? 0) || 0;
}

export function canCreateNote({ level = 0, currentNoteCount = 0 } = {}) {
  return currentNoteCount < getPlanLimits(level).notes;
}

export function canAttachFile({ level = 0, currentUsage = 0, fileSize = 0, attachmentCount = 0 } = {}) {
  const limits = getPlanLimits(level);
  return currentUsage + fileSize <= limits.storageBytes && attachmentCount < limits.attachmentsPerNote;
}
