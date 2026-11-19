/**
 * Donačítavanie starších komentárov po zlyhaní siete (nález 351, K43, R61).
 *
 * Po zlyhaní donačítania ostávalo `hasMore` pravdivé a kurzor sa neposúval. Sentinel sa zapína cez
 * `enabled: hasMore && !loading && !loadingMore` a pri každom prepnutí `enabled` vytvorí nový observer, ktorý hneď
 * doručí začiatočné oznámenie. Kým bol koniec zoznamu vo výhľade, platilo: zlyhanie, nový observer, donačítanie,
 * zlyhanie… Slučka bežala sama (v prehliadači 21 dopytov a 21 toastov za sekundu, naraz vo výhľade 20 toastov).
 *
 * Teraz sa po zlyhaní donačítavanie pozastaví a obnoví samo, bez viditeľnej zmeny: po úspešnej obnove pollingom, po
 * udalosti `online` a po novom načítaní. Hľadanie komentára z upozornenia (`silent`) a zastaraná chyba (zneplatnená
 * mutáciou) nič nepozastavujú; zastaraná odpoveď pollingu (zahodená mutáciou) donačítavanie neobnoví, ako nič iné.
 *
 * Slučku okamžité zamietnutie (`mockRejectedValue`) nevidí: React zlúči `loadingMore` true a false do jedného
 * prekreslenia, takže sa `enabled` nikdy neprepne. Preto zlyhanie prichádza až po `setTimeout` a observer je atrapa,
 * ktorá sa správa ako skutočný: po `observe()` doručí o snímku začiatočné oznámenie s aktuálnou viditeľnosťou.
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
const mockedCreate = createFeedPostComment as jest.MockedFunction<typeof createFeedPostComment>;
const toastError = toast.error as unknown as jest.Mock;

const LOAD_ERROR = 'Komentáre sa nepodarilo načítať.';
const CURSOR = 'http://api.test/comments/?cursor=2';
/** Jedna snímka a čas, po ktorom zlyhá dopyt bez siete (zlyhanie MUSÍ prísť neskôr než v rovnakom kole). */
const FRAME_MS = 16;
const FAIL_AFTER_MS = 30;

const author = { id: 1, display_name: 'Jana', slug: 'jana', user_type: 'individual', avatar_url: null };

function comment(id: number): FeedPostComment {
  return {
    id,
    text: `K${id}`,
    author,
    can_delete: false,
    can_edit: false,
    likes_count: 0,
    is_liked_by_me: false,
    parent_comment_id: null,
    replies: [],
    replies_count: 0,
    created_at: '2026-01-01',
  } as FeedPostComment;
}

const PAGE_ONE: FeedCommentPage = {
  results: Array.from({ length: 10 }, (_unused, index) => comment(100 - index)),
  next: CURSOR,
  previous: null,
  count: 20,
};
const PAGE_TWO: FeedCommentPage = {
  results: Array.from({ length: 10 }, (_unused, index) => comment(90 - index)),
  next: null,
  previous: null,
  count: 20,
};

/**
 * Stav spojenia. `feed`: dopyty bez kurzora (prvé načítanie a polling), `cursorPage`: donačítanie ďalšej stránky.
 * `hang` nechá dopyt visieť, kým ho test sám neodmietne (`rejectHanging`) alebo nedokončí (`resolveHangingFeed`).
 */
const connection: { feed: 'ok' | 'down' | 'hang'; cursorPage: 'ok' | 'down' | 'hang' } = {
  feed: 'ok',
  cursorPage: 'ok',
};
let rejectHanging: (error: unknown) => void = () => undefined;
let resolveHangingFeed: (page: FeedCommentPage) => void = () => undefined;

function networkError(): Promise<never> {
  return new Promise((_resolve, reject) => {
    setTimeout(() => reject(new Error('Network Error')), FAIL_AFTER_MS);
  });
}

function cursorRequests(): number {
  return mockedList.mock.calls.filter(([, options]) => Boolean(options?.cursorUrl)).length;
}

