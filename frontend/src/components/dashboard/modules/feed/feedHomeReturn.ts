'use client';

/**
 * Tlačidlo Domov a zapamätané miesto Nástenky.
 *
 * Späť v prehliadači vracia na zapamätané miesto Nástenky samo (snímka sa
 * neruší, `FeedList` ju pri mounte obnoví). Domov sa správa takto:
 *
 *  - prvý klik z inej obrazovky obnoví zapamätané miesto, ak ho smie použiť
 *    (`canRestoreFeedOnHome`),
 *  - druhý klik, keď už je Nástenka aktívna, ide na vrch (`scrollFeedToTop`),
 *  - ak snímku použiť nesmie, Domov ide na vrch ako doteraz.
 *
 * Snímku vzniká len pri vstupe z Nástenky (`requestFeedReturnCapture`). Táto
 * vrstva ju iba NENIČÍ tam, kde ju Domov má použiť; obnovu robí `FeedList`.
 */

import { clearFeedReturn, peekFeedReturn } from './feedReturnState';

/** Scrollovateľná plocha dashboardu – rovnaký element ako vo `useFeedReturn`. */
const DASHBOARD_MAIN_SELECTOR = '[data-dashboard-main]';

/** Hranica desktopu (Tailwind `lg`), rovnaká ako inde v navigácii dashboardu. */
const DESKTOP_MIN_WIDTH_PX = 1024;

/** Používateľ sám poslal Nástenku na vrch – čakajúca obnova už neplatí. */
export const FEED_SCROLL_TOP_EVENT = 'feed-scroll-top';

function isDesktopViewport(): boolean {
  return typeof window !== 'undefined' && window.innerWidth >= DESKTOP_MIN_WIDTH_PX;
}

/**
 * Smie Domov vrátiť na zapamätané miesto?
 *
 * Pravidlá:
 *  - snímka musí existovať a niesť kladnú pozíciu (pri pozícii 0 niet čo
 *    vracať a obnova by len ukázala feed bez načítania zo servera),
 *  - vlastný profil: desktop aj mobil,
 *  - cudzí profil: len desktop (na mobile ho rieši šípka Späť v appke),
 *  - iný pôvod alebo neznámy: nikdy.
 *
 * Pôvod sa vyhodnocuje pri kliku, nie pri uložení, takže zmena veľkosti okna
 * medzi odchodom a návratom nič nepokazí.
 */
export function canRestoreFeedOnHome(): boolean {
  const snapshot = peekFeedReturn();
  if (!snapshot || !(snapshot.scrollTop > 0)) return false;
  switch (snapshot.entry) {
    case 'own-profile':
      return true;
    case 'other-profile':
      return isDesktopViewport();
    default:
      return false;
  }
}

/**
 * Čo sa stane so snímkou Nástenky pri voľbe sekcie v navigácii.
 *
 *  - `home` z inej obrazovky: snímka ostane, ak ju Domov smie použiť; inak sa
 *    zahodí a Nástenka sa načíta od vrchu.
 *  - `home`, keď už na Nástenke sme (druhý klik): čistý vstup, snímka sa zahodí.
 *  - `profile` (vlastný profil z menu): nový reťazec, snímka sa zahodí.
 *  - ostatné sekcie (správy, štatistiky…): snímka prežije, aby sa po odbočke dalo
 *    vrátiť cez Domov na miesto, odkiaľ sa išlo na profil.
 */
export function settleFeedReturnOnModuleChange(moduleId: string, activeModule: string): void {
  if (moduleId === 'home') {
    if (activeModule === 'home' || !canRestoreFeedOnHome()) clearFeedReturn();
    return;
  }
  if (moduleId === 'profile') clearFeedReturn();
}

/**
 * Pošle Nástenku na vrch a zruší obnovu, ktorá by ešte mohla dobiehať.
 *
 * Bez zrušenia by rýchly druhý klik (dvojklik) prepísala obnova, ktorá sa
 * zapisuje o dva snímky neskôr, a druhý klik by sa „stratil".
 */
export function scrollFeedToTop(): void {
  if (typeof document === 'undefined') return;
  const main = document.querySelector<HTMLElement>(DASHBOARD_MAIN_SELECTOR);
  if (main) main.scrollTop = 0;
  window.dispatchEvent(new Event(FEED_SCROLL_TOP_EVENT));
}

/** Počúva na „Nástenka ide na vrch" (zrušenie čakajúcej obnovy). */
export function onFeedScrollTop(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(FEED_SCROLL_TOP_EVENT, handler);
  return () => window.removeEventListener(FEED_SCROLL_TOP_EVENT, handler);
}
