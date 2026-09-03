'use client';

/**
 * Má sa mobilná obrazovka detailu otvoriť rovno pri komentároch?
 *
 * Rozhodnutie žije mimo komponentu, aby sa dalo overiť pre všetky kombinácie
 * vstupov naraz – v samotnej obrazovke by to bola podmienka schovaná v efekte.
 *
 * PRAVIDLO: doscrolluje sa LEN keď príspevok má nad komentármi ROZMERNÝ obsah
 * (fotku ALEBO vnorený náhľad zdieľaného obsahu) A ZÁROVEŇ aspoň dva komentáre.
 *
 * Prečo obe podmienky súčasne:
 *  - Bez rozmerného obsahu je nad komentármi len text, ktorý používateľ na
 *    karte práve videl – preskočiť ho by ho pripravilo o kontext a nič by tým
 *    nezískal.
 *  - Fotka aj zdieľaný náhľad zaberú veľkú časť obrazovky, takže pri živej
 *    diskusii je otváranie od vrchu skôr prekážkou. Pri jednom (alebo žiadnom)
 *    komentári ale niet čo ukazovať – skok by odhalil prázdno.
 *
 * Náhľad sa počíta bez ohľadu na typ aj vtedy, keď je zdroj nedostupný: aj ten
 * stav je vykreslený blok, ktorý medzi text a komentáre patrí rovnako.
 *
 * Doscrollovanie je len ŠTARTOVACIA pozícia: používateľ sa vždy môže vrátiť
 * hore na celý text aj fotku.
 */

/** Odkedy sa diskusia oplatí ukázať rovno. */
export const AUTO_SCROLL_MIN_COMMENTS = 2;

type AutoScrollInput = {
  /** Má príspevok fotku, ktorú je čo zobraziť? */
  hasPhoto: boolean;
  /** Kreslí sa nad komentármi vnorený náhľad zdieľaného obsahu? */
  hasSharedPreview?: boolean;
  /** Počet komentárov zo servera (`comments_count`). */
  commentsCount: number | null | undefined;
};

export function shouldAutoScrollToComments({
  hasPhoto,
  hasSharedPreview = false,
  commentsCount,
}: AutoScrollInput): boolean {
  if (!hasPhoto && !hasSharedPreview) return false;
  const count = Number(commentsCount);
  if (!Number.isFinite(count)) return false;
  return count >= AUTO_SCROLL_MIN_COMMENTS;
}
