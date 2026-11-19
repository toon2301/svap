/**
 * Donačítavanie starších odpovedí po zlyhaní siete (nález 351, K43, R61; komentáre rieši `loadMorePause`).
 *
 * Sentinel vlákna odpovedí sa zapína cez `enabled = loadingRepliesFor !== comment.id`. Po zlyhaní `loadMoreReplies` sa
 * `loadingRepliesFor` vrátilo na `null`, `enabled` sa prepol, sentinel dostal nový observer s okamžitým začiatočným
 * oznámením a dopyt s tou istou kotvou sa zopakoval: zlyhanie, nový observer, donačítanie, zlyhanie… Kým bol koniec vlákna
 * vo výhľade, bežali desiatky dopytov a toastov „Odpovede sa nepodarilo načítať.“ za sekundu.
 *
 * Teraz sa po zlyhaní (nie `silent` hľadania) donačítavanie odpovedí pozastaví a obnoví samo, bez viditeľnej zmeny: po
 * úspešnej obnove pollingom, po udalosti `online` a po novom načítaní. Pozastavenie vypína len sentinel; záložné tlačidlo
 * v prostredí bez `IntersectionObserver` ostáva použiteľné (slučku nemá a je jediná cesta k zvyšku vlákna). Je nezávislé od
 * pozastavenia donačítavania komentárov: zlyhanie jedného nezastaví druhé.
 *
 * Slučku okamžité zamietnutie nevidí (React zlúči `loadingRepliesFor` na hodnotu a späť do jedného prekreslenia), preto
 * zlyhanie prichádza až po `setTimeout` a observer je atrapa so začiatočným oznámením o snímku po `observe()`; viditeľnosť
 * sa nastavuje zvlášť pre sentinel odpovedí a sentinel komentárov.
 *
 * Testy používajú len verejné rozhranie komponentu a mockujú len vonkajšie moduly.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import FeedPostComments from '../FeedPostComments';
import { COMMENTS_POLL_INTERVAL_MS } from '../useFeedCommentsPolling';
import {
  createFeedPostComment,
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
const mockedCreate = createFeedPostComment as jest.MockedFunction<typeof createFeedPostComment>;
const toastError = toast.error as unknown as jest.Mock;

const REPLIES_ERROR = 'Odpovede sa nepodarilo načítať.';
const COMMENTS_ERROR = 'Komentáre sa nepodarilo načítať.';
const CURSOR = 'http://api.test/comments/?cursor=2';
const SENTINEL = 'feed-comment-replies-sentinel-1';
const TOGGLE = 'feed-comment-toggle-replies-1';
/** Jedna snímka a čas, po ktorom zlyhá dopyt bez siete (zlyhanie MUSÍ prísť neskôr než v rovnakom kole). */
const FRAME_MS = 16;
const FAIL_AFTER_MS = 30;

const author = { id: 1, display_name: 'Jana', slug: 'jana', user_type: 'individual', avatar_url: null };

function comment(id: number, text: string, replies: FeedPostComment[] = [], repliesCount = replies.length): FeedPostComment {
  return {
    id,
    text,
    author,
    can_delete: false,
    can_edit: false,
    likes_count: 0,
    is_liked_by_me: false,
    parent_comment_id: null,
    replies,
    replies_count: repliesCount,
    created_at: '2026-01-01',
  } as FeedPostComment;
}

function reply(id: number): FeedPostComment {
  return {
    id,
    text: `Odpoveď ${id}`,
    author,
    can_delete: false,
    can_edit: false,
    likes_count: 0,
    is_liked_by_me: false,
    parent_comment_id: 1,
    created_at: '2026-01-02',
  } as FeedPostComment;
}

/** Vlákno má 15 odpovedí: náhľad je 10 najnovších (110…101), zvyšných 5 (100…96) sa donačíta jednou dávkou. */
const PREVIEW = Array.from({ length: 10 }, (_unused, index) => reply(110 - index));
const BATCH = Array.from({ length: 5 }, (_unused, index) => reply(100 - index));
const THREAD_TOTAL = 15;

