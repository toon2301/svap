'use client';

/**
 * Nový vstup do profilu vs. pokračovanie v už otvorenom.
 *
 * Klik na avatar či meno je vstup do NIEČOHO INÉHO: profil sa má otvoriť od
 * vrchu a na záložke Ponuky, bez ohľadu na to, kde a v akej záložke bol
 * používateľ pri predošlej návšteve iného profilu. Bez tohto ostával
 * `<main>` odscrollovaný z predošlého profilu (nikdy sa neodmountuje) a
 * používateľ pristál v polovici cudzej stránky.
 *
 * Príznak nastavuje VÝHRADNE preklik (`openUserProfile`). Práve preto sa
 * nespustí pri F5 (modulový stav reload neprežije) ani pri kroku
 * späť/dopredu vnútri už otvoreného profilu (žiadny preklik = žiadny
 * príznak) – tam sa má obnoviť to, čo si používateľ vybral.
 */

let freshEntryPending = false;

/** Preklik na profil – ďalší vstup je nový, nie pokračovanie. */
export function markProfileFreshEntry(): void {
  freshEntryPending = true;
}

/**
 * Prevezme príznak a zahodí ho.
 *
 * Jednorazové: druhé prekreslenie toho istého profilu už nový vstup nie je.
 */
export function takeProfileFreshEntry(): boolean {
  const pending = freshEntryPending;
  freshEntryPending = false;
  return pending;
}

/** Len pre testy – vyčistí modulový stav medzi prípadmi. */
export function resetProfileFreshEntry(): void {
  freshEntryPending = false;
}
