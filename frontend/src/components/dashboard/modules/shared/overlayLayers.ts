'use client';

/**
 * Poradie prekrytých vrstiev – kto je navrchu, ten reaguje na Escape.
 *
 * Appka doteraz vrstvy neriešila: každý dialóg si Escape počúval sám na
 * `window`, čo pri jednej vrstve stačí. Odkedy sa dá nad detail príspevku
 * otvoriť ešte fullscreen prehliadač fotky, by však jedno stlačenie zavrelo
 * OBE – oba listenery sú na tom istom uzle, takže `stopPropagation` medzi nimi
 * nič nerieši.
 *
 * Register je zámerne minimálny: pole identifikátorov v poradí otvorenia.
 * Vrchná vrstva je posledná zaregistrovaná; ostatné svoj Escape ignorujú.
 */

let stack: symbol[] = [];

/** Zaregistruje vrstvu a vráti funkciu na jej odobratie. */
export function pushOverlayLayer(): { id: symbol; release: () => void } {
  const id = Symbol('overlay-layer');
  stack = [...stack, id];
  return {
    id,
    release: () => {
      stack = stack.filter((entry) => entry !== id);
    },
  };
}

/** Je táto vrstva navrchu? Nezaregistrovaná vrstva sa berie ako vrchná. */
export function isTopOverlayLayer(id: symbol | null): boolean {
  if (id === null) return true;
  return stack.length === 0 || stack[stack.length - 1] === id;
}

/** Len pre testy – vyprázdni register medzi behmi. */
export function resetOverlayLayers(): void {
  stack = [];
}
