'use client';

/**
 * Oznámenie „vznikol nový príspevok" naprieč modulmi.
 *
 * Prečo event a nie callback prop: zdieľať sa dá z PROFILU (ponuka, portfólio),
 * kde `FeedList` vôbec nie je namountovaný – spoločný predok, cez ktorý by sa
 * callback dal pretiahnuť, neexistuje. Appka na presne takúto medzi-modulovú
 * komunikáciu už `window` eventy používa (`goToUserProfile`, `requestsRefresh`,
 * `offer-save-done`), takže sa preberá ten istý vzor namiesto nového kontextu.
 *
 * Keď feed namountovaný nie je, event sa ticho stratí – a nič sa nedeje:
 * pri ďalšom otvorení Nástenky sa zoznam načíta zo servera aj tak.
 */

import type { FeedPost } from '@/lib/feedApi';

export const FEED_POST_CREATED_EVENT = 'feed-post-created';

export function emitFeedPostCreated(post: FeedPost): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent<FeedPost>(FEED_POST_CREATED_EVENT, { detail: post }),
    );
  } catch {
    // Vloženie do feedu je len pohodlie – keby CustomEvent zlyhal (staršie
    // prostredie), príspevok aj tak existuje a načíta sa pri ďalšom otvorení.
  }
}

export function onFeedPostCreated(handler: (post: FeedPost) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<FeedPost>).detail;
    if (detail && typeof detail.id === 'number') handler(detail);
  };
  window.addEventListener(FEED_POST_CREATED_EVENT, listener);
  return () => window.removeEventListener(FEED_POST_CREATED_EVENT, listener);
}
