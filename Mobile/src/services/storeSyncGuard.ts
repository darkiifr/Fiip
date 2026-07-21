import { supabase, storageService } from './supabase';
import { getStorageLimit } from './planLimits';
import { authService } from './supabase';

export const isStorageFull = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false; // Offline rules apply, not checking limits

  const [usage, level] = await Promise.all([
    storageService.getUsage(user.id),
    authService.getPlanLevel(user),
  ]);
  return usage >= getStorageLimit(level);
};
