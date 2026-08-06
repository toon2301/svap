import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostComments from '../FeedPostComments';
import { listFeedPostComments, type FeedPostComment } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  listFeedPostComments: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback }),
}));

jest.mock('../../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: ({
    ariaLabel,
    onSelect,
  }: {
    ariaLabel: string;
    onSelect: (emoji: string) => void;
  }) => (
    <button type="button" aria-label={ariaLabel} onClick={() => onSelect('🙂')}>
      emoji
    </button>
  ),
}));

const mockedList = listFeedPostComments as jest.MockedFunction<
  typeof listFeedPostComments
>;

const author = {
  id: 1,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

function comment(id: number, text: string): FeedPostComment {
  return { id, text, author, can_delete: false, created_at: '2026-01-01' };
}

/**
 * Observer mock, ktorý si pamätá, KTORÝ uzol pozoruje – vďaka tomu vie test
 * spustiť donačítanie len pre jednu z dvoch rozbalených kariet.
 */
function installScopedObserverMock() {
  const registry: Array<{ node: Element; fire: () => void }> = [];
  const original = global.IntersectionObserver;

  class MockObserver {
    private cb: IntersectionObserverCallback;
    constructor(cb: IntersectionObserverCallback) {
      this.cb = cb;
    }
    observe = (node: Element) => {
      registry.push({
        node,
        fire: () =>
          this.cb(
            [{ isIntersecting: true } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          ),
      });
    };
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
    registry,
    restore: () => {
      (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
        original;
    },
  };
}

describe('FeedPostComments – scoped infinite scroll', () => {
  let observer: ReturnType<typeof installScopedObserverMock>;

  beforeEach(() => {
    mockedList.mockReset();
    observer = installScopedObserverMock();
  });

  afterEach(() => {
    observer.restore();
  });

  it('loads more without a button when the sentinel appears', async () => {
    mockedList
      .mockResolvedValueOnce({
        results: [comment(1, 'Prvý')],
        next: 'http://api.test/api/auth/feed/posts/5/comments/?cursor=a',
        previous: null,
      })
      .mockResolvedValueOnce({
        results: [comment(2, 'Druhý')],
        next: null,
        previous: null,
      })
      .mockResolvedValue({ results: [], next: null, previous: null });

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Prvý');

    // Tlačidlo „Zobraziť ďalšie" tu už nie je – donačítava sentinel.
    expect(
      screen.queryByRole('button', { name: 'Zobraziť ďalšie' }),
    ).not.toBeInTheDocument();

    await waitFor(() => expect(observer.registry.length).toBeGreaterThan(0));
    await act(async () => {
      observer.registry.forEach((entry) => entry.fire());
    });

    expect(await screen.findByText('Druhý')).toBeInTheDocument();
  });

  it('keeps two expanded cards independent', async () => {
    // Karta 5 má ďalšiu stránku, karta 9 nie.
    mockedList.mockImplementation(async (postId, params) => {
      if (postId === 5) {
        return params?.cursorUrl
          ? { results: [comment(52, 'Päť-druhý')], next: null, previous: null }
          : {
              results: [comment(51, 'Päť-prvý')],
              next: 'http://api.test/api/auth/feed/posts/5/comments/?cursor=a',
              previous: null,
            };
      }
      return { results: [comment(91, 'Deväť-prvý')], next: null, previous: null };
    });

    render(
      <div>
        <div data-testid="card-5">
          <FeedPostComments postId={5} />
        </div>
        <div data-testid="card-9">
          <FeedPostComments postId={9} />
        </div>
      </div>,
    );

    await screen.findByText('Päť-prvý');
    await screen.findByText('Deväť-prvý');

    // Sentinel registruje LEN karta 5 (karta 9 nemá ďalšiu stránku → enabled=false).
    await waitFor(() => expect(observer.registry).toHaveLength(1));
    const cardFive = screen.getByTestId('card-5');
    expect(cardFive).toContainElement(observer.registry[0].node as HTMLElement);

    await act(async () => {
      observer.registry[0].fire();
    });

    // Donačítala sa len karta 5; karta 9 ostala nedotknutá.
    expect(await within(cardFive).findByText('Päť-druhý')).toBeInTheDocument();
    const cardNine = screen.getByTestId('card-9');
    expect(within(cardNine).queryByText('Päť-druhý')).not.toBeInTheDocument();
    expect(within(cardNine).getByText('Deväť-prvý')).toBeInTheDocument();
  });

  it('inserts an emoji into the comment field', async () => {
    mockedList.mockResolvedValue({ results: [], next: null, previous: null });

    render(<FeedPostComments postId={5} />);
    await screen.findByTestId('feed-comments-empty');

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'Ahoj');
    await userEvent.click(screen.getByRole('button', { name: 'Pridať emoji' }));

    await waitFor(() => expect(textarea).toHaveValue('Ahoj🙂'));
  });
});
