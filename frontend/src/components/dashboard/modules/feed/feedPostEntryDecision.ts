'use client';

/**
 * Čo má appka spraviť, keď adresa ukazuje na príspevok?
 *
 * Rozhodnutie má prekvapivo veľa vstupov (dve rôzne oneskorenia adresy, mobil
 * vs. desktop, už otvorené okno), takže žije mimo dashboardu – tam by bolo
 * len ďalším neprehľadným efektom a nedalo by sa naň napísať test.
 *
 * Pravidlo: na DESKTOPE vedie cesta príspevku vždy k Nástenke na pozadí a
 * OKNU nad ňou – rovnakému, aké sa otvára klikom vo feede. Platí to aj pre
 * chladný vstup (odkaz, F5), kde predtým appka ukazovala samostatnú stránku.
 * Na mobile ostáva celoobrazovková stránka.
 */

import { parseFeedPostTargetUrl, type FeedPostRouteTarget } from './feedPostRouting';

export type FeedPostEntryDecision =
  /** Ešte nevieme rozhodnúť – nechaj obrazovku tak, ako je. */
  | { kind: 'wait' }
  /** Adresa príspevku sa netýka (alebo je už vybavená). */
  | { kind: 'none' }
  /** Mobil: pôvodná celoobrazovková stránka. */
  | { kind: 'full-page' }
  /** Desktop: Nástenka na pozadí a okno s príspevkom nad ňou. */
  | { kind: 'overlay'; target: FeedPostRouteTarget };

export type FeedPostEntryInput = {
  /** Príspevok z cesty podľa routera (`usePathname`). */
  pathPostId: number | null;
  /** Okno už niečo zobrazuje. */
  overlayOpen: boolean;
  /** Beží krok späť po zatvorení okna? */
  historyBusy: boolean;
  /** Skutočná adresa v prehliadači (`location.pathname + search`). */
  liveUrl: string | null;
  /** Vieme už, či je viewport mobilný? */
  viewportResolved: boolean;
  isMobile: boolean;
};

export function decideFeedPostEntry({
  pathPostId,
  overlayOpen,
  historyBusy,
  liveUrl,
  viewportResolved,
  isMobile,
}: FeedPostEntryInput): FeedPostEntryDecision {
  if (pathPostId == null) return { kind: 'none' };
  // Okno už príspevok zobrazuje – niet čo otvárať.
  if (overlayOpen) return { kind: 'none' };

  // Dve oneskorenia, každé opačným smerom:
  //  - po zatvorení okna dobehne `history.back()` až o kolo neskôr, takže
  //    SKUTOČNÁ adresa ešte ukazuje na príspevok → `historyBusy`,
  //  - po `replaceState` sa router dorovnáva až v transition, takže naopak
  //    CESTA Z ROUTERA ešte ukazuje na príspevok → kontrola skutočnej adresy.
  // Bez oboch by sa okno hneď po zatvorení otvorilo znova.
  if (historyBusy) return { kind: 'none' };
  const target = liveUrl ? parseFeedPostTargetUrl(liveUrl) : null;
  if (!target) return { kind: 'none' };

  // Okno je desktopová náhrada stránky; kým to nevieme isto, nerobíme nič.
  if (!viewportResolved) return { kind: 'wait' };
  if (isMobile) return { kind: 'full-page' };

  return { kind: 'overlay', target };
}
