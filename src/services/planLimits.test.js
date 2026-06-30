import { describe, expect, it } from 'vitest';

import {
  canAttachFile,
  canCreateNote,
  getAttachmentLimitAlert,
  getPlanKey,
  getStorageLimit,
  getStorageLimitAlert,
  PLAN_LIMITS,
  resolvePlanLevel,
} from './planLimits';

describe('plan limits', () => {
  it('keeps the free plan ultra limited', () => {
    expect(getPlanKey(0)).toBe('FREE');
    expect(getStorageLimit(0)).toBe(5 * 1024 * 1024);
    expect(PLAN_LIMITS.FREE).toMatchObject({
      notes: 5,
      attachmentsPerNote: 1,
      publicShares: 0,
      collaborators: 0,
    });
  });

  it('blocks the sixth free cloud note', () => {
    expect(canCreateNote({ level: 0, currentNoteCount: 4 })).toBe(true);
    expect(canCreateNote({ level: 0, currentNoteCount: 5 })).toBe(false);
  });

  it('blocks free attachments beyond storage or per-note allowance', () => {
    expect(canAttachFile({ level: 0, currentUsage: 0, fileSize: 1024, attachmentCount: 0 })).toBe(true);
    expect(canAttachFile({ level: 0, currentUsage: 0, fileSize: 1024, attachmentCount: 1 })).toBe(false);
    expect(canAttachFile({ level: 0, currentUsage: 5 * 1024 * 1024, fileSize: 1, attachmentCount: 0 })).toBe(false);
  });

  it('describes the attachment limit reached before importing files', () => {
    expect(getAttachmentLimitAlert({ level: 0, currentAttachmentCount: 1, incomingFileCount: 1 })).toMatchObject({
      type: 'attachments',
      title: 'Limite de pièces jointes atteinte',
    });
    expect(getAttachmentLimitAlert({ level: 0, currentAttachmentCount: 0, incomingFileCount: 1 })).toBeNull();
  });

  it('describes the storage limit reached before importing files', () => {
    expect(getStorageLimitAlert({
      level: 0,
      currentUsage: 5 * 1024 * 1024 - 10,
      incomingBytes: 11,
    })).toMatchObject({
      type: 'storage',
      title: 'Espace de stockage atteint',
    });
    expect(getStorageLimitAlert({
      level: 0,
      currentUsage: 1024,
      incomingBytes: 1024,
    })).toBeNull();
  });

  it('prefers profile plan_level over user metadata', () => {
    expect(resolvePlanLevel({ plan_level: 2, user_metadata: { subscription_level: 0 } })).toBe(2);
  });
});
