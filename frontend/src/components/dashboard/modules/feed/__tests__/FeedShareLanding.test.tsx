/**
 * Pristátie nového príspevku na Nástenke po zdieľaní.
 *
 * Dva prípady, ktoré sa líšia tým, či Nástenka v čase zdieľania na obrazovke
 * bola: zdieľanie z feedu (živý signál) a zdieľanie z profilu (feed sa
 * namountuje až po navigácii a pristátie si musí prevziať).
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedList from '../FeedList';
import {
  emitFeedShareLanding,
  isFeedLandingTargetMounted,
  resetFeedShareLanding,
} from '../feedShareLanding';
import { FEED_LANDING_HIGHLIGHT_MS } from '../useFeedShareLanding';

jest.mock('@/lib/feedApi', () => ({
  listFeedPosts: jest.fn(),
  createFeedPost: jest.fn(),
  getFeedPost: jest.fn(),
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

jest.mock('@/hooks', () => ({
  useIsMobile: () => false,
  useIsMobileState: () => ({ isMobile: false, isResolved: true }),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_key: string, fallback: string) => fallback,
    locale: 'sk',
  }),
}));

// `forwardRef` je tu podstatný: feed sa cez ref dozvie uzol karty a bez neho
// by nemal kam doscrollovať.
jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
      function MotionDiv({ children, ...props }, ref) {
        return (
          <div {...props} ref={ref}>
            {children}
          </div>
        );
      },
    ),
    article: ({ children, ...props }: React.ComponentProps<'article'>) => (
      <article {...props}>{children}</article>
    ),
  },
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const feedApi = jest.requireMock('@/lib/feedApi');
const mockedList = feedApi.listFeedPosts as jest.Mock;

const author = {
  id: 10,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

function post(id: number) {
  return {
    id,
    post_type: 'free_post',
    caption: `Príspevok ${id}`,
    author,
    images: [],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 0,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
  };
}

/** jsdom `scrollIntoView` nemá vôbec – appka ho preto volá cez kontrolu typu. */
let scrollSpy: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  resetFeedShareLanding();
  scrollSpy = jest.fn();
  (Element.prototype as unknown as { scrollIntoView: jest.Mock }).scrollIntoView =
    scrollSpy;
  mockedList.mockResolvedValue({
    results: [post(1), post(2), post(3)],
    next: null,
    previous: null,
  });
});

afterEach(() => {
  resetFeedShareLanding();
  delete (Element.prototype as unknown as { scrollIntoView?: unknown }).scrollIntoView;
});

describe('feed ako cieľ pristátia', () => {
  it('registers itself while it is on screen', async () => {
    expect(isFeedLandingTargetMounted()).toBe(false);

    const { unmount } = render(<FeedList />);
    await screen.findByTestId('feed-list');

    // Podľa tohto sa dialóg rozhoduje, či treba navigovať.
    expect(isFeedLandingTargetMounted()).toBe(true);

    unmount();
    expect(isFeedLandingTargetMounted()).toBe(false);
  });
});

describe('zdieľanie, keď je Nástenka na obrazovke', () => {
  it('highlights and scrolls to the new post', async () => {
    render(<FeedList />);
    await screen.findByTestId('feed-list');

    act(() => emitFeedShareLanding(2));

    const landed = await screen.findByTestId('feed-landed-post');
    expect(landed).toHaveTextContent('Príspevok 2');
    // Zvýraznenie navedie oko – prstenec okolo karty.
    expect(landed.className).toContain('ring-2');
    await waitFor(() => expect(scrollSpy).toHaveBeenCalled());
    expect(scrollSpy).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
  });

  it('lets the highlight fade on its own', async () => {
    jest.useFakeTimers();
    render(<FeedList />);
    await act(async () => {
      await Promise.resolve();
    });

    act(() => emitFeedShareLanding(2));
    expect(screen.queryByTestId('feed-landed-post')).not.toBeNull();

    // Zvýraznenie je navedenie, nie stav príspevku – po chvíli zhasne.
    act(() => {
      jest.advanceTimersByTime(FEED_LANDING_HIGHLIGHT_MS + 100);
    });

    expect(screen.queryByTestId('feed-landed-post')).toBeNull();
    jest.useRealTimers();
  });
});

describe('zdieľanie z profilu, kde Nástenka na obrazovke nebola', () => {
  it('picks the landing up once the feed mounts', async () => {
    // Signál padne do prázdna – feed ešte nie je nikde.
    act(() => emitFeedShareLanding(3));
    expect(isFeedLandingTargetMounted()).toBe(false);

    render(<FeedList />);

    const landed = await screen.findByTestId('feed-landed-post');
    expect(landed).toHaveTextContent('Príspevok 3');
    await waitFor(() => expect(scrollSpy).toHaveBeenCalled());
  });

  it('does not repeat the landing on the next visit', async () => {
    act(() => emitFeedShareLanding(3));

    const first = render(<FeedList />);
    await screen.findByTestId('feed-landed-post');
    first.unmount();

    // Druhé otvorenie Nástenky už nemá čo zvýrazňovať.
    render(<FeedList />);
    await screen.findByTestId('feed-list');
    expect(screen.queryByTestId('feed-landed-post')).toBeNull();
  });
});
