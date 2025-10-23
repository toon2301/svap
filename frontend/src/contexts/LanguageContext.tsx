'use client';

import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import enMessages from '../../messages/en.json';
import skMessages from '../../messages/sk.json';
import plMessages from '../../messages/pl.json';
import csMessages from '../../messages/cs.json';

type SupportedLocale = 'sk' | 'en' | 'pl' | 'cs';

type LanguageContextValue = {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, fallback?: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function getByPath(messages: Record<string, any>, key: string): unknown {
  return key.split('.').reduce<unknown>((obj, segment) => {
    if (obj && typeof obj === 'object' && segment in (obj as any)) {
      return (obj as any)[segment];
    }
    return undefined;
  }, messages);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Start with default to match server-rendered HTML, then hydrate from storage
  const [locale, setLocaleState] = useState<SupportedLocale>('sk');
  useEffect(() => {
    // Priority 1: persisted value
    try {
      const saved = window.localStorage.getItem('appLocale');
      if (saved === 'en' || saved === 'sk' || saved === 'pl' || saved === 'cs') {
        setLocaleState(saved as SupportedLocale);
        return; // respect user choice
      }
    } catch {}

    // Priority 2: geolocation by IP (best-effort)
    let cancelled = false;
    const detectByIp = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        if (!res.ok) throw new Error('ipapi failed');
        const data = await res.json();
        if (cancelled) return;
        const code = (data?.country_code || '').toUpperCase();
        if (code === 'PL') { setLocaleState('pl'); return; }
        if (code === 'SK') { setLocaleState('sk'); return; }
        if (code === 'CZ') { setLocaleState('cs'); return; }
        if (code === 'HU') { /* future */ }
        if (code === 'DE') { /* future */ }
        // No decisive country → try browser language
        detectByBrowser();
      } catch {
        // If IP fails, try browser
        detectByBrowser();
      }
    };

    // Priority 3: browser language
    const detectByBrowser = () => {
      try {
        const navLang = (navigator.languages && navigator.languages[0]) || navigator.language || '';
        const l = navLang.toLowerCase();
        if (l.startsWith('pl')) { setLocaleState('pl'); return; }
        if (l.startsWith('sk')) { setLocaleState('sk'); return; }
        if (l.startsWith('cs') || l.startsWith('cz')) { setLocaleState('cs'); return; }
        if (l.startsWith('en')) { setLocaleState('en'); return; }
      } catch {}
      // Priority 4: fallback
      setLocaleState('sk');
    };

    detectByIp();
    return () => { cancelled = true; };
  }, []);

  const setLocale = useCallback((next: SupportedLocale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem('appLocale', next);
    } catch {}
  }, []);

  const messages = useMemo(() => {
    if (locale === 'en') return enMessages as unknown as Record<string, any>;
    if (locale === 'pl') return plMessages as unknown as Record<string, any>;
    if (locale === 'cs') return csMessages as unknown as Record<string, any>;
    return skMessages as unknown as Record<string, any>;
  }, [locale]);

  const t = useCallback(
    (key: string, fallback?: string) => {
      const value = getByPath(messages, key);
      if (typeof value === 'string') return value as string;
      return fallback ?? key;
    },
    [messages]
  );

  const value = useMemo<LanguageContextValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}


