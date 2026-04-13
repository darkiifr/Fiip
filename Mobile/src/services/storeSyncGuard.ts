import { supabase, storageService } from './supabase';

export const isStorageFull = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false; // Offline rules apply, not checking limits

  const usage = await storageService.getUsage(user.id);
  return usage.totalBytes >= usage.limitBytes;
};
