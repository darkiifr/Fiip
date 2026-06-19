import React, { createContext, useContext, useState, useEffect } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

type Theme = 'original' | 'liquid-glass';

interface UIContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}

/**
 * Global UI Provider — wraps Radix TooltipProvider (required for all Tooltip components)
 * and manages global theme state.
 */
export function UIProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('fiip-ui-theme');
    return (saved as Theme) || 'original';
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('fiip-ui-theme', newTheme);
  };

  useEffect(() => {
    // Apply theme class to body for Liquid Glass effects
    if (theme === 'liquid-glass') {
      document.body.classList.add('theme-liquid-glass-original');
    } else {
      document.body.classList.remove('theme-liquid-glass-original');
    }
  }, [theme]);

  return (
    <UIContext.Provider value={{ theme, setTheme }}>
      <TooltipPrimitive.Provider delayDuration={300} skipDelayDuration={100}>
        {children}
      </TooltipPrimitive.Provider>
    </UIContext.Provider>
  );
}
