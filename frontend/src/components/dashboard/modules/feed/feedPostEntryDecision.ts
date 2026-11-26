'use client';

/**
 * Čo má appka spraviť, keď adresa ukazuje na príspevok?
 *
 * Rozhodnutie má prekvapivo veľa vstupov (dve rôzne oneskorenia adresy, už
 * otvorené okno), takže žije mimo dashboardu – tam by bolo len ďalším
 * neprehľadným efektom a nedalo by sa naň napísať test.
 *
 * Pravidlo: cesta príspevku vedie vždy k Nástenke na pozadí a DETAILU nad
 * ňou – rovnakému, aký sa otvára klikom vo feede alebo upozornením. Platí to
 * aj pre chladný vstup (odkaz, F5), kde predtým appka ukazovala samostatnú
 * stránku. Na počítači je detail okno, na mobile obrazovka; ktorú podobu
 * nakresliť, vyberá až `FeedPostDetailSwitch` podľa šírky okna, takže
 * rozhodnutie od šírky okna nezávisí (nález 360).
 */

import { parseFeedPostTargetUrl, type FeedPostRouteTarget } from './feedPostRouting';

export type FeedPostEntryDecision =
  /** Adresa príspevku sa netýka (alebo je už vybavená). */
  | { kind: 'none' }
  /** Nástenka na pozadí a detail príspevku nad ňou (okno na počítači, obrazovka na mobile). */
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
};

export function decideFeedPostEntry({
  pathPostId,
  overlayOpen,
  historyBusy,
  liveUrl,
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

  return { kind: 'overlay', target };
}
