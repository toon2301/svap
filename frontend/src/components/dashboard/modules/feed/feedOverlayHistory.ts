
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
/**
 * Beží náš krok späť?
 *
 * `history.back()` NIE JE okamžitý – adresa sa zmení až o kolo neskôr. Appka
 * medzitým vidí cestu príspevku, hoci okno je už zavreté, a bez tohto
 * príznaku by si to vyložila ako „používateľ je na permalinku príspevku" a
 * otvorila celoobrazovkovú stránku pod zavretým oknom.
 */
let closing = false;
/**
 * Prevzali sme adresu, ktorú sme sami nepridali?
 *
 * Pri priamom vstupe (odkaz, F5) je cesta príspevku PRVÉ, čo appka videla –
 * okno ju teda len prevezme. Vracať sa krokom späť by nebolo kam, preto sa
 * pri zatvorení adresa nahradí Nástenkou.
 */
let adopted = false;

/** Kam sa vráti zatvorenie okna otvoreného priamym vstupom. */
const DASHBOARD_PATH = '/dashboard';

/** Príznak zhasne, len čo náš krok späť naozaj dobehne. */
function armClosingReset(): void {
  const listener = () => {
    closing = false;
    window.removeEventListener('popstate', listener);
  };
  window.addEventListener('popstate', listener);
}

/** Otvorenie okna: prvé otvorenie pridá záznam, ďalšia zmena ho prepíše. */
export function pushFeedOverlayHistory(path: string): void {
  if (typeof window === 'undefined') return;
  closing = false;
  adopted = false;
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

/**
 * Priamy vstup: adresa príspevku už v prehliadači je, len ju okno prevezme.
 * Nič sa nepridáva – inak by v histórii vznikol duplicitný záznam.
 */
export function adoptFeedOverlayHistory(): void {
  closing = false;
  pushed = false;
  adopted = true;
}

/** Bežné zatvorenie: odober záznam, ktorý pridalo otvorenie. */
export function popFeedOverlayHistory(): void {
  if (typeof window === 'undefined') return;
  if (adopted && !pushed) {
    // Prevzatá adresa: predošlý stav appky neexistuje, takže sa niet kam
    // vracať – používateľ ostáva na Nástenke, ktorú vidí pod oknom.
    adopted = false;
    try {
      window.history.replaceState(null, '', DASHBOARD_PATH);
    } catch {
      // Adresa je pohodlie; okno sa zavrie aj tak.
    }
    return;
  }
  if (!pushed) return;
  // Príznak zhasni PRED `back()`: `popstate` príde až potom a nesmie sa
  // tváriť, že je čo odoberať.
  pushed = false;
  closing = true;
  try {
    armClosingReset();
    window.history.back();
  } catch {
    // Ako vyššie – bez histórie sa okno aj tak zatvorí.
    closing = false;
  }
}

/**
 * Záznam zmizol bez nášho pričinenia (používateľ dal „späť" pri otvorenom
 * okne). Odoberať už niet čo – len si to poznač.
 */
export function forgetFeedOverlayHistory(): void {
  pushed = false;
  closing = false;
  adopted = false;
}

/**
 * Patrí cesta príspevku ešte oknu?
 *
 * `true` znamená „okno je otvorené alebo sa práve zatvára" – appka vtedy
 * nesmie na adresu príspevku reagovať otvorením celoobrazovkovej stránky.
 */
export function isFeedOverlayHistoryBusy(): boolean {
  return pushed || closing;
}

/** Len pre testy – vyčistí príznaky medzi behmi. */
export function resetFeedOverlayHistory(): void {
  pushed = false;
  closing = false;
  adopted = false;
}
