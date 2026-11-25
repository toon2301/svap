/**
 * Počty riadkov textu pred „Viac" v okne detailu na počítači po ručnom teste K58 (R77).
 *
 * Dvojstĺpcové okno (od 1 024 px):
 *  - voľný príspevok s fotkou: 5 riadkov (predtým 10),
 *  - ponuka, portfólio a repost príspevku s fotkou: text zdieľajúceho 5 riadkov a pôvodný text 3 (bez zmeny),
 *  - voľný príspevok len s textom: celý text bez „Viac" (bez zmeny, R73),
 *  - repost textového príspevku: text zdieľajúceho 10 riadkov a pôvodný text 5, oba s „Viac" (predtým celé).
 * Jednostĺpcové okno pod 1 024 px sa nemení: 10 riadkov pri voľnom príspevku aj pri texte zdieľajúceho, pôvodný text 3.
 *
 * jsdom nelayoutuje, takže „presahuje text riadky?" sa nastavuje na uzle (`scrollHeight` proti `clientHeight`): orezaný
 * text presahuje, neorezaný sa zmestí, tak ako v prehliadači. Presnú hranicu riadkov (že „Viac" naskočí od 6. alebo od
 * 11. riadku) tu nemožno zmerať; kontroluje sa trieda orezania, ktorú prehliadač vykoná.
 */

import { render, screen } from '@testing-library/react';
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

const DLHY_TEXT = 'Dlhý text príspevku, ktorý v okne presahuje päť aj desať riadkov.';

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

/** Voľný príspevok s dlhým textom, s jednou schválenou fotkou alebo bez nej. */
function volnyPrispevok(sFotkou: boolean): FeedPost {
  return {
    ...ZAKLAD,
    post_type: 'free_post',
    caption: DLHY_TEXT,
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

/** Zdieľaná ponuka alebo portfólio s textom zdieľajúceho. */
function zdielanaKarta(typ: 'offer' | 'portfolio_item'): FeedPost {
  const jePonuka = typ === 'offer';
  return {
    ...ZAKLAD,
    post_type: jePonuka ? 'shared_offer' : 'shared_portfolio_item',
    caption: DLHY_TEXT,
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
      price_currency: jePonuka ? '€' : '',
    },
  } as unknown as FeedPost;
}

/** Zdieľaný voľný príspevok (repost); pôvodný príspevok má dlhý text a fotku len vtedy, keď `sFotkou`. */
function repost(sFotkou: boolean): FeedPost {
  return {
    ...ZAKLAD,
    post_type: 'shared_feed_post',
    caption: DLHY_TEXT,
    images: [],
    shared_content: {
      type: 'feed_post',
      title: '',
      category: '',
      caption: DLHY_TEXT,
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

/** Texty príspevku presahujú, kým sú orezané; neorezané sa zmestia. */
function nastavVysky() {
  const idecka = ['feed-post-caption', 'feed-shared-caption'];
  Object.defineProperty(HTMLParagraphElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return idecka.includes(this.dataset.testid) ? 60 : 0;
    },
  });
  Object.defineProperty(HTMLParagraphElement.prototype, 'scrollHeight', {
    configurable: true,
    get() {
      if (!idecka.includes(this.dataset.testid)) return 0;
      return this.className.includes('line-clamp') ? 900 : 60;
    },
  });
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
  nastavVysky();
});

afterEach(() => {
  // Výšky sú nastavené na prototype: bez upratania by pretiekli do ďalšieho testu.
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'clientHeight');
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'scrollHeight');
});

async function otvorOkno(prispevok: FeedPost) {
  mockedGetPost.mockResolvedValue(prispevok);
  render(<FeedPostDetailOverlay postId={prispevok.id} onClose={jest.fn()} />);
  await screen.findByTestId('feed-post-card');
}

