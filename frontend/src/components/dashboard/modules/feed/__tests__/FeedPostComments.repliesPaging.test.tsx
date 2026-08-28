/**
 * Zbalené odpovede, ich donačítavanie a zvýraznenie cez oboje.
 *
 * Overuje sa: predvolene zbalené vlákno s počtom z `replies_count`, lokálnosť
 * rozbalenia (per komentár, nie pre celý zoznam), rozbalenie bez requestu,
 * donačítanie zvyšku cez samostatné tlačidlo a hľadanie komentára
 * z notifikácie aj vtedy, keď leží v zbalenom alebo ešte nenačítanom vlákne.
 */

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostComments from '../FeedPostComments';
import { installFiringIntersectionObserver } from '../feedObserverTestUtils';
import { COMMENTS_POLL_INTERVAL_MS } from '../useFeedCommentsPolling';
import {
  listFeedCommentReplies,
  listFeedPostComments,
  type FeedPostComment,
} from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  listFeedPostComments: jest.fn(),
  listFeedCommentReplies: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
  listFeedCommentLikers: jest.fn(),
}));

const toastError = jest.fn();
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: (...args: unknown[]) => toastError(...args),
    success: jest.fn(),
  },
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
const mockedReplies = listFeedCommentReplies as jest.MockedFunction<
  typeof listFeedCommentReplies
>;

