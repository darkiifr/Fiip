import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ThemeMode = 'dark';
export type TypographyMode = 'Inter' | 'Roboto' | 'System' | 'Outfit';
export type FontSizeMode = 'petite' | 'moyenne' | 'grande';

interface SettingsState {
  hapticsEnabled: boolean;
  setHapticsEnabled: (enabled: boolean) => void;
  syncEnabled: boolean;
  setSyncEnabled: (enabled: boolean) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode?: ThemeMode) => void;
  globalLockEnabled: boolean;
  setGlobalLockEnabled: (enabled: boolean) => void;
  subscriptionPlan: 'free' | 'pro' | 'pro+';
  setSubscriptionPlan: (plan: 'free' | 'pro' | 'pro+') => void;
  lang: string;
  setLang: (lang: string) => void;
  
  // New visual configurations from mockup 3
  typography: TypographyMode;
  setTypography: (font: TypographyMode) => void;
  fontSize: FontSizeMode;
  setFontSize: (size: FontSizeMode) => void;
  autoSave: boolean;
  setAutoSave: (enabled: boolean) => void;
  showWordCount: boolean;
  setShowWordCount: (enabled: boolean) => void;
  showReadingTime: boolean;
  setShowReadingTime: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      hapticsEnabled: true,
      setHapticsEnabled: (enabled) => set({ hapticsEnabled: enabled }),
      syncEnabled: true,
      setSyncEnabled: (enabled) => set({ syncEnabled: enabled }),
      themeMode: 'dark',
      setThemeMode: () => set({ themeMode: 'dark' }),
      globalLockEnabled: false,
      setGlobalLockEnabled: (enabled) => set({ globalLockEnabled: enabled }),
      subscriptionPlan: 'free',
      setSubscriptionPlan: (plan) => set({ subscriptionPlan: plan }),
      lang: 'fr',
      setLang: (lang) => set({ lang: lang }),
      
      // Defaults matching Screen 3
      typography: 'Inter',
      setTypography: (typography) => set({ typography }),
      fontSize: 'moyenne',
      setFontSize: (fontSize) => set({ fontSize }),
      autoSave: true,
      setAutoSave: (autoSave) => set({ autoSave }),
      showWordCount: true,
      setShowWordCount: (showWordCount) => set({ showWordCount }),
      showReadingTime: true,
      setShowReadingTime: (showReadingTime) => set({ showReadingTime }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
