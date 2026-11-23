/**
 * Okno detailu na počítači: zdieľaná ponuka a portfólio v dvoch stĺpcoch (nález 344, R53).
 *
 * Ponuka a portfólio majú `images` prázdne, no karta je hlavný obsah okna ako fotka, takže idú do dvojstĺpcového
 * rozloženia: vľavo hlavička, text zdieľajúceho, karta a riadok akcií, vpravo komentáre. Pod 1 024 px ostáva
 * jednostĺpcové rozloženie, zdieľaný príspevok sa nemení.
 *
 * jsdom nelayoutuje, takže sa kontrolujú triedy a poradie uzlov, ktoré o rozložení rozhodujú.
 */

import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedPostDetailOverlay from '../FeedPostDetailOverlay';
import { sharesOfferOrPortfolio } from '../FeedPostDetailSplitLayout';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { getFeedPost, type FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  getFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(),
  listFeedCommentReplies: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  updateFeedPostComment: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  deleteFeedPost: jest.fn(),
  deleteFeedPostImage: jest.fn(),
  updateFeedPost: jest.fn(),
  reportFeedPost: jest.fn(),
  shareFeedPost: jest.fn(),
  removeOwnFeedPostTag: jest.fn(),
  listFeedPostLikers: jest.fn(),
  listFeedCommentLikers: jest.fn(),
}));

jest.mock('@/lib/feedImageUpload', () => ({
  uploadFeedPostImages: jest.fn(),
  isAllowedFeedImageName: () => true,
  MAX_FEED_POST_IMAGES: 5,
  FEED_IMAGE_MAX_MB: 5,
  FEED_IMAGE_MAX_BYTES: 5 * 1024 * 1024,
  FEED_IMAGE_ACCEPT: '.jpg,.png',
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_k: string, fallback: string) => fallback,
    locale: 'sk',
  }),
}));

let mockIsMobile = false;

jest.mock('@/hooks', () => ({
  useIsMobile: () => mockIsMobile,
  useIsMobileState: () => ({ isMobile: mockIsMobile, isResolved: true }),
}));

jest.mock('../../shared/useProtectedImage', () => ({
  useProtectedImage: (src: string | null) => ({
    resolvedSrc: src,
    isProtected: false,
    isLoading: false,
    isError: false,
  }),
}));

jest.mock('../../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: ({ ariaLabel }: { ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel}>
      emoji
    </button>
  ),
}));

jest.mock('../../messages/GroupUserPicker', () => ({
  GroupUserPicker: () => <div />,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    article: ({ children, ...props }: React.ComponentProps<'article'>) => (
      <article {...props}>{children}</article>
    ),
  },
}));

const mockedGetPost = getFeedPost as jest.MockedFunction<typeof getFeedPost>;
const mockedListComments = jest.requireMock('@/lib/feedApi')
  .listFeedPostComments as jest.Mock;

const autor = {
  id: 10,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};
const povodnyAutor = {
  id: 21,
  display_name: 'Peter',
  slug: 'peter',
  user_type: 'individual',
  avatar_url: null,
};

const ZAKLAD = {
  id: 7,
  author: autor,
  tagged_users: [],
  likes_count: 1,
  comments_count: 0,
  is_liked_by_me: false,
  can_manage: false,
  created_at: '2026-01-01T10:00:00Z',
  shared_content_unavailable: false,
};

/** Voľný príspevok, s jednou schválenou fotkou alebo bez nej. */
function volnyPrispevok(sFotkou: boolean): FeedPost {
  return {
    ...ZAKLAD,
    post_type: 'free_post',
    caption: 'Text príspevku',
    images: sFotkou
      ? [
          {
            id: 11,
            status: 'approved',
            thumbnail_url: 'http://api.test/11-t.webp',
            large_url: 'http://api.test/11-l.webp',
          },
        ]
      : [],
    shared_content: null,
  } as unknown as FeedPost;
}

/**
 * Zdieľaná ponuka alebo portfólio; `zdrojZmizol` = zdroj medzitým zmazaný. Snapshot si vtedy nechá typ, ale
 * bez živých údajov (id, vlastník, cena a náhľad sú `null`), tak ako ho posiela backend.
 */
