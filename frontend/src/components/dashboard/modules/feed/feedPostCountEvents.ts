'use client';

/**
 * Zosúladenie počtov jedného príspevku medzi jeho kartami.
 *
 * Ten istý príspevok môže byť na obrazovke dvakrát naraz: karta vo feede a
 * karta v okne detailu nad ňou. Lajk v okne musí byť vidieť aj na karte pod
 * ním – inak by po zavretí okna svietil starý počet, kým ho nedobehne
 * pravidelné obnovovanie.
 *
 * Zdrojom pravdy ostáva backend; toto je len okamžité rozposlanie ČERSTVEJ
 * odpovede ostatným kartám toho istého príspevku, nie druhá kópia stavu.
 * Rovnaký vzor ako `feedShareEvents` – appka na medzi-modulové signály
 * `window` eventy už používa a spoločný predok tu neexistuje (karta sa
 * vykresľuje aj z profilu).
 */

export const FEED_POST_COUNTS_EVENT = 'feed-post-counts-changed';

export type FeedPostCountsPatch = {
  postId: number;
  /** Nezaslané pole = „o tomto nič neviem", nie „vynuluj". */
  likesCount?: number;
  isLikedByMe?: boolean;
  commentsCount?: number;
};

export function emitFeedPostCounts(patch: FeedPostCountsPatch): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent<FeedPostCountsPatch>(FEED_POST_COUNTS_EVENT, {
        detail: patch,
      }),
    );
  } catch {
    // Zosúladenie je pohodlie – bez neho počet dobehne pri najbližšom
    // obnovení zo servera, takže sa nič nerozbije.
  }
}

export function onFeedPostCounts(
  handler: (patch: FeedPostCountsPatch) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<FeedPostCountsPatch>).detail;
    if (detail && typeof detail.postId === 'number') handler(detail);
  };
  window.addEventListener(FEED_POST_COUNTS_EVENT, listener);
  return () => window.removeEventListener(FEED_POST_COUNTS_EVENT, listener);
}
