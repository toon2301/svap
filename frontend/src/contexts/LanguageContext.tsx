'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import enMessages from '../../messages/en.json';
import skMessages from '../../messages/sk.json';
import plMessages from '../../messages/pl.json';
import csMessages from '../../messages/cs.json';
import deMessages from '../../messages/de.json';
import huMessages from '../../messages/hu.json';

type SupportedLocale = 'sk' | 'en' | 'pl' | 'cs' | 'de' | 'hu';
type CountryCode = 'SK' | 'CZ' | 'PL' | 'HU' | 'AT' | 'DE' | null;
type StoredCountryCode = Exclude<CountryCode, null>;
type GeoDetectionCache = {
  country: StoredCountryCode | null;
  detectedAt: number;
  status: 'ok' | 'failed';
};

type LanguageContextValue = {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, fallback?: string) => string;
  country: CountryCode;
  setCountry: (country: CountryCode) => void;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const GEO_DETECTION_CACHE_KEY = 'appGeoDetectionCacheV1';
export const GEO_DETECTION_SUCCESS_TTL_MS = 1000 * 60 * 60 * 24 * 14;
export const GEO_DETECTION_FAILURE_TTL_MS = 1000 * 60 * 60 * 6;

export function isSupportedCountryCode(value: unknown): value is StoredCountryCode {
  return value === 'SK' || value === 'CZ' || value === 'PL' || value === 'HU' || value === 'AT' || value === 'DE';
}

export function localeFromCountry(country: CountryCode): SupportedLocale | null {
  if (country === 'PL') return 'pl';
  if (country === 'SK') return 'sk';
  if (country === 'CZ') return 'cs';
  if (country === 'DE' || country === 'AT') return 'de';
  if (country === 'HU') return 'hu';
  return null;
}

export function localeFromBrowser(): SupportedLocale {
  try {
    const navLang = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    const value = navLang.toLowerCase();
    if (value.startsWith('pl')) return 'pl';
    if (value.startsWith('sk')) return 'sk';
    if (value.startsWith('cs') || value.startsWith('cz')) return 'cs';
    if (value.startsWith('de')) return 'de';
    if (value.startsWith('hu')) return 'hu';
    if (value.startsWith('en')) return 'en';
  } catch {}
  return 'sk';
}

export function readGeoDetectionCache(): GeoDetectionCache | null {
  try {
    const raw = window.localStorage.getItem(GEO_DETECTION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GeoDetectionCache> | null;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.detectedAt !== 'number') return null;
    if (parsed.status !== 'ok' && parsed.status !== 'failed') return null;
    if (parsed.country !== null && !isSupportedCountryCode(parsed.country)) return null;
    return {
      country: parsed.country ?? null,
      detectedAt: parsed.detectedAt,
      status: parsed.status,
    };
  } catch {
    return null;
  }
}

export function writeGeoDetectionCache(entry: GeoDetectionCache): void {
  try {
    window.localStorage.setItem(GEO_DETECTION_CACHE_KEY, JSON.stringify(entry));
  } catch {}
}

export function isGeoDetectionCacheFresh(entry: GeoDetectionCache): boolean {
  const ttlMs = entry.status === 'ok' ? GEO_DETECTION_SUCCESS_TTL_MS : GEO_DETECTION_FAILURE_TTL_MS;
  return Date.now() - entry.detectedAt < ttlMs;
}

function getByPath(messages: Record<string, any>, key: string): unknown {
  return key.split('.').reduce<unknown>((obj, segment) => {
    if (obj && typeof obj === 'object' && segment in (obj as any)) {
      return (obj as any)[segment];
    }
    return undefined;
  }, messages);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>('sk');
  const [country, setCountryState] = useState<CountryCode>(null);

  useEffect(() => {
    let hasSavedLocale = false;
    try {
      const saved = window.localStorage.getItem('appLocale');
      if (saved === 'en' || saved === 'sk' || saved === 'pl' || saved === 'cs' || saved === 'de' || saved === 'hu') {
        setLocaleState(saved as SupportedLocale);
        hasSavedLocale = true;
      }
    } catch {}

    const applyDetectedCountry = (nextCountry: CountryCode) => {
      if (nextCountry) {
        setCountryState(nextCountry);
      }
      if (!hasSavedLocale) {
        setLocaleState(localeFromCountry(nextCountry) ?? localeFromBrowser());
      }
    };

    const cachedGeo = readGeoDetectionCache();
    if (cachedGeo && isGeoDetectionCacheFresh(cachedGeo)) {
      if (cachedGeo.country) {
        applyDetectedCountry(cachedGeo.country);
      } else if (!hasSavedLocale) {
        setLocaleState(localeFromBrowser());
      }
      return;
    }

    let cancelled = false;

    const detectByIp = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        if (!res.ok) throw new Error('ipapi failed');
        const data = await res.json();
        if (cancelled) return;

        const rawCode = String(data?.country_code || '').toUpperCase();
        const detectedCountry = isSupportedCountryCode(rawCode) ? rawCode : null;

        writeGeoDetectionCache({
          country: detectedCountry,
          detectedAt: Date.now(),
          status: 'ok',
        });
        applyDetectedCountry(detectedCountry);
      } catch {
        if (!cancelled) {
          writeGeoDetectionCache({
            country: null,
            detectedAt: Date.now(),
            status: 'failed',
          });
        }
        if (!hasSavedLocale) {
          setLocaleState(localeFromBrowser());
        }
      }
    };

    void detectByIp();

    return () => {
      cancelled = true;
    };
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

  const value = useMemo<LanguageContextValue>(
    () => ({ locale, setLocale, t, country, setCountry }),
    [locale, setLocale, t, country, setCountry]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
