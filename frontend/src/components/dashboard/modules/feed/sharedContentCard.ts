/**
 * Dáta pre jednu kartu zdieľaného obsahu na Nástenke.
 *
 * Karta sa kreslí na TROCH miestach – vo feed zozname, v detaile príspevku
 * (desktop okno aj mobilná obrazovka) a v dialógu zdieľania. Zoznam a detail
 * majú k dispozícii hotový `FeedPost` z API, dialóg naopak zdroj, ktorý
 * príspevkom ešte len bude. Tento normalizovaný tvar je ich spoločný jazyk,
 * takže `SharedContentPreviewCard` nemusí vedieť, odkiaľ dáta prišli – a
 * používateľ v dialógu vidí presne to, čo o chvíľu pristane vo feede.
 */

import type { FeedPost } from '@/lib/feedApi';
import type { OfferPriceFields } from './offerPriceLabel';

export type SharedContentCardOwner = {
  displayName: string;
  avatarUrl?: string | null;
};

export type SharedContentCard = {
  type: 'offer' | 'portfolio_item' | 'feed_post';
  /** Názov ponuky/portfólia. Príspevok názov nemá – ten sa poznáva textom. */
  title?: string;
  /**
   * Druhý riadok pod názvom: PRELOŽENÁ kategória alebo lokalita.
   *
   * Zámerne hotový text, nie kľúč kategórie – snapshot vo feede nesie surový
   * kľúč (`it-a-technologie`), ktorý by sa na karte čítal ako preklep.
   */
  meta?: string | null;
  /** Text pôvodného príspevku (alebo popis ponuky/portfólia). */
  caption?: string | null;
  thumbnailUrl?: string | null;
  /** Len ponuka: `true` = Hľadám, `false` = Ponúkam, `null` = neuvádza sa. */
  isSeeking?: boolean | null;
  /** Surové polia ceny; text z nich zloží karta (viď formatOfferPriceLabel). */
  price?: OfferPriceFields | null;
  /** Pôvodný vlastník obsahu – kreslí sa NAD kartou, nie v nej. */
  owner?: SharedContentCardOwner | null;
  /** Zdroj medzitým zmizol: tá istá karta, len stlmená a bez kliku. */
  unavailable?: boolean;
};

/** Snapshot zdieľaného obsahu z feed API prevedený na dáta karty. */
export function sharedContentCardFromPost(post: FeedPost): SharedContentCard | null {
  const shared = post.shared_content;
  if (!shared) return null;

  return {
    type: shared.type,
    title: shared.title,
    caption: shared.caption,
    thumbnailUrl: shared.thumbnail_url,
    isSeeking: shared.is_seeking,
    // Snapshot sám nesie polia ceny, takže ide rovno ako `OfferPriceFields`.
    price: shared,
    owner: shared.owner_display_name
      ? {
          displayName: shared.owner_display_name,
          avatarUrl: shared.owner?.avatar_url ?? null,
        }
      : null,
    unavailable: post.shared_content_unavailable === true,
  };
}
