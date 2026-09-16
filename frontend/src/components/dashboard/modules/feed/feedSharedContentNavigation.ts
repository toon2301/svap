'use client';
import { dashboardFeedPostPath } from '../../components/dashboardRoutes';

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
import { openPortfolioDetail } from '../profile/portfolioRouting';
import { requestFeedReturnCapture } from './feedReturnState';

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
    // Rovnako ako pri preklik na profil: uloženie stavu Nástenky ešte pred
    // odchodom, nech sa dá vrátiť presne tam, kde používateľ skončil.
    requestFeedReturnCapture();
    if (sharedType === 'portfolio_item') {
      // S pôvodom: krok späť z detailu vráti na Nástenku.
      openPortfolioDetail(router, ownerIdentifier, sourceId);
      return;
    }
    if (sharedType === 'feed_post') {
      const postPath = dashboardFeedPostPath(sourceId);
      if (postPath) router.push(postPath);
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
