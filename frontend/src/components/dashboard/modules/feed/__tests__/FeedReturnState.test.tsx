/**
 * Návrat na Nástenku tam, kde ju používateľ opustil.
 *
 * Nástenka sa odchodom na profil / ponuku / portfólio odmountuje, takže sa jej
 * stav musí uložiť mimo komponentu. Testy držia obe strany: že sa pri odchode
 * uloží a že sa pri návrate obnoví BEZ nového načítania zo servera.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedList from '../FeedList';
import {
  FEED_RETURN_TTL_MS,
  clearFeedReturn,
  requestFeedReturnCapture,
  resetFeedReturnState,
  saveFeedReturn,
  takeFeedReturn,
} from '../feedReturnState';
import { openUserProfile } from '../feedProfileNavigation';
import {
  emitFeedShareLanding,
  resetFeedShareLanding,
} from '../feedShareLanding';

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

/** `<main data-dashboard-main>` – feed scrolluje v ňom, nie vo vlastnom boxe. */
function mountDashboardMain(): HTMLElement {
  const main = document.createElement('main');
  main.setAttribute('data-dashboard-main', '');
  document.body.appendChild(main);
  return main;
}

beforeEach(() => {
  jest.clearAllMocks();
  resetFeedReturnState();
  resetFeedShareLanding();
  document.querySelectorAll('[data-dashboard-main]').forEach((node) => node.remove());
  mockedList.mockResolvedValue({
    results: [post(1), post(2)],
    next: 'http://api.test/feed?cursor=2',
  });
});

afterEach(() => {
  resetFeedReturnState();
  resetFeedShareLanding();
});

describe('snímka stavu Nástenky', () => {
  it('keeps the posts, the cursor and the scroll position', () => {
    saveFeedReturn({
      posts: [post(1), post(2)] as never,
      nextUrl: 'http://api.test/feed?cursor=2',
      scrollTop: 840,
    });

    const taken = takeFeedReturn();
    expect(taken?.posts.map((entry) => entry.id)).toEqual([1, 2]);
    expect(taken?.nextUrl).toBe('http://api.test/feed?cursor=2');
    expect(taken?.scrollTop).toBe(840);
  });

  it('is consumed exactly once', () => {
    saveFeedReturn({ posts: [post(1)] as never, nextUrl: null, scrollTop: 10 });

    expect(takeFeedReturn()).not.toBeNull();
    // Obnova je jednorazová – inak by sa starý stav vracal pri každom
    // ďalšom otvorení Nástenky.
    expect(takeFeedReturn()).toBeNull();
  });

  it('stores nothing for an empty feed', () => {
    saveFeedReturn({ posts: [], nextUrl: null, scrollTop: 0 });

    expect(takeFeedReturn()).toBeNull();
  });

  it('goes stale instead of restoring an old feed', () => {
    saveFeedReturn({ posts: [post(1)] as never, nextUrl: null, scrollTop: 10 });

    // Snímka je návrat, nie archív: po dlhej odbočke inam sa neobnovuje.
    const realNow = Date.now;
    Date.now = () => realNow() + FEED_RETURN_TTL_MS + 1000;
    try {
      expect(takeFeedReturn()).toBeNull();
    } finally {
      Date.now = realNow;
    }
  });

  it('can be dropped without being taken', () => {
    saveFeedReturn({ posts: [post(1)] as never, nextUrl: null, scrollTop: 10 });
    clearFeedReturn();

    expect(takeFeedReturn()).toBeNull();
  });
});

describe('odchod z Nástenky', () => {
  it('captures the state when a profile link is followed', async () => {
    const main = mountDashboardMain();
    render(<FeedList />);
    // Až po načítaní: prázdny zoznam sa zámerne neukladá.
    await screen.findByText('Príspevok 1');
    main.scrollTop = 640;

    // Preklik na profil autora – navigácia si vyžiada snímku ešte predtým,
    // než sa Nástenka odmountuje.
    act(() => openUserProfile({ id: 21, slug: 'peter' }));

    const taken = takeFeedReturn();
    expect(taken?.posts.map((entry) => entry.id)).toEqual([1, 2]);
    expect(taken?.nextUrl).toBe('http://api.test/feed?cursor=2');
    expect(taken?.scrollTop).toBe(640);
  });

  it('ignores the request when the feed is not on screen', () => {
    mountDashboardMain();

    // Ten istý preklik zo správ alebo upozornení – Nástenka nikde, nie je čo
    // ukladať a nič nesmie spadnúť.
    act(() => requestFeedReturnCapture());

    expect(takeFeedReturn()).toBeNull();
  });
});

