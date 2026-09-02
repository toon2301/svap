'use client';

/**
 * Má sa mobilná obrazovka detailu otvoriť rovno pri komentároch?
 *
 * Rozhodnutie žije mimo komponentu, aby sa dalo overiť pre všetky kombinácie
 * vstupov naraz – v samotnej obrazovke by to bola podmienka schovaná v efekte.
 *
 * PRAVIDLO: doscrolluje sa LEN keď príspevok MÁ fotku A ZÁROVEŇ má aspoň dva
 * komentáre.
 *
 * Prečo obe podmienky súčasne:
 *  - Bez fotky je nad komentármi len text, ktorý používateľ na karte práve
 *    videl – preskočiť ho by ho pripravilo o kontext a nič by tým nezískal.
 *  - Fotka zaberie takmer celú výšku obrazovky, takže pri živej diskusii je
 *    otváranie od vrchu skôr prekážkou. Pri jednom (alebo žiadnom) komentári
 *    ale niet čo ukazovať – skok by odhalil prázdno.
 *
 * Doscrollovanie je len ŠTARTOVACIA pozícia: používateľ sa vždy môže vrátiť
 * hore na celý text aj fotku.
 */

/** Odkedy sa diskusia oplatí ukázať rovno. */
export const AUTO_SCROLL_MIN_COMMENTS = 2;

type AutoScrollInput = {
  /** Má príspevok fotku, ktorú je čo zobraziť? */
  hasPhoto: boolean;
  /** Počet komentárov zo servera (`comments_count`). */
  commentsCount: number | null | undefined;
};

export function shouldAutoScrollToComments({
  hasPhoto,
  commentsCount,
}: AutoScrollInput): boolean {
  if (!hasPhoto) return false;
  const count = Number(commentsCount);
  if (!Number.isFinite(count)) return false;
  return count >= AUTO_SCROLL_MIN_COMMENTS;
}
