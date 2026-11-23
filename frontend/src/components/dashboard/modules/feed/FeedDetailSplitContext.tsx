'use client';

/**
 * Údaj pre karty v ĽAVOM stĺpci dvojstĺpcového okna detailu (R53, R68).
 *
 * Ľavý stĺpec má tam PEVNÚ výšku (`h-[95vh]` okna), takže pružná plocha v karte (fotka ponuky alebo portfólia)
 * môže vyplniť jeho zvyšok. V jednostĺpcovom okne je výška len strop (`max-h-[95vh]`), pružná plocha by tam
 * nemala z čoho rátať a zmenšila by sa pod dnešných 256 px, preto tam údaj nie je (predvolená hodnota `false`).
 * Údaj nesie kontext, nie vlastnosť karty: `FeedPostCard.tsx` má 498 riadkov a pravidlo 500 riadkov mu
 * nedovolí rásť.
 */

import { createContext, useContext } from 'react';

const FeedDetailSplitContext = createContext(false);

export const FeedDetailSplitProvider = FeedDetailSplitContext.Provider;

/** `true` len vnútri ľavého stĺpca dvojstĺpcového okna detailu. */
export function useFeedDetailSplit(): boolean {
  return useContext(FeedDetailSplitContext);
}