const PAGE_ONE: FeedCommentPage = {
  results: [comment(1, 'Hlavný', PREVIEW, THREAD_TOTAL), comment(2, 'Druhý')],
  next: null,
  previous: null,
  count: 2,
};
/** Strana komentárov s ďalšou stranou, na nezávislosť donačítavania komentárov a odpovedí. */
const PAGE_ONE_WITH_MORE: FeedCommentPage = { ...PAGE_ONE, next: CURSOR };
const PAGE_TWO: FeedCommentPage = {
  results: [comment(3, 'Tretí')],
  next: null,
  previous: null,
  count: 3,
};

/**
 * Stav spojenia. `feed`: dopyty bez kurzora (prvé načítanie a polling; `hang` ho nechá visieť, kým ho test sám neukončí
 * cez `resolveHangingFeed`), `cursorPage`: ďalšia strana komentárov, `replies`: dávka odpovedí.
 */
const connection: {
  feed: 'ok' | 'down' | 'hang';
  cursorPage: 'ok' | 'down';
  replies: 'ok' | 'down';
  firstPage: FeedCommentPage;
} = {
  feed: 'ok',
  cursorPage: 'ok',
  replies: 'ok',
  firstPage: PAGE_ONE,
};
let resolveHangingFeed: (page: FeedCommentPage) => void = () => undefined;

function networkError(): Promise<never> {
  return new Promise((_resolve, reject) => {
    setTimeout(() => reject(new Error('Network Error')), FAIL_AFTER_MS);
  });
}

function replyRequests(): number {
  return mockedReplies.mock.calls.length;
}

function cursorRequests(): number {
  return mockedList.mock.calls.filter(([, options]) => Boolean(options?.cursorUrl)).length;
}

function feedRequests(): number {
  return mockedList.mock.calls.filter(([, options]) => !options?.cursorUrl).length;
}

/**
 * Atrapa `IntersectionObserver`: po `observe()` príde o snímku začiatočné oznámenie s AKTUÁLNOU viditeľnosťou sledovaného
 * uzla. Sentinel odpovedí sa pozná podľa `data-testid`, ostatné je sentinel komentárov.
 */
type Kind = 'replies' | 'comments';
const visible: Record<Kind, boolean> = { replies: false, comments: false };
type Registration = { callback: IntersectionObserverCallback; observer: unknown; kind: Kind; live: boolean };
let registrations: Registration[] = [];
let observersCreated = 0;

function kindOf(node: Element): Kind {
  return node.getAttribute('data-testid')?.startsWith('feed-comment-replies-sentinel') ? 'replies' : 'comments';
}

