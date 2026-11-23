/**
 * Okno detailu na počítači: šírku určuje obsah (nález 344, R53 a R63).
 *
 * Príspevok s fotkou, ponukou alebo portfóliom má široké okno (54 rem, 864 px). Príspevok len s textom, repost
 * textového príspevku, kostra pri načítaní a chybové okno majú užšie (36 rem, 576 px): druh príspevku sa pri
 * otvorení okna zistí až po načítaní, preto je kostra úzka a textový príspevok sa po načítaní nehýbe.
 *
 * jsdom nelayoutuje, takže sa kontrolujú triedy, ktoré o rozmeroch rozhodujú.
 */

import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedPostDetailOverlay from '../FeedPostDetailOverlay';
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
  return screen.getByTestId('feed-post-overlay');
}

// `toHaveClass` porovnáva celé triedy: trieda zlepená s vedľajšou (`max-w-xlmax-h-[95vh]`) by prešla cez `toContain`.
function jeUzke(okno: HTMLElement) {
  expect(okno).toHaveClass('max-w-xl');
  expect(okno).not.toHaveClass('max-w-[54rem]');
}

function jeSiroke(okno: HTMLElement) {
  expect(okno).toHaveClass('max-w-[54rem]');
  expect(okno).not.toHaveClass('max-w-xl');
}

describe('okno len s textom je užšie', () => {
  it('príspevok len s textom: úzke okno so stropom výšky', async () => {
    const okno = await otvorOkno(volnyPrispevok(false));

    jeUzke(okno);
    expect(okno).toHaveClass('max-h-[95vh]');
    expect(okno).not.toHaveClass('h-[95vh]');
  });

  it('repost textového príspevku: úzke okno', async () => {
    jeUzke(await otvorOkno(repost(false)));
  });
});

describe('okno s fotkou, ponukou a portfóliom je široké', () => {
  it.each([
    ['príspevok s fotkou', () => volnyPrispevok(true)],
    ['repost príspevku s fotkou', () => repost(true)],
    ['ponuka', () => zdielanaKarta('offer')],
    ['portfólio', () => zdielanaKarta('portfolio_item')],
    ['ponuka, ktorej zdroj zmizol', () => zdielanaKarta('offer', { zdrojZmizol: true })],
  ])('%s: široké okno', async (_nazov, vytvor) => {
    jeSiroke(await otvorOkno(vytvor()));
  });

  it('pod 1 024 px sa šírka riadi obsahom, mení sa len rozloženie', async () => {
    mockIsMobile = true;
    jeSiroke(await otvorOkno(zdielanaKarta('offer')));
  });

  it('pod 1 024 px ostáva text v úzkom okne', async () => {
    mockIsMobile = true;
    jeUzke(await otvorOkno(volnyPrispevok(false)));
  });
});

describe('kostra a chyba pri načítaní sú v úzkom okne', () => {
  it('kostra pri načítaní je v úzkom okne', () => {
    mockedGetPost.mockReturnValue(new Promise(() => undefined));
    render(<FeedPostDetailOverlay postId={7} onClose={jest.fn()} />);

    expect(screen.getByTestId('feed-post-overlay-loading')).toBeInTheDocument();
    jeUzke(screen.getByTestId('feed-post-overlay'));
  });

  it('okno s chybou načítania je v úzkom okne', async () => {
    mockedGetPost.mockRejectedValue(new Error('chyba'));
    render(<FeedPostDetailOverlay postId={7} onClose={jest.fn()} />);

    await screen.findByTestId('feed-post-overlay-error');
    jeUzke(screen.getByTestId('feed-post-overlay'));
  });

  it('textový príspevok sa po načítaní z kostry nehýbe', async () => {
    let dokonci: (prispevok: FeedPost) => void = () => undefined;
    mockedGetPost.mockReturnValue(
      new Promise<FeedPost>((resolve) => {
        dokonci = resolve;
      }),
    );
    render(<FeedPostDetailOverlay postId={7} onClose={jest.fn()} />);
    jeUzke(screen.getByTestId('feed-post-overlay'));

    await act(async () => {
      dokonci(volnyPrispevok(false));
    });
    await screen.findByTestId('feed-post-card');

    jeUzke(screen.getByTestId('feed-post-overlay'));
  });

  it('ponuka sa po načítaní z úzkej kostry rozšíri na široké okno', async () => {
    let dokonci: (prispevok: FeedPost) => void = () => undefined;
    mockedGetPost.mockReturnValue(
      new Promise<FeedPost>((resolve) => {
        dokonci = resolve;
      }),
    );
    render(<FeedPostDetailOverlay postId={7} onClose={jest.fn()} />);
    jeUzke(screen.getByTestId('feed-post-overlay'));

    await act(async () => {
      dokonci(zdielanaKarta('offer'));
    });
    await screen.findByTestId('feed-post-card');

    jeSiroke(screen.getByTestId('feed-post-overlay'));
  });
});
