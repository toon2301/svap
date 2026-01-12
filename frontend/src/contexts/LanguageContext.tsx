'use client';

import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import enMessages from '../../messages/en.json';
import skMessages from '../../messages/sk.json';
import plMessages from '../../messages/pl.json';
import csMessages from '../../messages/cs.json';
import deMessages from '../../messages/de.json';
import huMessages from '../../messages/hu.json';

type SupportedLocale = 'sk' | 'en' | 'pl' | 'cs' | 'de' | 'hu';
type CountryCode = 'SK' | 'CZ' | 'PL' | 'HU' | 'AT' | 'DE' | null;

type LanguageContextValue = {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, fallback?: string) => string;
  country: CountryCode;
  setCountry: (country: CountryCode) => void;
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
  const [country, setCountryState] = useState<CountryCode>(null);
  
  useEffect(() => {
    // Priority 1: persisted value
    let hasSavedLocale = false;
    try {
      const saved = window.localStorage.getItem('appLocale');
      if (saved === 'en' || saved === 'sk' || saved === 'pl' || saved === 'cs' || saved === 'de' || saved === 'hu') {
        setLocaleState(saved as SupportedLocale);
        hasSavedLocale = true;
      }
    } catch {}

    // Priority 2: geolocation by IP (best-effort)
    // Vždy detekujeme krajinu (pre výber okresov), aj keď máme uložený jazyk
    let cancelled = false;
    const detectByIp = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        if (!res.ok) throw new Error('ipapi failed');
        const data = await res.json();
        if (cancelled) return;
        const code = (data?.country_code || '').toUpperCase();
        
        // Vždy nastav krajinu (pre výber okresov)
        if (code === 'SK' || code === 'CZ' || code === 'PL' || code === 'HU' || code === 'AT' || code === 'DE') {
          setCountryState(code as CountryCode);
        }
        
        // Nastav jazyk podľa krajiny len ak nie je uložený
        if (!hasSavedLocale) {
          if (code === 'PL') { setLocaleState('pl'); return; }
          if (code === 'SK') { setLocaleState('sk'); return; }
          if (code === 'CZ') { setLocaleState('cs'); return; }
          if (code === 'DE' || code === 'AT') { setLocaleState('de'); return; }
          if (code === 'HU') { setLocaleState('hu'); return; }
          // No decisive country → try browser language
          detectByBrowser();
        }
      } catch {
        // If IP fails, try browser (len ak nie je uložený jazyk)
        if (!hasSavedLocale) {
          detectByBrowser();
        }
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
        if (l.startsWith('de')) { setLocaleState('de'); return; }
        if (l.startsWith('hu')) { setLocaleState('hu'); return; }
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

  const setCountry = useCallback((next: CountryCode) => {
    setCountryState(next);
  }, []);

  const messages = useMemo(() => {
    if (locale === 'en') return enMessages as unknown as Record<string, any>;
    if (locale === 'pl') return plMessages as unknown as Record<string, any>;
    if (locale === 'cs') return csMessages as unknown as Record<string, any>;
    if (locale === 'de') return deMessages as unknown as Record<string, any>;
    if (locale === 'hu') return huMessages as unknown as Record<string, any>;
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

  const value = useMemo<LanguageContextValue>(() => ({ locale, setLocale, t, country, setCountry }), [locale, setLocale, t, country, setCountry]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}


