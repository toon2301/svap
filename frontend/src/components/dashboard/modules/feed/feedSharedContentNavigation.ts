'use client';

/**
 * Preklik z vnoreného náhľadu na samotný zdieľaný obsah.
 *
 * Vytiahnuté z karty, lebo náhľad kreslia tri miesta (karta, desktopové okno,
 * mobilná obrazovka detailu) a každé z nich musí prekliknúť rovnako. Typ sa tu
 * MUSÍ rozlišovať: ponuky, portfólio položky aj príspevky majú nezávislé
 * číslovanie, takže poslať portfolio id ako `offerId` by otvorilo cudziu
 * ponuku s rovnakým číslom.
 */

import type { FeedPost } from '@/lib/feedApi';
import { buildPortfolioDetailPath } from '../profile/portfolioRouting';

type Router = { push: (href: string) => void };

type SharedSourceOptions = {
  router: Router;
  /**
   * Zavolá sa TESNE PRED navigáciou.
   *
   * Vrstva, z ktorej sa preklikáva (okno detailu, mobilná obrazovka), sa tým
   * zavrie – inak by ostala visieť nad stránkou, na ktorú sa používateľ práve
   * dostal. Adresu si rieši samotná navigácia, preto vrstvy zatvárajú s
   * `keepHistory`: krok späť by ju vzápätí zrušil.
   */
  beforeNavigate?: () => void;
};

/**
 * Vráti handler na otvorenie zdieľaného zdroja, alebo `undefined`, keď sa
 * otvárať nedá (chýba id, prípadne vlastník pri ponuke/portfóliu).
 */
export function buildSharedSourceHandler(
  post: FeedPost,
  { router, beforeNavigate }: SharedSourceOptions,
): (() => void) | undefined {
  const ownerIdentifier =
    (post.shared_content?.owner?.slug || '').trim() ||
    String(post.shared_content?.owner?.id || '');
  const sourceId = post.shared_content?.id ?? null;
  const sharedType = post.shared_content?.type;

  if (!sourceId) return undefined;
  if (sharedType !== 'feed_post' && !ownerIdentifier) return undefined;

  return () => {
    beforeNavigate?.();
    if (sharedType === 'portfolio_item') {
      router.push(buildPortfolioDetailPath(ownerIdentifier, sourceId));
      return;
    }
    if (sharedType === 'feed_post') {
      router.push(`/dashboard/feed/${sourceId}`);
      return;
    }
    // Ponuka – globálny event, rovnako ako OfferShareMessageCard v správach.
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('goToUserProfile', {
        detail: { identifier: ownerIdentifier, offerId: sourceId },
      }),
    );
  };
}
