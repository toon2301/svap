import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCard from '../FeedPostCard';
import {
  createFeedPostComment,
  deleteFeedPostComment,
  likeFeedPost,
  listFeedPostComments,
  reportFeedPost,
  shareFeedPost,
  unlikeFeedPost,
  type FeedPost,
} from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  reportFeedPost: jest.fn(),
  shareFeedPost: jest.fn(),
}));

const toastError = jest.fn();
const toastSuccess = jest.fn();
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback, locale: 'sk' }),
}));

jest.mock('../../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: ({
    ariaLabel,
    onSelect,
  }: {
    ariaLabel: string;
    onSelect: (emoji: string) => void;
  }) => (
    <button type="button" aria-label={ariaLabel} onClick={() => onSelect('🙂')}>
      emoji
    </button>
  ),
}));

jest.mock('../../messages/GroupUserPicker', () => ({
  GroupUserPicker: ({
    onSelectedUsersChange,
  }: {
    onSelectedUsersChange?: (users: Array<{ id: number }>) => void;
  }) => (
    <button
      type="button"
      data-testid="mock-user-picker"
      onClick={() => onSelectedUsersChange?.([{ id: 77 }])}
    >
      pick
    </button>
  ),
}));

const mockRouterPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    article: ({ children, ...props }: React.ComponentProps<'article'>) => (
      <article {...props}>{children}</article>
    ),
  },
}));

const mockedLike = likeFeedPost as jest.MockedFunction<typeof likeFeedPost>;
const mockedUnlike = unlikeFeedPost as jest.MockedFunction<typeof unlikeFeedPost>;
const mockedListComments = listFeedPostComments as jest.MockedFunction<
  typeof listFeedPostComments
>;
const mockedCreateComment = createFeedPostComment as jest.MockedFunction<
  typeof createFeedPostComment
>;
const mockedDeleteComment = deleteFeedPostComment as jest.MockedFunction<
  typeof deleteFeedPostComment
>;
const mockedReport = reportFeedPost as jest.MockedFunction<typeof reportFeedPost>;
const mockedShare = shareFeedPost as jest.MockedFunction<typeof shareFeedPost>;

const author = {
  id: 10,
  display_name: 'Jana Nováková',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

function makePost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: 1,
    post_type: 'free_post',
    caption: 'Ahoj feed!',
    author,
    image: null,
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 2,
    comments_count: 1,
    is_liked_by_me: false,
    can_manage: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  // mockReset (nie clearAllMocks): clear nechá v mockoch implementácie
  // z predošlého testu, takže by si testy medzi sebou požičiavali odpovede.
  [
    mockedLike,
    mockedUnlike,
    mockedListComments,
    mockedCreateComment,
    mockedDeleteComment,
    mockedReport,
    mockedShare,
  ].forEach((mock) => mock.mockReset());
  toastError.mockReset();
  toastSuccess.mockReset();
  mockRouterPush.mockReset();
  mockedListComments.mockResolvedValue({ results: [], next: null, previous: null });
});

afterEach(() => {
  // Appka nemá globálne restoreMocks – spy na window.confirm by inak pretiekol
  // do ďalších testov a tie by potvrdzovali dialógy bez toho, aby o tom vedeli.
  jest.restoreAllMocks();
});

describe('FeedPostCard – lajk', () => {
  it('updates optimistically before the request resolves', async () => {
    let resolveLike: (value: unknown) => void = () => {};
    mockedLike.mockReturnValue(
      new Promise((resolve) => {
        resolveLike = resolve;
      }) as ReturnType<typeof likeFeedPost>,
    );

    render(<FeedPostCard post={makePost()} />);
    const button = screen.getByTestId('feed-like-button');

    await act(async () => {
      await userEvent.click(button);
    });

    // Počet vyskočil hneď, request ešte beží.
    expect(button).toHaveTextContent('3');

    await act(async () => {
      resolveLike({ post_id: 1, is_liked_by_me: true, likes_count: 3 });
    });
    expect(mockedLike).toHaveBeenCalledWith(1);
  });

  it('reverts the optimistic update when the request fails', async () => {
    mockedLike.mockRejectedValue(new Error('boom'));

    render(<FeedPostCard post={makePost()} />);
    const button = screen.getByTestId('feed-like-button');

    await act(async () => {
      await userEvent.click(button);
    });

    await waitFor(() => {
      expect(button).toHaveTextContent('2');
    });
    expect(toastError).toHaveBeenCalled();
  });

  it('unlikes an already liked post', async () => {
    mockedUnlike.mockResolvedValue({
      post_id: 1,
      is_liked_by_me: false,
      likes_count: 1,
    });

    render(<FeedPostCard post={makePost({ is_liked_by_me: true })} />);

    await act(async () => {
      await userEvent.click(screen.getByTestId('feed-like-button'));
    });

    expect(mockedUnlike).toHaveBeenCalledWith(1);
  });
});

