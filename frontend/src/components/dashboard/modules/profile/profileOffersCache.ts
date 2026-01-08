import type { Offer } from './profileOffersTypes';

// Jednoduchá cache ponúk (skills) pre profily používateľov.
// Cieľ: znížiť počet volaní na /auth/skills/ a /auth/dashboard/users/{id}/skills/
// bez zmeny logiky a bezpečnosti aplikácie.

const CACHE_TTL_MS = 60 * 1000; // 60 sekúnd – krátka životnosť kvôli aktuálnosti dát

type CacheEntry = {
  offers: Offer[];
  timestamp: number;
};

const offersCache = new Map<string, CacheEntry>();

export const makeOffersCacheKey = (ownerUserId?: number): string =>
  ownerUserId ? `user-${ownerUserId}` : 'self';

export const getOffersFromCache = (key: string): Offer[] | undefined => {
  const entry = offersCache.get(key);
  if (!entry) return undefined;

  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL_MS) {
    // Cache je príliš stará – zmaž ju a vráť undefined
    offersCache.delete(key);
    return undefined;
  }

  return entry.offers;
};

export const setOffersToCache = (key: string, offers: Offer[]): void => {
  offersCache.set(key, {
    offers,
    timestamp: Date.now(),
  });
};