function zdielanaKarta(
  typ: 'offer' | 'portfolio_item',
  moznosti: { sFotkou?: boolean; zdrojZmizol?: boolean } = {},
): FeedPost {
  const jePonuka = typ === 'offer';
  const zivy = moznosti.zdrojZmizol !== true;
  return {
    ...ZAKLAD,
    post_type: jePonuka ? 'shared_offer' : 'shared_portfolio_item',
    caption: 'Odporúčam.',
    images: [],
    shared_content: {
      type: typ,
      title: jePonuka ? 'Programovanie' : 'Weby',
      category: 'it',
      caption: '',
      id: zivy ? 42 : null,
      owner: zivy ? povodnyAutor : null,
      owner_display_name: 'Peter',
      thumbnail_url: zivy && moznosti.sFotkou ? 'http://api.test/offer-t.webp' : null,
      is_seeking: zivy && jePonuka ? false : null,
      price_negotiable: zivy && jePonuka ? false : null,
      price_from: zivy && jePonuka ? '25' : null,
      price_currency: zivy && jePonuka ? '€' : '',
    },
    shared_content_unavailable: !zivy,
  } as unknown as FeedPost;
}

/** Zdieľaný voľný príspevok (repost), s fotkou pôvodného príspevku alebo bez nej. */
function repost(sFotkou: boolean): FeedPost {
  return {
    ...ZAKLAD,
    post_type: 'shared_feed_post',
    caption: 'Toto stojí za pozretie.',
    images: [],
    shared_content: {
      type: 'feed_post',
      title: '',
      category: '',
      caption: 'Pôvodný text',
      id: 9,
      owner: povodnyAutor,
      owner_display_name: 'Peter',
      thumbnail_url: sFotkou ? 'http://api.test/shared-9.webp' : null,
      is_seeking: null,
      price_negotiable: null,
      price_from: null,
      price_currency: '',
    },
  } as unknown as FeedPost;
}

beforeEach(() => {
  mockIsMobile = false;
  jest.clearAllMocks();
  resetOverlayLayers();
  mockedListComments.mockResolvedValue({
    results: [],
    next: null,
    previous: null,
    count: 0,
  });
});

async function otvorOkno(prispevok: FeedPost) {
  mockedGetPost.mockResolvedValue(prispevok);
  render(<FeedPostDetailOverlay postId={prispevok.id} onClose={jest.fn()} />);
  await screen.findByTestId('feed-post-card');
}

const KARTY: Array<[string, () => FeedPost]> = [
  ['ponuka s fotkou', () => zdielanaKarta('offer', { sFotkou: true })],
  ['ponuka bez fotky', () => zdielanaKarta('offer')],
  ['portfólio s fotkou', () => zdielanaKarta('portfolio_item', { sFotkou: true })],
  ['portfólio bez fotky', () => zdielanaKarta('portfolio_item')],
  ['ponuka, ktorej zdroj zmizol', () => zdielanaKarta('offer', { zdrojZmizol: true })],
];

