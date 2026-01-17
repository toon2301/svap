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

// Request deduplication - globálny map pre in-flight requesty
const inFlightRequests = new Map<string, Promise<Offer[]>>();

// Cooldown mechanizmus - zabráni volaniu toho istého endpointu príliš často
const lastRequestTime = new Map<string, number>();
const COOLDOWN_MS = 2000; // 2 sekundy cooldown medzi rovnakými requestmi

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

/**
 * Invaliduje cache pre daný kľúč - zmaže ju, aby sa pri ďalšom načítaní načítali nové dáta
 */
export const invalidateOffersCache = (ownerUserId?: number): void => {
  const key = makeOffersCacheKey(ownerUserId);
  offersCache.delete(key);
  // Zmaž aj cooldown a in-flight requesty
  lastRequestTime.delete(key);
  inFlightRequests.delete(key);
};

/**
 * Získa alebo vytvorí in-flight request pre daný cache key
 * Zabráni viacerým rovnakým requestom súčasne a príliš častým volaniam (cooldown)
 */
export const getOrCreateOffersRequest = (
  key: string,
  fetcher: () => Promise<Offer[]>
): Promise<Offer[]> => {
  const now = Date.now();
  const lastTime = lastRequestTime.get(key);
  
  // Cooldown check - ak sa request volal nedávno, vráť posledné cacheované dáta alebo reject
  if (lastTime && now - lastTime < COOLDOWN_MS) {
    // Skús vrátiť cacheované dáta
    const cached = getOffersFromCache(key);
    if (cached) {
      return Promise.resolve(cached);
    }
    // Ak nie sú cacheované dáta, počkaj na existujúci in-flight request alebo reject
    if (inFlightRequests.has(key)) {
      return inFlightRequests.get(key)!;
    }
    // Ak nie je in-flight request a je v cooldown, reject s informáciou
    return Promise.reject(new Error('Request in cooldown period'));
  }

  // Ak už existuje in-flight request, použij ho
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key)!;
  }

  // Vytvor nový request
  lastRequestTime.set(key, now);
  const request = fetcher()
    .then((offers) => {
      // Vyčisti z mapy po úspešnom dokončení
      inFlightRequests.delete(key);
      return offers;
    })
    .catch((error) => {
      // Vyčisti z mapy pri chybe
      inFlightRequests.delete(key);
      throw error;
    });

  inFlightRequests.set(key, request);
  return request;
};


