/**
 * Priebežné počty lajkov na karte.
 *
 * Rovnaký hook ako pri komentároch (`useFeedCommentsPolling`), ale zapnutý
 * LEN keď je karta v zornom poli – inak by pri feede s desiatkami kariet
 * bežal request za každú z nich.
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedPostCard from '../FeedPostCard';
import { COMMENTS_POLL_INTERVAL_MS } from '../useFeedCommentsPolling';
import { getFeedPost, likeFeedPost, type FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  getFeedPost: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  deleteFeedPost: jest.fn(),
  removeOwnFeedPostTag: jest.fn(),
  listFeedPostComments: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
  reportFeedPost: jest.fn(),
  shareFeedPost: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback, locale: 'sk' }),
}));

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

// POZOR: `article` musí prepošliavať ref. Karta ním pripína IntersectionObserver
// (polling počtov beží len pre kartu na obrazovke) – obyčajný funkčný komponent
// ref zahodí a polling by sa v teste nikdy nespustil. Skutočné `motion.article`
// ref podporuje.
jest.mock('framer-motion', () => {
  const React = jest.requireActual('react');
  return {
    motion: {
      div: ({ children, ...props }: React.ComponentProps<'div'>) => (
        <div {...props}>{children}</div>
      ),
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

/** Observer, ktorý vie kartu ohlásiť ako viditeľnú alebo mimo obrazovky. */
function installViewportObserver(intersecting: boolean) {
  const original = global.IntersectionObserver;
  class MockObserver {
    constructor(private cb: IntersectionObserverCallback) {}
    observe = () =>
      this.cb(
        [{ isIntersecting: intersecting } as IntersectionObserverEntry],
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
    MockObserver;
  return () => {
    (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
      original;
  };
}

function post(overrides: Partial<FeedPost> = {}): FeedPost {
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

async function tick() {
  await act(async () => {
    jest.advanceTimersByTime(COMMENTS_POLL_INTERVAL_MS + 50);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

it('picks up a like made by someone else while the card is on screen', async () => {
  const restore = installViewportObserver(true);
  try {
    mockedGet.mockResolvedValue(post({ likes_count: 9 }));
    render(<FeedPostCard post={post()} />);
    expect(screen.getByTestId('feed-like-button')).toHaveTextContent('3');

    await tick();

    await waitFor(() =>
      expect(screen.getByTestId('feed-like-button')).toHaveTextContent('9'),
    );
  } finally {
    restore();
  }
});

it('does not poll while the card is outside the viewport', async () => {
  const restore = installViewportObserver(false);
  try {
    mockedGet.mockResolvedValue(post({ likes_count: 9 }));
    render(<FeedPostCard post={post()} />);

    await tick();
    await tick();

    // Výkonová brzda: feed s desiatkami kariet nesmie pollovať všetky naraz.
    expect(mockedGet).not.toHaveBeenCalled();
    expect(screen.getByTestId('feed-like-button')).toHaveTextContent('3');
  } finally {
    restore();
  }
});

it('does not let a poll overwrite the like the user just made', async () => {
  const restore = installViewportObserver(true);
  try {
    // Lajk visí – poll medzitým vráti stav SPRED neho.
    let releaseLike: ((value: unknown) => void) | null = null;
    mockedLike.mockImplementation(
      () => new Promise((resolve) => {
        releaseLike = resolve;
      }) as ReturnType<typeof likeFeedPost>,
    );
    mockedGet.mockResolvedValue(post({ likes_count: 3, is_liked_by_me: false }));

    render(<FeedPostCard post={post()} />);
    await act(async () => {
      screen.getByTestId('feed-like-button').click();
    });
    // Optimisticky 4.
    expect(screen.getByTestId('feed-like-button')).toHaveTextContent('4');

    await tick();

    // Poll sa počas prebiehajúceho lajku vôbec nesmie premietnuť.
    expect(screen.getByTestId('feed-like-button')).toHaveTextContent('4');

    await act(async () => {
      releaseLike?.({ likes_count: 4, is_liked_by_me: true });
    });
    expect(screen.getByTestId('feed-like-button')).toHaveTextContent('4');
  } finally {
    restore();
  }
});

it('discards a poll response that landed after the user liked mid-flight', async () => {
  const restore = installViewportObserver(true);
  try {
    // Poll odíde PRVÝ a visí; lajk sa stihne až počas jeho behu. Odpoveď je
    // teda spred lajku a nesmie sa premietnuť.
    let releasePoll: ((value: FeedPost) => void) | null = null;
    mockedGet.mockImplementation(
      () => new Promise<FeedPost>((resolve) => {
        releasePoll = resolve;
      }),
    );
    mockedLike.mockResolvedValue({
      post_id: 5,
      likes_count: 4,
      is_liked_by_me: true,
    } as Awaited<ReturnType<typeof likeFeedPost>>);

    render(<FeedPostCard post={post()} />);
    await tick();
    expect(mockedGet).toHaveBeenCalled();

    await act(async () => {
      screen.getByTestId('feed-like-button').click();
    });
    expect(screen.getByTestId('feed-like-button')).toHaveTextContent('4');

    await act(async () => {
      releasePoll?.(post({ likes_count: 3, is_liked_by_me: false }));
    });

    // Zastaraná odpoveď by vrátila 3 a odlajkovala – to sa stať nesmie.
    expect(screen.getByTestId('feed-like-button')).toHaveTextContent('4');
  } finally {
    restore();
  }
});
