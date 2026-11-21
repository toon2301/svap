/**
 * Priebežné obnovovanie počtov karty (polling) a rozposielanie čerstvých počtov do vrstiev nad kartou.
 *
 * Charakterizačné testy pred delením `FeedPostCard.tsx` (nález 333, dávka K48). Karta na obrazovke si v intervale
 * dopytuje počty príspevku. Existujúce testy držia, že poll neprepíše lajk používateľa a že karta mimo obrazovky
 * nepolluje; nestrážia, že počas prebiehajúceho lajku sa server vôbec nevolá, že sa čerstvý počet komentárov dostane
 * k ikone a že čerstvé počty dostane aj otvorená mobilná obrazovka detailu a mobilný prehliadač fotky (tie samy
 * nepollujú). Testy idú cez verejné rozhranie karty (vlastnosti, DOM, `data-testid`, atrapa `getFeedPost`), takže musia
 * prejsť bez úpravy aj po presune pollingu do hooku (krok f delenia).
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedPostCard from '../FeedPostCard';
import { COMMENTS_POLL_INTERVAL_MS } from '../useFeedCommentsPolling';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { getFeedPost, likeFeedPost, type FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  updateFeedPost: jest.fn(),
  deleteFeedPostImage: jest.fn(),
  deleteFeedPost: jest.fn(),
  getFeedPost: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(() =>
    Promise.resolve({ results: [], next: null, previous: null, count: 0 }),
  ),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
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

// POZOR: `article` musí prepošliavať ref. Karta ním pripína IntersectionObserver (polling počtov beží len pre kartu
// na obrazovke), takže bez toho by sa polling v teste nikdy nespustil.
jest.mock('framer-motion', () => {
  const React = jest.requireActual('react');
  return {
    motion: {
      // eslint-disable-next-line react/display-name
      article: React.forwardRef(
        (
          { children, ...props }: React.ComponentProps<'article'>,
          ref: React.Ref<HTMLElement>,
        ) => (
          <article ref={ref} {...props}>
            {children}
          </article>
        ),
      ),
    },
  };
});

const mockedGet = getFeedPost as jest.MockedFunction<typeof getFeedPost>;
const mockedLike = likeFeedPost as jest.MockedFunction<typeof likeFeedPost>;

/** Pozorovateľ, ktorý kartu ohlási ako viditeľnú (polling beží len pre kartu na obrazovke). */
function installVisibleObserver() {
  const original = global.IntersectionObserver;
  class VisibleObserver {
    constructor(private cb: IntersectionObserverCallback) {}
    observe = () =>
      this.cb(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    disconnect = jest.fn();
    unobserve = jest.fn();
    takeRecords = jest.fn();
    root = null;
    rootMargin = '';
    thresholds = [];
  }
  (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
    VisibleObserver;
  return () => {
    (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
      original;
  };
}

function makePost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: 5,
    post_type: 'free_post',
    caption: 'Ahoj',
    author: {
      id: 1,
      display_name: 'Jana',
      slug: 'jana',
      user_type: 'individual',
      avatar_url: null,
    },
    images: [],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 3,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as unknown as FeedPost;
}

const photo = {
  id: 11,
  status: 'approved',
  thumbnail_url: 'http://api.test/11-t.webp',
  large_url: 'http://api.test/11-l.webp',
};

/** Jeden tik pollingu: posunie čas o interval a nechá dobehnúť sľuby. */
async function tick() {
  await act(async () => {
    jest.advanceTimersByTime(COMMENTS_POLL_INTERVAL_MS + 50);
  });
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

let restoreObserver: () => void = () => undefined;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  resetOverlayLayers();
  mockIsMobile = false;
  document.body.innerHTML = '';
  restoreObserver = installVisibleObserver();
});

afterEach(() => {
  restoreObserver();
  jest.useRealTimers();
});

describe('polling počtov: brzda počas vlastného lajku', () => {
  it('počas prebiehajúceho lajku polling server nevolá a po dokončení lajku ho volá znova', async () => {
    let finishLike!: (payload: Awaited<ReturnType<typeof likeFeedPost>>) => void;
    mockedLike.mockReturnValue(
      new Promise((resolve) => {
        finishLike = resolve;
      }),
    );
    mockedGet.mockResolvedValue(makePost({ likes_count: 4, is_liked_by_me: true }));
    render(<FeedPostCard post={makePost()} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('feed-like-button'));
    });
    await tick();
    expect(mockedGet).not.toHaveBeenCalled();

    await act(async () => {
      finishLike({ is_liked_by_me: true, likes_count: 4 });
    });
    await tick();
    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(mockedGet).toHaveBeenCalledWith(5);
  });
});

describe('polling počtov: čerstvé počty v karte a vo vrstvách nad ňou', () => {
  it('polling zapíše čerstvý počet lajkov a počet komentárov do karty', async () => {
    mockedGet.mockResolvedValue(makePost({ likes_count: 9, comments_count: 6 }));
    render(<FeedPostCard post={makePost()} />);
    expect(screen.getByTestId('feed-like-count')).toHaveTextContent('3');
    expect(screen.getByTestId('feed-comments-button')).toHaveAttribute(
      'aria-label',
      'Komentáre: 0',
    );

    await tick();

    expect(screen.getByTestId('feed-like-count')).toHaveTextContent('9');
    expect(screen.getByTestId('feed-comments-button')).toHaveAttribute(
      'aria-label',
      'Komentáre: 6',
    );
  });

  it('polling pošle čerstvý lajk a jeho počet otvorenej mobilnej obrazovke detailu', async () => {
    mockIsMobile = true;
    mockedGet.mockResolvedValue(makePost({ likes_count: 9, is_liked_by_me: true }));
    render(<FeedPostCard post={makePost()} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('feed-comments-button'));
    });
    await flush();
    expect(screen.getByTestId('feed-mobile-detail-like-count')).toHaveTextContent('3');
    expect(screen.getByTestId('feed-mobile-detail-like')).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    await tick();

    expect(screen.getByTestId('feed-mobile-detail-like-count')).toHaveTextContent('9');
    expect(screen.getByTestId('feed-mobile-detail-like')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('polling pošle čerstvý počet lajkov otvorenému mobilnému prehliadaču fotky', async () => {
    mockIsMobile = true;
    mockedGet.mockResolvedValue(makePost({ likes_count: 9, images: [photo] as never }));
    render(<FeedPostCard post={makePost({ images: [photo] as never })} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('feed-image-open-11'));
    });
    await flush();
    expect(screen.getByTestId('feed-photo-viewer-like-count')).toHaveTextContent('3');

    await tick();

    expect(screen.getByTestId('feed-photo-viewer-like-count')).toHaveTextContent('9');
  });
});
