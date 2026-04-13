import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsState {
  hapticsEnabled: boolean;
  setHapticsEnabled: (enabled: boolean) => void;
  syncEnabled: boolean;
  setSyncEnabled: (enabled: boolean) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  globalLockEnabled: boolean;
  setGlobalLockEnabled: (enabled: boolean) => void;
  subscriptionPlan: 'free' | 'pro' | 'pro+';
  setSubscriptionPlan: (plan: 'free' | 'pro' | 'pro+') => void;
  lang: string;
  setLang: (lang: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      hapticsEnabled: true,
      setHapticsEnabled: (enabled) => set({ hapticsEnabled: enabled }),
      syncEnabled: true,
      setSyncEnabled: (enabled) => set({ syncEnabled: enabled }),
      themeMode: 'system',
      setThemeMode: (mode) => set({ themeMode: mode }),
      globalLockEnabled: false,
      setGlobalLockEnabled: (enabled) => set({ globalLockEnabled: enabled }),
      subscriptionPlan: 'free',
      setSubscriptionPlan: (plan) => set({ subscriptionPlan: plan }),
      lang: 'fr',
      setLang: (lang) => set({ lang: lang }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
