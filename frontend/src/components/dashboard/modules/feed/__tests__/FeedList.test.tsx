import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedList from '../FeedList';
import { listFeedPosts } from '@/lib/feedApi';
import type { FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  listFeedPosts: jest.fn(),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => (
      <div {...props}>{children}</div>
    ),
    article: ({ children, ...props }: React.ComponentProps<'article'>) => (
      <article {...props}>{children}</article>
    ),
  },
}));

const mockedListFeedPosts = listFeedPosts as jest.MockedFunction<typeof listFeedPosts>;

function makePost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: 1,
    post_type: 'free_post',
    caption: 'Ahoj feed!',
    author: {
      id: 10,
      display_name: 'Jana Nováková',
      slug: 'jana',
      user_type: 'individual',
      avatar_url: null,
    },
    image: null,
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 0,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// jest.setup.js definuje globálny IntersectionObserver (observe() je no-op).
// Testy, ktoré potrebujú callback spustiť, ho dočasne nahradia – po teste sa
// MUSÍ vrátiť pôvodný, nie zmazať, inak by ostatné testy v súbore bežali bez
// neho a správali sa inak než v ostrej prevádzke.
const originalIntersectionObserver = global.IntersectionObserver;

/** Zachytí callback observera, aby ho test vedel spustiť ručne. */
function installIntersectionObserverMock() {
  const triggers: Array<() => void> = [];
  const observe = jest.fn();
  const disconnect = jest.fn();

  class MockIntersectionObserver {
    constructor(callback: IntersectionObserverCallback) {
      triggers.push(() =>
        callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        ),
      );
    }
    observe = observe;
    disconnect = disconnect;
    unobserve = jest.fn();
    takeRecords = jest.fn();
    root = null;
    rootMargin = '';
    thresholds = [];
  }

  (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
    MockIntersectionObserver;
  return { triggers, observe, disconnect };
}

