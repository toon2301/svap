
'use client';

/**
 * História pri okne detailu príspevku.
 *
 * Otvorenie okna pridá do histórie PRESNE JEDEN záznam a bežné zatvorenie
 * (Escape / „X" / klik mimo) ho zase ODOBERIE. Keby zatvorenie namiesto toho
 * pushlo pôvodnú adresu, história by vyzerala takto:
 *
 *   pôvodná stránka → /dashboard/feed/7 → pôvodná stránka
 *
 * a „späť" v prehliadači by používateľa poslalo NAZAD DO PRÍSPEVKU (navyše cez
 * celoobrazovkovú zálohu, nie cez okno) namiesto tam, kde bol pred otvorením.
 *
 * Stav je jeden príznak na úrovni modulu, lebo okno je v appke práve jedno –
 * rovnako ako register vrstiev v `overlayLayers`.
 */

/** Máme v histórii vlastný záznam, ktorý treba pri zatvorení odobrať? */
let pushed = false;

/** Otvorenie okna: prvé otvorenie pridá záznam, ďalšia zmena ho prepíše. */
export function pushFeedOverlayHistory(path: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (pushed) {
      // Zmena príspevku v už otvorenom okne nesmie pridať ďalší záznam –
      // inak by zatvorenie odobralo len ten posledný.
      window.history.replaceState(null, '', path);
      return;
    }
    window.history.pushState(null, '', path);
    pushed = true;
  } catch {
    // URL je pohodlie (obnovenie stránky, poslanie odkazu). Keby history API
    // zlyhalo, okno funguje ďalej – len bez adresy.
  }
}

/** Bežné zatvorenie: odober záznam, ktorý pridalo otvorenie. */
export function popFeedOverlayHistory(): void {
  if (!pushed || typeof window === 'undefined') return;
  // Príznak zhasni PRED `back()`: `popstate` príde až potom a nesmie sa
  // tváriť, že je čo odoberať.
  pushed = false;
  try {
    window.history.back();
  } catch {
    // Ako vyššie – bez histórie sa okno aj tak zatvorí.
  }
}

/**
 * Záznam zmizol bez nášho pričinenia (používateľ dal „späť" pri otvorenom
 * okne). Odoberať už niet čo – len si to poznač.
 */
export function forgetFeedOverlayHistory(): void {
  pushed = false;
}

/** Len pre testy – vyčistí príznak medzi behmi. */
export function resetFeedOverlayHistory(): void {
  pushed = false;
}