describe('návrat na Nástenku', () => {
  it('restores the posts without hitting the server', async () => {
    saveFeedReturn({
      posts: [post(7), post(8), post(9)] as never,
      nextUrl: 'http://api.test/feed?cursor=9',
      scrollTop: 0,
    });

    render(<FeedList />);

    await screen.findByText('Príspevok 7');
    expect(screen.getByText('Príspevok 9')).toBeInTheDocument();
    // Práve toto drží obsah na mieste: žiadny refetch prvej stránky.
    expect(mockedList).not.toHaveBeenCalled();
  });

  it('keeps the loaded pages and loads more from the restored cursor', async () => {
    // Tri príspevky = viac než jedna stránka; kurzor musí prežiť, inak by
    // donačítavanie začalo odznova.
    saveFeedReturn({
      posts: [post(7), post(8), post(9)] as never,
      nextUrl: 'http://api.test/feed?cursor=9',
      scrollTop: 0,
    });

    render(<FeedList />);
    await screen.findByText('Príspevok 7');
    expect(mockedList).not.toHaveBeenCalled();

    // Donačítanie pokračuje TAM, kde používateľ skončil – nie od začiatku.
    mockedList.mockResolvedValue({ results: [post(10)], next: null });
    fireEvent.click(screen.getByRole('button', { name: /ďalšie/i }));

    await waitFor(() =>
      expect(mockedList).toHaveBeenCalledWith({
        cursorUrl: 'http://api.test/feed?cursor=9',
      }),
    );
    expect(await screen.findByText('Príspevok 10')).toBeInTheDocument();
  });

  it('puts the scroll position back', async () => {
    const main = mountDashboardMain();
    saveFeedReturn({
      posts: [post(7), post(8)] as never,
      nextUrl: null,
      scrollTop: 720,
    });

    render(<FeedList />);
    await screen.findByText('Príspevok 7');

    await waitFor(() => expect(main.scrollTop).toBe(720));
  });

  it('loads normally when there is nothing to restore', async () => {
    render(<FeedList />);

    await screen.findByText('Príspevok 1');
    // Bežné otvorenie Nástenky sa nemení.
    expect(mockedList).toHaveBeenCalledTimes(1);
  });
});

describe('zdieľanie z profilu, na ktorý sa prišlo z Nástenky', () => {
  it('drops the snapshot so the new post can be found', async () => {
    // 1. Nástenka → profil: snímka sa uloží.
    const main = mountDashboardMain();
    const feed = render(<FeedList />);
    await screen.findByText('Príspevok 1');
    main.scrollTop = 600;
    act(() => openUserProfile({ id: 21, slug: 'peter' }));
    feed.unmount();

    // 2. Z profilu sa zdieľa ponuka. Nástenka nie je na obrazovke, takže
    //    `emitFeedPostCreated` nemá poslucháča – ostáva len čakajúce
    //    pristátie so samotným ID.
    act(() => emitFeedShareLanding(99));

    // Snímka je od tejto chvíle zastaraná: vznikla PRED zdieľaním, takže
    // nový príspevok neobsahuje a obnovuje sa bez fetchu.
    expect(takeFeedReturn()).toBeNull();
  });

  it('loads the feed fresh on return, so the new post is there', async () => {
    const main = mountDashboardMain();
    const feed = render(<FeedList />);
    await screen.findByText('Príspevok 1');
    main.scrollTop = 600;
    act(() => openUserProfile({ id: 21, slug: 'peter' }));
    feed.unmount();

    act(() => emitFeedShareLanding(99));

    // Server už nový príspevok vracia (chronologicky na vrchu).
    mockedList.mockResolvedValue({
      results: [post(99), post(1), post(2)],
      next: null,
    });
    render(<FeedList />);

    // Nástenka sa namountuje „na čisto" – načíta sa a nový príspevok je tam.
    await screen.findByText('Príspevok 99');
    expect(mockedList).toHaveBeenCalled();
  });
});
