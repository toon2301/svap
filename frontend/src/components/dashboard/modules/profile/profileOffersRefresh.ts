'use client';

import { dispatchProfileOffersRefresh } from './profileOfferEvents';
import { invalidateOffersCache, makeOffersCacheKey } from './profileOffersCache';

/** Ako dlho sa čaká na ďalšiu žiadosť, kým sa obnovenie naozaj odošle. */
const COALESCE_MS = 300;

const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Zneplatní cache ponúk vlastníka a po krátkom zlúčení opakovaných žiadostí pošle
 * udalosť, ktorá donúti zoznam ponúk na profile načítať sa znova. Zlúčenie bráni
 * tomu, aby po sérii zmien bežalo viac načítaní naraz a staršia odpoveď neprepísala novšiu.
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

type PhotoRemovalSeries = { running: number; removedAny: boolean };

const photoRemovalSeries = new Map<string, PhotoRemovalSeries>();

/**
 * Spustí zmazanie jednej fotky ponuky a po dokončení CELEJ série zmazaní obnoví profil
 * raz (nie po každej fotke zvlášť). Okno úpravy ponuky maže označené fotky po jednej:
 * ďalšie zmazanie sa spustí ešte v mikrokole po dokončení predošlého. Preto sa o konci
 * série rozhodne až v nasledujúcom makrokole – ak medzitým začalo ďalšie zmazanie,
 * obnovenie neodíde. Obnovenie uprostred série by načítalo čiastočný stav a jeho
 * zastaraná odpoveď by mohla skončiť posledná a vrátiť zmazané fotky.
 * Obnovenie odíde, len ak aspoň jedno zmazanie v sérii prešlo; chyba sa prepošle volajúcemu.
 */
export async function removeOfferPhotoAndRefreshProfile<T>(
  ownerUserId: number | undefined,
  removePhoto: () => Promise<T>,
): Promise<T> {
  const key = makeOffersCacheKey(ownerUserId);
  const series = photoRemovalSeries.get(key) ?? { running: 0, removedAny: false };
  photoRemovalSeries.set(key, series);

  series.running += 1;
  try {
    const result = await removePhoto();
    series.removedAny = true;
    return result;
  } finally {
    series.running -= 1;
    setTimeout(() => {
      if (series.running > 0 || !series.removedAny) return;
      series.removedAny = false;
      scheduleProfileOffersRefresh(ownerUserId);
    }, 0);
  }
}
