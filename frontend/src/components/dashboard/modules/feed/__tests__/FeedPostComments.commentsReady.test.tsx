/**
 * Signál `onCommentsReady` (poistka pred delením, nález 333).
 *
 * Mobilný detail príspevku po otvorení doscrolluje na komentáre, ale až keď je
 * zoznam VYKRESLENÝ: v stave „Načítavam…" je obsah plochy kratší než ona sama
 * a scroll by sa ticho zahodil. Komponent preto ohlási „hotovo" raz na
 * príspevok, až po commite s komentármi v DOM, a pri neúspešnom načítaní
 * vôbec – nie je čo ukázať a doscrollovať sa nemá kam.
 *
 * Testy používajú len verejné rozhranie komponentu (props, DOM) a mockujú len
 * vonkajšie moduly, takže platia aj po každom kroku delenia súboru.
 */

import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
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
  listFeedPostComments: jest.fn(),
  listFeedCommentReplies: jest.fn(),
  updateFeedPostComment: jest.fn(),
  createFeedPostComment: jest.fn(),
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
  DesktopEmojiPickerButton: ({ ariaLabel }: { ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel}>
      emoji
    </button>
  ),
}));

const mockedList = listFeedPostComments as jest.MockedFunction<
  typeof listFeedPostComments
>;
const mockedCreate = createFeedPostComment as jest.MockedFunction<
  typeof createFeedPostComment
>;

const author = {
  id: 1,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

function comment(id: number, text: string): FeedPostComment {
  return {
    id,
    text,
    author,
    can_delete: false,
    likes_count: 0,
    is_liked_by_me: false,
    parent_comment_id: null,
    replies: [],
    replies_count: 0,
    created_at: '2026-01-01',
  } as FeedPostComment;
}

function page(results: FeedPostComment[]): FeedCommentPage {
  return { results, next: null, previous: null, count: results.length };
}

/** Odpoveď, ktorú test podrží a pustí, až keď sa mu to hodí. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

/** Nechá dobehnúť už vyriešené promise a následné prekreslenia. */
async function settle() {
  await act(async () => {
    for (let i = 0; i < 20; i += 1) await Promise.resolve();
  });
}

describe('FeedPostComments – signál onCommentsReady', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockedList.mockReset();
    mockedCreate.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('signals once, only after the list is drawn', async () => {
    const slowList = deferred<FeedCommentPage>();
    mockedList.mockImplementation(() => slowList.promise);
    // Čo bolo v DOM v okamihu signálu: komentár už vykreslený, „Načítavam…" preč.
    const stateAtSignal: Array<{
      drawn: boolean;
      loadingShown: boolean;
      scroller: HTMLElement | null;
    }> = [];
    const onCommentsReady = jest.fn((scroller: HTMLElement | null) => {
      stateAtSignal.push({
        drawn: document.querySelector('[data-comment-id="1"]') !== null,
        loadingShown: screen.queryByText('Načítavam...') !== null,
        scroller,
      });
    });

    render(<FeedPostComments postId={5} onCommentsReady={onCommentsReady} />);
    await settle();
    // Kým zoznam nie je načítaný, nie je čo ohlasovať.
    expect(screen.getByText('Načítavam...')).toBeInTheDocument();
    expect(onCommentsReady).not.toHaveBeenCalled();

    await act(async () => {
      slowList.resolve(page([comment(1, 'Prvý')]));
    });

    expect(onCommentsReady).toHaveBeenCalledTimes(1);
    expect(stateAtSignal).toHaveLength(1);
    expect(stateAtSignal[0]).toMatchObject({ drawn: true, loadingShown: false });
    // Signál nesie scrollovaciu plochu, ktorú volajúci potom posúva.
    expect(stateAtSignal[0].scroller).toBe(
      screen.getByTestId('feed-comments-scroll'),
    );
  });

  it('signals for an empty thread as well', async () => {
    mockedList.mockResolvedValue(page([]));
    const onCommentsReady = jest.fn();

    render(<FeedPostComments postId={5} onCommentsReady={onCommentsReady} />);
    await screen.findByTestId('feed-comments-empty');

    expect(onCommentsReady).toHaveBeenCalledTimes(1);
  });

  it('does not signal again after later changes', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockedList.mockResolvedValue(page([comment(1, 'Prvý')]));
    mockedCreate.mockResolvedValue(comment(2, 'Môj nový'));
    const onCommentsReady = jest.fn();

    const { rerender } = render(
      <FeedPostComments postId={5} onCommentsReady={onCommentsReady} />,
    );
    await screen.findByText('Prvý');
    expect(onCommentsReady).toHaveBeenCalledTimes(1);

    // Nový komentár, poll aj prerenderovanie s novým callbackom nič nezopakujú.
    await user.type(screen.getByRole('textbox'), 'Môj nový');
    await user.click(screen.getByRole('button', { name: 'Pridať' }));
    await within(screen.getByTestId('feed-comments-scroll')).findByText('Môj nový');
    await act(async () => {
      jest.advanceTimersByTime(COMMENTS_POLL_INTERVAL_MS + 50);
    });
    const laterCallback = jest.fn();
    rerender(<FeedPostComments postId={5} onCommentsReady={laterCallback} />);
    await settle();

    expect(onCommentsReady).toHaveBeenCalledTimes(1);
    expect(laterCallback).not.toHaveBeenCalled();
  });

  it('does not signal when the first load fails', async () => {
    mockedList.mockRejectedValue(new Error('offline'));
    const onCommentsReady = jest.fn();

    render(<FeedPostComments postId={5} onCommentsReady={onCommentsReady} />);

    expect(
      await screen.findByText('Komentáre sa nepodarilo načítať.'),
    ).toBeInTheDocument();
    await settle();
    // Nie je čo ukázať, takže sa ani nemá kam doscrollovať.
    expect(onCommentsReady).not.toHaveBeenCalled();
  });
});
