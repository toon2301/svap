/**
 * Medzery v testoch načítania, pollingu a donačítavania komentárov (K38 a K41, mutácie C3, D6, LD2, LD3, D5, LM2 a R4;
 * R6 a R7 spolu a kostra odpovedí (LR4, W5) tu majú priamu kontrolu, hoci ich už zachytávali testy pozastavenia).
 *
 * Overuje sa správanie, ktoré dnes stráži len čítanie kódu: prechod na iný príspevok na tej istej inštancii (načíta sa
 * nanovo, začína s „Načítavam...“ a bez chyby po predchádzajúcom príspevku, polling sa po zmiznutom príspevku zapne znova
 * a hranica „už videné“ sa počíta odznova), súbežné donačítania pošlú jeden dopyt, polling dlhého zoznamu nevráti
 * stránkovanie späť, odpoveď dotiahnutá so staršou stránkou sa pri súbežnom pollingu neohlási ako nová (obe odpovede
 * dobehnú v jednom `act`, teda skôr, než React zoznam prekreslí), ten istý nový komentár sa pri ďalšom pollingu neohlási
 * dvakrát a donačítavanie odpovedí ukazuje kostru.
 *
 * Testy používajú len verejné rozhranie komponentu (DOM, `data-testid`, volania atrap `feedApi`) a mockujú len vonkajšie
 * moduly.
 */

import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedPostComments from '../FeedPostComments';
import { installFiringIntersectionObserver } from '../feedObserverTestUtils';
import { COMMENTS_POLL_INTERVAL_MS } from '../useFeedCommentsPolling';
import {
  listFeedCommentReplies,
  listFeedPostComments,
  type FeedCommentPage,
  type FeedPostComment,
} from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  getFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(),
  listFeedCommentReplies: jest.fn(),
  createFeedPostComment: jest.fn(),
  updateFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
  listFeedCommentLikers: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback }),
}));

jest.mock('../../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: () => null,
}));

const mockedList = listFeedPostComments as jest.MockedFunction<typeof listFeedPostComments>;
const mockedReplies = listFeedCommentReplies as jest.MockedFunction<typeof listFeedCommentReplies>;

const LOAD_ERROR = 'Komentáre sa nepodarilo načítať.';
const author = { id: 1, display_name: 'Jana', slug: 'jana', user_type: 'individual', avatar_url: null };

function comment(id: number, text: string, overrides: Partial<FeedPostComment> = {}): FeedPostComment {
  return {
    id,
    text,
    author,
    can_delete: false,
    can_edit: false,
    likes_count: 0,
    is_liked_by_me: false,
    parent_comment_id: null,
    replies: [],
    replies_count: 0,
    created_at: '2026-01-01',
    ...overrides,
  } as FeedPostComment;
}

function page(results: FeedPostComment[], next: string | null = null): FeedCommentPage {
  return { results, next, previous: null, count: results.length };
}

function networkError() {
  return new Error('Network Error');
}

/** Sľub, ktorý dokončí až test: určuje okamih, kedy odpovie server. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function pollOnce() {
  await act(async () => {
    jest.advanceTimersByTime(COMMENTS_POLL_INTERVAL_MS + 50);
  });
  await flush();
}

/** jsdom nemá layout, preto sa rozmery a poloha scrollovacieho boxu nastavujú ručne. */
function readFarFromTop() {
  const node = screen.getByTestId('feed-comments-scroll');
  Object.defineProperty(node, 'scrollHeight', { value: 1000, configurable: true });
  Object.defineProperty(node, 'clientHeight', { value: 400, configurable: true });
  node.scrollTop = 600;
  node.scrollTo = jest.fn() as unknown as typeof node.scrollTo;
}

function cursorRequests() {
  return mockedList.mock.calls.filter(([, options]) => Boolean(options?.cursorUrl));
}

