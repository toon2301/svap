'use client';

/**
 * Príspevok medzitým zmizol – jedno spracovanie pre celú Nástenku.
 *
 * Príspevok sa dá zmazať v inej relácii alebo na inom zariadení, kým ho appka
 * ešte ukazuje. Bez spoločného miesta sa každá interakcia (otvorenie detailu,
 * lajk, komentár) správala inak: karta ostávala vo feede, chyby sa hlásili ako
 * bežné zlyhania a pri každom ďalšom kliknutí pribudol ďalší toast.
 *
 * Pravidlá:
 *  1. Príspevok sa OKAMŽITE odstráni zo zoznamov – cez ten istý signál, aký
 *     používa mazanie vlastného príspevku (`emitFeedPostDeleted`), takže
 *     `FeedList` aj profilové zoznamy nepotrebujú nič nové.
 *  2. Otvorené vrstvy sa zatvárajú samy – počúvajú ten istý signál.
 *  3. Toast padne NAJVIAC RAZ na príspevok. Ďalšie requesty, ktoré dobehnú
 *     tesne po sebe (lajk + polling komentárov), už mlčia.
 *  4. Žiadny reload a žiadne odhlásenie: 404/403/410 nie sú autentifikačné
 *     chyby a interceptor v `lib/api.ts` na ne nesiaha (obnovu tokenu rieši
 *     výhradne 401).
 */

import toast from 'react-hot-toast';
import { emitFeedPostDeleted } from './feedPostDeletedEvents';

/**
 * Príspevky, o ktorých už používateľ vie.
 *
 * Modulová množina, nie stav komponentu: hlásiť môže ktorákoľvek vrstva
 * (karta, okno detailu, komentáre) a všetky majú mlčať spoločne.
 */
const announced = new Set<number>();

/**
 * Znamená táto chyba, že príspevok už neexistuje alebo naň nie je prístup?
 *
 * Rovnaká trojica stavov, akú už používa načítanie okna detailu. Appka
 * ZÁMERNE nerozlišuje dôvod (zmazané / sprivátnené / blokovanie) – rozdielna
 * reakcia by prezradila, že ide o blok. Pre používateľa je výsledok tak či tak
 * rovnaký: s týmto príspevkom sa už nedá pracovať, takže zmizne a povie sa to
 * jednou neutrálnou vetou.
 */
export function isFeedPostGoneError(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 404 || status === 403 || status === 410;
}

/**
 * Spracuje zmiznutý príspevok: odstráni ho zo zoznamov, zavrie jeho otvorené
 * vrstvy a nanajvýš raz to oznámi.
 */
export function handleGoneFeedPost(
  postId: number,
  t: (key: string, fallback?: string) => string,
): void {
  const alreadyAnnounced = announced.has(postId);
  announced.add(postId);
  // Signál ide VŽDY – vrstvy otvorené neskôr sa musia zavrieť aj vtedy, keď
  // toast už raz padol.
  emitFeedPostDeleted(postId);
  if (alreadyAnnounced) return;
  toast.error(t('feed.postUnavailable', 'Tento príspevok už nie je dostupný.'));
}

/**
 * Ak je chyba „príspevok zmizol", spracuje ju a vráti `true`.
 *
 * Volajúci tým vie, či má ešte hlásiť vlastnú chybovú hlášku.
 */
export function handleFeedPostErrorIfGone(
  error: unknown,
  postId: number,
  t: (key: string, fallback?: string) => string,
): boolean {
  if (!isFeedPostGoneError(error)) return false;
  handleGoneFeedPost(postId, t);
  return true;
}

/** Len pre testy – medzi prípadmi treba začínať s čistou pamäťou. */
export function resetAnnouncedFeedPosts(): void {
  announced.clear();
}