describe('FeedPostCard – komentáre', () => {
  it('expands inline, lists comments and adds a new one', async () => {
    mockedListComments.mockResolvedValue({
      results: [
        {
          id: 5,
          text: 'Pekné!',
          author,
          can_delete: false,
          likes_count: 0,
          is_liked_by_me: false,
          created_at: new Date().toISOString(),
        },
      ],
      next: null,
      previous: null,
    });
    mockedCreateComment.mockResolvedValue({
      id: 6,
      text: 'Môj komentár',
      author,
      can_delete: true,
      likes_count: 0,
      is_liked_by_me: false,
      created_at: new Date().toISOString(),
    });

    render(<FeedPostCard post={makePost()} />);
    await userEvent.click(screen.getByTestId('feed-comments-button'));

    const section = await screen.findByTestId('feed-post-comments');
    expect(await within(section).findByText('Pekné!')).toBeInTheDocument();

    const textarea = within(section).getByRole('textbox');
    await userEvent.type(textarea, 'Môj komentár');
    await userEvent.click(within(section).getByRole('button', { name: 'Pridať' }));

    expect(mockedCreateComment).toHaveBeenCalledWith(1, 'Môj komentár');
    await waitFor(() => {
      expect(within(section).getByText('Môj komentár')).toBeInTheDocument();
    });
  });

  it('shows the delete action only when can_delete is true', async () => {
    mockedListComments.mockResolvedValue({
      results: [
        { id: 5, text: 'Cudzí', author, can_delete: false, likes_count: 0, is_liked_by_me: false, created_at: '2026-01-01' },
        { id: 6, text: 'Môj', author, can_delete: true, likes_count: 0, is_liked_by_me: false, created_at: '2026-01-01' },
      ],
      next: null,
      previous: null,
    });
    mockedDeleteComment.mockResolvedValue(undefined);

    render(<FeedPostCard post={makePost()} />);
    await userEvent.click(screen.getByTestId('feed-comments-button'));

    const section = await screen.findByTestId('feed-post-comments');
    await within(section).findByText('Cudzí');
    const deleteButtons = within(section).getAllByRole('button', {
      name: 'Zmazať komentár',
    });
    expect(deleteButtons).toHaveLength(1);

    await userEvent.click(deleteButtons[0]);

    // Natívny confirm nahradený appkovým dialógom (vzor DeleteMessageConfirmModal).
    const dialog = await screen.findByTestId('feed-comment-delete-confirm');
    await userEvent.click(
      within(dialog).getByTestId('feed-comment-delete-confirm-action'),
    );
    expect(mockedDeleteComment).toHaveBeenCalledWith(1, 6);
  });

  it('shows an empty-state message when there are no comments', async () => {
    render(<FeedPostCard post={makePost()} />);
    await userEvent.click(screen.getByTestId('feed-comments-button'));

    const section = await screen.findByTestId('feed-post-comments');
    expect(
      await within(section).findByTestId('feed-comments-empty'),
    ).toHaveTextContent('Zatiaľ žiadne komentáre.');
  });

  it('blocks submitting over the 500 character limit', async () => {
    render(<FeedPostCard post={makePost()} />);
    await userEvent.click(screen.getByTestId('feed-comments-button'));

    const section = await screen.findByTestId('feed-post-comments');
    const textarea = within(section).getByRole('textbox');
    await userEvent.click(textarea);
    await userEvent.paste('x'.repeat(501));

    expect(within(section).getByTestId('feed-comment-counter')).toHaveTextContent(
      '501/500',
    );
    expect(within(section).getByRole('button', { name: 'Pridať' })).toBeDisabled();
    expect(mockedCreateComment).not.toHaveBeenCalled();
  });
});

