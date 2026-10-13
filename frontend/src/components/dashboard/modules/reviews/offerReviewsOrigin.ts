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
 * Bez pôvodu (odkaz, F5, nová karta) ostáva záložná adresa `returnTo`.
 */

const ORIGIN_HISTORY_KEY = '__svaplyOfferReviewsOrigin';

/**
 * Identita tohto načítania stránky.
 *
 * `history.state` prežije F5, pôvod však nie: po reloade appka stav, z ktorého
 * sa recenzie otvorili, nepozná. Marker z iného načítania preto neplatí.
 */
const PAGE_LOAD_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

type OfferReviewsOriginMarker = { version: 1; pageLoadId: string };

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
 */
export function markOfferReviewsPending(href: string): void {
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
        [ORIGIN_HISTORY_KEY]: {
          version: 1,
          pageLoadId: PAGE_LOAD_ID,
        } satisfies OfferReviewsOriginMarker,
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
  if (marker?.version !== 1 || marker.pageLoadId !== PAGE_LOAD_ID) return false;
  window.history.back();
  return true;
}

/** Len pre testy – vyčistí modulový stav medzi prípadmi. */
export function resetOfferReviewsOrigin(): void {
  pendingPath = null;
}
