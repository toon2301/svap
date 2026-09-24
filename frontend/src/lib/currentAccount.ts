'use client';

/**
 * Kto je práve prihlásený – čitateľné aj mimo Reactu.
 *
 * `AuthContext` je zdroj pravdy, ale hovorí len komponentom. Modulové úložiská
 * (snímka návratu na Nástenku a čokoľvek podobné) si musia vedieť overiť, komu
 * ich obsah patrí, a hook v nich zavolať nemôžu. Jedna karta prehliadača pritom
 * môže za jednu `sessionStorage` session vystriedať viac účtov.
 *
 * JEDINÝ zapisovateľ je `applyResolvedUser` v `AuthContext`: cez neho prechádza
 * každá zmena účtu – prihlásenie, odhlásenie, obnova `/me` aj zneplatnenie
 * session. Preto tu netreba reagovať na jednotlivé prejavy zmeny účtu zvlášť.
 *
 * Modulový stav zámerne: po znovunačítaní dokumentu má byť účet NEZNÁMY, kým ho
 * `/me` nepotvrdí. Uhádnutá identita by bola horšia než žiadna – podľa nej by sa
 * dal cudzí obsah privlastniť.
 */

let currentAccountId: number | null = null;

/** Volá výhradne `AuthContext`, keď dorieši, kto je prihlásený. */
export function setCurrentAccountId(id: number | null | undefined): void {
  currentAccountId = typeof id === 'number' && id > 0 ? id : null;
}

/** `null` = nikto prihlásený, alebo sa to ešte nezistilo. */
export function getCurrentAccountId(): number | null {
  return currentAccountId;
}
