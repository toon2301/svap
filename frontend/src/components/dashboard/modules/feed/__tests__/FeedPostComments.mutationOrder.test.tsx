/**
 * Poradie zneplatnenia načítania voči odpovedi servera pri mutáciách komentárov (medzera z K42, mutácie A1o až A4o a A1f).
 *
 * Pridanie, úprava, odpoveď aj zmazanie komentára zneplatnia rozbehnuté načítanie (`loadSeqRef += 1`) až vtedy, keď
 * server na mutáciu odpovie, a len pri úspechu. Kto by zápis presunul pred volanie API (alebo ho nechal aj po zlyhaní),
 * zahodí odpoveď pollingu či prvého načítania, ktorá dobehne počas čakania na server: komentáre od iných ľudí sa
 * ukážu až o ďalší polling a prvé načítanie sa zbytočne zopakuje (nález 338, K41).
 *
 * Testy používajú len verejné rozhranie komponentu (DOM, `data-testid`, volania atrap `feedApi`) a mockujú len vonkajšie
 * moduly. Odpovede API sú riadené ručne (odložené sľuby), aby sa dal pevne určiť okamih, kedy ktorá dobehne.
 */

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedPostComments from '../FeedPostComments';
import { COMMENTS_POLL_INTERVAL_MS } from '../useFeedCommentsPolling';
import {
  createFeedPostComment,
  deleteFeedPostComment,
  listFeedPostComments,
  updateFeedPostComment,
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
const mockedUpdate = updateFeedPostComment as jest.MockedFunction<typeof updateFeedPostComment>;
const mockedDelete = deleteFeedPostComment as jest.MockedFunction<typeof deleteFeedPostComment>;

const author = { id: 1, display_name: 'Jana', slug: 'jana', user_type: 'individual', avatar_url: null };

function comment(id: number, text: string, overrides: Partial<FeedPostComment> = {}): FeedPostComment {
  return {
    id,
    text,
    author,
    can_delete: true,
    can_edit: true,
    likes_count: 0,
    is_liked_by_me: false,
    parent_comment_id: null,
    replies: [],
    replies_count: 0,
    created_at: '2026-01-01',
    ...overrides,
  } as FeedPostComment;
}

function page(results: FeedPostComment[]): FeedCommentPage {
  return { results, next: null, previous: null, count: results.length };
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

/** Spustí jednu mutáciu cez rozhranie a nechá odpoveď servera visieť; vráti funkciu, ktorá ju dokončí úspechom. */
type Action = { name: string; start: () => Promise<() => Promise<void>> };

const ACTIONS: Action[] = [
  {
    name: 'pridanie komentára',
    async start() {
      const response = deferred<FeedPostComment>();
      mockedCreate.mockReturnValueOnce(response.promise);
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Nový komentár' } });
      fireEvent.click(screen.getByRole('button', { name: 'Pridať' }));
      await flush();
      expect(mockedCreate).toHaveBeenCalledTimes(1);
      return () => act(async () => response.resolve(comment(900, 'Nový komentár')));
    },
  },
  {
    name: 'úprava komentára',
    async start() {
      const response = deferred<FeedPostComment>();
      mockedUpdate.mockReturnValueOnce(response.promise);
      fireEvent.click(screen.getByTestId('feed-comment-edit-1'));
      const editor = screen.getByTestId('feed-comment-edit-composer-1');
      fireEvent.change(within(editor).getByRole('textbox'), { target: { value: 'Upravený text' } });
      fireEvent.click(screen.getByTestId('feed-comment-edit-submit'));
      await flush();
      expect(mockedUpdate).toHaveBeenCalledTimes(1);
      return () => act(async () => response.resolve(comment(1, 'Upravený text', { is_edited: true })));
    },
  },
  {
    name: 'odpoveď na komentár',
    async start() {
      const response = deferred<FeedPostComment>();
      mockedCreate.mockReturnValueOnce(response.promise);
      fireEvent.click(screen.getByTestId('feed-comment-reply-1'));
      const composer = screen.getByTestId('feed-reply-composer');
      fireEvent.change(within(composer).getByRole('textbox'), { target: { value: 'Moja odpoveď' } });
      fireEvent.click(screen.getByTestId('feed-reply-submit'));
      await flush();
      expect(mockedCreate).toHaveBeenCalledTimes(1);
      return () => act(async () => response.resolve(comment(901, 'Moja odpoveď', { parent_comment_id: 1 })));
    },
  },
  {
    name: 'zmazanie komentára',
    async start() {
      const response = deferred<void>();
      mockedDelete.mockReturnValueOnce(response.promise);
      fireEvent.click(screen.getByRole('button', { name: 'Zmazať komentár' }));
      fireEvent.click(screen.getByTestId('feed-comment-delete-confirm-action'));
      await flush();
      expect(mockedDelete).toHaveBeenCalledTimes(1);
      return () => act(async () => response.resolve());
    },
  },
];

describe('FeedPostComments – poradie zneplatnenia načítania pri mutáciách', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    mockedList.mockReset();
    mockedCreate.mockReset();
    mockedUpdate.mockReset();
    mockedDelete.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe.each(ACTIONS)('$name', ({ start }) => {
    it('odpoveď pollingu, ktorá dobehne počas čakania na server, sa použije', async () => {
      const poll = deferred<FeedCommentPage>();
      mockedList
        .mockResolvedValueOnce(page([comment(1, 'Môj komentár')]))
        .mockReturnValueOnce(poll.promise);
      render(<FeedPostComments postId={5} />);
      await screen.findByText('Môj komentár');

      // Polling sa rozbehne skôr, než používateľ odošle mutáciu.
      await act(async () => {
        jest.advanceTimersByTime(COMMENTS_POLL_INTERVAL_MS + 50);
      });
      expect(mockedList).toHaveBeenCalledTimes(2);

      const finish = await start();

      // Server na mutáciu ešte neodpovedal a odpoveď pollingu už je tu: komentár od iného človeka sa ukáže hneď.
      await act(async () => poll.resolve(page([comment(200, 'Cudzí komentár', { can_edit: false, can_delete: false }), comment(1, 'Môj komentár')])));
      expect(screen.getByText('Cudzí komentár')).toBeInTheDocument();

      await finish();
    });
  });

  it('zlyhané pridanie komentára nezneplatní prvé načítanie, ktoré ešte beží', async () => {
    const firstLoad = deferred<FeedCommentPage>();
    const created = deferred<FeedPostComment>();
    mockedList.mockReturnValueOnce(firstLoad.promise).mockResolvedValue(page([comment(1, 'Môj komentár')]));
    mockedCreate.mockReturnValueOnce(created.promise);
    render(<FeedPostComments postId={5} />);

    // Zoznam sa ešte načítava, používateľ medzitým odošle komentár a server ho odmietne.
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Nový komentár' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pridať' }));
    await flush();
    await act(async () => created.reject({ response: { status: 500, data: {} } }));

    await act(async () => firstLoad.resolve(page([comment(1, 'Môj komentár')])));

    // Odpoveď prvého načítania platí, takže sa zoznam neprenačítava.
    expect(screen.getByText('Môj komentár')).toBeInTheDocument();
    expect(mockedList).toHaveBeenCalledTimes(1);
  });
});
