/**
 * Adresy fotiek Nástenky na doméne frontendu (nález 274).
 *
 * Backend skladá adresy fotiek s vlastným hostom (za proxy frontendu je to host backendu). Prehliadač takú požiadavku
 * `<img>` pošle bez prihlasovacieho cookie, ktoré patrí doméne frontendu, takže ju backend berie ako anonymnú a fotky
 * súkromného autora (aj jeho vlastné) vráti ako 404. Pomocník preto adresu súboru fotky prepíše na cestu na doméne
 * frontendu, kde cookie ide s požiadavkou. Test overuje pomocníka aj všetky funkcie, ktoré z neho adresy skladajú.
 */

import { sameOriginFeedImageUrl } from '../feedImageUrl';
import { feedImageSrc, feedViewableSources, sharedFeedPostPhoto } from '../feedImageSources';
import { sharedContentCardFromPost } from '../sharedContentCard';
import type { FeedPost, FeedPostImage } from '@/lib/feedApi';

const BACKEND = 'https://backend.example.up.railway.app';
const LARGE = `${BACKEND}/api/auth/feed/posts/5/images/9/file/?variant=large`;
const THUMB = `${BACKEND}/api/auth/feed/posts/5/images/9/file/?variant=thumbnail`;
const SHARED = `${BACKEND}/api/auth/feed/posts/5/shared-thumbnail/`;

const SAME_LARGE = '/api/auth/feed/posts/5/images/9/file/?variant=large';
const SAME_THUMB = '/api/auth/feed/posts/5/images/9/file/?variant=thumbnail';
const SAME_SHARED = '/api/auth/feed/posts/5/shared-thumbnail/';

const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

/** Nastaví základ API ako na Railway: frontend preposiela `/api` na backend (`undefined` premennú zruší). */
function setApiUrl(value: string | undefined) {
  if (value === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = value;
}

beforeEach(() => setApiUrl('/api'));
afterEach(() => setApiUrl(originalApiUrl));

describe('sameOriginFeedImageUrl', () => {
  it('fotku príspevku z hostu backendu prepíše na cestu na doméne frontendu (aj s variantom)', () => {
    expect(sameOriginFeedImageUrl(LARGE)).toBe(SAME_LARGE);
    expect(sameOriginFeedImageUrl(THUMB)).toBe(SAME_THUMB);
  });

  it('náhľad zdieľaného obsahu prepíše rovnako', () => {
    expect(sameOriginFeedImageUrl(SHARED)).toBe(SAME_SHARED);
  });

  it('už relatívna adresa ostane (prepis je idempotentný)', () => {
    expect(sameOriginFeedImageUrl(SAME_LARGE)).toBe(SAME_LARGE);
    expect(sameOriginFeedImageUrl(sameOriginFeedImageUrl(LARGE))).toBe(SAME_LARGE);
  });

  it('základ API s koncovým lomítkom funguje rovnako', () => {
    setApiUrl('/api/');
    expect(sameOriginFeedImageUrl(LARGE)).toBe(SAME_LARGE);
  });

  it('pri absolútnom základe API (priame API na inom hoste, bez proxy) adresu nemení', () => {
    setApiUrl('https://api.example.com/api');
    expect(sameOriginFeedImageUrl(LARGE)).toBe(LARGE);
    setApiUrl(undefined);
    expect(sameOriginFeedImageUrl(LARGE)).toBe(LARGE);
  });

  it.each([
    ['verejná adresa z úložiska', 'https://bucket.s3.eu-central-1.amazonaws.com/feed/5/large.webp'],
    ['chránený obrázok portfólia (rieši ho axios)', `${BACKEND}/api/auth/portfolio/1/images/2/file/?variant=medium`],
    ['avatar', `${BACKEND}/media/avatars/a.png`],
    ['detail príspevku, nie súbor fotky', `${BACKEND}/api/auth/feed/posts/5/`],
    ['súbor fotky bez čísla príspevku', `${BACKEND}/api/auth/feed/posts/x/images/9/file/`],
    // Predpona rovnako dlhá ako základ API (`/api`): bez kontroly základu by sa odrezala a cesta by sa mylne zhodla.
    ['cesta ako súbor fotky, ale mimo základu API', `${BACKEND}/foo/auth/feed/posts/5/images/9/file/?variant=large`],
    ['lokálny náhľad (blob)', 'blob:http://localhost/3f0c'],
    ['lokálny náhľad (data)', 'data:image/png;base64,AAAA'],
  ])('%s ostane bez zmeny', (_name, url) => {
    expect(sameOriginFeedImageUrl(url)).toBe(url);
  });

  it('prázdna hodnota dá prázdny reťazec a medzery okolo adresy sa orežú', () => {
    expect(sameOriginFeedImageUrl(null)).toBe('');
    expect(sameOriginFeedImageUrl(undefined)).toBe('');
    expect(sameOriginFeedImageUrl('   ')).toBe('');
    expect(sameOriginFeedImageUrl(`  ${LARGE}  `)).toBe(SAME_LARGE);
  });

  it('neplatná adresa nezhodí vykreslenie, vráti sa orezaná', () => {
    expect(sameOriginFeedImageUrl('  http://  ')).toBe('http://');
  });
});

describe('adresy fotiek Nástenky skladané z odpovede API', () => {
  const image: FeedPostImage = { id: 9, thumbnail_url: THUMB, large_url: LARGE };

  it('feedImageSrc dá veľkú fotku na doméne frontendu, inak náhľad, inak prázdny reťazec', () => {
    expect(feedImageSrc(image)).toBe(SAME_LARGE);
    expect(feedImageSrc({ id: 9, thumbnail_url: THUMB })).toBe(SAME_THUMB);
    expect(feedImageSrc({ id: 9, status: 'pending' })).toBe('');
  });

  it('feedViewableSources (prehliadač fotiek) dá všetky adresy na doméne frontendu', () => {
    expect(feedViewableSources([image, { id: 10, status: 'pending' }])).toEqual([SAME_LARGE]);
  });

  it('sharedFeedPostPhoto dá náhľad zdieľaného príspevku na doméne frontendu', () => {
    const post = {
      id: 1,
      shared_content_unavailable: false,
      shared_content: { type: 'feed_post', id: 5, thumbnail_url: SHARED },
    } as unknown as FeedPost;
    expect(sharedFeedPostPhoto(post)).toEqual({ postId: 5, thumbnailUrl: SAME_SHARED });
  });

  it('sharedContentCardFromPost dá náhľad karty zdieľaného obsahu na doméne frontendu, chýbajúci náhľad ostane null', () => {
    const withThumb = {
      id: 1,
      shared_content: { type: 'offer', title: 'T', category: 'c', caption: '', id: 3, thumbnail_url: SHARED },
    } as unknown as FeedPost;
    const without = {
      id: 2,
      shared_content: { type: 'offer', title: 'T', category: 'c', caption: '', id: 3, thumbnail_url: null },
    } as unknown as FeedPost;
    expect(sharedContentCardFromPost(withThumb)?.thumbnailUrl).toBe(SAME_SHARED);
    expect(sharedContentCardFromPost(without)?.thumbnailUrl).toBeNull();
  });
});