class InitialNotifyObserver {
  private readonly callback: IntersectionObserverCallback;
  root = null;
  rootMargin = '';
  thresholds = [];

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    observersCreated += 1;
  }

  observe(node: Element) {
    const registration: Registration = { callback: this.callback, observer: this, kind: kindOf(node), live: true };
    registrations.push(registration);
    setTimeout(() => {
      if (!registration.live) return;
      this.callback(
        [{ isIntersecting: visible[registration.kind] } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    }, FRAME_MS);
  }

  disconnect() {
    registrations.filter((entry) => entry.observer === this).forEach((entry) => {
      entry.live = false;
    });
  }

  unobserve() {}

  takeRecords() {
    return [];
  }
}

async function frames(count: number) {
  for (let index = 0; index < count; index += 1) {
    await act(async () => {
      jest.advanceTimersByTime(FRAME_MS);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }
}

/** Čitateľ doscrolloval na koniec vlákna odpovedí alebo zoznamu komentárov (bez argumentu oboje): sentinel je vo výhľade. */
async function scrollToEnd(...kinds: Kind[]) {
  const chosen: Kind[] = kinds.length ? kinds : ['replies', 'comments'];
  chosen.forEach((kind) => {
    visible[kind] = true;
  });
  await act(async () => {
    registrations
      .filter((entry) => entry.live && chosen.includes(entry.kind))
      .forEach((entry) =>
        entry.callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          entry.observer as IntersectionObserver,
        ),
      );
  });
}

async function openList(postId = 5) {
  const view = render(<FeedPostComments postId={postId} />);
  await frames(2);
  expect(screen.getByText('Hlavný')).toBeInTheDocument();
  return view;
}

/** Rozbalí vlákno prvého komentára: objaví sa náhľad 10 odpovedí a sentinel pre zvyšných 5. */
async function expandThread() {
  await act(async () => {
    fireEvent.click(screen.getByTestId(TOGGLE));
  });
  await frames(2);
  expect(screen.getByTestId(SENTINEL)).toBeInTheDocument();
}

/** Nechá uplynúť jeden interval pollingu a dobehnúť jeho odpoveď, prípadné nové observery aj ich oznámenia. */
async function pollOnce() {
  await act(async () => {
    jest.advanceTimersByTime(COMMENTS_POLL_INTERVAL_MS);
  });
  await frames(12);
}

describe('FeedPostComments – donačítavanie odpovedí bez internetu', () => {
  const originalObserver = (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver;

  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    mockedList.mockReset();
    mockedReplies.mockReset();
    mockedCreate.mockReset();
    toastError.mockReset();
    connection.feed = 'ok';
    connection.cursorPage = 'ok';
    connection.replies = 'ok';
    connection.firstPage = PAGE_ONE;
    visible.replies = false;
    visible.comments = false;
    registrations = [];
    observersCreated = 0;
    (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver = InitialNotifyObserver;
    mockedList.mockImplementation((_postId, options) => {
      if (options?.cursorUrl) {
        return connection.cursorPage === 'ok' ? Promise.resolve(PAGE_TWO) : networkError();
      }
      if (connection.feed === 'hang') {
        return new Promise((resolve) => {
          resolveHangingFeed = resolve;
        });
      }
      return connection.feed === 'ok' ? Promise.resolve(connection.firstPage) : networkError();
    });
    mockedReplies.mockImplementation(() =>
      connection.replies === 'ok'
        ? Promise.resolve({ results: BATCH, next: null, previous: null })
        : networkError(),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver = originalObserver;
  });

  it('po jednom neúspešnom pokuse sa zastaví: jeden dopyt a jedna hláška, nech je koniec vlákna vo výhľade akokoľvek dlho', async () => {
    await openList();
    await expandThread();
    connection.replies = 'down';

    await scrollToEnd();
    await frames(120);

    // Bez opravy tu bolo desiatky dopytov a toastov (jeden každé dve-tri snímky).
    expect(replyRequests()).toBe(1);
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledWith(REPLIES_ERROR);
  });

  it('nespustí nič, keď čitateľ odíde od konca vlákna a vráti sa, kým je internet vypnutý', async () => {
    await openList();
    await expandThread();
    connection.replies = 'down';
    await scrollToEnd();
    await frames(20);
    expect(replyRequests()).toBe(1);

    visible.replies = false;
    await frames(10);
    await scrollToEnd();
    await frames(60);

    expect(replyRequests()).toBe(1);
    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it('počas pozastavenia nevytvára nové observery', async () => {
    await openList();
    await expandThread();
    connection.replies = 'down';
    await scrollToEnd();
    await frames(10);
    const created = observersCreated;

    await frames(100);

    expect(observersCreated).toBe(created);
    expect(registrations.filter((entry) => entry.live)).toHaveLength(0);
  });

  it('po úspešnom pollingu sa samo obnoví a donačíta zvyšok vlákna', async () => {
    await openList();
    await expandThread();
    connection.replies = 'down';
    await scrollToEnd();
    await frames(20);
    expect(replyRequests()).toBe(1);

    // Spojenie sa vrátilo: najbližší polling prejde a donačítanie sa obnoví bez zásahu čitateľa.
    connection.replies = 'ok';
    await pollOnce();

    expect(replyRequests()).toBe(2);
    expect(screen.getByText('Odpoveď 96')).toBeInTheDocument();
    // Vlákno je kompletné, sentinel zmizol a obnova prebehla ticho (žiadna ďalšia hláška).
    expect(screen.queryByTestId(SENTINEL)).not.toBeInTheDocument();
    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it('po zlyhanom pollingu sa neobnoví', async () => {
    await openList();
    await expandThread();
    connection.replies = 'down';
    connection.feed = 'down';
    await scrollToEnd();
    await frames(20);
    const pollsBefore = feedRequests();

    await pollOnce();
    await pollOnce();
    await pollOnce();

    // Polling beží ďalej a ticho zlyháva, donačítavanie ostáva pozastavené.
    expect(feedRequests()).toBeGreaterThan(pollsBefore);
    expect(replyRequests()).toBe(1);
    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it('neobnoví sa na odpoveď pollingu, ktorú už zneplatnil nový komentár', async () => {
    await openList();
    await expandThread();
    connection.replies = 'down';
    await scrollToEnd();
    await frames(20);
    expect(replyRequests()).toBe(1);

    // Polling sa rozbehne a čaká na odpoveď; medzitým čitateľ pridá komentár, takže odpoveď je spred mutácie a zahodí sa.
    connection.feed = 'hang';
    await act(async () => {
      jest.advanceTimersByTime(COMMENTS_POLL_INTERVAL_MS);
    });
    mockedCreate.mockResolvedValue(comment(999, 'Nový'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Nový' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pridať' }));
    await frames(5);
    expect(mockedCreate).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveHangingFeed(PAGE_ONE);
    });
    await frames(30);
    // Zahodená odpoveď nič nemení, takže donačítavanie ostáva pozastavené.
    expect(replyRequests()).toBe(1);
    expect(toastError).toHaveBeenCalledTimes(1);

    // Až ďalší polling, ktorý už nič nezneplatnilo, ho obnoví.
    connection.feed = 'ok';
    connection.replies = 'ok';
    await pollOnce();
    expect(replyRequests()).toBe(2);
    expect(screen.getByText('Odpoveď 96')).toBeInTheDocument();
  });

  it('obnoví sa hneď, keď prehliadač ohlási návrat spojenia', async () => {
    await openList();
    await expandThread();
    connection.replies = 'down';
    await scrollToEnd();
    await frames(20);
    expect(replyRequests()).toBe(1);

    connection.replies = 'ok';
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });
    // Bez čakania na polling: stačí pár snímok na nový observer a jeho začiatočné oznámenie.
    await frames(12);

    expect(replyRequests()).toBe(2);
    expect(screen.getByText('Odpoveď 96')).toBeInTheDocument();
    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it('po návrate spojenia nič nedonačíta, kým čitateľ nie je znova na konci vlákna', async () => {
    await openList();
    await expandThread();
    connection.replies = 'down';
    await scrollToEnd();
    await frames(20);
    expect(replyRequests()).toBe(1);

    // Čitateľ medzitým odišiel od konca vlákna, takže obnova nemá čo doťahovať.
    visible.replies = false;
    connection.replies = 'ok';
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });
    await frames(20);
    expect(replyRequests()).toBe(1);

    await scrollToEnd('replies');
    await frames(12);
    expect(replyRequests()).toBe(2);
    expect(screen.getByText('Odpoveď 96')).toBeInTheDocument();
  });

  it('opakuje pokus najviac raz za interval pollingu, keď zlyháva len dopyt na odpovede', async () => {
    await openList();
    await expandThread();
    connection.replies = 'down';
    await scrollToEnd();
    await frames(20);
    expect(replyRequests()).toBe(1);

    // Polling prechádza, no dávka odpovedí zlyháva: pokus sa opakuje najviac raz za interval, nie desiatky za sekundu.
    await pollOnce();
    await pollOnce();
    await pollOnce();

    expect(replyRequests()).toBeGreaterThanOrEqual(2);
    expect(replyRequests()).toBeLessThanOrEqual(4);
    expect(toastError).toHaveBeenCalledTimes(replyRequests());
  });

  it('nepozastaví sa, keď tiché hľadanie cieľa z upozornenia na pozadí zlyhá', async () => {
    connection.replies = 'down';
    render(<FeedPostComments postId={5} highlightCommentId={777} />);
    await frames(1);
    // Po zlyhaní hľadanie ešte raz obnoví zoznam (cieľ môže ležať nad oknom). Úspešná obnova by pozastavenie hneď
    // zrušila a test by ho nevidel, preto ju nechaj zlyhať.
    connection.feed = 'down';
    // Hľadanie cieľa donačíta odpovede ticho: zlyhanie nič nehlási a hľadanie sa vzdá.
    await frames(11);
    expect(replyRequests()).toBe(1);
    expect(toastError).not.toHaveBeenCalled();

    // Čitateľ rozbalí vlákno a doscrolluje na koniec: sentinel nie je pozastavený, takže jeho pokus prebehne a ohlási sa.
    await expandThread();
    await scrollToEnd('replies');
    await frames(20);
    expect(replyRequests()).toBe(2);
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledWith(REPLIES_ERROR);
    // Až teraz je pozastavené.
    await frames(60);
    expect(replyRequests()).toBe(2);
  });

  it('pozastavenie predchádzajúceho príspevku sa neprenesie do nového', async () => {
    const { rerender } = await openList(5);
    await expandThread();
    connection.replies = 'down';
    await scrollToEnd();
    await frames(20);
    expect(replyRequests()).toBe(1);

    connection.replies = 'ok';
    rerender(<FeedPostComments postId={6} />);
    await frames(4);
    expect(screen.getByText('Hlavný')).toBeInTheDocument();
    await scrollToEnd('replies');
    await frames(12);

    expect(replyRequests()).toBe(2);
    expect(screen.getByText('Odpoveď 96')).toBeInTheDocument();
  });

  it('stránkovanie komentárov pokračuje, keď zlyhajú len odpovede', async () => {
    connection.firstPage = PAGE_ONE_WITH_MORE;
    connection.replies = 'down';
    await openList();
    await expandThread();

    await scrollToEnd('replies');
    await frames(20);
    expect(replyRequests()).toBe(1);
    expect(cursorRequests()).toBe(0);

    // Odpovede sú pozastavené, no donačítavanie komentárov to nijako neovplyvnilo.
    await scrollToEnd('comments');
    await frames(12);
    expect(cursorRequests()).toBe(1);
    expect(screen.getByText('Tretí')).toBeInTheDocument();
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledWith(REPLIES_ERROR);
  });

  it('odpovede sa donačítavajú ďalej, keď zlyhajú len komentáre', async () => {
    connection.firstPage = PAGE_ONE_WITH_MORE;
    connection.cursorPage = 'down';
    await openList();

    await scrollToEnd('comments');
    await frames(20);
    expect(cursorRequests()).toBe(1);
    expect(toastError).toHaveBeenCalledWith(COMMENTS_ERROR);

    // Komentáre sú pozastavené, no vlákno odpovedí sa donačíta ako zvyčajne.
    await expandThread();
    await scrollToEnd('replies');
    await frames(12);
    expect(replyRequests()).toBe(1);
    expect(screen.getByText('Odpoveď 96')).toBeInTheDocument();
    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it('ručné tlačidlo prostredia bez IntersectionObserver ostane po zlyhaní použiteľné', async () => {
    (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver = undefined;
    connection.replies = 'down';
    await openList();
    await expandThread();
    const fallback = screen.getByTestId(`${SENTINEL}-fallback`);

    await act(async () => {
      fireEvent.click(fallback);
    });
    await frames(5);
    expect(replyRequests()).toBe(1);
    expect(toastError).toHaveBeenCalledTimes(1);

    // Tlačidlo je jediná cesta k zvyšku vlákna, takže pozastavenie sentinelu ho nesmie vypnúť.
    expect(screen.getByTestId(`${SENTINEL}-fallback`)).toBeEnabled();
    await act(async () => {
      fireEvent.click(screen.getByTestId(`${SENTINEL}-fallback`));
    });
    await frames(5);
    expect(replyRequests()).toBe(2);
    expect(toastError).toHaveBeenCalledTimes(2);

    connection.replies = 'ok';
    await act(async () => {
      fireEvent.click(screen.getByTestId(`${SENTINEL}-fallback`));
    });
    await frames(5);
    expect(screen.getByText('Odpoveď 96')).toBeInTheDocument();
  });

  it('donačíta celé vlákno ako predtým, keď spojenie funguje', async () => {
    await openList();
    await expandThread();

    await scrollToEnd();
    await frames(12);

    expect(replyRequests()).toBe(1);
    expect(mockedReplies).toHaveBeenCalledWith(5, 1, { after: 101, pageSize: 10 });
    expect(screen.getByText('Odpoveď 96')).toBeInTheDocument();
    expect(toastError).not.toHaveBeenCalled();
    // Vlákno je kompletné, takže už nie je čo donačítať.
    expect(screen.queryByTestId(SENTINEL)).not.toBeInTheDocument();
    await scrollToEnd();
    await frames(30);
    expect(replyRequests()).toBe(1);
  });
});
