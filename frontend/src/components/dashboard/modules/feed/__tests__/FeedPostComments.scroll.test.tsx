/**
 * Ohraničená výška sekcie komentárov + vlastný scroll vo vnútri.
 *
 * Podstatné je, že donačítavanie aj viditeľnosť nového komentára fungujú voči
 * TOMUTO boxu, nie voči scrollu celej stránky.
 */

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostComments from '../FeedPostComments';
import {
  createFeedPostComment,
  listFeedPostComments,
  type FeedPostComment,
} from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  listFeedPostComments: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback }),
}));

jest.mock('../../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: ({ ariaLabel }: { ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel}>
      emoji
    </button>
  ),
}));

const mockedList = listFeedPostComments as jest.MockedFunction<
  typeof listFeedPostComments
>;
const mockedCreate = createFeedPostComment as jest.MockedFunction<
  typeof createFeedPostComment
>;

const author = {
  id: 1,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

function comment(id: number, text: string): FeedPostComment {
  return { id, text, author, can_delete: false, likes_count: 0, is_liked_by_me: false, created_at: '2026-01-01' };
}

/** Observer mock, ktorý si zapamätá options (kvôli kontrole `root`). */
function installObserverMock() {
  const created: Array<{
    node: Element;
    options?: IntersectionObserverInit;
    fire: () => void;
  }> = [];
  const original = global.IntersectionObserver;

  class MockObserver {
    private options?: IntersectionObserverInit;
    private cb: IntersectionObserverCallback;
    constructor(cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      this.cb = cb;
      this.options = options;
    }
    observe = (node: Element) =>
      created.push({
        node,
        options: this.options,
        fire: () =>
          this.cb(
            [{ isIntersecting: true } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          ),
      });
    disconnect = jest.fn();
    unobserve = jest.fn();
    takeRecords = jest.fn();
    root = null;
    rootMargin = '';
    thresholds = [];
  }

  (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
    MockObserver;
  return {
    created,
    restore: () => {
      (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
        original;
    },
  };
}

describe('FeedPostComments – ohraničená výška a vlastný scroll', () => {
  let observer: ReturnType<typeof installObserverMock>;

  beforeEach(() => {
    mockedList.mockReset();
    mockedCreate.mockReset();
    observer = installObserverMock();
  });

  afterEach(() => {
    observer.restore();
  });

  it('puts the list in a capped, scrollable box', async () => {
    mockedList.mockResolvedValue({
      results: [comment(1, 'Prvý')],
      next: null,
      previous: null,
    });

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Prvý');

    const box = screen.getByTestId('feed-comments-scroll');
    expect(box.className).toContain('overflow-y-auto');
    expect(box.className).toMatch(/max-h-\[min\(/);
    // Reťazenie scrollu na stránku pri dosiahnutí konca – hlavne mobil.
    expect(box.className).toContain('overscroll-contain');
    // Scrollovateľná oblasť musí byť ovládateľná aj z klávesnice.
    expect(box).toHaveAttribute('tabindex', '0');

    // Zoznam je vnútri boxu…
    expect(within(box).getByText('Prvý')).toBeInTheDocument();
    // …a rovnaké ohraničenie platí pre mobil aj desktop (jedno pravidlo,
    // žiadny `sm:`/`lg:` prepínač, ktorý by mobil vynechal).
    expect(box.className).not.toMatch(/(sm|md|lg):max-h-/);
  });

  it('keeps the composer outside the scrollable area', async () => {
    mockedList.mockResolvedValue({ results: [], next: null, previous: null });

    render(<FeedPostComments postId={5} />);
    await screen.findByTestId('feed-comments-empty');

    const box = screen.getByTestId('feed-comments-scroll');
    // Textové pole aj tlačidlo ostávajú viditeľné bez ohľadu na pozíciu
    // scrollu v zozname, takže NESMÚ byť vnútri boxu.
    expect(within(box).queryByRole('textbox')).not.toBeInTheDocument();
    expect(
      within(box).queryByRole('button', { name: 'Pridať' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('observes the sentinel against the box, not the viewport', async () => {
    mockedList.mockResolvedValue({
      results: [comment(1, 'Prvý')],
      next: 'http://api.test/api/auth/feed/posts/5/comments/?cursor=a',
      previous: null,
    });

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Prvý');
    await waitFor(() => expect(observer.created.length).toBeGreaterThan(0));

    const box = screen.getByTestId('feed-comments-scroll');
    const entry = observer.created[0];
    // Sentinel musí byť VNÚTRI boxu – inak by ho vnútorný scroll nikdy
    // neposunul do zorného poľa a donačítavanie by sa nespustilo.
    expect(box).toContainElement(entry.node as HTMLElement);
    expect(entry.options?.root).toBe(box);
  });

  it('scrolls to the new comment after posting', async () => {
    mockedList.mockResolvedValue({
      results: [comment(1, 'Starý')],
      next: null,
      previous: null,
    });
    mockedCreate.mockResolvedValue(comment(2, 'Môj nový'));

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Starý');

    const box = screen.getByTestId('feed-comments-scroll');
    const scrollTopSetter = jest.fn();
    Object.defineProperty(box, 'scrollHeight', { value: 1234, configurable: true });
    Object.defineProperty(box, 'scrollTop', {
      get: () => 0,
      set: scrollTopSetter,
      configurable: true,
    });

    await userEvent.type(screen.getByRole('textbox'), 'Môj nový');
    await userEvent.click(screen.getByRole('button', { name: 'Pridať' }));

    expect(await screen.findByText('Môj nový')).toBeInTheDocument();
    // Nový komentár ide NAVRCH zoznamu, ale composer je pod ním – pri dlhšom
    // vlákne by ostal nad zlomom a pôsobil by, akoby sa nepridal.
    await waitFor(() => expect(scrollTopSetter).toHaveBeenCalledWith(0));
  });

  it('does not move the scroll position when older pages load in', async () => {
    mockedList
      .mockResolvedValueOnce({
        results: [comment(1, 'Prvý')],
        next: 'http://api.test/api/auth/feed/posts/5/comments/?cursor=a',
        previous: null,
      })
      .mockResolvedValue({
        results: [comment(2, 'Druhý')],
        next: null,
        previous: null,
      });

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Prvý');

    const box = screen.getByTestId('feed-comments-scroll');
    const scrollTopSetter = jest.fn();
    Object.defineProperty(box, 'scrollHeight', { value: 1234, configurable: true });
    Object.defineProperty(box, 'scrollTop', {
      get: () => 0,
      set: scrollTopSetter,
      configurable: true,
    });

    await waitFor(() => expect(observer.created.length).toBeGreaterThan(0));
    await act(async () => {
      observer.created[0].fire();
    });

    expect(await screen.findByText('Druhý')).toBeInTheDocument();
    // Donačítanie NESMIE hýbať scrollom – používateľ číta tam, kde je.
    expect(scrollTopSetter).not.toHaveBeenCalled();
  });
});
