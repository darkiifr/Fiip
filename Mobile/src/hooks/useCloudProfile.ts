import { useCallback, useEffect, useMemo, useState } from 'react';

import { authService, dataService } from '../services/supabase';

export function useCloudProfile() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = await authService.getUser();
      setUser(currentUser);

      if (!currentUser) {
        setProfile(null);
        return;
      }

      const { data } = await dataService.fetchProfile();
      setProfile(data || null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const subscription = authService.onAuthStateChange?.(() => {
      refresh();
    });

    return () => {
      subscription?.data?.subscription?.unsubscribe?.();
    };
  }, [refresh]);

  const displayName = useMemo(() => {
    return profile?.nickname
      || profile?.username
      || user?.user_metadata?.nickname
      || user?.user_metadata?.username
      || user?.user_metadata?.full_name
      || user?.email?.split('@')[0]
      || 'Fiip';
  }, [profile, user]);

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || '';

  return {
    user,
    profile,
    avatarUrl,
    displayName,
    loading,
    refresh,
  };
}