const author = {
  id: 1,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

function comment(
  id: number,
  text: string,
  replies: FeedPostComment[] = [],
  repliesCount = replies.length,
): FeedPostComment {
  return {
    id,
    text,
    author,
    can_delete: false,
    likes_count: 0,
    is_liked_by_me: false,
    parent_comment_id: null,
    replies,
    replies_count: repliesCount,
    created_at: '2026-01-01',
  } as FeedPostComment;
}

function reply(id: number, text: string, parentId: number): FeedPostComment {
  return {
    id,
    text,
    author,
    can_delete: false,
    likes_count: 0,
    is_liked_by_me: false,
    parent_comment_id: parentId,
    created_at: '2026-01-02',
  } as FeedPostComment;
}

/** Náhľad: 10 NAJNOVŠÍCH odpovedí, presne ako ich posiela backend. */
function preview(parentId: number, newest = 110): FeedPostComment[] {
  return Array.from({ length: 10 }, (_, i) =>
    reply(newest - i, `Odpoveď ${newest - i}`, parentId),
  );
}

function page(results: FeedPostComment[], count?: number) {
  return {
    results,
    next: null,
    previous: null,
    count: count ?? results.length,
  };
}

let observer: ReturnType<typeof installFiringIntersectionObserver>;

beforeEach(() => {
  jest.clearAllMocks();
  mockedReplies.mockReset();
  toastError.mockReset();
  observer = installFiringIntersectionObserver();
});

afterEach(() => {
  observer.restore();
});

/** Doscrollovanie na koniec vlákna – to spúšťa donačítanie starších. */
async function reachReplySentinel(commentId: number) {
  await act(async () => {
    observer.fire(`feed-comment-replies-sentinel-${commentId}`);
  });
}

// --- Časť B: zbalené vlákno -------------------------------------------------

describe('zbalené odpovede', () => {
  it('keeps replies collapsed and shows the total from replies_count', async () => {
    mockedList.mockResolvedValue(
      page([comment(1, 'Hlavný', preview(1), 15)], 16),
    );

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Hlavný');

    // Vlákno je zbalené, aj keď náhľad odpovedí už v appke je.
    expect(
      screen.queryByTestId('feed-comment-replies-1'),
    ).not.toBeInTheDocument();
    // Číslo je CELKOVÉ (15), nie počet doručených (10).
    expect(screen.getByTestId('feed-comment-toggle-replies-1')).toHaveTextContent(
      'Zobraziť odpovede (15)',
    );
  });

  it('expands from the data it already has, without a request', async () => {
    mockedList.mockResolvedValue(page([comment(1, 'Hlavný', preview(1), 10)], 11));

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Hlavný');

    await userEvent.click(screen.getByTestId('feed-comment-toggle-replies-1'));

    const nested = screen.getByTestId('feed-comment-replies-1');
    expect(within(nested).getAllByText(/^Odpoveď 1/)).toHaveLength(10);
    // Rozbalenie je len prepnutie zobrazenia – nič sa nedoťahuje.
    expect(mockedReplies).not.toHaveBeenCalled();
  });

  it('collapses again on a second click', async () => {
    mockedList.mockResolvedValue(page([comment(1, 'Hlavný', preview(1), 10)], 11));

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Hlavný');
    const toggle = screen.getByTestId('feed-comment-toggle-replies-1');

    await userEvent.click(toggle);
    expect(toggle).toHaveTextContent('Skryť odpovede');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(toggle);
    expect(
      screen.queryByTestId('feed-comment-replies-1'),
    ).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps the expanded state per comment', async () => {
    mockedList.mockResolvedValue(
      page(
        [
          comment(1, 'Prvý', [reply(11, 'Odpoveď na prvý', 1)]),
          comment(2, 'Druhý', [reply(22, 'Odpoveď na druhý', 2)]),
        ],
        4,
      ),
    );

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Prvý');

    await userEvent.click(screen.getByTestId('feed-comment-toggle-replies-1'));

    // Rozbalenie sa týka len toho komentára, na ktorý sa kliklo.
    expect(screen.getByText('Odpoveď na prvý')).toBeInTheDocument();
    expect(screen.queryByText('Odpoveď na druhý')).not.toBeInTheDocument();
  });

  it('offers no expand action when there are no replies', async () => {
    mockedList.mockResolvedValue(page([comment(1, 'Bez odpovedí')], 1));

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Bez odpovedí');

    // Ostáva len „Odpovedať" – prázdne vlákno nie je čo otvárať.
    expect(screen.getByTestId('feed-comment-reply-1')).toBeInTheDocument();
    expect(
      screen.queryByTestId('feed-comment-toggle-replies-1'),
    ).not.toBeInTheDocument();
  });
});

// --- Časť C: donačítanie zvyšku --------------------------------------------

describe('donačítanie odpovedí', () => {
  it('offers a manual fallback only where IntersectionObserver is missing', async () => {
    mockedList.mockResolvedValue(
      page([comment(1, 'Hlavný', preview(1), 12)], 13),
    );
    mockedReplies.mockResolvedValue({
      results: [reply(100, 'Predposledná', 1), reply(99, 'Posledná', 1)],
      next: null,
      previous: null,
    });
    // Prostredie bez observera – sentinel sa nemá ako pretnúť.
    observer.restore();
    const original = (global as unknown as { IntersectionObserver: unknown })
      .IntersectionObserver;
    (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
      undefined;

    try {
      render(<FeedPostComments postId={5} />);
      await screen.findByText('Hlavný');
      await userEvent.click(screen.getByTestId('feed-comment-toggle-replies-1'));

      const fallback = await screen.findByTestId(
        'feed-comment-replies-sentinel-1-fallback',
      );
      await userEvent.click(fallback);

      expect(mockedReplies).toHaveBeenCalledWith(5, 1, {
        after: 101,
        pageSize: 10,
      });
      expect(await screen.findByText('Posledná')).toBeInTheDocument();
    } finally {
      (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
        original;
    }
  });

  it('shows no button in a normal environment', async () => {
    mockedList.mockResolvedValue(
      page([comment(1, 'Hlavný', preview(1), 12)], 13),
    );

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Hlavný');
    await userEvent.click(screen.getByTestId('feed-comment-toggle-replies-1'));

    // S observerom ostáva výhradne automatické donačítanie pri scrollovaní.
    expect(
      screen.getByTestId('feed-comment-replies-sentinel-1'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('feed-comment-replies-sentinel-1-fallback'),
    ).not.toBeInTheDocument();
  });

  it('loads the older ones by itself when the reader reaches the end', async () => {
    mockedList.mockResolvedValue(
      page([comment(1, 'Hlavný', preview(1), 12)], 13),
    );
    mockedReplies.mockResolvedValue({
      results: [reply(100, 'Predposledná', 1), reply(99, 'Posledná', 1)],
      next: null,
      previous: null,
    });

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Hlavný');

    // Kým je vlákno zbalené, nie je čo donačítavať – sentinel neexistuje.
    expect(
      screen.queryByTestId('feed-comment-replies-sentinel-1'),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('feed-comment-toggle-replies-1'));
    expect(
      screen.getByTestId('feed-comment-replies-sentinel-1'),
    ).toBeInTheDocument();
    // Žiadne tlačidlo – doplní sa samo pri scrollovaní.
    expect(
      screen.queryByTestId('feed-comment-more-replies-1'),
    ).not.toBeInTheDocument();

    await reachReplySentinel(1);

    // Pokračuje sa PRESNE za najstaršou doručenou odpoveďou.
    expect(mockedReplies).toHaveBeenCalledWith(5, 1, {
      after: 101,
      pageSize: 10,
    });
    expect(await screen.findByText('Posledná')).toBeInTheDocument();
    expect(screen.getByText('Predposledná')).toBeInTheDocument();
    // Náhľad ostáva – donačítané sa pridáva, nie nahrádza.
    expect(screen.getByText('Odpoveď 110')).toBeInTheDocument();
    // Po dobratí vlákna sentinel zmizne.
    await waitFor(() =>
      expect(
        screen.queryByTestId('feed-comment-replies-sentinel-1'),
      ).not.toBeInTheDocument(),
    );
  });

  it('keeps loaded replies when polling brings only the preview', async () => {
    jest.useFakeTimers();
    try {
      mockedList.mockResolvedValue(
        page([comment(1, 'Hlavný', preview(1), 12)], 13),
      );
      mockedReplies.mockResolvedValue({
        results: [reply(100, 'Predposledná', 1), reply(99, 'Posledná', 1)],
        next: null,
        previous: null,
      });

      render(<FeedPostComments postId={5} />);
      await screen.findByText('Hlavný');
      await act(async () => {
        screen.getByTestId('feed-comment-toggle-replies-1').click();
      });
      await reachReplySentinel(1);
      expect(await screen.findByText('Posledná')).toBeInTheDocument();

      await act(async () => {
        jest.advanceTimersByTime(COMMENTS_POLL_INTERVAL_MS + 50);
      });

      // Polling nesie len náhľad (10 najnovších). Keby rodiča prepísal celého,
      // používateľ by prišiel o staršie, ktoré si sám donačítal.
      expect(screen.getByText('Posledná')).toBeInTheDocument();
      expect(screen.getByText('Predposledná')).toBeInTheDocument();
      expect(screen.getByText('Odpoveď 110')).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it('reports a failed manual load instead of swallowing it', async () => {
    mockedList.mockResolvedValue(
      page([comment(1, 'Hlavný', preview(1), 12)], 13),
    );
    mockedReplies.mockRejectedValue(new Error('offline'));

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Hlavný');
    await userEvent.click(screen.getByTestId('feed-comment-toggle-replies-1'));
    await reachReplySentinel(1);

    // Donačítanie pri scrollovaní je vedomé čítanie – zlyhanie sa nesmie
    // stratiť (na rozdiel od hľadania z notifikácie, ktoré beží na pozadí).
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('Odpovede sa nepodarilo načítať.'),
    );
    // Sentinel ostáva, takže sa dá skúsiť znova.
    expect(
      screen.getByTestId('feed-comment-replies-sentinel-1'),
    ).toBeInTheDocument();
  });

  it('offers nothing more when the preview already covers the thread', async () => {
    mockedList.mockResolvedValue(
      page([comment(1, 'Hlavný', [reply(11, 'Jediná', 1)], 1)], 2),
    );

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Hlavný');
    await userEvent.click(screen.getByTestId('feed-comment-toggle-replies-1'));

    expect(screen.getByText('Jediná')).toBeInTheDocument();
    expect(
      screen.queryByTestId('feed-comment-more-replies-1'),
    ).not.toBeInTheDocument();
  });
});

// --- Časť D: zvýraznenie cez zbalené aj nenačítané vlákno -------------------

describe('zvýraznenie z notifikácie', () => {
  const scrollIntoView = jest.fn();

  beforeEach(() => {
    scrollIntoView.mockClear();
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      value: scrollIntoView,
      configurable: true,
      writable: true,
    });
  });

  function highlightClass(id: number) {
    return document.querySelector(`[data-comment-id="${id}"]`)?.className ?? '';
  }

  it('expands the one thread that holds the target reply', async () => {
    mockedList.mockResolvedValue(
      page(
        [
          comment(1, 'Prvý', [reply(11, 'Hľadaná odpoveď', 1)]),
          comment(2, 'Druhý', [reply(22, 'Cudzia odpoveď', 2)]),
        ],
        4,
      ),
    );

    render(<FeedPostComments postId={5} highlightCommentId={11} />);

    expect(await screen.findByText('Hľadaná odpoveď')).toBeInTheDocument();
    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalled();
      expect(highlightClass(11)).toContain('bg-purple-100/80');
    });
    // Ostatné vlákna sa neotvárajú – rozbalí sa len to jedno.
    expect(screen.queryByText('Cudzia odpoveď')).not.toBeInTheDocument();
    // Cieľ už bol v appke, takže sa nič nedoťahovalo.
    expect(mockedReplies).not.toHaveBeenCalled();
  });

  it('fetches further batches until the target reply shows up', async () => {
    mockedList.mockResolvedValue(
      page([comment(1, 'Hlavný', preview(1), 15)], 16),
    );
    // Server dáva po dvoch smerom k STARŠÍM – cieľ (98) je až v druhej dávke.
    mockedReplies
      .mockResolvedValueOnce({
        results: [reply(100, 'Stotina', 1), reply(99, 'Deväťdesiatdeviata', 1)],
        next: null,
        previous: null,
      })
      .mockResolvedValueOnce({
        results: [reply(98, 'Hľadaná', 1), reply(97, 'Najstaršia', 1)],
        next: null,
        previous: null,
      });

    render(<FeedPostComments postId={5} highlightCommentId={98} />);

    expect(await screen.findByText('Hľadaná')).toBeInTheDocument();
    await waitFor(() => expect(highlightClass(98)).toContain('bg-purple-100/80'));
    expect(scrollIntoView).toHaveBeenCalled();
    // Dve dávky, každá presne za predchádzajúcou – bez duplicít a bez dier.
    expect(mockedReplies).toHaveBeenCalledTimes(2);
    expect(mockedReplies).toHaveBeenNthCalledWith(1, 5, 1, {
      after: 101,
      pageSize: 10,
    });
    expect(mockedReplies).toHaveBeenNthCalledWith(2, 5, 1, {
      after: 99,
      pageSize: 10,
    });
  });

  it('gives up after a failed batch instead of retrying forever', async () => {
    mockedList.mockResolvedValue(
      page([comment(1, 'Hlavný', preview(1), 15)], 16),
    );
    mockedReplies.mockRejectedValue(new Error('sieť'));

    render(<FeedPostComments postId={5} highlightCommentId={98} />);
    await screen.findByText('Hlavný');

    await waitFor(() => expect(mockedReplies).toHaveBeenCalledTimes(1));
    // Hľadanie beží na pozadí – používateľa neotravuje chybou.
    expect(toastError).not.toHaveBeenCalled();
    // Chvíľa navyše: keby sa hľadanie reštartovalo, počet by narástol.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockedReplies).toHaveBeenCalledTimes(1);
    // Zoznam ostáva použiteľný, len bez skoku.
    expect(screen.getByTestId('feed-comment-toggle-replies-1')).toBeVisible();
  });

  it('handles a top-level target without touching reply threads', async () => {
    mockedList.mockResolvedValue(
      page(
        [
          comment(1, 'Hlavný', preview(1), 15),
          comment(200, 'Hľadaný komentár'),
        ],
        17,
      ),
    );

    render(<FeedPostComments postId={5} highlightCommentId={200} />);
    await screen.findByText('Hľadaný komentár');

    await waitFor(() => expect(highlightClass(200)).toContain('bg-purple-100/80'));
    expect(scrollIntoView).toHaveBeenCalled();
    // Vrcholový cieľ je priamo v zozname – vlákna sa nedoťahujú ani neotvárajú.
    expect(mockedReplies).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId('feed-comment-replies-1'),
    ).not.toBeInTheDocument();
  });
});
