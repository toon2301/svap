'use client';

/**
 * Údaj pre kartu v ĽAVOM stĺpci dvojstĺpcového okna, keď je príspevok len text (bez fotky, ponuky a portfólia; R73).
 *
 * Ľavý stĺpec tam nemá čo iné ukázať, takže text nemá súperiť o miesto a text voľného príspevku sa ukáže celý (bez
 * „Viac"); keď je vyšší než stĺpec, posúva sa len on. Repost textového príspevku má od R77 text zdieľajúceho na desať
 * riadkov a pôvodný text na päť (s „Viac"). Rovnako ako `FeedDetailSplitContext` ide údaj kontextom, nie vlastnosťou
 * karty, lebo `FeedPostCard.tsx` nesmie rásť nad 500 riadkov.
 */

import { createContext, useContext } from 'react';

const FeedDetailTextOnlyContext = createContext(false);

export const FeedDetailTextOnlyProvider = FeedDetailTextOnlyContext.Provider;

/** `true` len vnútri ľavého stĺpca dvojstĺpcového okna príspevku len s textom. */
export function useFeedDetailTextOnly(): boolean {
  return useContext(FeedDetailTextOnlyContext);
}
