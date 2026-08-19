/**
 * Odpovede na komentáre – jedna úroveň vnorenia.
 *
 * Overuje sa: vnorené zobrazenie, „Odpovedať" len pri vrcholových komentároch,
 * odoslanie odpovede pod správneho rodiča, zachytenie cudzej odpovede
 * pollingom a scroll-to-comment na odpoveď.
 */

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostComments from '../FeedPostComments';
import { COMMENTS_POLL_INTERVAL_MS } from '../useFeedCommentsPolling';
import {
  createFeedPostComment,
  listFeedPostComments,
  type FeedPostComment,
} from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  listFeedPostComments: jest.fn(),
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

function comment(
  id: number,
  text: string,
  replies: FeedPostComment[] = [],
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

function page(results: FeedPostComment[], count?: number) {
  return {
    results,
    next: null,
    previous: null,
    count: count ?? results.length,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

it('shows replies nested under their parent comment', async () => {
  mockedList.mockResolvedValue(
    page([
      comment(1, 'Hlavný', [reply(2, 'Odpoveď na prvý', 1)]),
      comment(3, 'Druhý hlavný'),
    ]),
  );

  render(<FeedPostComments postId={5} />);
  await screen.findByText('Hlavný');

  const nested = screen.getByTestId('feed-comment-replies-1');
  expect(within(nested).getByText('Odpoveď na prvý')).toBeInTheDocument();
  // Odpoveď patrí pod prvý komentár, nie pod druhý.
  expect(
    screen.queryByTestId('feed-comment-replies-3'),
  ).not.toBeInTheDocument();
});

it('offers Reply on top-level comments only', async () => {
  mockedList.mockResolvedValue(
    page([comment(1, 'Hlavný', [reply(2, 'Odpoveď', 1)])]),
  );

  render(<FeedPostComments postId={5} />);
  await screen.findByText('Hlavný');

  expect(screen.getByTestId('feed-comment-reply-1')).toBeInTheDocument();
  // Na odpoveď sa už odpovedať nedá – tlačidlo pri nej nie je vôbec.
  expect(screen.queryByTestId('feed-comment-reply-2')).not.toBeInTheDocument();
});

it('posts a reply under the right parent and shows it nested', async () => {
  mockedList.mockResolvedValue(page([comment(1, 'Hlavný'), comment(3, 'Iný')]));
  mockedCreate.mockResolvedValue(reply(9, 'Moja odpoveď', 1));

  render(<FeedPostComments postId={5} />);
  await screen.findByText('Hlavný');

  await userEvent.click(screen.getByTestId('feed-comment-reply-1'));
  const composer = await screen.findByTestId('feed-reply-composer');
  await userEvent.type(within(composer).getByRole('textbox'), 'Moja odpoveď');
  await userEvent.click(screen.getByTestId('feed-reply-submit'));

  await waitFor(() =>
    expect(mockedCreate).toHaveBeenCalledWith(5, 'Moja odpoveď', 1),
  );
  const nested = await screen.findByTestId('feed-comment-replies-1');
  expect(within(nested).getByText('Moja odpoveď')).toBeInTheDocument();
  // Pole sa po odoslaní zavrie.
  await waitFor(() =>
    expect(screen.queryByTestId('feed-reply-composer')).not.toBeInTheDocument(),
  );
});

it('closes the reply box on cancel without sending anything', async () => {
  mockedList.mockResolvedValue(page([comment(1, 'Hlavný')]));

  render(<FeedPostComments postId={5} />);
  await screen.findByText('Hlavný');

  await userEvent.click(screen.getByTestId('feed-comment-reply-1'));
  await screen.findByTestId('feed-reply-composer');
  await userEvent.click(screen.getByRole('button', { name: 'Zrušiť' }));

  expect(screen.queryByTestId('feed-reply-composer')).not.toBeInTheDocument();
  expect(mockedCreate).not.toHaveBeenCalled();
});

it('picks up a reply written by someone else through polling', async () => {
  jest.useFakeTimers();
  try {
    mockedList
      .mockResolvedValueOnce(page([comment(1, 'Hlavný')], 1))
      .mockResolvedValue(
        page([comment(1, 'Hlavný', [reply(7, 'Cudzia odpoveď', 1)])], 2),
      );

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Hlavný');

    await act(async () => {
      jest.advanceTimersByTime(COMMENTS_POLL_INTERVAL_MS + 50);
    });

    // Odpoveď príde vnorená v obnovenom rodičovi – bez akcie používateľa.
    expect(await screen.findByText('Cudzia odpoveď')).toBeInTheDocument();
  } finally {
    jest.useRealTimers();
  }
});

it('scrolls to and highlights a reply from a notification', async () => {
  const scrollIntoView = jest.fn();
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    value: scrollIntoView,
    configurable: true,
    writable: true,
  });
  mockedList.mockResolvedValue(
    page([comment(1, 'Hlavný', [reply(42, 'Hľadaná odpoveď', 1)])]),
  );

  render(<FeedPostComments postId={5} highlightCommentId={42} />);
  await screen.findByText('Hľadaná odpoveď');

  // Cieľom notifikácie môže byť aj odpoveď – nie len vrcholový komentár.
  await waitFor(() => {
    expect(scrollIntoView).toHaveBeenCalled();
    expect(
      document.querySelector('[data-comment-id="42"]')?.className,
    ).toContain('bg-purple-100/80');
  });
});