describe('okno detailu: zdieľaná ponuka a portfólio v dvoch stĺpcoch', () => {
  it.each(KARTY)('%s: na počítači ide do dvoch stĺpcov, so širokým oknom a pevnou výškou', async (_nazov, vytvor) => {
    await otvorOkno(vytvor());

    const okno = screen.getByTestId('feed-post-overlay');
    expect(screen.getByTestId('feed-post-overlay-split')).toBeInTheDocument();
    expect(okno.className).toContain('max-w-[54rem]');
    expect(okno.className).toContain('h-[95vh]');
    expect(okno.className).not.toContain('max-h-[95vh]');
  });

  it.each(KARTY)('%s: karta je v ľavom stĺpci a komentáre v pravom', async (_nazov, vytvor) => {
    await otvorOkno(vytvor());

    const lavy = screen.getByTestId('feed-post-overlay-media');
    const pravy = screen.getByTestId('feed-post-overlay-comments');
    expect(within(lavy).getByTestId('feed-shared-card')).toBeInTheDocument();
    expect(within(lavy).queryByTestId('feed-post-comments')).toBeNull();
    expect(within(pravy).getByTestId('feed-post-comments')).toBeInTheDocument();
    expect(within(pravy).queryByTestId('feed-shared-card')).toBeNull();
  });

  it('v ľavom stĺpci drží poradie hlavička, text zdieľajúceho, karta a riadok akcií', async () => {
    await otvorOkno(zdielanaKarta('offer', { sFotkou: true }));

    const lavy = screen.getByTestId('feed-post-overlay-media');
    const hlavicka = lavy.querySelector('header') as HTMLElement;
    const text = within(lavy).getByTestId('feed-post-caption');
    const karta = within(lavy).getByTestId('feed-shared-card');
    const akcie = lavy.querySelector('footer') as HTMLElement;
    const nasleduje = Node.DOCUMENT_POSITION_FOLLOWING;
    expect(hlavicka.compareDocumentPosition(text)).toBe(nasleduje);
    expect(text.compareDocumentPosition(karta)).toBe(nasleduje);
    expect(karta.compareDocumentPosition(akcie)).toBe(nasleduje);
  });

  it('karta ostáva tlačidlom, ktoré vedie na zdroj', async () => {
    await otvorOkno(zdielanaKarta('offer', { sFotkou: true }));

    const karta = screen.getByTestId('feed-shared-compact-preview');
    expect(karta.tagName).toBe('BUTTON');
    expect(karta).toBeEnabled();
  });

  it('plocha fotky karty je v dvojstĺpcovom okne pružná', async () => {
    await otvorOkno(zdielanaKarta('offer'));

    const plocha = screen.getByTestId('feed-shared-card-media');
    expect(plocha.className).toContain('min-h-32');
    expect(plocha.className).toContain('flex-1');
  });

  it('pod 1 024 px ostáva jednostĺpcové rozloženie so širokým oknom', async () => {
    mockIsMobile = true;
    await otvorOkno(zdielanaKarta('offer', { sFotkou: true }));

    const okno = screen.getByTestId('feed-post-overlay');
    expect(screen.queryByTestId('feed-post-overlay-split')).toBeNull();
    expect(screen.getByTestId('feed-post-overlay-fixed')).toBeInTheDocument();
    expect(okno.className).toContain('max-w-[54rem]');
    expect(okno.className).toContain('max-h-[95vh]');
  });

  it('pod 1 024 px ostáva plocha fotky karty 256 px', async () => {
    mockIsMobile = true;
    await otvorOkno(zdielanaKarta('offer', { sFotkou: true }));

    const plocha = screen.getByTestId('feed-shared-card-media');
    expect(plocha.className).toContain('h-64');
    expect(plocha.className).not.toContain('min-h-32');
  });

  it('zdieľaný príspevok bez fotky ostáva v jednostĺpcovom rozložení', async () => {
    await otvorOkno(repost(false));

    expect(screen.queryByTestId('feed-post-overlay-split')).toBeNull();
    expect(screen.getByTestId('feed-post-overlay-fixed')).toBeInTheDocument();
  });

  it('zdieľaný príspevok s fotkou ostáva v dvojstĺpcovom rozložení', async () => {
    await otvorOkno(repost(true));

    expect(screen.getByTestId('feed-post-overlay-split')).toBeInTheDocument();
  });

  it('zdieľaný príspevok s fotkou má plochu fotky 256 px', async () => {
    await otvorOkno(repost(true));

    const plocha = screen.getByTestId('feed-shared-card-media');
    expect(plocha.className).toContain('h-64');
    expect(plocha.className).not.toContain('flex-1');
  });

  it('voľný príspevok s fotkou ostáva v dvojstĺpcovom rozložení', async () => {
    await otvorOkno(volnyPrispevok(true));

    expect(screen.getByTestId('feed-post-overlay-split')).toBeInTheDocument();
  });
});

describe('predikát sharesOfferOrPortfolio', () => {
  it.each<[string, boolean, FeedPost | null | undefined]>([
    ['ponuka', true, zdielanaKarta('offer')],
    ['portfólio', true, zdielanaKarta('portfolio_item')],
    ['ponuka, ktorej zdroj zmizol', true, zdielanaKarta('offer', { zdrojZmizol: true })],
    ['zdieľaný príspevok', false, repost(false)],
    ['voľný príspevok', false, volnyPrispevok(false)],
    ['príspevok sa ešte nenačítal (null)', false, null],
    ['príspevok bez údaja (undefined)', false, undefined],
  ])('%s: predikát vráti %s', (_nazov, ocakavane, prispevok) => {
    expect(sharesOfferOrPortfolio(prispevok)).toBe(ocakavane);
  });
});