describe('FeedPostComments – prechod na iný príspevok na tej istej inštancii', () => {
  beforeEach(() => {
    mockedList.mockReset();
    mockedReplies.mockReset();
  });

  it('načíta iný príspevok nanovo a ukáže jeho zoznam namiesto starého', async () => {
    mockedList.mockImplementation((postId) =>
      Promise.resolve(page([postId === 5 ? comment(1, 'Príspevok A') : comment(2, 'Príspevok B')])),
    );
    const { rerender } = render(<FeedPostComments postId={5} />);
    await screen.findByText('Príspevok A');

    rerender(<FeedPostComments postId={6} />);

    expect(await screen.findByText('Príspevok B')).toBeInTheDocument();
    expect(screen.queryByText('Príspevok A')).not.toBeInTheDocument();
    expect(mockedList).toHaveBeenLastCalledWith(6, expect.anything());
  });

  it('počas načítania iného príspevku ukáže „Načítavam...“ namiesto starého zoznamu', async () => {
    const second = deferred<FeedCommentPage>();
    mockedList.mockImplementation((postId) =>
      postId === 5 ? Promise.resolve(page([comment(1, 'Príspevok A')])) : second.promise,
    );
    const { rerender } = render(<FeedPostComments postId={5} />);
    await screen.findByText('Príspevok A');

    rerender(<FeedPostComments postId={6} />);

    expect(screen.getByText('Načítavam...')).toBeInTheDocument();
    expect(screen.queryByText('Príspevok A')).not.toBeInTheDocument();

    await act(async () => second.resolve(page([comment(2, 'Príspevok B')])));
    expect(screen.getByText('Príspevok B')).toBeInTheDocument();
    expect(screen.queryByText('Načítavam...')).not.toBeInTheDocument();
  });

  it('chyba načítania predchádzajúceho príspevku zmizne, keď sa načíta ďalší', async () => {
    mockedList.mockImplementation((postId) =>
      postId === 5 ? Promise.reject(networkError()) : Promise.resolve(page([comment(2, 'Príspevok B')])),
    );
    const { rerender } = render(<FeedPostComments postId={5} />);
    expect(await screen.findByText(LOAD_ERROR)).toBeInTheDocument();

    rerender(<FeedPostComments postId={6} />);

    expect(await screen.findByText('Príspevok B')).toBeInTheDocument();
    expect(screen.queryByText(LOAD_ERROR)).not.toBeInTheDocument();
  });
});

describe('FeedPostComments – polling po prechode na iný príspevok', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    mockedList.mockReset();
    mockedReplies.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('po zmiznutom príspevku sa pre iný príspevok polling zapne znova', async () => {
    mockedList
      .mockRejectedValueOnce({ response: { status: 404, data: {} } })
      .mockResolvedValue(page([comment(2, 'Príspevok B')]));
    const { rerender } = render(<FeedPostComments postId={5} />);
    await flush();
    expect(mockedList).toHaveBeenCalledTimes(1);

    rerender(<FeedPostComments postId={6} />);
    await flush();
    expect(screen.getByText('Príspevok B')).toBeInTheDocument();
    expect(mockedList).toHaveBeenCalledTimes(2);

    // Zmiznutý príspevok polling vypol; nový príspevok ho má mať zapnutý.
    await pollOnce();
    expect(mockedList).toHaveBeenCalledTimes(3);
    expect(mockedList).toHaveBeenLastCalledWith(6, expect.anything());
  });

  it('hranica „už videné“ sa pri inom príspevku počíta odznova', async () => {
    mockedList
      .mockResolvedValueOnce(page([comment(1000, 'Starý príspevok')]))
      .mockResolvedValueOnce(page([comment(50, 'Nižšie id')]))
      .mockResolvedValue(page([comment(60, 'Nový komentár'), comment(50, 'Nižšie id')]));
    const { rerender } = render(<FeedPostComments postId={5} />);
    await flush();

    rerender(<FeedPostComments postId={6} />);
    await flush();
    expect(screen.getByText('Nižšie id')).toBeInTheDocument();
    readFarFromTop();

    // Nový komentár má nižšie id než najvyššie id predchádzajúceho príspevku, no je novší než čokoľvek v tomto.
    await pollOnce();

    expect(screen.getByTestId('feed-comments-new-indicator')).toHaveTextContent('1 nový komentár');
  });
});

