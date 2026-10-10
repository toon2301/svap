'use client';

import { dispatchProfileOffersRefresh } from './profileOfferEvents';
import { invalidateOffersCache, makeOffersCacheKey } from './profileOffersCache';

/** Ako dlho sa čaká na ďalšiu žiadosť, kým sa obnovenie naozaj odošle. */
const COALESCE_MS = 300;

const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Zneplatní cache ponúk vlastníka a po krátkom zlúčení opakovaných žiadostí pošle
 * udalosť, ktorá donúti zoznam ponúk na profile načítať sa znova. Zlúčenie bráni
 * tomu, aby po sérii zmien (napr. viac zmazaných fotiek za sebou) bežalo viac
 * načítaní naraz a staršia odpoveď neprepísala novšiu.
 */
export function scheduleProfileOffersRefresh(ownerUserId?: number): void {
  invalidateOffersCache(ownerUserId);

  const key = makeOffersCacheKey(ownerUserId);
  const pending = pendingTimers.get(key);
  if (pending !== undefined) clearTimeout(pending);

  pendingTimers.set(
    key,
    setTimeout(() => {
      pendingTimers.delete(key);
      dispatchProfileOffersRefresh({ ownerUserId });
    }, COALESCE_MS),
  );
}
