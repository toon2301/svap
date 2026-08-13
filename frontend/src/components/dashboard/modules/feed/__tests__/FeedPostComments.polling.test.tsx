/**
 * Priebežné sledovanie komentárov (polling namiesto WebSocket izieb).
 *
 * Overuje sa: nové komentáre a počet bez akcie používateľa, brzdy (skrytá
 * záložka, nečinnosť), zlúčenie s optimistickým stavom, nezávislosť dvoch
 * otvorených sekcií a cleanup po zatvorení.
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostComments from '../FeedPostComments';
import {
  COMMENTS_POLL_IDLE_TIMEOUT_MS,
  COMMENTS_POLL_INTERVAL_MS,
} from '../useFeedCommentsPolling';
import { listFeedPostComments, type FeedPostComment } from '@/lib/feedApi';

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
const mockedCreate = jest.requireMock('@/lib/feedApi')
  .createFeedPostComment as jest.Mock;

const author = {
  id: 1,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

function comment(id: number, text: string, likes = 0): FeedPostComment {
  return {
    id,
    text,
    author,
    can_delete: false,
    likes_count: likes,
    is_liked_by_me: false,
    created_at: '2026-01-01',
  };
}

function page(results: FeedPostComment[], count?: number) {
  return { results, next: null, previous: null, count: count ?? results.length };
}

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'visibilityState', {
    value: hidden ? 'hidden' : 'visible',
    configurable: true,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

/** Observer, ktorý si zapamätá sentinel a vie ho ručne vystreliť. */
function installFiringObserver() {
  const registry: Array<() => void> = [];
  const original = global.IntersectionObserver;
  class MockObserver {
    private cb: IntersectionObserverCallback;
    constructor(cb: IntersectionObserverCallback) {
      this.cb = cb;
    }
    observe = () =>
      registry.push(() =>
        this.cb(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        ),
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
  return {
    registry,
    restore: () => {
      (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
        original;
    },
  };
}

/** Posunie čas o jeden pollovací tik a nechá dobehnúť promise reťaz. */
async function tick(times = 1) {
  for (let i = 0; i < times; i += 1) {
    await act(async () => {
      jest.advanceTimersByTime(COMMENTS_POLL_INTERVAL_MS + 50);
    });
  }
}

describe('FeedPostComments – polling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockedList.mockReset();
    mockedCreate.mockReset();
    setHidden(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('brings in a comment written by someone else', async () => {
    mockedList
      .mockResolvedValueOnce(page([comment(1, 'Prvý')]))
      .mockResolvedValue(page([comment(1, 'Prvý'), comment(2, 'Od iného')], 2));

    render(<FeedPostComments postId={5} onTotalChange={jest.fn()} />);
    await screen.findByText('Prvý');

    await tick();

    // Bez akéhokoľvek zásahu používateľa.
    expect(await screen.findByText('Od iného')).toBeInTheDocument();
  });

  it('keeps comments_count in step with the list', async () => {
    const onTotalChange = jest.fn();
    mockedList
      .mockResolvedValueOnce(page([comment(1, 'Prvý')], 1))
      .mockResolvedValue(page([comment(1, 'Prvý'), comment(2, 'Druhý')], 2));

    render(<FeedPostComments postId={5} onTotalChange={onTotalChange} />);
    await screen.findByText('Prvý');
    expect(onTotalChange).toHaveBeenLastCalledWith(1);

    await tick();

    await waitFor(() => expect(onTotalChange).toHaveBeenLastCalledWith(2));
  });

  it('picks up a fresher like count for a comment already shown', async () => {
    mockedList
      .mockResolvedValueOnce(page([comment(1, 'Prvý', 0)]))
      .mockResolvedValue(page([comment(1, 'Prvý', 7)]));

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Prvý');

    await tick();

    // Prekrývajúce sa id sa NAHRADÍ čerstvou verziou.
    await waitFor(() =>
      expect(screen.getByTestId('feed-comment-like-1')).toHaveTextContent('7'),
    );
  });

  it('stops while the tab is hidden and resumes on return', async () => {
    mockedList.mockResolvedValue(page([comment(1, 'Prvý')]));

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Prvý');
    const afterLoad = mockedList.mock.calls.length;

    setHidden(true);
    await tick(3);
    expect(mockedList.mock.calls.length).toBe(afterLoad);

    setHidden(false);
    await tick();
    expect(mockedList.mock.calls.length).toBeGreaterThan(afterLoad);
  });

  it('stops after a long stretch without interaction', async () => {
    mockedList.mockResolvedValue(page([comment(1, 'Prvý')]));

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Prvý');

    // Prekroč hranicu nečinnosti. Počas tohto okna polling ešte legitímne
    // beží – zaujíma nás až stav PO jeho prekročení.
    await act(async () => {
      jest.advanceTimersByTime(COMMENTS_POLL_IDLE_TIMEOUT_MS);
    });
    const afterIdleReached = mockedList.mock.calls.length;

    await tick(3);
    expect(mockedList.mock.calls.length).toBe(afterIdleReached);

    // …a interakcia sledovanie obnoví.
    await act(async () => {
      window.dispatchEvent(new Event('pointerdown'));
    });
    await tick();
    expect(mockedList.mock.calls.length).toBeGreaterThan(afterIdleReached);
  });

  it('does not lose a comment the user just posted', async () => {
    // userEvent má vlastné čakanie – s fake timermi mu treba dať posúvač,
    // inak sa zablokuje.
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockedList
      .mockResolvedValueOnce(page([comment(1, 'Prvý')]))
      // Po vytvorení je komentár v DB, takže ho ďalší poll vráti – merge ho
      // nesmie zduplikovať ani stratiť.
      .mockResolvedValue(page([comment(1, 'Prvý'), comment(99, 'Môj vlastný')], 2));
    mockedCreate.mockResolvedValue(comment(99, 'Môj vlastný'));

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Prvý');

    await user.type(screen.getByRole('textbox'), 'Môj vlastný');
    await user.click(screen.getByRole('button', { name: 'Pridať' }));
    expect(await screen.findByText('Môj vlastný')).toBeInTheDocument();

    await tick(2);

    // Optimistický komentár prežije aj opakované obnovenie, a to práve raz.
    expect(screen.getAllByText('Môj vlastný')).toHaveLength(1);
    expect(screen.getByText('Prvý')).toBeInTheDocument();
  });

  it('polls two open sections independently', async () => {
    mockedList.mockImplementation(async (postId) =>
      postId === 5
        ? page([comment(51, 'Päť')])
        : page([comment(91, 'Deväť')]),
    );

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
    await screen.findByText('Päť');
    await screen.findByText('Deväť');

    mockedList.mockClear();
    await tick();

    const polledIds = mockedList.mock.calls.map((call) => call[0]).sort();
    // Každá sekcia si pýta VLASTNÝ príspevok.
    expect(polledIds).toEqual([5, 9]);
  });

  it('follows a fresh next cursor instead of re-polling a full page', async () => {
    // Prvá stránka je PLNÁ – komentár pridaný za ňou sa v nej nikdy neobjaví,
    // takže polling musí prevziať nový `next` a dotiahnuť ďalšiu stránku.
    const fullPage = Array.from({ length: 10 }, (_, i) => comment(i + 1, `K${i + 1}`));
    const observer = installFiringObserver();
    try {
      mockedList
        .mockResolvedValueOnce({
          results: fullPage,
          next: null,
          previous: null,
          count: 10,
        })
        // Poll: tá istá plná stránka, ale server už hlási ďalšiu.
        .mockResolvedValueOnce({
          results: fullPage,
          next: 'http://api.test/comments/?cursor=b',
          previous: null,
          count: 11,
        })
        // Donačítanie cez sentinel prinesie 11. komentár.
        .mockResolvedValue({
          results: [comment(11, 'Jedenásty')],
          next: null,
          previous: null,
          count: 11,
        });

      render(<FeedPostComments postId={5} />);
      await screen.findByText('K1');
      expect(screen.queryByTestId('feed-comments-sentinel')).toBeInTheDocument();

      await tick();

      // Poll prevzal nový kurzor → sentinel sa zapol a donačítal.
      await waitFor(() => expect(observer.registry.length).toBeGreaterThan(0));
      await act(async () => {
        observer.registry.forEach((fire) => fire());
      });

      expect(await screen.findByText('Jedenásty')).toBeInTheDocument();
      const cursors = mockedList.mock.calls
        .map((call) => call[1]?.cursorUrl)
        .filter(Boolean);
      expect(cursors).toContain('http://api.test/comments/?cursor=b');
    } finally {
      observer.restore();
    }
  });

  it('drops a comment that someone else deleted', async () => {
    mockedList
      .mockResolvedValueOnce(page([comment(1, 'Ostáva'), comment(2, 'Zmazaný')], 2))
      // Server už druhý nevracia – v rozsahu stránky teda zmizol.
      .mockResolvedValue(page([comment(1, 'Ostáva')], 1));

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Zmazaný');

    await tick();

    await waitFor(() =>
      expect(screen.queryByText('Zmazaný')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Ostáva')).toBeInTheDocument();
  });

  it('does not treat content beyond a full page as deleted', async () => {
    // Plná stránka znamená, že za ňou MÔŽU byť ďalšie komentáre, ktoré táto
    // odpoveď nepokrýva – odstraňovanie zmazaných sa tam nesmie siahať.
    const fullPage = Array.from({ length: 10 }, (_, i) => comment(i + 1, `K${i + 1}`));
    mockedList
      .mockResolvedValueOnce({
        results: [...fullPage, comment(11, 'Za stránkou')],
        next: null,
        previous: null,
        count: 11,
      })
      // Poll vidí len prvú (plnú) stránku.
      .mockResolvedValue({
        results: fullPage,
        next: 'http://api.test/comments/?cursor=b',
        previous: null,
        count: 11,
      });

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Za stránkou');

    await tick();

    expect(screen.getByText('Za stránkou')).toBeInTheDocument();
  });

  it('stops polling once the section is closed', async () => {
    mockedList.mockResolvedValue(page([comment(1, 'Prvý')]));

    const { unmount } = render(<FeedPostComments postId={5} />);
    await screen.findByText('Prvý');

    unmount();
    const afterUnmount = mockedList.mock.calls.length;
    await tick(3);

    // Žiadne requesty na pozadí po zatvorení sekcie.
    expect(mockedList.mock.calls.length).toBe(afterUnmount);
  });

  it('keeps the newest page in view for a long thread', async () => {
    // Vlákno má viac stránok – používateľ si donačítal poslednú, takže
    // polling musí sledovať JU, nie prvú (kde nové komentáre nikdy nie sú).
    mockedList
      .mockResolvedValueOnce({
        results: [comment(1, 'Starý')],
        next: 'http://api.test/comments/?cursor=a',
        previous: null,
        count: 2,
      })
      .mockResolvedValueOnce({
        results: [comment(2, 'Novší')],
        next: null,
        previous: null,
        count: 2,
      })
      .mockResolvedValue({
        results: [comment(2, 'Novší'), comment(3, 'Najnovší')],
        next: null,
        previous: null,
        count: 3,
      });

    const observer = installFiringObserver();
    try {
      render(<FeedPostComments postId={5} />);
      await screen.findByText('Starý');

      // Donačítaj druhú (poslednú) stránku.
      await waitFor(() => expect(observer.registry.length).toBeGreaterThan(0));
      await act(async () => {
        observer.registry.forEach((fire) => fire());
      });
      await screen.findByText('Novší');

      mockedList.mockClear();
      await tick();

      // Polling musí ísť na KURZOR poslednej stránky – prvá stránka nesie
      // najstaršie komentáre, nové by tam nikdy nepribudli.
      const [, params] = mockedList.mock.calls[0];
      expect(params?.cursorUrl).toBe('http://api.test/comments/?cursor=a');
      expect(await screen.findByText('Najnovší')).toBeInTheDocument();
    } finally {
      observer.restore();
    }
  });
});