describe('FeedPostCard – nahlásenie', () => {
  async function openReport() {
    await act(async () => {
      await userEvent.click(screen.getByTestId('feed-post-menu-trigger'));
    });
    await act(async () => {
      await userEvent.click(screen.getByRole('menuitem'));
    });
    return screen.getByTestId('feed-report-modal');
  }

  it('closes the menu on Escape and returns focus to the trigger', async () => {
    render(<FeedPostCard post={makePost()} />);
    const trigger = screen.getByTestId('feed-post-menu-trigger');

    await userEvent.click(trigger);
    expect(screen.getByTestId('feed-post-menu')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByTestId('feed-post-menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('requires a description when the reason is "other"', async () => {
    render(<FeedPostCard post={makePost()} />);
    const modal = await openReport();

    await userEvent.click(within(modal).getByRole('radio', { name: 'Iné' }));

    const submit = within(modal).getByRole('button', { name: 'Odoslať' });
    expect(submit).toBeDisabled();
    expect(within(modal).getByText(/Popis\s*\*/)).toBeInTheDocument();

    await userEvent.type(within(modal).getByRole('textbox'), 'Podvod');
    expect(submit).toBeEnabled();
  });

  it('submits a report and confirms with a toast', async () => {
    mockedReport.mockResolvedValue(undefined);
    render(<FeedPostCard post={makePost()} />);

    const modal = await openReport();
    await act(async () => {
      await userEvent.click(within(modal).getByRole('button', { name: 'Odoslať' }));
    });

    // Stabilný kód, nie preložený text – moderačná fronta musí byť filtrovateľná.
    expect(mockedReport).toHaveBeenCalledWith(1, {
      reason: 'inappropriate',
      description: '',
    });
    expect(toastSuccess).toHaveBeenCalled();
  });

  it('surfaces a duplicate report as a toast, not a crash', async () => {
    mockedReport.mockRejectedValue({
      response: { data: { error: 'Tento prispevok si uz nahlasil.' } },
    });
    render(<FeedPostCard post={makePost()} />);

    const modal = await openReport();
    await act(async () => {
      await userEvent.click(within(modal).getByRole('button', { name: 'Odoslať' }));
    });

    expect(toastError).toHaveBeenCalledWith('Tento prispevok si uz nahlasil.');
    expect(screen.getByTestId('feed-post-card')).toBeInTheDocument();
  });
});

describe('FeedPostCard – zdieľanie ďalej', () => {
  it('prefills the preview and shares with a caption', async () => {
    mockedShare.mockResolvedValue(makePost({ id: 99 }));
    render(<FeedPostCard post={makePost()} />);

    await act(async () => {
      await userEvent.click(screen.getByTestId('feed-share-button'));
    });

    const modal = screen.getByTestId('feed-share-modal');
    const preview = within(modal).getByTestId('feed-share-preview');
    expect(within(preview).getByText('Jana Nováková')).toBeInTheDocument();
    expect(within(preview).getByText('Ahoj feed!')).toBeInTheDocument();

    await act(async () => {
      await userEvent.type(within(modal).getByRole('textbox'), 'Pozrite');
      await userEvent.click(within(modal).getByRole('button', { name: 'Zdieľať' }));
    });

    expect(mockedShare).toHaveBeenCalledWith(1, 'Pozrite', []);
  });

  it('sends selected tagged users with the share', async () => {
    mockedShare.mockResolvedValue(makePost({ id: 98 }));
    render(<FeedPostCard post={makePost()} />);

    await act(async () => {
      await userEvent.click(screen.getByTestId('feed-share-button'));
    });
    const modal = screen.getByTestId('feed-share-modal');

    await userEvent.type(within(modal).getByRole('textbox'), 'Pozrite');
    // Samostatné act-y: výber musí byť commitnutý skôr, než handler prečíta stav.
    await act(async () => {
      await userEvent.click(within(modal).getByTestId('mock-user-picker'));
    });
    await act(async () => {
      await userEvent.click(within(modal).getByRole('button', { name: 'Zdieľať' }));
    });

    expect(mockedShare).toHaveBeenCalledWith(1, 'Pozrite', [77]);
    expect(toastSuccess).toHaveBeenCalled();
  });

  it('shares with an empty caption when the user adds no comment', async () => {
    mockedShare.mockResolvedValue(makePost({ id: 100 }));
    render(<FeedPostCard post={makePost({ can_manage: true })} />);

    await act(async () => {
      await userEvent.click(screen.getByTestId('feed-share-button'));
    });
    const modal = screen.getByTestId('feed-share-modal');
    await act(async () => {
      await userEvent.click(within(modal).getByRole('button', { name: 'Zdieľať' }));
    });

    expect(mockedShare).toHaveBeenCalledWith(1, '', []);
  });
});

describe('FeedPostCard – kompaktný náhľad ponuky', () => {
  const offerPost = makePost({
    id: 11,
    post_type: 'shared_offer',
    shared_content: {
      type: 'offer',
      title: 'Programovanie',
      category: 'it-a-technologie',
      caption: '',
      id: 42,
      owner: { ...author, id: 30, display_name: 'Peter Malý', slug: 'peter' },
      owner_display_name: 'Peter Malý',
      thumbnail_url: null,
      is_seeking: false,
      price_negotiable: false,
      price_from: '25',
      price_currency: '€',
    },
  });

  it('shows type, title, owner and price in one compact row', () => {
    render(<FeedPostCard post={offerPost} />);

    const preview = screen.getByTestId('feed-shared-compact-preview');
    expect(within(preview).getByText('Ponúkam')).toBeInTheDocument();
    expect(within(preview).getByText('Programovanie')).toBeInTheDocument();
    expect(within(preview).getByText('Peter Malý')).toBeInTheDocument();
    expect(within(preview).getByText(/25/)).toBeInTheDocument();
  });

  it('renders the seeking label and negotiable price', () => {
    render(
      <FeedPostCard
        post={makePost({
          ...offerPost,
          shared_content: {
            ...offerPost.shared_content!,
            is_seeking: true,
            price_negotiable: true,
            price_from: null,
          },
        })}
      />,
    );

    const preview = screen.getByTestId('feed-shared-compact-preview');
    expect(within(preview).getByText('Hľadám')).toBeInTheDocument();
    expect(within(preview).getByText('Dohodou')).toBeInTheDocument();
  });

  it('routes a shared portfolio item to the portfolio detail, not an offer', async () => {
    const listener = jest.fn();
    window.addEventListener('goToUserProfile', listener);

    render(
      <FeedPostCard
        post={makePost({
          id: 12,
          post_type: 'shared_portfolio_item',
          shared_content: {
            ...offerPost.shared_content!,
            type: 'portfolio_item',
            title: 'Weby',
            id: 42,
            is_seeking: null,
            price_negotiable: null,
            price_from: null,
            price_currency: '',
          },
        })}
      />,
    );

    await userEvent.click(screen.getByTestId('feed-shared-compact-preview'));

    // Ponuky a portfólio majú nezávislé číslovanie – id 42 nesmie skončiť
    // ako offerId, inak by sa otvorila cudzia ponuka s rovnakým číslom.
    expect(listener).not.toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/users/peter/portfolio/42');
    window.removeEventListener('goToUserProfile', listener);
  });

  it('opens the source when the preview is clicked', async () => {
    const listener = jest.fn();
    window.addEventListener('goToUserProfile', listener);
    render(<FeedPostCard post={offerPost} />);

    await userEvent.click(screen.getByTestId('feed-shared-compact-preview'));

    expect(listener).toHaveBeenCalled();
    window.removeEventListener('goToUserProfile', listener);
  });
});

describe('FeedPostCard – self-share', () => {
  it('shows a single neutral header instead of repeating the author', () => {
    const selfShared = makePost({
      id: 8,
      post_type: 'shared_feed_post',
      shared_content: {
        type: 'feed_post',
        title: '',
        category: '',
        caption: 'Môj pôvodný text',
        id: 4,
        owner: author,
        owner_display_name: author.display_name,
        thumbnail_url: null,
      },
    });

    render(<FeedPostCard post={selfShared} />);

    expect(screen.getByText('Znovu zdieľané')).toBeInTheDocument();
    // Meno sa objaví raz (hlavička karty), nie druhýkrát vo vnorenom náhľade.
    expect(screen.getAllByText(author.display_name)).toHaveLength(1);
  });
});

describe('FeedPostCard – zdieľaný príspevok (feed_post)', () => {
  const sharedPost = makePost({
    id: 7,
    post_type: 'shared_feed_post',
    caption: 'Toto musíte vidieť',
    shared_content: {
      type: 'feed_post',
      title: '',
      category: '',
      caption: 'Pôvodný text príspevku',
      id: 3,
      owner: { ...author, id: 20, display_name: 'Peter Malý' },
      owner_display_name: 'Peter Malý',
      thumbnail_url: null,
    },
  });

  it('renders the mini-post preview instead of an empty title', async () => {
    render(<FeedPostCard post={sharedPost} />);

    const preview = screen.getByTestId('feed-shared-post-preview');
    expect(within(preview).getByText('Peter Malý')).toBeInTheDocument();
    expect(within(preview).getByText('Pôvodný text príspevku')).toBeInTheDocument();
    expect(
      screen.getByText('Jana Nováková zdieľa príspevok ďalej'),
    ).toBeInTheDocument();
  });

  it('shows the dedicated placeholder when the source is gone', async () => {
    render(
      <FeedPostCard
        post={makePost({
          ...sharedPost,
          shared_content_unavailable: true,
          shared_content: { ...sharedPost.shared_content!, id: null, owner: null },
        })}
      />,
    );

    expect(
      screen.getByText('Tento príspevok už nie je dostupný'),
    ).toBeInTheDocument();
  });
});
