/**
 * Vlastník zdieľaného obsahu v dátach karty (nález 362, dávka K59).
 *
 * Riadok pôvodného autora nad kartou zdieľaného obsahu (repost, ponuka, portfólio) mal v dátach karty len meno a adresu
 * avatara, takže sa z neho nedalo prekliknúť na profil. Feed API pri živom zdroji posiela v `shared_content.owner` celý
 * `FeedUserSummary` (id, adresa profilu, avatar), pri nedostupnom zdroji `null` (ide len snapshot s menom). Mapovanie
 * `sharedContentCardFromPost` preto prenáša `id` a `slug` vlastníka; bez nich ostávajú prázdne a karta sa nepreklikáva.
 * Staré polia karty sa nemenia.
 */

import { sharedContentCardFromPost } from '../sharedContentCard';
import type { FeedPost } from '@/lib/feedApi';

const VLASTNIK = {
  id: 21,
  display_name: 'Peter Malý',
  slug: 'peter',
  user_type: 'individual',
  avatar_url: 'http://api.test/peter.webp',
};

function prispevok(zdielany: Record<string, unknown> | null, ostatne: Record<string, unknown> = {}): FeedPost {
  return {
    id: 7,
    post_type: 'shared_offer',
    caption: 'Odporúčam.',
    author: { id: 10, display_name: 'Jana', slug: 'jana', user_type: 'individual', avatar_url: null },
    images: [],
    shared_content: zdielany,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 0,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
    ...ostatne,
  } as unknown as FeedPost;
}

function zdielanaPonuka(prepisy: Record<string, unknown> = {}) {
  return {
    type: 'offer',
    title: 'Programovanie',
    category: 'it-a-technologie',
    caption: '',
    id: 42,
    owner: VLASTNIK,
    owner_display_name: VLASTNIK.display_name,
    thumbnail_url: null,
    is_seeking: false,
    price_negotiable: false,
    price_from: '25',
    price_currency: '€',
    ...prepisy,
  };
}

describe('vlastník zdieľaného obsahu v dátach karty (nález 362)', () => {
  it.each([
    ['ponuka', { type: 'offer' }],
    ['portfólio', { type: 'portfolio_item', title: 'Weby' }],
    ['repost príspevku', { type: 'feed_post', title: '', caption: 'Pôvodný text' }],
  ])('%s: vlastník nesie aj id a adresu profilu zo `shared_content.owner`', (_popis, zdroj) => {
    const karta = sharedContentCardFromPost(prispevok(zdielanaPonuka(zdroj)));

    expect(karta?.owner).toEqual({
      displayName: 'Peter Malý',
      avatarUrl: 'http://api.test/peter.webp',
      id: 21,
      slug: 'peter',
    });
  });

  it('vlastník bez adresy profilu má `slug` `null` a `id` ostáva (profil sa otvorí podľa id)', () => {
    const karta = sharedContentCardFromPost(
      prispevok(zdielanaPonuka({ owner: { ...VLASTNIK, slug: null } })),
    );

    expect(karta?.owner?.id).toBe(21);
    expect(karta?.owner?.slug).toBeNull();
  });

  it('nedostupný zdroj (`owner` je `null`): meno zo snapshotu ostáva, id a adresa profilu sú prázdne', () => {
    const karta = sharedContentCardFromPost(
      prispevok(zdielanaPonuka({ id: null, owner: null, owner_display_name: 'Peter Malý' }), {
        shared_content_unavailable: true,
      }),
    );

    expect(karta?.unavailable).toBe(true);
    expect(karta?.owner?.displayName).toBe('Peter Malý');
    expect(karta?.owner?.avatarUrl).toBeNull();
    expect(karta?.owner?.id).toBeUndefined();
    expect(karta?.owner?.slug).toBeUndefined();
  });

  it('bez mena vlastníka sa vlastník v dátach karty nevytvorí, aj keď objekt `owner` príde', () => {
    const karta = sharedContentCardFromPost(prispevok(zdielanaPonuka({ owner_display_name: '' })));

    expect(karta?.owner).toBeNull();
  });

  it('staré polia karty sa nemenia', () => {
    const karta = sharedContentCardFromPost(prispevok(zdielanaPonuka()));

    expect(karta).toEqual({
      type: 'offer',
      title: 'Programovanie',
      caption: '',
      thumbnailUrl: null,
      isSeeking: false,
      price: expect.objectContaining({ price_from: '25', price_currency: '€', price_negotiable: false }),
      owner: {
        displayName: 'Peter Malý',
        avatarUrl: 'http://api.test/peter.webp',
        id: 21,
        slug: 'peter',
      },
      unavailable: false,
    });
  });

  it('voľný príspevok nemá zdieľaný obsah, takže ani kartu', () => {
    expect(sharedContentCardFromPost(prispevok(null, { post_type: 'free_post' }))).toBeNull();
  });
});
