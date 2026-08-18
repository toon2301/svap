/**
 * Optimistický lajk komentára – rovnaké správanie ako lajk príspevku:
 * okamžitá zmena, dorovnanie podľa servera, revert pri zlyhaní, guard
 * proti dvojkliku.
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import FeedCommentLikeButton from '../FeedCommentLikeButton';
import {
  likeFeedPostComment,
  unlikeFeedPostComment,
  type FeedPostComment,
} from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback }),
}));

const mockedLike = likeFeedPostComment as jest.MockedFunction<
  typeof likeFeedPostComment
>;
const mockedUnlike = unlikeFeedPostComment as jest.MockedFunction<
  typeof unlikeFeedPostComment
>;
const mockedToastError = toast.error as jest.MockedFunction<typeof toast.error>;

function comment(overrides: Partial<FeedPostComment> = {}): FeedPostComment {
  return {
    id: 7,
    text: 'Komentár',
    author: {
      id: 1,
      display_name: 'Jana',
      slug: 'jana',
      user_type: 'individual',
      avatar_url: null,
    },
    can_delete: false,
    likes_count: 2,
    is_liked_by_me: false,
    created_at: '2026-01-01',
    ...overrides,
  } as FeedPostComment;
}

describe('FeedCommentLikeButton', () => {
  beforeEach(() => {
    mockedLike.mockReset();
    mockedUnlike.mockReset();
    mockedToastError.mockReset();
  });

  it('bumps the count before the request resolves', async () => {
    let resolveLike: (value: never) => void = () => {};
    mockedLike.mockImplementation(
      () => new Promise((resolve) => {
        resolveLike = resolve as (value: never) => void;
      }),
    );

    render(<FeedCommentLikeButton postId={5} comment={comment()} />);
    const button = screen.getByTestId('feed-comment-like-7');
    // Počet je od zavedenia zoznamu lajkujúcich samostatné tlačidlo vedľa
    // prepínača (vnorené tlačidlo by bolo neplatné HTML).
    const count = () => screen.queryByTestId('feed-comment-like-count-7');
    expect(count()).toHaveTextContent('2');

    await userEvent.click(button);

    // Request ešte beží – počet už musí byť zvýšený.
    expect(count()).toHaveTextContent('3');
    expect(button).toHaveAttribute('aria-pressed', 'true');

    await act(async () => {
      resolveLike({ comment_id: 7, is_liked_by_me: true, likes_count: 9 } as never);
    });

    // Server je zdroj pravdy – iný divák mohol medzitým lajknúť tiež.
    await waitFor(() => expect(count()).toHaveTextContent('9'));
  });

  it('reverts and warns when the request fails', async () => {
    mockedLike.mockRejectedValue(new Error('boom'));

    render(<FeedCommentLikeButton postId={5} comment={comment()} />);
    const button = screen.getByTestId('feed-comment-like-7');
    // Počet je od zavedenia zoznamu lajkujúcich samostatné tlačidlo vedľa
    // prepínača (vnorené tlačidlo by bolo neplatné HTML).
    const count = () => screen.queryByTestId('feed-comment-like-count-7');

    await userEvent.click(button);

    await waitFor(() => expect(count()).toHaveTextContent('2'));
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(mockedToastError).toHaveBeenCalledWith('Akciu sa nepodarilo uložiť.');
  });

  it('unlikes an already liked comment', async () => {
    mockedUnlike.mockResolvedValue({
      comment_id: 7,
      is_liked_by_me: false,
      likes_count: 1,
    });

    render(
      <FeedCommentLikeButton
        postId={5}
        comment={comment({ is_liked_by_me: true })}
      />,
    );
    const button = screen.getByTestId('feed-comment-like-7');
    // Počet je od zavedenia zoznamu lajkujúcich samostatné tlačidlo vedľa
    // prepínača (vnorené tlačidlo by bolo neplatné HTML).
    const count = () => screen.queryByTestId('feed-comment-like-count-7');
    expect(button).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(button);

    expect(mockedUnlike).toHaveBeenCalledWith(5, 7);
    expect(mockedLike).not.toHaveBeenCalled();
    await waitFor(() => expect(count()).toHaveTextContent('1'));
  });

  it('ignores a second click while the first is in flight', async () => {
    let resolveLike: (value: never) => void = () => {};
    mockedLike.mockImplementation(
      () => new Promise((resolve) => {
        resolveLike = resolve as (value: never) => void;
      }),
    );

    render(<FeedCommentLikeButton postId={5} comment={comment()} />);
    const button = screen.getByTestId('feed-comment-like-7');

    await userEvent.click(button);
    await userEvent.click(button);

    // Bez guardu by druhý klik odoslal unlike a stav by sa rozišiel so serverom.
    expect(mockedLike).toHaveBeenCalledTimes(1);
    expect(mockedUnlike).not.toHaveBeenCalled();

    await act(async () => {
      resolveLike({ comment_id: 7, is_liked_by_me: true, likes_count: 3 } as never);
    });
  });

  it('hides the number when nobody liked yet', () => {
    render(
      <FeedCommentLikeButton postId={5} comment={comment({ likes_count: 0 })} />,
    );

    const button = screen.getByTestId('feed-comment-like-7');
    expect(button).not.toHaveTextContent('0');
    // Prístupné meno nesie počet aj vtedy, keď sa číslo nevykresľuje.
    expect(button).toHaveAttribute('aria-label', 'Páči sa mi komentár: 0');
  });
});
