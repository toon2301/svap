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
  return { id, text, author, can_delete: false, likes_count: 0, is_liked_by_me: false, created_at: '2026-01-01' };
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

  it('discards a load-more page that a mutation made stale', async () => {
    const mockedCreate = jest.requireMock('@/lib/feedApi')
      .createFeedPostComment as jest.Mock;

    // Bez predvolenej no-op implementácie: keby sa druhý request nikdy
    // nespustil, callback ostane null a test padne namiesto toho, aby
    // prešiel naprázdno.
    let resolveSecondPage: ((value: unknown) => void) | null = null;
    mockedList
      .mockResolvedValueOnce({
        results: [comment(1, 'Prvý')],
        next: 'http://api.test/api/auth/feed/posts/5/comments/?cursor=a',
        previous: null,
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecondPage = resolve;
          }) as never,
      );
    mockedCreate.mockResolvedValue(comment(99, 'Môj nový'));

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Prvý');

    // Spusti donačítanie a NECHAJ ho visieť.
    await waitFor(() => expect(observer.registry.length).toBeGreaterThan(0));
    await act(async () => {
      observer.registry.forEach((entry) => entry.fire());
    });

    // Medzitým pridaj komentár – mutácia zneplatní prebiehajúcu stránku.
    await userEvent.type(screen.getByRole('textbox'), 'Môj nový');
    await userEvent.click(screen.getByRole('button', { name: 'Pridať' }));
    expect(await screen.findByText('Môj nový')).toBeInTheDocument();

    // Druhý request musel REÁLNE vzniknúť – inak nie je čo zahadzovať.
    await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(2));
    expect(resolveSecondPage).not.toBeNull();

    // Až teraz dobehne stará odpoveď – musí sa zahodiť.
    await act(async () => {
      resolveSecondPage!({
        results: [comment(2, 'Zastaraný')],
        next: null,
        previous: null,
      });
    });

    expect(screen.queryByText('Zastaraný')).not.toBeInTheDocument();
    expect(screen.getByText('Môj nový')).toBeInTheDocument();
    expect(screen.getByText('Prvý')).toBeInTheDocument();
  });

  it('stays quiet when a load-more failure was already invalidated', async () => {
    const mockedCreate = jest.requireMock('@/lib/feedApi')
      .createFeedPostComment as jest.Mock;
    const mockedToastError = jest.requireMock('react-hot-toast').default
      .error as jest.Mock;
    mockedToastError.mockReset();

    // Rovnako ako vyššie – žiadna no-op náhrada, nech test nemôže prejsť
    // bez toho, aby druhý request skutočne prebehol.
    let rejectSecondPage: ((reason?: unknown) => void) | null = null;
    mockedList
      .mockResolvedValueOnce({
        results: [comment(1, 'Prvý')],
        next: 'http://api.test/api/auth/feed/posts/5/comments/?cursor=a',
        previous: null,
      })
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectSecondPage = reject;
          }) as never,
      );
    mockedCreate.mockResolvedValue(comment(99, 'Môj nový'));

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Prvý');

    await waitFor(() => expect(observer.registry.length).toBeGreaterThan(0));
    await act(async () => {
      observer.registry.forEach((entry) => entry.fire());
    });

    // Mutácia zneplatní prebiehajúce donačítanie…
    await userEvent.type(screen.getByRole('textbox'), 'Môj nový');
    await userEvent.click(screen.getByRole('button', { name: 'Pridať' }));
    expect(await screen.findByText('Môj nový')).toBeInTheDocument();

    // Druhý request musel REÁLNE vzniknúť a odovzdať svoj reject callback.
    await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(2));
    expect(rejectSecondPage).not.toBeNull();

    // …a až potom zlyhá. Hláška o nenačítaní komentárov by tesne po úspešnom
    // pridaní komentára len mýlila.
    await act(async () => {
      rejectSecondPage!(new Error('offline'));
    });

    expect(mockedToastError).not.toHaveBeenCalled();
  });

  it('still reports a load-more failure that nothing invalidated', async () => {
    const mockedToastError = jest.requireMock('react-hot-toast').default
      .error as jest.Mock;
    mockedToastError.mockReset();

    mockedList
      .mockResolvedValueOnce({
        results: [comment(1, 'Prvý')],
        next: 'http://api.test/api/auth/feed/posts/5/comments/?cursor=a',
        previous: null,
      })
      .mockRejectedValueOnce(new Error('offline'));

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Prvý');

    await waitFor(() => expect(observer.registry.length).toBeGreaterThan(0));
    await act(async () => {
      observer.registry.forEach((entry) => entry.fire());
    });

    await waitFor(() =>
      expect(mockedToastError).toHaveBeenCalledWith(
        'Komentáre sa nepodarilo načítať.',
      ),
    );
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
