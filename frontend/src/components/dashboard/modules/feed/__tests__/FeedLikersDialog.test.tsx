/**
 * Pokrytie zoznamu ľudí, čo dali lajk.
 *
 * Overuje sa: klik na počet otvorí dialóg so správnym zdrojom (príspevok vs.
 * komentár), klik na osobu naviguje na profil, blokovaný sa v zozname
 * nezobrazí (backend ho neposiela) a nulový počet nie je interaktívny.
 */

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedLikersDialog from '../FeedLikersDialog';
import FeedCommentLikeButton from '../FeedCommentLikeButton';
import {
  listFeedCommentLikers,
  listFeedPostLikers,
  type FeedPostComment,
} from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  listFeedPostLikers: jest.fn(),
  listFeedCommentLikers: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback, locale: 'sk' }),
}));

const mockedPostLikers = listFeedPostLikers as jest.MockedFunction<
  typeof listFeedPostLikers
>;
const mockedCommentLikers = listFeedCommentLikers as jest.MockedFunction<
  typeof listFeedCommentLikers
>;

function liker(id: number, name: string, slug = `u${id}`) {
  return {
    id,
    display_name: name,
    slug,
    user_type: 'individual',
    avatar_url: null,
  };
}

function page(results: ReturnType<typeof liker>[], next: string | null = null) {
  return { results, next, previous: null };
}

beforeEach(() => {
  jest.clearAllMocks();
});

it('lists the people who liked the post', async () => {
  mockedPostLikers.mockResolvedValue(page([liker(1, 'Jana'), liker(2, 'Peter')]));

  render(<FeedLikersDialog open onClose={jest.fn()} postId={5} />);

  expect(await screen.findByText('Jana')).toBeInTheDocument();
  expect(screen.getByText('Peter')).toBeInTheDocument();
  expect(mockedPostLikers).toHaveBeenCalledWith(5, expect.anything());
  expect(mockedCommentLikers).not.toHaveBeenCalled();
});

it('uses the comment source when a comment id is given', async () => {
  mockedCommentLikers.mockResolvedValue(page([liker(3, 'Zuzana')]));

  render(<FeedLikersDialog open onClose={jest.fn()} postId={5} commentId={9} />);

  expect(await screen.findByText('Zuzana')).toBeInTheDocument();
  expect(mockedCommentLikers).toHaveBeenCalledWith(5, 9, expect.anything());
  expect(mockedPostLikers).not.toHaveBeenCalled();
});

it('does not show someone the backend filtered out', async () => {
  // Blokovanie rieši backend – dialóg zobrazí presne to, čo dostane.
  mockedPostLikers.mockResolvedValue(page([liker(1, 'Jana')]));

  render(<FeedLikersDialog open onClose={jest.fn()} postId={5} />);

  await screen.findByText('Jana');
  expect(screen.queryByText('Blokovaný')).not.toBeInTheDocument();
});

it('navigates to the profile of the person clicked', async () => {
  mockedPostLikers.mockResolvedValue(page([liker(1, 'Jana', 'jana')]));
  const onClose = jest.fn();
  const events: CustomEvent[] = [];
  const listener = (event: Event) => events.push(event as CustomEvent);
  window.addEventListener('goToUserProfile', listener);

  try {
    render(<FeedLikersDialog open onClose={onClose} postId={5} />);
    await screen.findByText('Jana');

    await userEvent.click(screen.getByTestId('feed-liker-1'));

    expect(events).toHaveLength(1);
    expect(events[0].detail).toMatchObject({ identifier: 'jana' });
    // Dialóg sa pri odchode zavrie, nech neostane visieť nad profilom.
    expect(onClose).toHaveBeenCalled();
  } finally {
    window.removeEventListener('goToUserProfile', listener);
  }
});

it('loads further pages from a button, not by scrolling', async () => {
  mockedPostLikers
    .mockResolvedValueOnce(page([liker(1, 'Jana')], 'http://api.test/next'))
    .mockResolvedValueOnce(page([liker(2, 'Peter')]));

  render(<FeedLikersDialog open onClose={jest.fn()} postId={5} />);
  await screen.findByText('Jana');

  await userEvent.click(screen.getByTestId('feed-likers-load-more'));

  expect(await screen.findByText('Peter')).toBeInTheDocument();
  expect(mockedPostLikers).toHaveBeenLastCalledWith(5, {
    cursorUrl: 'http://api.test/next',
  });
  // Po poslednej stránke tlačidlo zmizne.
  await waitFor(() =>
    expect(screen.queryByTestId('feed-likers-load-more')).not.toBeInTheDocument(),
  );
});

// --- interaktivita počtu ----------------------------------------------------

function comment(likes: number): FeedPostComment {
  return {
    id: 7,
    text: 'Komentár',
    author: liker(1, 'Jana'),
    can_delete: false,
    likes_count: likes,
    is_liked_by_me: false,
    created_at: '2026-01-01',
  } as unknown as FeedPostComment;
}

it('opens the dialog from a comment like count', async () => {
  mockedCommentLikers.mockResolvedValue(page([liker(1, 'Jana')]));

  render(<FeedCommentLikeButton postId={5} comment={comment(2)} />);

  await act(async () => {
    screen.getByTestId('feed-comment-like-count-7').click();
  });

  expect(await screen.findByTestId('feed-likers-dialog')).toBeInTheDocument();
  const dialog = screen.getByTestId('feed-likers-dialog');
  expect(within(dialog).getByText('Jana')).toBeInTheDocument();
});

it('leaves a zero count non-interactive', () => {
  render(<FeedCommentLikeButton postId={5} comment={comment(0)} />);

  // Pri nule sa počet vôbec nevykreslí, takže nie je čo otvoriť ani prázdny
  // dialóg zobraziť.
  expect(
    screen.queryByTestId('feed-comment-like-count-7'),
  ).not.toBeInTheDocument();
  expect(screen.queryByTestId('feed-likers-dialog')).not.toBeInTheDocument();
});
