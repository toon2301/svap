'use client';

/**
 * Pôvod stránky recenzií – odkiaľ ju otvorila appka – pre šípku „späť".
 *
 * Recenzie sa z appky otvárajú z karty ponuky na profile (vlastnom aj cudzom).
 * Šípka v nich predtým profil otvorila ZNOVA (`router.push` na návratovú
 * adresu): pridala ďalší záznam, takže prehliadačové Späť viedlo naspäť do
 * recenzií a dvojica obrazoviek sa dala preklikávať donekonečna. Pri známom
 * pôvode je správny skutočný krok späť – profil ostane tam, kde bol, a ďalší
 * krok vedie odtiaľ, kam sa do profilu prišlo.
 *
 * Pôvod sa píše do `history.state` záznamu recenzií – rovnaký vzor ako
 * `__svaplyPortfolioDetailOrigin` (detail portfólia). Dvojkrokovo, lebo záznam
 * vytvára až Next router pri commite novej stránky: otvorenie si cestu
 * zapamätá a zobrazená stránka recenzií ju prevezme.
 *
 * Bez pôvodu (odkaz, nová karta) ostáva záložná adresa `returnTo`.
 *
 * Značka sa NEVIAŽE na načítanie stránky (na rozdiel od detailu portfólia). Hovorí
 * len to, že záznam recenzií vznikol krokom z profilu, teda predošlý záznam JE ten
 * profil – a F5 históriu ani `history.state` nemení. Značka viazaná na načítanie
 * po F5 zlyhala: šípka išla záložným `replace`, ktorý k starému záznamu profilu
 * pridal jeho kópiu bez pôvodu, a ďalšie Späť pristálo na tej kópii namiesto na
 * mieste, odkiaľ sa do profilu prišlo.
 */

import { rememberProfileScroll } from '../profile/profileScrollMemory';

const ORIGIN_HISTORY_KEY = '__svaplyOfferReviewsOrigin';

type OfferReviewsOriginMarker = { version: 1 };

/** Cesta recenzií, ktoré appka práve otvára a ešte nemajú svoj záznam. */
let pendingPath: string | null = null;

function historyStateRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Cesta bez dotazu a hashu.
 *
 * Adresa po príchode sa môže v dotaze líšiť od tej, ktorú otvorenie dostalo
 * (`returnTo`, `review_id`) – o pôvode rozhoduje len stránka.
 */
function pathOf(href: string): string {
  return href.split(/[?#]/, 1)[0];
}

/**
 * Appka otvára recenzie – navigáciu však robí niekto iný (napr. `<Link>`).
 *
 * Zapamätá si len, čo sa otvára; záznam histórie vznikne až po príchode.
 * Zároveň uloží, dokiaľ je profil odscrollovaný, aby ho krok späť otvoril na tom
 * istom mieste (viď `profileScrollMemory`) – musí sa stať PRED navigáciou, kým je
 * aktuálny záznam ešte profil a jeho plocha ešte na obrazovke.
 */
export function markOfferReviewsPending(href: string): void {
  rememberProfileScroll();
  pendingPath = pathOf(href);
}

/** Otvor recenzie z karty ponuky – s pôvodom pre krok späť. */
export function openOfferReviews(router: { push: (url: string) => void }, href: string): void {
  markOfferReviewsPending(href);
  router.push(href);
}

/**
 * Recenzie sa zobrazili: ak ich otvorila appka, označí ich záznam pôvodom.
 *
 * Prevzatie je jednorazové a zahodí sa aj pri nezhode – inak by si ho mohla
 * neskôr privlastniť stránka otvorená odkazom.
 */
export function adoptOfferReviewsOrigin(): void {
  if (typeof window === 'undefined') return;
  const path = pendingPath;
  pendingPath = null;
  if (!path || window.location.pathname !== path) return;
  try {
    window.history.replaceState(
      {
        ...historyStateRecord(window.history.state),
        [ORIGIN_HISTORY_KEY]: { version: 1 } satisfies OfferReviewsOriginMarker,
      },
      '',
      window.location.href,
    );
  } catch {
    // Bez markera sa šípka správa ako pri vstupe odkazom (záložná adresa).
  }
}

/**
 * Krok späť na pôvod recenzií, keď je známy.
 *
 * Vracia `false`, keď pôvod známy nie je – volajúci ostáva pri záložnej adrese.
 */
export function returnToOfferReviewsOrigin(): boolean {
  if (typeof window === 'undefined') return false;
  const marker = historyStateRecord(window.history.state)[ORIGIN_HISTORY_KEY] as
    | Partial<OfferReviewsOriginMarker>
    | undefined;
  if (marker?.version !== 1) return false;
  window.history.back();
  return true;
}

/** Len pre testy – vyčistí modulový stav medzi prípadmi. */
export function resetOfferReviewsOrigin(): void {
  pendingPath = null;
}
