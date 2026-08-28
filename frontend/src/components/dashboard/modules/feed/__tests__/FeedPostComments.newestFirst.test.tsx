/**
 * Smer zoznamu komentárov: najnovšie hore, staršie dole.
 *
 * Overuje sa vykreslenie, vloženie vlastného komentára navrch, donačítavanie
 * k starším smerom nadol a to, že notifikácia na čerstvú odpoveď nepotrebuje
 * žiadne donačítavanie – je v dohľade hneď.
 */

import { act, render, screen, waitFor } from '@testing-library/react';
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

function comment(
  id: number,
  overrides: Partial<FeedPostComment> = {},
): FeedPostComment {
  const minute = String(id % 60).padStart(2, '0');
  return {
    id,
    text: `K${id}`,
    author,
    can_delete: false,
    likes_count: 0,
    is_liked_by_me: false,
    parent_comment_id: null,
    replies: [],
    replies_count: 0,
    created_at: `2026-01-01T10:${minute}:00Z`,
    ...overrides,
  } as FeedPostComment;
}

function reply(id: number, parentId: number): FeedPostComment {
  const minute = String(id % 60).padStart(2, '0');
  return {
    id,
    text: `R${id}`,
    author,
    can_delete: false,
    likes_count: 0,
    is_liked_by_me: false,
    parent_comment_id: parentId,
    created_at: `2026-01-01T11:${minute}:00Z`,
  } as FeedPostComment;
}

/** Id komentárov tak, ako sú vykreslené zhora nadol. */
function renderedIds(): number[] {
  return Array.from(
    screen.getByTestId('feed-comments-scroll').querySelectorAll('[data-comment-id]'),
  ).map((node) => Number(node.getAttribute('data-comment-id')));
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

it('renders the newest comment first and the oldest last', async () => {
  mockedList.mockResolvedValue({
    results: [comment(3), comment(2), comment(1)],
    next: null,
    previous: null,
    count: 3,
  });

  render(<FeedPostComments postId={5} />);
  await screen.findByText('K3');

  expect(renderedIds()).toEqual([3, 2, 1]);
});

it('puts an own comment straight on top', async () => {
  mockedList.mockResolvedValue({
    results: [comment(2), comment(1)],
    next: null,
    previous: null,
    count: 2,
  });
  mockedCreate.mockResolvedValue(comment(3, { text: 'Môj' }));

  render(<FeedPostComments postId={5} />);
  await screen.findByText('K2');

  await userEvent.type(screen.getByRole('textbox'), 'Môj');
  await userEvent.click(screen.getByRole('button', { name: 'Pridať' }));

  await waitFor(() => expect(screen.getByText('Môj')).toBeInTheDocument());
  // Vlastný komentár je najnovší, takže patrí navrch – bez čakania na poll.
  expect(renderedIds()).toEqual([3, 2, 1]);
});

it('appends older comments to the bottom when scrolling down', async () => {
  mockedList
    .mockResolvedValueOnce({
      results: [comment(4), comment(3)],
      next: 'http://api.test/c?cursor=older',
      previous: null,
      count: 4,
    })
    .mockResolvedValue({
      results: [comment(2), comment(1)],
      next: null,
      previous: null,
    });

  render(<FeedPostComments postId={5} />);
  await screen.findByText('K4');
  expect(renderedIds()).toEqual([4, 3]);

  // Sentinel sa začne sledovať až po dobehnutí prvého načítania – bez tohto
  // čakania by `fire` pri zaťaženom behu netrafilo nič.
  await waitFor(() => expect(observer.count()).toBeGreaterThan(0));
  await act(async () => {
    observer.fire('feed-comments-sentinel');
  });

  // Donačítané sú STARŠIE a idú pod už zobrazené.
  await waitFor(() => expect(renderedIds()).toEqual([4, 3, 2, 1]));
});

it('needs no paging for a notification about a fresh reply', async () => {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    value: jest.fn(),
    configurable: true,
    writable: true,
  });
  // Čerstvá odpoveď je v náhľade (najnovšie hore), takže hľadanie nemá čo
  // donačítavať – ani zoznam komentárov, ani odpovede.
  mockedList.mockResolvedValue({
    results: [
      comment(9, { replies: [reply(99, 9)], replies_count: 1 }),
      comment(8),
    ],
    next: null,
    previous: null,
    count: 3,
  });

  render(<FeedPostComments postId={5} highlightCommentId={99} />);

  await waitFor(() =>
    expect(
      document.querySelector('[data-comment-id="99"]')?.className,
    ).toContain('bg-purple-100/80'),
  );
  expect(mockedReplies).not.toHaveBeenCalled();
  // Jediné volanie je počiatočné načítanie – žiadne stránkovanie navyše.
  expect(mockedList).toHaveBeenCalledTimes(1);
});
