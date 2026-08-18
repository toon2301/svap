'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import enMessages from '../../messages/en.json';
import skMessages from '../../messages/sk.json';
import plMessages from '../../messages/pl.json';
import csMessages from '../../messages/cs.json';
import deMessages from '../../messages/de.json';
import huMessages from '../../messages/hu.json';
import {
  normalizeOfferCountryCode,
  type OfferCountryCode,
} from '@/shared/countryRegistry';
import {
  isGeoDetectionCacheFresh,
  readGeoDetectionCache,
  readLastManualOfferCountry,
  writeGeoDetectionCache,
  writeLastManualOfferCountry,
} from '@/shared/offerCountryPreference';

export {
  GEO_DETECTION_CACHE_KEY,
  GEO_DETECTION_FAILURE_TTL_MS,
  GEO_DETECTION_SUCCESS_TTL_MS,
  isGeoDetectionCacheFresh,
  readGeoDetectionCache,
  writeGeoDetectionCache,
} from '@/shared/offerCountryPreference';

type SupportedLocale = 'sk' | 'en' | 'pl' | 'cs' | 'de' | 'hu';
type CountryCode = OfferCountryCode | null;
type StoredCountryCode = Exclude<CountryCode, null>;

type LanguageContextValue = {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, fallback?: string) => string;
  country: CountryCode;
  setCountry: (country: CountryCode) => void;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function isSupportedCountryCode(value: unknown): value is StoredCountryCode {
  return Boolean(normalizeOfferCountryCode(value));
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

function getByPath(messages: Record<string, unknown>, key: string): unknown {
  let current: unknown = messages;
  for (const segment of key.split('.')) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>('sk');
  const [country, setCountryState] = useState<CountryCode>(null);
  const manualCountryRef = useRef<OfferCountryCode | ''>('');

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

    const savedManualCountry = readLastManualOfferCountry();
    if (savedManualCountry) {
      manualCountryRef.current = savedManualCountry;
      setCountryState(savedManualCountry);
      if (!hasSavedLocale) {
        setLocaleState(localeFromBrowser());
      }
      return;
    }

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
          status: detectedCountry ? 'ok' : 'failed',
        });
        const currentManualCountry =
          manualCountryRef.current || readLastManualOfferCountry();
        if (currentManualCountry) {
          manualCountryRef.current = currentManualCountry;
          setCountryState(currentManualCountry);
          if (!hasSavedLocale) {
            setLocaleState(
              localeFromCountry(detectedCountry) ?? localeFromBrowser(),
            );
          }
          return;
        }
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
    const normalized = writeLastManualOfferCountry(next);
    manualCountryRef.current = normalized;
    setCountryState(normalized || null);
  }, []);

  const messages = useMemo(() => {
    if (locale === 'en') return enMessages as unknown as Record<string, unknown>;
    if (locale === 'pl') return plMessages as unknown as Record<string, unknown>;
    if (locale === 'cs') return csMessages as unknown as Record<string, unknown>;
    if (locale === 'de') return deMessages as unknown as Record<string, unknown>;
    if (locale === 'hu') return huMessages as unknown as Record<string, unknown>;
    return skMessages as unknown as Record<string, unknown>;
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
