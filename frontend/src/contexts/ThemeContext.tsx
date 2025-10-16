'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'swaply_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    // Load initial theme from localStorage or system preference
    try {
      const stored = typeof window !== 'undefined' ? (localStorage.getItem(STORAGE_KEY) as Theme | null) : null;
      const systemDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial: Theme = stored ?? (systemDark ? 'dark' : 'light');
      setThemeState(initial);
      // Apply class to html element
      const html = document.documentElement;
      if (initial === 'dark') html.classList.add('dark'); else html.classList.remove('dark');
    } catch {
      // fallback: light
      setThemeState('light');
    }
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {}
    const html = document.documentElement;
    if (t === 'dark') html.classList.add('dark'); else html.classList.remove('dark');
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const value = useMemo(() => ({ theme, toggleTheme, setTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}


