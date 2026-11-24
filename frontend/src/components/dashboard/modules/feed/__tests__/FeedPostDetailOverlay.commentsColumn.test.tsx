/**
 * Jednostĺpcové okno detailu: pevný blok sa nezmenšuje a komentáre sa posúvajú (nález 363, K57 krok 4).
 *
 * Okno má v jednostĺpcovom rozložení len strop výšky (`max-h-[95vh]`), nie pevnú výšku. Percentuálny základ pri `flex-1`
 * sa preto vyhodnotí ako obsah a zmrštenie by sa rozdelilo medzi pevný blok (hlavička, text, akcie) a komentáre podľa
 * ich veľkosti: pri štyroch a viac komentároch by sa blok zmáčkol a pole na komentár vypadlo pod okno. Pevný blok sa
 * preto nezmenšuje (`shrink-0`), má strop poistky `calc(95vh-11rem)` a komentáre odovzdávajú výšku flexom (`flexFill`).
 * Dvojstĺpcové okno (ponuka, portfólio a príspevok s fotkou na počítači) sa nemení. Príspevok len s textom a repost
 * textu majú od K58 (R73) jednostĺpcové okno len pod 1 024 px (`mockIsMobile = true`), na počítači sú dva stĺpce.
 *
 * jsdom nelayoutuje, takže sa kontrolujú triedy, ktoré o rozmeroch rozhodujú.
 */

import { render, screen, within } from '@testing-library/react';
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

/** Zdieľaná ponuka alebo portfólio bez fotky. */
function zdielanaKarta(typ: 'offer' | 'portfolio_item'): FeedPost {
  const jePonuka = typ === 'offer';
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
      id: 42,
      owner: povodnyAutor,
      owner_display_name: 'Peter',
      thumbnail_url: null,
      is_seeking: jePonuka ? false : null,
      price_negotiable: jePonuka ? false : null,
      price_from: jePonuka ? '25' : null,
      price_currency: '€',
    },
  } as unknown as FeedPost;
}

/** Zdieľaný voľný príspevok (repost) bez fotky. */
function repostTextu(): FeedPost {
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
      thumbnail_url: null,
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

const STROP_POISTKY = 'max-h-[calc(95vh-11rem)]';

describe('jednostĺpcové okno: pevný blok sa nezmenšuje', () => {
  it('príspevok len s textom pod 1 024 px: pevný blok má poistku s posúvaním a strop', async () => {
    mockIsMobile = true;
    const okno = await otvorOkno(volnyPrispevok(false));

    const pevny = within(okno).getByTestId('feed-post-overlay-fixed');
    expect(pevny).toHaveClass('shrink-0', 'overflow-y-auto', STROP_POISTKY);
    expect(pevny).not.toHaveClass('overflow-hidden');
  });

  it('príspevok s fotkou pod 1 024 px: tá istá ochrana pevného bloku', async () => {
    mockIsMobile = true;
    const okno = await otvorOkno(volnyPrispevok(true));

    const pevny = within(okno).getByTestId('feed-post-overlay-fixed');
    expect(pevny).toHaveClass('shrink-0', 'overflow-y-auto', STROP_POISTKY);
  });

  it.each([
    ['repost textového príspevku pod 1 024 px', true, () => repostTextu()],
    ['ponuka pod 1 024 px', true, () => zdielanaKarta('offer')],
    ['portfólio pod 1 024 px', true, () => zdielanaKarta('portfolio_item')],
  ])(
    '%s: pevný blok je flex stĺpec, nezmenšuje sa a má strop',
    async (_nazov, podHranicou, vytvor) => {
      mockIsMobile = podHranicou;
      const okno = await otvorOkno(vytvor());

      const pevny = within(okno).getByTestId('feed-post-overlay-fixed');
      expect(pevny).toHaveClass(
        'flex',
        'flex-col',
        'overflow-hidden',
        'shrink-0',
        STROP_POISTKY,
      );
      expect(pevny).not.toHaveClass('overflow-y-auto');
    },
  );
});

describe('jednostĺpcové okno: komentáre odovzdávajú výšku flexom', () => {
  it('sekcia komentárov je flex stĺpec a zoznam v nej sa zmenšuje cez flex', async () => {
    mockIsMobile = true;
    const okno = await otvorOkno(volnyPrispevok(false));

    const sekcia = within(okno).getByTestId('feed-post-overlay-comments');
    expect(sekcia).toHaveClass(
      'flex',
      'flex-col',
      'flex-1',
      'min-h-[7rem]',
      'overflow-hidden',
    );
    const koren = within(sekcia).getByTestId('feed-post-comments');
    expect(koren).toHaveClass('flex', 'min-h-0', 'flex-1', 'flex-col');
    expect(koren).not.toHaveClass('h-full');
    const zoznam = within(sekcia).getByTestId('feed-comments-scroll');
    expect(zoznam).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto');
    expect(zoznam).not.toHaveClass('h-full');
  });

  it('pole na komentár je v sekcii komentárov mimo posuvného zoznamu', async () => {
    const okno = await otvorOkno(volnyPrispevok(false));

    const sekcia = within(okno).getByTestId('feed-post-overlay-comments');
    const pole = within(sekcia).getByLabelText('Napíš komentár...');
    expect(within(sekcia).getByTestId('feed-comments-scroll')).not.toContainElement(
      pole,
    );
  });
});

describe('dvojstĺpcové okno sa nemení', () => {
  it.each([
    ['príspevok s fotkou', () => volnyPrispevok(true)],
    ['ponuka', () => zdielanaKarta('offer')],
  ])(
    '%s: komentáre držia percentuálnu výšku a pevný blok so stropom tam nie je',
    async (_nazov, vytvor) => {
      const okno = await otvorOkno(vytvor());

      expect(within(okno).queryByTestId('feed-post-overlay-fixed')).toBeNull();
      const zoznam = within(okno).getByTestId('feed-comments-scroll');
      expect(zoznam).toHaveClass('h-full');
      expect(zoznam).not.toHaveClass('flex-1');
      const koren = within(okno).getByTestId('feed-post-comments');
      expect(koren).toHaveClass('h-full');
      expect(koren).not.toHaveClass('flex-1');
    },
  );
});