describe('FeedList', () => {
  beforeEach(() => {
    // mockReset (nie clearAllMocks): clear nechá v mocku zvyšnú frontu
    // mockResolvedValueOnce aj perzistentnú implementáciu z predošlého testu,
    // takže by si testy medzi sebou požičiavali odpovede.
    mockedListFeedPosts.mockReset();
  });

  afterEach(() => {
    (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
      originalIntersectionObserver;
  });

  it('renders a card for every post type', async () => {
    mockedListFeedPosts.mockResolvedValue({
      results: [
        makePost({ id: 1, post_type: 'free_post' }),
        makePost({
          id: 2,
          post_type: 'shared_offer',
          shared_content: {
            type: 'offer',
            title: 'Programovanie',
            category: 'it',
            id: 5,
            owner: null,
            owner_display_name: 'Peter',
            thumbnail_url: null,
          },
        }),
        makePost({
          id: 3,
          post_type: 'shared_portfolio_item',
          shared_content: {
            type: 'portfolio_item',
            title: 'Weby na mieru',
            category: 'it',
            id: 7,
            owner: null,
            owner_display_name: 'Peter',
            thumbnail_url: null,
          },
        }),
      ],
      next: null,
      previous: null,
    });

    render(<FeedList />);

    await waitFor(() => {
      expect(screen.getAllByTestId('feed-post-card')).toHaveLength(3);
    });
    expect(screen.getByText('Programovanie')).toBeInTheDocument();
    expect(screen.getByText('Weby na mieru')).toBeInTheDocument();
  });

  it('gives shared cards a dark: background variant so text stays readable', async () => {
    mockedListFeedPosts.mockResolvedValue({
      results: [
        makePost({
          id: 2,
          post_type: 'shared_offer',
          shared_content: {
            type: 'offer',
            title: 'Programovanie',
            category: 'it',
            id: 5,
            owner: null,
            owner_display_name: 'Peter',
            thumbnail_url: null,
          },
        }),
      ],
      next: null,
      previous: null,
    });

    render(<FeedList />);

    const card = await screen.findByTestId('feed-post-card');
    // Pozadie musí byť trieda s dark: variantom, nie inline style – inline
    // farba sa neprepína a v tmavom režime by ostal svetlý text na svetlom.
    expect(card.className).toContain('dark:bg-');
    expect(card.getAttribute('style')).toBeNull();
  });

  it('shows the inviting empty state with a CTA when there are no posts', async () => {
    mockedListFeedPosts.mockResolvedValue({
      results: [],
      next: null,
      previous: null,
    });

    render(<FeedList />);

    await waitFor(() => {
      expect(screen.getByTestId('feed-empty-state')).toBeInTheDocument();
    });
    expect(screen.getByText('Nástenka je zatiaľ tichá')).toBeInTheDocument();
    expect(screen.getByTestId('feed-empty-cta')).toBeDisabled();
  });

  it('renders a placeholder when shared content is unavailable', async () => {
    mockedListFeedPosts.mockResolvedValue({
      results: [
        makePost({
          id: 4,
          post_type: 'shared_offer',
          shared_content_unavailable: true,
          shared_content: {
            type: 'offer',
            title: 'Programovanie',
            category: 'it',
            id: null,
            owner: null,
            owner_display_name: 'Peter',
            thumbnail_url: null,
          },
        }),
      ],
      next: null,
      previous: null,
    });

    render(<FeedList />);

    await waitFor(() => {
      expect(screen.getByTestId('feed-shared-unavailable')).toBeInTheDocument();
    });
    // Príspevok sa NEskryje – zobrazí sa s placeholderom.
    expect(screen.getByTestId('feed-post-card')).toBeInTheDocument();
    expect(
      screen.getByText('Táto ponuka už nie je dostupná'),
    ).toBeInTheDocument();
  });

  it('loads the next page once when the sentinel becomes visible', async () => {
    const observer = installIntersectionObserverMock();
    mockedListFeedPosts
      .mockResolvedValueOnce({
        results: [makePost({ id: 1 })],
        next: 'http://api.test/api/auth/feed/posts/?cursor=abc',
        previous: null,
      })
      .mockResolvedValueOnce({
        results: [makePost({ id: 2 })],
        next: null,
        previous: null,
      })
      // Poistka: keby observer vystrelil ešte raz, nech to nevytiahne dáta
      // z fronty iného testu – prázdna odpoveď je neutrálna.
      .mockResolvedValue({ results: [], next: null, previous: null });

    render(<FeedList />);
    await waitFor(() => {
      expect(screen.getAllByTestId('feed-post-card')).toHaveLength(1);
    });

    // Sentinel efekt beží až po tom, čo hasMore prejde na true – bez tohto
    // čakania by sme pri záťaži strieľali do prázdnej fronty triggerov.
    await waitFor(() => {
      expect(observer.triggers.length).toBeGreaterThan(0);
    });

    // Jeden scroll môže observer vystreliť viackrát – loadMore smie prejsť raz.
    await act(async () => {
      observer.triggers.forEach((trigger) => trigger());
      observer.triggers.forEach((trigger) => trigger());
    });

    await waitFor(() => {
      expect(screen.getAllByTestId('feed-post-card')).toHaveLength(2);
    });
    expect(mockedListFeedPosts).toHaveBeenCalledTimes(2);
    expect(mockedListFeedPosts).toHaveBeenLastCalledWith({
      cursorUrl: 'http://api.test/api/auth/feed/posts/?cursor=abc',
    });
  });

  it('deduplicates posts that overlap between pages', async () => {
    mockedListFeedPosts
      .mockResolvedValueOnce({
        results: [makePost({ id: 1 }), makePost({ id: 2 })],
        next: 'http://api.test/api/auth/feed/posts/?cursor=abc',
        previous: null,
      })
      .mockResolvedValueOnce({
        // id 2 sa prekrýva s prvou stránkou.
        results: [makePost({ id: 2 }), makePost({ id: 3 })],
        next: null,
        previous: null,
      })
      .mockResolvedValue({ results: [], next: null, previous: null });

    render(<FeedList />);
    await waitFor(() => {
      expect(screen.getAllByTestId('feed-post-card')).toHaveLength(2);
    });

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Zobraziť ďalšie' }));
    });

    await waitFor(() => {
      expect(screen.getAllByTestId('feed-post-card')).toHaveLength(3);
    });
  });

  it('shows a retry action when the initial load fails', async () => {
    mockedListFeedPosts.mockRejectedValueOnce(new Error('boom'));

    render(<FeedList />);

    await waitFor(() => {
      expect(
        screen.getByText('Nástenku sa nepodarilo načítať.'),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Skúsiť znova' })).toBeInTheDocument();
  });
});