describe('FeedPostComments – donačítavanie a polling dlhého zoznamu', () => {
  let observer: ReturnType<typeof installFiringIntersectionObserver>;

  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    mockedList.mockReset();
    mockedReplies.mockReset();
    observer = installFiringIntersectionObserver();
  });

  afterEach(() => {
    observer.restore();
    jest.useRealTimers();
  });

  it('dva súbežné podnety na donačítanie pošlú len jeden dopyt', async () => {
    const more = deferred<FeedCommentPage>();
    mockedList.mockImplementation((_postId, options) =>
      options?.cursorUrl
        ? more.promise
        : Promise.resolve(page(Array.from({ length: 10 }, (_unused, index) => comment(100 - index, `K${100 - index}`)), 'CURSOR')),
    );
    render(<FeedPostComments postId={5} />);
    await flush();
    expect(screen.getByText('K100')).toBeInTheDocument();

    await act(async () => {
      observer.fire('feed-comments-sentinel');
      observer.fire('feed-comments-sentinel');
    });

    expect(cursorRequests()).toHaveLength(1);
    await act(async () => more.resolve(page([])));
  });

  it('polling zoznamu nad stropom okna nevráti stránkovanie späť', async () => {
    const loaded = Array.from({ length: 60 }, (_unused, index) => comment(1000 - index, `K${1000 - index}`));
    mockedList.mockImplementation((_postId, options) => {
      if (options?.cursorUrl) return Promise.resolve(page([]));
      // Polling pýta okno najviac 50 komentárov, takže jeho kurzor ukazuje doprostred už načítaného zoznamu.
      if (options?.pageSize === 50) return Promise.resolve({ results: loaded.slice(0, 50), next: 'MID', previous: null, count: 60 });
      return Promise.resolve(page(loaded, 'END'));
    });
    render(<FeedPostComments postId={5} />);
    await flush();
    expect(screen.getByText('K1000')).toBeInTheDocument();

    await pollOnce();
    await act(async () => {
      observer.fire('feed-comments-sentinel');
    });

    expect(mockedList).toHaveBeenLastCalledWith(5, { cursorUrl: 'END' });
  });

  it('odpoveď dotiahnutá so staršou stránkou sa pri súbežnom pollingu neohlási ako nový komentár', async () => {
    const newest = Array.from({ length: 10 }, (_unused, index) => comment(400 - index, `K${400 - index}`));
    // Starší komentár má vnorenú odpoveď s najvyšším číslom zo všetkých: ide o čerstvú odpoveď na starý komentár.
    const older = comment(50, 'Starý komentár', {
      replies: [comment(900, 'Čerstvá odpoveď', { parent_comment_id: 50 })],
      replies_count: 1,
    });
    const more = deferred<FeedCommentPage>();
    const poll = deferred<FeedCommentPage>();
    mockedList.mockImplementation((_postId, options) => {
      if (options?.cursorUrl) return more.promise;
      // Prvé načítanie pýta 10 komentárov, polling okno o 10 väčšie než načítaný zoznam.
      if (options?.pageSize === 20) return poll.promise;
      return Promise.resolve(page(newest, 'CURSOR'));
    });
    render(<FeedPostComments postId={5} />);
    await flush();
    readFarFromTop();

    // Donačítanie aj polling bežia naraz a ich odpovede dobehnú skôr, než React stihne zoznam prekresliť.
    await act(async () => {
      observer.fire('feed-comments-sentinel');
    });
    await act(async () => {
      jest.advanceTimersByTime(COMMENTS_POLL_INTERVAL_MS + 50);
    });
    expect(cursorRequests()).toHaveLength(1);
    expect(mockedList.mock.calls.filter(([, options]) => options?.pageSize === 20)).toHaveLength(1);
    await act(async () => {
      more.resolve(page([older]));
      poll.resolve({ results: [...newest, older], next: null, previous: null, count: 11 });
    });
    await flush();

    expect(screen.getByText('Starý komentár')).toBeInTheDocument();
    expect(screen.queryByTestId('feed-comments-new-indicator')).not.toBeInTheDocument();
  });

  it('ten istý nový komentár sa pri ďalšom pollingu neohlási druhýkrát', async () => {
    mockedList
      .mockResolvedValueOnce(page([comment(100, 'Prvý')]))
      .mockResolvedValue(page([comment(200, 'Nový'), comment(100, 'Prvý')]));
    render(<FeedPostComments postId={5} />);
    await flush();
    readFarFromTop();

    await pollOnce();
    expect(screen.getByTestId('feed-comments-new-indicator')).toHaveTextContent('1 nový komentár');

    // Druhý polling vráti ten istý nový komentár: hranica „už videné“ sa po prvom posunula, takže sa nič nepripočíta.
    await pollOnce();
    expect(screen.getByTestId('feed-comments-new-indicator')).toHaveTextContent('1 nový komentár');
    expect(screen.getByTestId('feed-comments-new-indicator')).not.toHaveTextContent('2');
  });
});

describe('FeedPostComments – kostra pri donačítavaní odpovedí', () => {
  let observer: ReturnType<typeof installFiringIntersectionObserver>;

  beforeEach(() => {
    mockedList.mockReset();
    mockedReplies.mockReset();
    observer = installFiringIntersectionObserver();
  });

  afterEach(() => {
    observer.restore();
  });

  it('počas donačítavania odpovedí ukáže kostru načítavania a po dobehnutí ju skryje', async () => {
    const preview = Array.from({ length: 10 }, (_unused, index) =>
      comment(110 - index, `Odpoveď ${110 - index}`, { parent_comment_id: 1 }),
    );
    mockedList.mockResolvedValue(page([comment(1, 'Hlavný', { replies: preview, replies_count: 12 })]));
    const batch = deferred<{ results: FeedPostComment[]; next: string | null; previous: string | null }>();
    mockedReplies.mockReturnValue(batch.promise);
    render(<FeedPostComments postId={5} />);
    await screen.findByText('Hlavný');
    await act(async () => {
      screen.getByTestId('feed-comment-toggle-replies-1').click();
    });
    expect(screen.queryByTestId('feed-comment-replies-sentinel-1-loading')).not.toBeInTheDocument();

    await act(async () => {
      observer.fire('feed-comment-replies-sentinel-1');
    });
    expect(screen.getByTestId('feed-comment-replies-sentinel-1-loading')).toBeInTheDocument();

    await act(async () =>
      batch.resolve({
        results: [
          comment(100, 'Odpoveď 100', { parent_comment_id: 1 }),
          comment(99, 'Odpoveď 99', { parent_comment_id: 1 }),
        ],
        next: null,
        previous: null,
      }),
    );
    expect(screen.queryByTestId('feed-comment-replies-sentinel-1-loading')).not.toBeInTheDocument();
  });
});
