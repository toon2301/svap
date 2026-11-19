/**
 * Zastaraná chyba odpovedí nesmie pozastaviť donačítavanie nad novým stavom (nález 351, K43; nález CodeRabbitu na PR #298).
 *
 * `loadMoreReplies` po zlyhaní pozastaví automatické donačítavanie odpovedí (`repliesPaused`). Keď medzitým začalo nové
 * načítanie (iný príspevok) alebo prebehla mutácia (pridaný komentár), zlyhanie staršieho dopytu už k tomuto stavu
 * nepatrí. Pozastavenie by však ostalo zapnuté až do ďalšieho úspešného pollingu alebo udalosti `online` a sentinely
 * vlákien nového príspevku by zbytočne mlčali. Rovnako to ošetruje `loadMore` pri komentároch: pozastavenie nastaví len
 * zlyhanie dopytu z aktuálnej generácie načítania.
 *
 * Zlyhanie prichádza až po `setTimeout` a observer je atrapa so začiatočným oznámením o snímku po `observe()`, aby sa
 * dala vidieť aj slučka (okamžité zamietnutie React zlúči do jedného prekreslenia). Súbor je samostatný, lebo
 * `FeedPostComments.repliesPause.test.tsx` je nad 500 riadkov.
 *
 * Testy používajú len verejné rozhranie komponentu a mockujú len vonkajšie moduly.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import FeedPostComments from '../FeedPostComments';
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

const PAGE_ONE: FeedCommentPage = {
  results: [comment(1, 'Hlavný', PREVIEW, 15), comment(2, 'Druhý')],
  next: null,
  previous: null,
  count: 2,
};

/** Stav dopytov na odpovede: `hang` ho nechá visieť, kým ho test sám neodmietne cez `rejectHanging`. */
const connection: { replies: 'ok' | 'down' | 'hang' } = { replies: 'ok' };
let rejectHanging: (error: unknown) => void = () => undefined;

function networkError(): Promise<never> {
  return new Promise((_resolve, reject) => {
    setTimeout(() => reject(new Error('Network Error')), FAIL_AFTER_MS);
  });
}

function replyRequests(): number {
  return mockedReplies.mock.calls.length;
}

/** Atrapa `IntersectionObserver`: po `observe()` príde o snímku začiatočné oznámenie s AKTUÁLNOU viditeľnosťou. */
let sentinelVisible = false;
type Registration = { callback: IntersectionObserverCallback; observer: unknown; live: boolean };
let registrations: Registration[] = [];

class InitialNotifyObserver {
  private readonly callback: IntersectionObserverCallback;
  root = null;
  rootMargin = '';
  thresholds = [];

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
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

/** Čitateľ doscrolloval na koniec vlákna: sentinel je vo výhľade a každý žijúci observer to oznámi. */
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

/** Otvorí zoznam a rozbalí vlákno prvého komentára: náhľad 10 odpovedí a sentinel pre zvyšných 5. */
async function openThread(postId = 5) {
  const view = render(<FeedPostComments postId={postId} />);
  await frames(2);
  expect(screen.getByText('Hlavný')).toBeInTheDocument();
  await act(async () => {
    fireEvent.click(screen.getByTestId(TOGGLE));
  });
  await frames(2);
  expect(screen.getByTestId(SENTINEL)).toBeInTheDocument();
  return view;
}

describe('FeedPostComments – zastaraná chyba pri donačítavaní odpovedí', () => {
  const originalObserver = (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver;

  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    mockedList.mockReset();
    mockedReplies.mockReset();
    mockedCreate.mockReset();
    toastError.mockReset();
    connection.replies = 'ok';
    sentinelVisible = false;
    registrations = [];
    (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver = InitialNotifyObserver;
    mockedList.mockResolvedValue(PAGE_ONE);
    mockedReplies.mockImplementation(() => {
      if (connection.replies === 'hang') {
        return new Promise((_resolve, reject) => {
          rejectHanging = reject;
        });
      }
      return connection.replies === 'ok'
        ? Promise.resolve({ results: BATCH, next: null, previous: null })
        : networkError();
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver = originalObserver;
  });

  it('zlyhanie dopytu z predchádzajúceho príspevku nepozastaví odpovede nového príspevku', async () => {
    const { rerender } = await openThread(5);
    connection.replies = 'hang';
    await scrollToEnd();
    await frames(5);
    expect(replyRequests()).toBe(1);

    // Čitateľ prejde na iný príspevok, kým dopyt toho prvého ešte beží.
    rerender(<FeedPostComments postId={6} />);
    await frames(4);
    expect(screen.getByText('Hlavný')).toBeInTheDocument();

    // Starý dopyt zlyhá až teraz, spojenie je už v poriadku.
    connection.replies = 'ok';
    await act(async () => {
      rejectHanging(new Error('Network Error'));
    });
    await frames(20);

    // Koniec vlákna nového príspevku je vo výhľade a jeho odpovede sa donačítajú samy; staré zlyhanie ich nezastavilo.
    expect(replyRequests()).toBe(2);
    expect(mockedReplies).toHaveBeenLastCalledWith(6, 1, { after: 101, pageSize: 10 });
    expect(screen.getByText('Odpoveď 96')).toBeInTheDocument();
  });

  it('po zlyhaní zneplatnenom mutáciou sa slučka nevráti: najviac jeden ďalší pokus, potom pozastavenie', async () => {
    await openThread();
    connection.replies = 'hang';
    await scrollToEnd();
    await frames(5);
    expect(replyRequests()).toBe(1);

    // Čitateľ pridá komentár: rozbehnutý dopyt je zastaraný.
    mockedCreate.mockResolvedValue(comment(999, 'Nový'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Nový' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pridať' }));
    await frames(5);
    expect(mockedCreate).toHaveBeenCalledTimes(1);

    // Zastaraný dopyt zlyhá bez siete. Zastaranú chybu nič nepozastaví, takže koniec vlákna, ktorý je stále vo výhľade,
    // skúsi dopyt znova; keď zlyhá aj ten (už aktuálny), donačítavanie sa pozastaví.
    connection.replies = 'down';
    await act(async () => {
      rejectHanging(new Error('Network Error'));
    });
    await frames(30);
    expect(replyRequests()).toBe(2);
    const toastsAfterPause = toastError.mock.calls.length;

    await frames(120);
    expect(replyRequests()).toBe(2);
    expect(toastError).toHaveBeenCalledTimes(toastsAfterPause);
  });
});
