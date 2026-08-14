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

/**
 * Falošný server, ktorý REŠPEKTUJE parametre dopytu.
 *
 * Doterajšie mocky vracali pevnú odpoveď bez ohľadu na `pageSize`/`cursorUrl`,
 * takže cez ne prešla chyba G3: polling sa pýtal cez uložený kurzor a ten o
 * ničom pred sebou nevypovedá. Tvary odpovedí sú odpísané zo skutočného behu
 * endpointu (viď accounts/test/test_feed_comment_polling_window.py):
 *  - kurzor nesie POZÍCIU vo vlákne, nie číslo stránky – zmazanie skoršieho
 *    komentára ním teda nepohne,
 *  - `count` sa vracia LEN pri dopyte bez kurzora,
 *  - `page_size` je zhora orezaný na max_page_size = 50.
 */
function createFakeCommentServer(initial: FeedPostComment[]) {
  const store = [...initial];
  const impl = async (
    _postId: number,
    params: { pageSize?: number; cursorUrl?: string | null } = {},
  ) => {
    const query = params.cursorUrl ? new URL(params.cursorUrl).searchParams : null;
    const after = query ? Number(query.get('after')) : null;
    const size = Math.min(
      Number(query?.get('page_size') ?? params.pageSize ?? 20),
      50,
    );
    const from = after === null ? 0 : store.findIndex((item) => item.id > after);
    const slice = from < 0 ? [] : store.slice(from, from + size);
    const last = slice[slice.length - 1];
    const hasNext = last ? store.indexOf(last) < store.length - 1 : false;
    return {
      results: slice,
      next: hasNext
        ? `http://api.test/comments/?after=${last.id}&page_size=${size}`
        : null,
      previous: null,
      count: params.cursorUrl ? undefined : store.length,
    };
  };
  return {
    impl,
    remove: (id: number) => {
      // Bez kontroly by findIndex === -1 poslal splice(-1, 1), čo odstráni
      // POSLEDNÝ prvok – neznáme id by ticho zmazalo niečo iné.
      const index = store.findIndex((comment) => comment.id === id);
      if (index >= 0) store.splice(index, 1);
    },
    add: (item: FeedPostComment) => store.push(item),
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

  it('brings in a comment added beyond a full first page', async () => {
    // Prvá stránka je PLNÁ – 11. komentár je za jej hranicou. Keďže sa polling
    // pýta od začiatku na celé okno + rezervu, príde priamo v odpovedi;
    // sentinel ani donačítavanie na to netreba.
    const fullPage = Array.from({ length: 10 }, (_, i) => comment(i + 1, `K${i + 1}`));
    mockedList
      .mockResolvedValueOnce({
        results: fullPage,
        next: null,
        previous: null,
        count: 10,
      })
      .mockResolvedValue({
        results: [...fullPage, comment(11, 'Jedenásty')],
        next: null,
        previous: null,
        count: 11,
      });

    render(<FeedPostComments postId={5} />);
    await screen.findByText('K1');

    await tick();

    expect(await screen.findByText('Jedenásty')).toBeInTheDocument();
    // Žiadny dopyt pollingu nesmie ísť cez uložený kurzor.
    expect(
      mockedList.mock.calls.slice(1).every((call) => !call[1]?.cursorUrl),
    ).toBe(true);
  });

  /** Vlákno s 15 komentármi, používateľ si doscrolloval poslednú stránku. */
  async function renderLongThread(onTotalChange: jest.Mock = jest.fn()) {
    const server = createFakeCommentServer(
      Array.from({ length: 15 }, (_, i) => comment(i + 1, `K${i + 1}`)),
    );
    mockedList.mockImplementation(server.impl);
    const observer = installFiringObserver();
    render(<FeedPostComments postId={5} onTotalChange={onTotalChange} />);
    await screen.findByText('K1');
    await waitFor(() => expect(observer.registry.length).toBeGreaterThan(0));
    await act(async () => {
      observer.registry.forEach((fire) => fire());
    });
    await screen.findByText('K15');
    return { server, observer };
  }

  it('drops a comment deleted on an EARLIER page than the last one loaded', async () => {
    // REGRESIA G3 z manuálneho testu na produkcii: 15 komentárov, používateľ
    // si donačítal druhú stránku, niekto zmazal komentár z PRVEJ.
    // Polling cez uložený kurzor videl len [11..15] a o ničom pred tým
    // nevedel, takže zmazaný komentár ostal na obrazovke až do reloadu.
    const { server, observer } = await renderLongThread();
    try {
      expect(screen.getByText('K7')).toBeInTheDocument();

      server.remove(7);
      await tick();

      await waitFor(() => expect(screen.queryByText('K7')).not.toBeInTheDocument());
      // Zvyšok okna ostáva – odstránil sa presne ten jeden.
      expect(screen.getByText('K1')).toBeInTheDocument();
      expect(screen.getByText('K15')).toBeInTheDocument();
    } finally {
      observer.restore();
    }
  });

  it('drops a comment deleted at the very start of the thread', async () => {
    // Hraničný prípad k predošlému: zmazanie na SAMOM začiatku okna.
    const { server, observer } = await renderLongThread();
    try {
      server.remove(1);
      await tick();

      await waitFor(() => expect(screen.queryByText('K1')).not.toBeInTheDocument());
      expect(screen.getByText('K2')).toBeInTheDocument();
      expect(screen.getByText('K15')).toBeInTheDocument();
    } finally {
      observer.restore();
    }
  });

  it('asks for the whole loaded window, not just the last page', async () => {
    const { observer } = await renderLongThread();
    try {
      mockedList.mockClear();
      await tick();

      // 15 načítaných + rezerva jednej stránky pre nové komentáre, bez kurzora.
      expect(mockedList).toHaveBeenCalledWith(5, { pageSize: 25 });
    } finally {
      observer.restore();
    }
  });

  it('adds a new comment to a long thread the user has fully scrolled', async () => {
    const { server, observer } = await renderLongThread();
    try {
      server.add(comment(16, 'K16'));
      await tick();

      expect(await screen.findByText('K16')).toBeInTheDocument();
      expect(screen.getByText('K1')).toBeInTheDocument();
    } finally {
      observer.restore();
    }
  });

  it('never asks for more than the page size the backend allows', async () => {
    // Väčšiu hodnotu BE ticho oreže; potom by odpoveď nepokryla, čo si FE
    // myslí, že si vypýtal.
    const many = Array.from({ length: 45 }, (_, i) => comment(i + 1, `K${i + 1}`));
    mockedList.mockResolvedValue({
      results: many,
      next: 'http://api.test/comments/?cursor=z',
      previous: null,
      count: 200,
    });

    render(<FeedPostComments postId={5} />);
    await screen.findByText('K1');

    mockedList.mockClear();
    await tick();

    expect(mockedList).toHaveBeenCalledWith(5, { pageSize: 50 });
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

  it('does not treat content beyond the polled range as deleted', async () => {
    // Odpoveď s `next` znamená, že za ňou MÔŽU byť ďalšie komentáre, ktoré
    // nepokrýva – odstraňovanie zmazaných tam nesmie siahať.
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

  /**
   * jsdom nemá layout – rozmery scrollovacieho boxu nastavíme ručne, aby sa
   * dalo rozlíšiť „číta pri spodku" od „číta vyššie".
   */
  function setScrollPosition({
    scrollTop,
    scrollHeight = 1000,
    clientHeight = 400,
  }: {
    scrollTop: number;
    scrollHeight?: number;
    clientHeight?: number;
  }) {
    const node = screen.getByTestId('feed-comments-scroll');
    Object.defineProperty(node, 'scrollHeight', {
      value: scrollHeight,
      configurable: true,
    });
    Object.defineProperty(node, 'clientHeight', {
      value: clientHeight,
      configurable: true,
    });
    node.scrollTop = scrollTop;
    node.scrollTo = jest.fn() as unknown as typeof node.scrollTo;
    return node;
  }

  it('scrolls to a new comment when the user is already at the bottom', async () => {
    mockedList
      .mockResolvedValueOnce(page([comment(1, 'Prvý')]))
      .mockResolvedValue(page([comment(1, 'Prvý'), comment(2, 'Nový')], 2));

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Prvý');
    // 1000 - 600 - 400 = 0 px od spodku.
    const node = setScrollPosition({ scrollTop: 600 });

    await tick();
    await screen.findByText('Nový');

    expect(node.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth' }),
    );
    // Pri spodku indikátor nemá čo hlásiť.
    expect(
      screen.queryByTestId('feed-comments-new-indicator'),
    ).not.toBeInTheDocument();
  });

  it('shows an indicator instead of moving the view when reading higher up', async () => {
    mockedList
      .mockResolvedValueOnce(page([comment(1, 'Prvý')]))
      .mockResolvedValue(page([comment(1, 'Prvý'), comment(2, 'Nový')], 2));

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Prvý');
    // 1000 - 0 - 400 = 600 px od spodku → používateľ číta vyššie.
    const node = setScrollPosition({ scrollTop: 0 });

    await tick();
    await screen.findByText('Nový');

    const indicator = await screen.findByTestId('feed-comments-new-indicator');
    expect(indicator).toHaveTextContent('1 nový komentár');
    // Pohľad sa NEPOSUNUL.
    expect(node.scrollTo).not.toHaveBeenCalled();

    // Klik na indikátor doscrolluje a upozornenie zmizne.
    await act(async () => {
      indicator.click();
    });
    expect(node.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth' }),
    );
    await waitFor(() =>
      expect(
        screen.queryByTestId('feed-comments-new-indicator'),
      ).not.toBeInTheDocument(),
    );
  });

  it('counts several comments that arrived across polls', async () => {
    mockedList
      .mockResolvedValueOnce(page([comment(1, 'Prvý')]))
      .mockResolvedValueOnce(page([comment(1, 'Prvý'), comment(2, 'A')], 2))
      .mockResolvedValueOnce(
        page([comment(1, 'Prvý'), comment(2, 'A'), comment(3, 'B')], 3),
      )
      .mockResolvedValue(
        page(
          [comment(1, 'Prvý'), comment(2, 'A'), comment(3, 'B'), comment(4, 'C')],
          4,
        ),
      );

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Prvý');
    setScrollPosition({ scrollTop: 0 });

    await tick(3);
    await screen.findByText('C');

    // 3 → tvar pre 2–4.
    expect(
      await screen.findByTestId('feed-comments-new-indicator'),
    ).toHaveTextContent('3 nové komentáre');
  });

  it('clears the indicator once the user scrolls to the bottom', async () => {
    mockedList
      .mockResolvedValueOnce(page([comment(1, 'Prvý')]))
      .mockResolvedValue(page([comment(1, 'Prvý'), comment(2, 'Nový')], 2));

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Prvý');
    const node = setScrollPosition({ scrollTop: 0 });

    await tick();
    await screen.findByTestId('feed-comments-new-indicator');

    await act(async () => {
      node.scrollTop = 600;
      node.dispatchEvent(new Event('scroll', { bubbles: true }));
    });

    await waitFor(() =>
      expect(
        screen.queryByTestId('feed-comments-new-indicator'),
      ).not.toBeInTheDocument(),
    );
  });

  it('keeps the live region mounted so screen readers can hear the update', async () => {
    mockedList
      .mockResolvedValueOnce(page([comment(1, 'Prvý')]))
      .mockResolvedValue(page([comment(1, 'Prvý'), comment(2, 'Nový')], 2));

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Prvý');
    setScrollPosition({ scrollTop: 0 });

    // Región musí existovať UŽ PRED zmenou – aria-live na uzle, ktorý sa
    // objaví až s oznámením, čítačka spoľahlivo neohlási.
    const announcer = screen.getByTestId('feed-comments-new-announcer');
    expect(announcer).toHaveAttribute('aria-live', 'polite');
    expect(announcer).toBeEmptyDOMElement();

    await tick();

    await waitFor(() => expect(announcer).toHaveTextContent('1 nový komentár'));
    // Ten istý uzol, nie novo vložený.
    expect(screen.getByTestId('feed-comments-new-announcer')).toBe(announcer);
  });

  it('does not rewind pagination when loadMore finished during a poll', async () => {
    // Kým poll čaká na odpoveď, používateľ si donačíta ďalšie dve stránky.
    // Odpoveď pollu je postavená na kratšom okne, takže jej `next` ukazuje
    // dozadu – prevziať ho by znamenalo stiahnuť už načítanú stránku znova.
    const server = createFakeCommentServer(
      Array.from({ length: 40 }, (_, i) => comment(i + 1, `K${i + 1}`)),
    );
    const releasePoll: Array<() => void> = [];
    let requestsWithoutCursor = 0;
    mockedList.mockImplementation((postId: number, params = {}) => {
      const response = server.impl(postId, params);
      if (!params.cursorUrl) {
        requestsWithoutCursor += 1;
        // 1. = počiatočné načítanie, 2. = poll → ten podržíme.
        if (requestsWithoutCursor === 2) {
          return new Promise((resolve) => releasePoll.push(() => resolve(response)));
        }
      }
      return response;
    });

    const observer = installFiringObserver();
    try {
      render(<FeedPostComments postId={5} />);
      await screen.findByText('K1');

      await tick();
      expect(releasePoll).toHaveLength(1);

      await act(async () => {
        observer.registry.forEach((fire) => fire());
      });
      await screen.findByText('K20');
      await act(async () => {
        observer.registry.forEach((fire) => fire());
      });
      await screen.findByText('K30');

      await act(async () => {
        releasePoll[0]();
      });

      mockedList.mockClear();
      await act(async () => {
        observer.registry.forEach((fire) => fire());
      });

      const cursors = mockedList.mock.calls
        .map((call) => call[1]?.cursorUrl)
        .filter(Boolean) as string[];
      expect(cursors[0]).toContain('after=30');
      expect(cursors[0]).not.toContain('after=20');
    } finally {
      observer.restore();
    }
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

  it('keeps a long thread whole while adding what is new at the end', async () => {
    // Viac stránok: používateľ si donačítal poslednú. Nový komentár musí
    // pribudnúť a zároveň nesmie zmiznúť nič z už načítaného okna.
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
        count: undefined,
      })
      .mockResolvedValue({
        results: [comment(1, 'Starý'), comment(2, 'Novší'), comment(3, 'Najnovší')],
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

      expect(await screen.findByText('Najnovší')).toBeInTheDocument();
      expect(screen.getByText('Starý')).toBeInTheDocument();
      expect(screen.getByText('Novší')).toBeInTheDocument();
    } finally {
      observer.restore();
    }
  });

  it('keeps the counter fresh even after the user loaded more pages', async () => {
    // `count` vracia BE LEN pri dopyte bez kurzora. Kým polling chodil cez
    // uložený kurzor, číslo pri ikone sa každému, kto si donačítal ďalšiu
    // stránku, prestalo aktualizovať – falošný server to isté pravidlo drží.
    const onTotalChange = jest.fn();
    const { server, observer } = await renderLongThread(onTotalChange);
    try {
      expect(onTotalChange).toHaveBeenLastCalledWith(15);

      server.remove(3);
      await tick();

      await waitFor(() => expect(onTotalChange).toHaveBeenLastCalledWith(14));
    } finally {
      observer.restore();
    }
  });
});
