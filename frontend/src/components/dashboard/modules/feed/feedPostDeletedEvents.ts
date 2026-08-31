'use client';

/**
 * Oznámenie „príspevok bol zmazaný" naprieč zoznamami.
 *
 * Mazať sa dá aj z OKNA DETAILU, ktoré leží nad bežiacim feedom. Okno o
 * zozname pod sebou nevie a spoločný predok, cez ktorý by sa dal pretiahnuť
 * callback, neexistuje (karta sa vykresľuje aj z profilu). Bez tohto signálu
 * by po zavretí okna ostala vo feede karta príspevku, ktorý už neexistuje –
 * až do najbližšieho obnovenia zoznamu.
 *
 * Rovnaký vzor ako `feedShareEvents` („vznikol príspevok") a
 * `feedPostCountEvents` („zmenili sa počty“) – jeden signál, jeden modul.
 */

export const FEED_POST_DELETED_EVENT = 'feed-post-deleted';

export function emitFeedPostDeleted(postId: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent<number>(FEED_POST_DELETED_EVENT, { detail: postId }),
    );
  } catch {
    // Odstránenie karty je pohodlie – zoznam sa pri najbližšom načítaní
    // zosúladí so serverom aj bez neho.
  }
}

export function onFeedPostDeleted(handler: (postId: number) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<number>).detail;
    if (typeof detail === 'number') handler(detail);
  };
  window.addEventListener(FEED_POST_DELETED_EVENT, listener);
  return () => window.removeEventListener(FEED_POST_DELETED_EVENT, listener);
}