function feedRequests(): number {
  return mockedList.mock.calls.filter(([, options]) => !options?.cursorUrl).length;
}

/** Atrapa `IntersectionObserver`: po `observe()` príde o snímku začiatočné oznámenie s AKTUÁLNOU viditeľnosťou. */
let sentinelVisible = false;
type Registration = { callback: IntersectionObserverCallback; observer: unknown; live: boolean };
let registrations: Registration[] = [];
let observersCreated = 0;

class InitialNotifyObserver {
  private readonly callback: IntersectionObserverCallback;
  root = null;
  rootMargin = '';
  thresholds = [];

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    observersCreated += 1;
  }

  observe() {
    const registration: Registration = { callback: this.callback, observer: this, live: true };
    registrations.push(registration);
    setTimeout(() => {
      if (!registration.live) return;
      this.callback(
        [{ isIntersecting: sentinelVisible } as IntersectionObserverEntry],
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

/** Čitateľ doscrolloval na koniec: sentinel je vo výhľade a každý žijúci observer to oznámi. */
async function scrollToEnd() {
  sentinelVisible = true;
  await act(async () => {
    registrations
      .filter((entry) => entry.live)
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
  expect(screen.getByText('K100')).toBeInTheDocument();
  return view;
}

/** Nechá uplynúť jeden interval pollingu a dobehnúť jeho odpoveď, prípadné nové observery aj ich oznámenia. */
async function pollOnce() {
  await act(async () => {
    jest.advanceTimersByTime(COMMENTS_POLL_INTERVAL_MS);
  });
  await frames(12);
}

describe('FeedPostComments – donačítavanie komentárov bez internetu', () => {
  const originalObserver = (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver;

  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    mockedList.mockReset();
    mockedCreate.mockReset();
    toastError.mockReset();
    connection.feed = 'ok';
    connection.cursorPage = 'ok';
    sentinelVisible = false;
    registrations = [];
    observersCreated = 0;
    (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver = InitialNotifyObserver;
    mockedList.mockImplementation((_postId, options) => {
      if (options?.cursorUrl) {
        if (connection.cursorPage === 'down') return networkError();
        if (connection.cursorPage === 'hang') {
          return new Promise((_resolve, reject) => {
            rejectHanging = reject;
          });
        }
        return Promise.resolve(PAGE_TWO);
      }
      if (connection.feed === 'hang') {
        return new Promise((resolve) => {
          resolveHangingFeed = resolve;
        });
      }
      return connection.feed === 'ok' ? Promise.resolve(PAGE_ONE) : networkError();
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver = originalObserver;
  });

  it('stops after one failed attempt: one request and one message, however long the end stays in view', async () => {
    await openList();
    connection.cursorPage = 'down';

    await scrollToEnd();
    await frames(120);

    // Bez opravy tu bolo desiatky dopytov a toastov (jeden každé dve-tri snímky).
    expect(cursorRequests()).toBe(1);
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledWith(LOAD_ERROR);
  });

  it('starts nothing when the reader leaves the end and comes back while the connection is down', async () => {
    await openList();
    connection.cursorPage = 'down';
    await scrollToEnd();
    await frames(20);
    expect(cursorRequests()).toBe(1);

    sentinelVisible = false;
    await frames(10);
    await scrollToEnd();
    await frames(60);

    expect(cursorRequests()).toBe(1);
    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it('creates no new observers while paused', async () => {
    await openList();
    connection.cursorPage = 'down';
    await scrollToEnd();
    await frames(10);
    const created = observersCreated;

    await frames(100);

    expect(observersCreated).toBe(created);
    expect(registrations.filter((entry) => entry.live)).toHaveLength(0);
  });

  it('resumes by itself after a successful poll and loads the next page', async () => {
    await openList();
    connection.cursorPage = 'down';
    await scrollToEnd();
    await frames(20);
    expect(cursorRequests()).toBe(1);

    // Spojenie sa vrátilo: najbližší polling prejde a donačítanie sa obnoví bez zásahu čitateľa.
    connection.cursorPage = 'ok';
    await pollOnce();

    expect(cursorRequests()).toBe(2);
    expect(screen.getByText('K90')).toBeInTheDocument();
    // Žiadna ďalšia hláška: obnova prebehla ticho.
    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it('does not resume after a failed poll', async () => {
    await openList();
    connection.cursorPage = 'down';
    connection.feed = 'down';
    await scrollToEnd();
    await frames(20);
    const pollsBefore = feedRequests();

    await pollOnce();
    await pollOnce();
    await pollOnce();

    // Polling beží ďalej a ticho zlyháva, donačítanie ostáva pozastavené.
    expect(feedRequests()).toBeGreaterThan(pollsBefore);
    expect(cursorRequests()).toBe(1);
    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it('does not resume on the answer of a poll that a new comment has already invalidated', async () => {
    await openList();
    connection.cursorPage = 'down';
    await scrollToEnd();
    await frames(20);
    expect(cursorRequests()).toBe(1);

    // Polling sa rozbehne a čaká na odpoveď; medzitým čitateľ pridá komentár, takže odpoveď je spred mutácie a zahodí sa.
    connection.feed = 'hang';
    await act(async () => {
      jest.advanceTimersByTime(COMMENTS_POLL_INTERVAL_MS);
    });
    mockedCreate.mockResolvedValue(comment(999));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Nový' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pridať' }));
    await frames(5);
    expect(mockedCreate).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveHangingFeed(PAGE_ONE);
    });
    await frames(30);
    // Zahodená odpoveď nič nemení, takže donačítavanie ostáva pozastavené.
    expect(cursorRequests()).toBe(1);
    expect(toastError).toHaveBeenCalledTimes(1);

    // Až ďalší polling, ktorý už nič nezneplatnilo, ho obnoví.
    connection.feed = 'ok';
    connection.cursorPage = 'ok';
    await pollOnce();
    expect(cursorRequests()).toBe(2);
    expect(screen.getByText('K90')).toBeInTheDocument();
  });

  it('resumes at once when the browser reports that the connection is back', async () => {
    await openList();
    connection.cursorPage = 'down';
    await scrollToEnd();
    await frames(20);
    expect(cursorRequests()).toBe(1);

    connection.cursorPage = 'ok';
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });
    // Bez čakania na polling: stačí pár snímok na nový observer a jeho začiatočné oznámenie.
    await frames(12);

    expect(cursorRequests()).toBe(2);
    expect(screen.getByText('K90')).toBeInTheDocument();
    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it('loads nothing after the connection returns until the reader is at the end of the list again', async () => {
    await openList();
    connection.cursorPage = 'down';
    await scrollToEnd();
    await frames(20);
    expect(cursorRequests()).toBe(1);

    // Čitateľ medzitým odišiel od konca zoznamu, takže obnova nemá čo doťahovať.
    sentinelVisible = false;
    connection.cursorPage = 'ok';
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });
    await frames(20);
    expect(cursorRequests()).toBe(1);

    await scrollToEnd();
    await frames(12);
    expect(cursorRequests()).toBe(2);
    expect(screen.getByText('K90')).toBeInTheDocument();
  });

  it('retries at most once per poll interval when only the page request keeps failing', async () => {
    await openList();
    connection.cursorPage = 'down';
    await scrollToEnd();
    await frames(20);
    expect(cursorRequests()).toBe(1);

    // Polling prechádza, no stránka s kurzorom zlyháva: pokus sa opakuje najviac raz za interval, nie desiatky za sekundu.
    await pollOnce();
    await pollOnce();
    await pollOnce();

    expect(cursorRequests()).toBeGreaterThanOrEqual(2);
    expect(cursorRequests()).toBeLessThanOrEqual(4);
    expect(toastError).toHaveBeenCalledTimes(cursorRequests());
  });

  it('does not pause when the background search for a notification target fails silently', async () => {
    render(<FeedPostComments postId={5} highlightCommentId={55} />);
    connection.cursorPage = 'down';
    await frames(2);
    // Hľadanie cieľa donačíta ďalšiu stránku ticho: zlyhanie nič nehlási a hľadanie sa vzdá.
    await frames(10);
    expect(cursorRequests()).toBe(1);
    expect(toastError).not.toHaveBeenCalled();

    // Čitateľ doscrolluje na koniec: sentinel nie je pozastavený, takže jeho pokus prebehne a ohlási sa.
    await scrollToEnd();
    await frames(20);
    expect(cursorRequests()).toBe(2);
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledWith(LOAD_ERROR);
    // Až teraz je pozastavené.
    await frames(60);
    expect(cursorRequests()).toBe(2);
  });

  it('neither reports nor pauses a failure of a request that a new comment has already invalidated', async () => {
    await openList();
    connection.cursorPage = 'hang';
    await scrollToEnd();
    await frames(5);
    expect(cursorRequests()).toBe(1);

    // Medzitým čitateľ pridá komentár: rozbehnuté donačítanie je zastarané.
    mockedCreate.mockResolvedValue(comment(999));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Nový' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pridať' }));
    await frames(5);
    expect(mockedCreate).toHaveBeenCalledTimes(1);

    // Čitateľ odíde od konca, aby nový observer sám nič nespustil, a zastaraný dopyt potom zlyhá.
    sentinelVisible = false;
    connection.cursorPage = 'down';
    await act(async () => {
      rejectHanging(new Error('Network Error'));
    });
    await frames(5);
    // Zastaraná chyba nič nehlási a nič nepozastaví: ďalší pokus po návrate na koniec prebehne.
    expect(toastError).not.toHaveBeenCalled();
    expect(cursorRequests()).toBe(1);
    await scrollToEnd();
    await frames(20);
    expect(cursorRequests()).toBe(2);
    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it('starts a new post without the pause of the previous one', async () => {
    const { rerender } = await openList(5);
    connection.cursorPage = 'down';
    await scrollToEnd();
    await frames(20);
    expect(cursorRequests()).toBe(1);

    connection.cursorPage = 'ok';
    rerender(<FeedPostComments postId={6} />);
    await frames(4);
    expect(screen.getByText('K100')).toBeInTheDocument();
    await scrollToEnd();
    await frames(12);

    expect(cursorRequests()).toBe(2);
    expect(screen.getByText('K90')).toBeInTheDocument();
  });

  it('keeps the usual single error in the list when the first load fails without internet', async () => {
    connection.feed = 'down';
    render(<FeedPostComments postId={5} />);
    await frames(10);

    expect(screen.getByText(LOAD_ERROR)).toBeInTheDocument();
    // Prvé načítanie dáva chybu v zozname, nie toast, a nespúšťa žiadne opakovanie.
    expect(toastError).not.toHaveBeenCalled();
    await frames(60);
    expect(mockedList).toHaveBeenCalledTimes(1);
  });

  it('pages through the whole list as before when the connection works', async () => {
    await openList();

    await scrollToEnd();
    await frames(12);

    expect(cursorRequests()).toBe(1);
    expect(screen.getByText('K90')).toBeInTheDocument();
    expect(toastError).not.toHaveBeenCalled();
    // Za poslednou stránkou už nie je čo donačítať.
    await scrollToEnd();
    await frames(30);
    expect(cursorRequests()).toBe(1);
  });

  it('removes its listener for the online event when the list is closed', async () => {
    const added = jest.spyOn(window, 'addEventListener');
    const removed = jest.spyOn(window, 'removeEventListener');
    const { unmount } = await openList();
    const onlineCalls = added.mock.calls.filter(([type]) => type === 'online');
    expect(onlineCalls.length).toBeGreaterThan(0);

    unmount();

    for (const [, handler] of onlineCalls) {
      expect(removed).toHaveBeenCalledWith('online', handler);
    }
    added.mockRestore();
    removed.mockRestore();
  });
});
