import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export const useHaptics = create(
  persist(
    (set, get) => ({
      hapticsEnabled: true,
      toggleHaptics: () => set((state) => ({ hapticsEnabled: !state.hapticsEnabled })),
      setHapticsEnabled: (enabled) => set({ hapticsEnabled: enabled }),

      triggerSelection: () => {
        if (get().hapticsEnabled) {
          ReactNativeHapticFeedback.trigger('selection', hapticOptions);
        }
      },
      
      triggerSuccess: () => {
        if (get().hapticsEnabled) {
          ReactNativeHapticFeedback.trigger('notificationSuccess', hapticOptions);
        }
      },

      triggerError: () => {
        if (get().hapticsEnabled) {
          ReactNativeHapticFeedback.trigger('notificationError', hapticOptions);
        }
      },

      triggerImpact: (style = 'impactLight') => {
        if (get().hapticsEnabled) {
          ReactNativeHapticFeedback.trigger(style, hapticOptions);
        }
      },
    }),
    {
      name: 'haptics-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
