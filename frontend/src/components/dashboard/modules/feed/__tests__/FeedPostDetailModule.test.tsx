import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostDetailModule from '../FeedPostDetailModule';
import {
  createFeedPostComment,
  getFeedPost,
  listFeedPostComments,
  type FeedPost,
  type FeedPostComment,
} from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  getFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  parseFeedPostId: (v: unknown) => (Number(v) >= 1 ? Number(v) : null),
}));

const mockRouterPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback, locale: 'sk' }),
}));

jest.mock('../../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: ({ ariaLabel }: { ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel}>
      emoji
    </button>
  ),
}));

jest.mock('framer-motion', () => ({
  motion: {
    section: ({ children, ...props }: React.ComponentProps<'section'>) => (
      <section {...props}>{children}</section>
    ),
    article: ({ children, ...props }: React.ComponentProps<'article'>) => (
      <article {...props}>{children}</article>
    ),
  },
}));

const mockedGetPost = getFeedPost as jest.MockedFunction<typeof getFeedPost>;
const mockedListComments = listFeedPostComments as jest.MockedFunction<
  typeof listFeedPostComments
>;
const mockedCreateComment = createFeedPostComment as jest.MockedFunction<
  typeof createFeedPostComment
>;

const author = {
  id: 10,
  display_name: 'Jana Nováková',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

const post: FeedPost = {
  id: 5,
  post_type: 'free_post',
  caption: 'Ahoj feed!',
  author,
  image: null,
  shared_content: null,
  shared_content_unavailable: false,
  tagged_users: [],
  likes_count: 0,
  comments_count: 1,
  is_liked_by_me: false,
  can_manage: false,
  created_at: new Date().toISOString(),
};

function comment(id: number, text: string): FeedPostComment {
  return { id, text, author, can_delete: true, likes_count: 0, is_liked_by_me: false, created_at: '2026-01-01' };
}

describe('FeedPostDetailModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetPost.mockResolvedValue(post);
    mockedListComments.mockResolvedValue({
      results: [comment(1, 'Existujúci')],
      next: null,
      previous: null,
    });
  });

  it('opens with comments expanded', async () => {
    render(<FeedPostDetailModule postId={5} />);

    expect(await screen.findByTestId('feed-post-detail')).toBeInTheDocument();
    expect(await screen.findByText('Existujúci')).toBeInTheDocument();
  });

  it('shows a newly added comment immediately, without a reload', async () => {
    mockedCreateComment.mockResolvedValue(comment(2, 'Môj nový komentár'));

    render(<FeedPostDetailModule postId={5} />);
    const section = await screen.findByTestId('feed-post-comments');
    await within(section).findByText('Existujúci');

    await userEvent.type(
      within(section).getByRole('textbox'),
      'Môj nový komentár',
    );
    await userEvent.click(within(section).getByRole('button', { name: 'Pridať' }));

    await waitFor(() => {
      expect(within(section).getByText('Môj nový komentár')).toBeInTheDocument();
    });
    // Zoznam sa nesmie znovu načítať zo servera – nový komentár pribudne
    // do stavu, inak by po refetchi (bez neho na serveri) zmizol.
    expect(within(section).getByText('Existujúci')).toBeInTheDocument();
  });

  it('does not keep the previous post state when navigating to another post', async () => {
    // Notifikácia → detail A → iná notifikácia → detail B. Bez remountu by si
    // karta niesla lajk/počty z príspevku A.
    mockedGetPost.mockResolvedValueOnce({
      ...post,
      id: 5,
      likes_count: 7,
      is_liked_by_me: true,
    });

    const { rerender } = render(<FeedPostDetailModule postId={5} />);
    await screen.findByTestId('feed-post-detail');
    expect(screen.getByTestId('feed-like-button')).toHaveTextContent('7');

    mockedGetPost.mockResolvedValueOnce({
      ...post,
      id: 9,
      likes_count: 0,
      is_liked_by_me: false,
    });
    rerender(<FeedPostDetailModule postId={9} />);

    await waitFor(() => {
      expect(screen.getByTestId('feed-like-button')).toHaveTextContent('0');
    });
  });

  it('redirects when the post is gone', async () => {
    mockedGetPost.mockRejectedValue({ response: { status: 404 } });

    render(<FeedPostDetailModule postId={5} />);

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/home');
    });
  });

  it('offers a retry on a transient error instead of redirecting', async () => {
    mockedGetPost.mockRejectedValueOnce({ response: { status: 500 } });

    render(<FeedPostDetailModule postId={5} />);

    const retry = await screen.findByRole('button', { name: 'Skúsiť znova' });
    expect(mockRouterPush).not.toHaveBeenCalled();

    mockedGetPost.mockResolvedValue(post);
    await userEvent.click(retry);

    expect(await screen.findByTestId('feed-post-detail')).toBeInTheDocument();
  });
});
