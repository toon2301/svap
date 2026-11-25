'use client';

/**
 * Poistka proti „hýbaniu“ stránky pod mobilným detailom a panelom komentárov (R75 bod 5, nález 370).
 *
 * Detail príspevku aj panel nad fotkou sú vrstvy `fixed`. Keď sa v nich nedá nič posúvať (krátky príspevok, pár komentárov),
 * ťah prstom sa pošle stránke pod nimi a iPhone ju prirodzene „odpruží“ (gumový efekt): vrstva aj pole na komentár sa vtedy
 * pred očami hýbu, hoci majú stáť. Kým je vrstva otvorená, preto stránka dostane `overscroll-behavior: none` (iOS 16 a novší),
 * čo gumový efekt a reťazenie scrollu vypne.
 *
 * Zámerne sa NEMENÍ `overflow` na `body`, ako to robia iné vrstvy: v appke má `html` aj `body` vlastné `overflow`, takže
 * `overflow: hidden` na `body` stránku nezamkne, a vnorené vrstvy (detail s fotoprehliadačom nad ním) by si pri zatváraní
 * navzájom prepísali uloženú hodnotu a stránka by ostala zamknutá. `overscroll-behavior` nemení nikto iný, takže tu takýto
 * konflikt nie je.
 *
 * Zámok sa počíta (`locks`): viac vrstiev naraz ho drží spolu a pôvodné hodnoty sa vrátia, až keď sa zatvorí posledná.
 */

import { useEffect } from 'react';

let locks = 0;
let saved: { html: string; body: string } | null = null;

/** Zapne zámok a vráti funkciu, ktorá ho uvoľní (opakované volanie nič nepokazí). */
export function lockFeedOverscroll(): () => void {
  if (typeof document === 'undefined') return () => undefined;
  const html = document.documentElement;
  const body = document.body;
  if (locks === 0) {
    saved = {
      html: html.style.overscrollBehavior,
      body: body.style.overscrollBehavior,
    };
    html.style.overscrollBehavior = 'none';
    body.style.overscrollBehavior = 'none';
  }
  locks += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks -= 1;
    if (locks === 0 && saved) {
      html.style.overscrollBehavior = saved.html;
      body.style.overscrollBehavior = saved.body;
      saved = null;
    }
  };
}

/** Kým je `active`, stránka pod vrstvou sa nedá „odpružiť“ (gumový efekt). */
export function useFeedOverscrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    return lockFeedOverscroll();
  }, [active]);
}
