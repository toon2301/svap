'use client';

import {
  normalizeOfferCountryCode,
  type OfferCountryCode,
} from './countryRegistry';

export type GeoDetectionCache = {
  country: OfferCountryCode | null;
  detectedAt: number;
  status: 'ok' | 'failed';
};

export const GEO_DETECTION_CACHE_KEY = 'appGeoDetectionCacheV2';
export const LAST_MANUAL_OFFER_COUNTRY_KEY = 'appLastManualOfferCountryV1';
export const GEO_DETECTION_SUCCESS_TTL_MS = 1000 * 60 * 60 * 24;
export const GEO_DETECTION_FAILURE_TTL_MS = 1000 * 60 * 30;

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readLastManualOfferCountry(): OfferCountryCode | '' {
  const storage = getLocalStorage();
  if (!storage) return '';
  try {
    return normalizeOfferCountryCode(
      storage.getItem(LAST_MANUAL_OFFER_COUNTRY_KEY),
    );
  } catch {
    return '';
  }
}

export function writeLastManualOfferCountry(value: unknown): OfferCountryCode | '' {
  const normalized = normalizeOfferCountryCode(value);
  const storage = getLocalStorage();
  if (!storage) return normalized;
  try {
    if (normalized) {
      storage.setItem(LAST_MANUAL_OFFER_COUNTRY_KEY, normalized);
    } else {
      storage.removeItem(LAST_MANUAL_OFFER_COUNTRY_KEY);
    }
  } catch {
    // Formulár musí fungovať aj pri zablokovanom localStorage.
  }
  return normalized;
}

export function readGeoDetectionCache(): GeoDetectionCache | null {
  const storage = getLocalStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(GEO_DETECTION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GeoDetectionCache> | null;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.detectedAt !== 'number') return null;
    if (parsed.status !== 'ok' && parsed.status !== 'failed') return null;
    const country = normalizeOfferCountryCode(parsed.country);
    if (parsed.country !== null && !country) return null;
    return {
      country: country || null,
      detectedAt: parsed.detectedAt,
      status: parsed.status,
    };
  } catch {
    return null;
  }
}

export function writeGeoDetectionCache(entry: GeoDetectionCache): void {
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    storage.setItem(
      GEO_DETECTION_CACHE_KEY,
      JSON.stringify({
        country: normalizeOfferCountryCode(entry.country) || null,
        detectedAt: entry.detectedAt,
        status: entry.status,
      }),
    );
  } catch {
    // IP detekcia je iba pomocná a nesmie zablokovať aplikáciu.
  }
}

export function isGeoDetectionCacheFresh(entry: GeoDetectionCache): boolean {
  const ttlMs =
    entry.status === 'ok'
      ? GEO_DETECTION_SUCCESS_TTL_MS
      : GEO_DETECTION_FAILURE_TTL_MS;
  return Date.now() - entry.detectedAt < ttlMs;
}

export function readFreshIpOfferCountry(): OfferCountryCode | '' {
  const cached = readGeoDetectionCache();
  if (!cached || !isGeoDetectionCacheFresh(cached) || cached.status !== 'ok') {
    return '';
  }
  return normalizeOfferCountryCode(cached.country);
}

export function resolvePreferredOfferCountry(params: {
  savedCountryCode?: unknown;
  detectedCountryCode?: unknown;
  trustDetectedCountryCode?: boolean;
}): OfferCountryCode | '' {
  const savedCountry = normalizeOfferCountryCode(params.savedCountryCode);
  if (savedCountry) return savedCountry;

  const manualCountry = readLastManualOfferCountry();
  if (manualCountry) return manualCountry;

  const ipCountry = readFreshIpOfferCountry();
  if (ipCountry) return ipCountry;

  // Ak localStorage nie je dostupný, stále vieme použiť práve zistenú krajinu
  // držanú v kontexte. Pri dostupnom úložisku týmto zámerne neobídeme
  // neúspešnú alebo expirovanú IP detekciu starým pevným fallbackom.
  if (params.trustDetectedCountryCode || !getLocalStorage()) {
    return normalizeOfferCountryCode(params.detectedCountryCode);
  }
  return '';
}

export function resolveNewOfferDraftCountry(params: {
  initialCountryCode?: unknown;
  districtCode?: unknown;
  district?: unknown;
  location?: unknown;
  detectedCountryCode?: unknown;
}): OfferCountryCode | '' {
  const initialCountry = normalizeOfferCountryCode(params.initialCountryCode);
  const hasLocationData = Boolean(
    String(params.districtCode || '').trim() ||
      String(params.district || '').trim() ||
      String(params.location || '').trim(),
  );
  const savedCountry =
    initialCountry === 'SK' && !hasLocationData ? '' : initialCountry;

  return resolvePreferredOfferCountry({
    savedCountryCode: savedCountry,
    detectedCountryCode: params.detectedCountryCode,
  });
}