describe('dvojstĺpcové okno na počítači: text s fotkou, ponukou a portfóliom má 5 riadkov', () => {
  it('voľný príspevok s fotkou má text na 5 riadkoch a „Viac“ (nie 10)', async () => {
    await otvorOkno(volnyPrispevok(true));

    const text = screen.getByTestId('feed-post-caption');
    expect(text).toHaveClass('line-clamp-5');
    expect(text).not.toHaveClass('line-clamp-[10]');
    expect(text).not.toHaveClass('line-clamp-3');
    expect(await screen.findByTestId('feed-post-caption-toggle')).toHaveTextContent('Viac');
  });

  it.each([
    ['ponuka', () => zdielanaKarta('offer')],
    ['portfólio', () => zdielanaKarta('portfolio_item')],
  ])('%s: text zdieľajúceho má 5 riadkov a „Viac“', async (_nazov, vytvor) => {
    await otvorOkno(vytvor());

    const text = screen.getByTestId('feed-post-caption');
    expect(text).toHaveClass('line-clamp-5');
    expect(text).not.toHaveClass('line-clamp-[10]');
    expect(await screen.findByTestId('feed-post-caption-toggle')).toHaveTextContent('Viac');
  });

  it('repost príspevku s fotkou ostáva bez zmeny: text zdieľajúceho 5 riadkov a pôvodný text 3', async () => {
    await otvorOkno(repost(true));

    expect(screen.getByTestId('feed-post-caption')).toHaveClass('line-clamp-5');
    expect(screen.getByTestId('feed-shared-caption')).toHaveClass('line-clamp-3');
    expect(await screen.findByTestId('feed-post-caption-toggle')).toHaveTextContent('Viac');
    expect(await screen.findByTestId('feed-shared-caption-toggle')).toHaveTextContent('Viac');
  });
});

describe('dvojstĺpcové okno na počítači: príspevok len s textom', () => {
  it('voľný príspevok len s textom ostáva celý, bez orezania a bez „Viac“', async () => {
    await otvorOkno(volnyPrispevok(false));

    const text = screen.getByTestId('feed-post-caption');
    expect(text.className).not.toContain('line-clamp');
    expect(text).toHaveTextContent(DLHY_TEXT);
    expect(screen.queryByTestId('feed-post-caption-toggle')).toBeNull();
  });

  it('repost textového príspevku: text zdieľajúceho má 10 riadkov a „Viac“ od 11. riadku', async () => {
    await otvorOkno(repost(false));

    const text = screen.getByTestId('feed-post-caption');
    expect(text).toHaveClass('line-clamp-[10]');
    expect(text).not.toHaveClass('line-clamp-5');
    expect(await screen.findByTestId('feed-post-caption-toggle')).toHaveTextContent('Viac');
  });

  it('repost textového príspevku: pôvodný text má 5 riadkov a „Viac“ od 6. riadku', async () => {
    await otvorOkno(repost(false));

    const povodny = screen.getByTestId('feed-shared-caption');
    expect(povodny).toHaveClass('line-clamp-5');
    expect(povodny).not.toHaveClass('line-clamp-3');
    expect(await screen.findByTestId('feed-shared-caption-toggle')).toHaveTextContent('Viac');
  });

  it('repost textového príspevku: krátke texty nemajú „Viac“, ak sa zmestia', async () => {
    // Všetko sa zmestí: výška obsahu sa rovná výške rámika, nič nepresahuje.
    Object.defineProperty(HTMLParagraphElement.prototype, 'scrollHeight', {
      configurable: true,
      get() {
        return 60;
      },
    });
    await otvorOkno(repost(false));

    expect(screen.queryByTestId('feed-post-caption-toggle')).toBeNull();
    expect(screen.queryByTestId('feed-shared-caption-toggle')).toBeNull();
  });
});

describe('jednostĺpcové okno pod 1 024 px sa nemení (R77 sa ho netýka)', () => {
  beforeEach(() => {
    mockIsMobile = true;
  });

  it('voľný príspevok s fotkou ostáva na 10 riadkoch s „Viac“', async () => {
    await otvorOkno(volnyPrispevok(true));

    expect(screen.getByTestId('feed-post-caption')).toHaveClass('line-clamp-[10]');
    expect(screen.getByTestId('feed-post-caption')).not.toHaveClass('line-clamp-5');
    expect(await screen.findByTestId('feed-post-caption-toggle')).toHaveTextContent('Viac');
  });

  it('voľný príspevok len s textom ostáva na 10 riadkoch s „Viac“', async () => {
    await otvorOkno(volnyPrispevok(false));

    expect(screen.getByTestId('feed-post-caption')).toHaveClass('line-clamp-[10]');
    expect(await screen.findByTestId('feed-post-caption-toggle')).toHaveTextContent('Viac');
  });

  it('repost textového príspevku: text zdieľajúceho 10 riadkov a pôvodný text 3 riadky', async () => {
    await otvorOkno(repost(false));

    expect(screen.getByTestId('feed-post-caption')).toHaveClass('line-clamp-[10]');
    expect(screen.getByTestId('feed-shared-caption')).toHaveClass('line-clamp-3');
    expect(screen.getByTestId('feed-shared-caption')).not.toHaveClass('line-clamp-5');
  });
});
