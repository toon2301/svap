/**
 * Odpovede v novom poradí: najnovšie hore, staršie sa dopĺňajú smerom nadol.
 *
 * Nahrádza pôvodný súbor „vlákno s medzerou". Ten overoval sledovanie
 * súvislého úseku (`replyReachRef`) – mechanizmus, ktorý existoval len preto,
 * že v starom poradí (najstaršie hore) pribúdali nové odpovede ZA načítaným
 * koncom a robili v zozname dieru. Pri novom smere pribúdajú NAVRCH, kotvou je
 * jednoducho najstaršia načítaná odpoveď a medzera nemá ako vzniknúť, takže
 * tie testy stratili predmet. Ostáva to, čo platí ďalej: smer, poradie,
 * pokračovanie kurzora a hľadanie starého cieľa.
 */

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostComments from '../FeedPostComments';
import { installFiringIntersectionObserver } from '../feedObserverTestUtils';
import {
  createFeedPostComment,
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
  updateFeedPostComment: jest.fn(),
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

jest.mock('@/hooks', () => ({
  useIsMobile: () => false,
  useIsMobileState: () => ({ isMobile: false, isResolved: true }),
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

/** Odpoveď s časom odvodeným od id – server radí podľa (created_at, id). */
function reply(id: number, parentId = 1, createdAt?: string): FeedPostComment {
  const minute = String(id % 100).padStart(2, '0');
  return {
    id,
    text: `R${id}`,
    author,
    can_delete: false,
    likes_count: 0,
    is_liked_by_me: false,
    parent_comment_id: parentId,
    created_at: createdAt ?? `2026-01-01T10:${minute}:00Z`,
  } as FeedPostComment;
}

function comment(replies: FeedPostComment[], repliesCount: number) {
  return {
    id: 1,
    text: 'Hlavný',
    author,
    can_delete: false,
    likes_count: 0,
    is_liked_by_me: false,
    parent_comment_id: null,
    replies,
    replies_count: repliesCount,
    created_at: '2026-01-01T09:00:00Z',
  } as FeedPostComment;
}

function page(results: FeedPostComment[], count: number) {
  return { results, next: null, previous: null, count };
}

/** Celé vlákno od najnovšej po najstaršiu, tak ako ho posiela server. */
const THREAD = Array.from({ length: 15 }, (_, i) => reply(115 - i));
/** Náhľad = 10 NAJNOVŠÍCH. */
const PREVIEW = THREAD.slice(0, 10);

/** Server: bez kotvy od najnovšej, s kotvou pokračovanie k starším. */
function serveOlderThanAnchor(thread: FeedPostComment[]) {
  mockedReplies.mockImplementation(async (_postId, _commentId, params) => {
    const after = params?.after;
    const from =
      after == null ? 0 : thread.findIndex((item) => item.id === after) + 1;
    return {
      results: thread.slice(from, from + 10),
      next: null,
      previous: null,
    };
  });
}

function renderedReplyIds(): number[] {
  const list = screen.queryByTestId('feed-comment-replies-1');
  if (!list) return [];
  return Array.from(list.querySelectorAll('[data-comment-id]')).map((node) =>
    Number(node.getAttribute('data-comment-id')),
  );
}

let observer: ReturnType<typeof installFiringIntersectionObserver>;

beforeEach(() => {
  mockedList.mockReset();
  mockedReplies.mockReset();
  mockedCreate.mockReset();
  observer = installFiringIntersectionObserver();
});

afterEach(() => {
  observer.restore();
});

async function expandThread() {
  await screen.findByText('Hlavný');
  await userEvent.click(screen.getByTestId('feed-comment-toggle-replies-1'));
  // Sentinel vlákna sa začne sledovať až po prekreslení – bez čakania by
  // `fire` pri zaťaženom behu netrafilo nič.
  await waitFor(() => expect(observer.count()).toBeGreaterThan(0));
}

it('shows the newest replies first', async () => {
  mockedList.mockResolvedValue(page([comment(PREVIEW, 15)], 16));

  render(<FeedPostComments postId={5} />);
  await expandThread();

  expect(renderedReplyIds()).toEqual([
    115, 114, 113, 112, 111, 110, 109, 108, 107, 106,
  ]);
});

it('adds the older ones to the bottom when the sentinel comes into view', async () => {
  mockedList.mockResolvedValue(page([comment(PREVIEW, 15)], 16));
  serveOlderThanAnchor(THREAD);

  render(<FeedPostComments postId={5} />);
  await expandThread();

  await act(async () => {
    observer.fire('feed-comment-replies-sentinel-1');
  });

  // Kotvou je NAJSTARŠIA načítaná odpoveď a dávka pribudne POD ňu.
  await waitFor(() =>
    expect(mockedReplies).toHaveBeenCalledWith(5, 1, {
      after: 106,
      pageSize: 10,
    }),
  );
  await waitFor(() =>
    expect(renderedReplyIds()).toEqual([
      115, 114, 113, 112, 111, 110, 109, 108, 107, 106, 105, 104, 103, 102, 101,
    ]),
  );
});

it('puts an own reply on top and keeps paging from the oldest loaded', async () => {
  // Vlastná odpoveď je najnovšia, takže ide NAVRCH – pod kotvou (najstaršou
  // načítanou) tým pádom nevzniká medzera a ďalšia dávka pokračuje správne.
  mockedList.mockResolvedValue(page([comment(PREVIEW, 15)], 16));
  mockedCreate.mockResolvedValue(reply(116));
  serveOlderThanAnchor([reply(116), ...THREAD]);

  render(<FeedPostComments postId={5} />);
  await expandThread();

  await userEvent.click(screen.getByTestId('feed-comment-reply-1'));
  const composer = await screen.findByTestId('feed-reply-composer');
  await userEvent.type(within(composer).getByRole('textbox'), 'Moja');
  await userEvent.click(screen.getByTestId('feed-reply-submit'));

  await waitFor(() => expect(renderedReplyIds()[0]).toBe(116));

  await act(async () => {
    observer.fire('feed-comment-replies-sentinel-1');
  });

  await waitFor(() =>
    expect(mockedReplies).toHaveBeenCalledWith(5, 1, {
      after: 106,
      pageSize: 10,
    }),
  );
  await waitFor(() => expect(renderedReplyIds()).toHaveLength(16));
  // Najnovšia hore, najstaršia dole.
  expect(renderedReplyIds()[0]).toBe(116);
  expect(renderedReplyIds()[15]).toBe(101);
});

it('keeps paging down without refetching the same batch', async () => {
  const thread = Array.from({ length: 25 }, (_, i) => reply(125 - i));
  mockedList.mockResolvedValue(page([comment(thread.slice(0, 10), 25)], 26));
  serveOlderThanAnchor(thread);

  render(<FeedPostComments postId={5} />);
  await expandThread();

  await act(async () => {
    observer.fire('feed-comment-replies-sentinel-1');
  });
  await waitFor(() => expect(renderedReplyIds()).toHaveLength(20));

  await act(async () => {
    observer.fire('feed-comment-replies-sentinel-1');
  });
  await waitFor(() => expect(renderedReplyIds()).toHaveLength(25));

  // Druhá kotva pokračuje za koncom prvej dávky, nie znova za náhľadom.
  expect(mockedReplies.mock.calls.map((call) => call[2]?.after)).toEqual([
    116, 106,
  ]);
});

it('orders by created_at, not by id, when the two disagree', async () => {
  // Poistka pre prípad, že id nekopíruje čas vzniku (posun hodín, import).
  const preview = reply(300, 1, '2026-01-01T10:05:00Z');
  const mine = reply(200, 1, '2026-01-01T10:09:00Z');
  const older = reply(400, 1, '2026-01-01T10:01:00Z');
  mockedList.mockResolvedValue(page([comment([preview], 3)], 4));
  mockedCreate.mockResolvedValue(mine);
  mockedReplies.mockResolvedValue({
    results: [older],
    next: null,
    previous: null,
  });

  render(<FeedPostComments postId={5} />);
  await expandThread();

  await userEvent.click(screen.getByTestId('feed-comment-reply-1'));
  const composer = await screen.findByTestId('feed-reply-composer');
  await userEvent.type(within(composer).getByRole('textbox'), 'Moja');
  await userEvent.click(screen.getByTestId('feed-reply-submit'));
  await waitFor(() => expect(renderedReplyIds()).toEqual([200, 300]));

  await act(async () => {
    observer.fire('feed-comment-replies-sentinel-1');
  });

  // Podľa času: 10:09, 10:05, 10:01. Podľa id by vyšlo 400, 300, 200.
  await waitFor(() => expect(renderedReplyIds()).toEqual([200, 300, 400]));
});

it('keeps two expanded threads loading independently', async () => {
  // Dva rozbalené vlákna naraz: každé má vlastný sentinel, takže donačítanie
  // jedného nesmie spustiť to druhé.
  const first = Array.from({ length: 15 }, (_, i) => reply(115 - i, 1));
  const second = Array.from({ length: 15 }, (_, i) => reply(215 - i, 2));
  mockedList.mockResolvedValue({
    results: [
      { ...comment(first.slice(0, 10), 15), id: 1, text: 'Prvý' },
      { ...comment(second.slice(0, 10), 15), id: 2, text: 'Druhý' },
    ],
    next: null,
    previous: null,
    count: 32,
  });
  mockedReplies.mockImplementation(async (_postId, commentId, params) => {
    const thread = commentId === 1 ? first : second;
    const after = params?.after;
    const from =
      after == null ? 0 : thread.findIndex((item) => item.id === after) + 1;
    return { results: thread.slice(from, from + 10), next: null, previous: null };
  });

  render(<FeedPostComments postId={5} />);
  await screen.findByText('Prvý');
  await userEvent.click(screen.getByTestId('feed-comment-toggle-replies-1'));
  await userEvent.click(screen.getByTestId('feed-comment-toggle-replies-2'));
  await waitFor(() => expect(observer.count()).toBeGreaterThan(1));

  await act(async () => {
    observer.fire('feed-comment-replies-sentinel-2');
  });

  // Dotiahlo sa LEN druhé vlákno.
  await waitFor(() => expect(mockedReplies).toHaveBeenCalledTimes(1));
  expect(mockedReplies).toHaveBeenCalledWith(5, 2, { after: 206, pageSize: 10 });

  const idsIn = (commentId: number) =>
    Array.from(
      screen
        .getByTestId(`feed-comment-replies-${commentId}`)
        .querySelectorAll('[data-comment-id]'),
    ).map((node) => Number(node.getAttribute('data-comment-id')));

  await waitFor(() => expect(idsIn(2)).toHaveLength(15));
  expect(idsIn(1)).toHaveLength(10);

  // A teraz to prvé – nezávisle.
  await act(async () => {
    observer.fire('feed-comment-replies-sentinel-1');
  });
  await waitFor(() => expect(idsIn(1)).toHaveLength(15));
  expect(mockedReplies).toHaveBeenLastCalledWith(5, 1, {
    after: 106,
    pageSize: 10,
  });
});

it('pages down to find an older reply from a notification', async () => {
  // Cieľ (102) je hlboko v histórii vlákna – appka sa k nemu musí prehrýzť
  // smerom nadol.
  mockedList.mockResolvedValue(page([comment(PREVIEW, 15)], 16));
  serveOlderThanAnchor(THREAD);

  render(<FeedPostComments postId={5} highlightCommentId={102} />);
  await screen.findByText('Hlavný');

  await waitFor(() => expect(renderedReplyIds()).toContain(102), {
    timeout: 8000,
  });
  expect(mockedReplies).toHaveBeenCalledWith(5, 1, {
    after: 106,
    pageSize: 10,
  });
}, 15000);
