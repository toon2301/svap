/**
 * Úprava vlastného príspevku – „..." menu, ľahký dialóg, označenie „(upravené)".
 *
 * Overuje sa: ponuka úpravy len pri vlastnom príspevku, uloženie textu bez
 * obnovenia feedu, označenie „(upravené)" LEN autorovi (backend pole nikomu
 * inému neposiela) a FE validácia prázdneho textu bez fotky.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCard from '../FeedPostCard';
import { updateFeedPost, type FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  updateFeedPost: jest.fn(),
  deleteFeedPostImage: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  deleteFeedPost: jest.fn(),
  reportFeedPost: jest.fn(),
  shareFeedPost: jest.fn(),
  getFeedPost: jest.fn(),
  removeOwnFeedPostTag: jest.fn(),
  listFeedPostLikers: jest.fn(),
  listFeedCommentLikers: jest.fn(),
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
  useLanguage: () => ({
    t: (_k: string, fallback: string) => fallback,
    locale: 'sk',
  }),
}));

const mockIsMobile = jest.fn(() => false);
jest.mock('@/hooks', () => ({
  useIsMobile: () => mockIsMobile(),
  useIsMobileState: () => ({ isMobile: mockIsMobile(), isResolved: true }),
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
  GroupUserPicker: () => <div />,
}));

jest.mock('@/lib/feedImageUpload', () => ({
  uploadFeedPostImages: jest.fn(),
  isAllowedFeedImageName: () => true,
  MAX_FEED_POST_IMAGES: 5,
  FEED_IMAGE_MAX_MB: 5,
  FEED_IMAGE_MAX_BYTES: 5 * 1024 * 1024,
  FEED_IMAGE_ACCEPT: '.jpg,.png',
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    article: ({ children, ...props }: React.ComponentProps<'article'>) => (
      <article {...props}>{children}</article>
    ),
  },
}));

const mockedUpdate = updateFeedPost as jest.MockedFunction<typeof updateFeedPost>;

const author = {
  id: 10,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

function makePost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: 1,
    post_type: 'free_post',
    caption: 'Povodny text',
    author,
    images: [],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 0,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: true,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as FeedPost;
}

async function openMenu() {
  await userEvent.click(screen.getByTestId('feed-post-menu-trigger'));
  return screen.getByTestId('feed-post-menu');
}

beforeEach(() => {
  mockedUpdate.mockReset();
  toastError.mockReset();
  toastSuccess.mockReset();
  mockIsMobile.mockReturnValue(false);
});

describe('ponuka úpravy', () => {
  it('offers Edit on my own post', async () => {
    render(<FeedPostCard post={makePost()} />);

    const menu = await openMenu();

    expect(within(menu).getByTestId('feed-post-edit')).toBeInTheDocument();
  });

  it('does not offer Edit on someone elses post', async () => {
    render(<FeedPostCard post={makePost({ can_manage: false })} />);

    const menu = await openMenu();

    // O práve rozhoduje backend cez `can_manage` – FE si ho neodvodzuje sám.
    expect(within(menu).queryByTestId('feed-post-edit')).not.toBeInTheDocument();
    expect(
      within(menu).queryByTestId('feed-post-delete'),
    ).not.toBeInTheDocument();
  });
});

describe('úprava textu', () => {
  it('saves the new caption and shows it without a reload', async () => {
    mockedUpdate.mockResolvedValue(
      makePost({ caption: 'Novy text', is_edited: true }),
    );
    render(<FeedPostCard post={makePost()} />);

    const menu = await openMenu();
    await userEvent.click(within(menu).getByTestId('feed-post-edit'));

    const input = await screen.findByTestId('feed-post-edit-input');
    // Dialóg sa otvára s pôvodným textom, nie prázdny.
    expect(input).toHaveValue('Povodny text');
    await userEvent.clear(input);
    await userEvent.type(input, 'Novy text');
    await userEvent.click(screen.getByTestId('feed-post-edit-submit'));

    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledWith(1, 'Novy text'));
    expect(await screen.findByText('Novy text')).toBeInTheDocument();
    expect(screen.queryByText('Povodny text')).not.toBeInTheDocument();
    // Dialóg sa po uložení zavrie.
    await waitFor(() =>
      expect(
        screen.queryByTestId('feed-post-edit-modal'),
      ).not.toBeInTheDocument(),
    );
  });

  it('keeps the original text when saving fails', async () => {
    mockedUpdate.mockRejectedValue(new Error('offline'));
    render(<FeedPostCard post={makePost()} />);

    const menu = await openMenu();
    await userEvent.click(within(menu).getByTestId('feed-post-edit'));
    const input = await screen.findByTestId('feed-post-edit-input');
    await userEvent.clear(input);
    await userEvent.type(input, 'Novy text');
    await userEvent.click(screen.getByTestId('feed-post-edit-submit'));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(screen.getByText('Povodny text')).toBeInTheDocument();
  });

  it('refuses to save an empty caption when the post has no photo', async () => {
    render(<FeedPostCard post={makePost()} />);

    const menu = await openMenu();
    await userEvent.click(within(menu).getByTestId('feed-post-edit'));
    await userEvent.clear(await screen.findByTestId('feed-post-edit-input'));

    // Rovnaké pravidlo ako na backende – FE ho vynúti, nech sa nechodí zbytočne.
    expect(screen.getByTestId('feed-post-edit-submit')).toBeDisabled();
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it('allows an empty caption when the post has a photo', async () => {
    mockedUpdate.mockResolvedValue(makePost({ caption: '', is_edited: true }));
    const withPhoto = makePost({
      images: [
        {
          id: 5,
          thumbnail_url: 'http://api.test/t.webp',
          large_url: 'http://api.test/l.webp',
        },
      ] as FeedPost['images'],
    });
    render(<FeedPostCard post={withPhoto} />);

    const menu = await openMenu();
    await userEvent.click(within(menu).getByTestId('feed-post-edit'));
    await userEvent.clear(await screen.findByTestId('feed-post-edit-input'));

    expect(screen.getByTestId('feed-post-edit-submit')).toBeEnabled();
    await userEvent.click(screen.getByTestId('feed-post-edit-submit'));
    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledWith(1, ''));
  });

  it('drops the emoji button on mobile, keeps it on desktop', async () => {
    const { unmount } = render(<FeedPostCard post={makePost()} />);
    let menu = await openMenu();
    await userEvent.click(within(menu).getByTestId('feed-post-edit'));
    await screen.findByTestId('feed-post-edit-modal');
    expect(screen.getByLabelText('Pridať emoji')).toBeInTheDocument();
    unmount();

    mockIsMobile.mockReturnValue(true);
    render(<FeedPostCard post={makePost()} />);
    menu = await openMenu();
    await userEvent.click(within(menu).getByTestId('feed-post-edit'));
    await screen.findByTestId('feed-post-edit-modal');
    expect(screen.queryByLabelText('Pridať emoji')).not.toBeInTheDocument();
  });
});

describe('označenie „(upravené)"', () => {
  it('shows the mark to the author', () => {
    render(<FeedPostCard post={makePost({ is_edited: true })} />);

    expect(screen.getByTestId('feed-post-edited')).toBeInTheDocument();
  });

  it('shows nothing to a viewer who is not the author', () => {
    // Cudziemu divákovi backend pole vôbec neposiela – v payloade chýba.
    const foreign = makePost({ can_manage: false });
    delete (foreign as Partial<FeedPost>).is_edited;

    render(<FeedPostCard post={foreign} />);

    expect(screen.queryByTestId('feed-post-edited')).not.toBeInTheDocument();
  });

  it('shows nothing on a post that was never edited', () => {
    render(<FeedPostCard post={makePost({ is_edited: false })} />);

    expect(screen.queryByTestId('feed-post-edited')).not.toBeInTheDocument();
  });

  it('shows photos from the edit right away, before the feed refreshes', async () => {
    const { getFeedPost } = jest.requireMock('@/lib/feedApi');
    const withPhoto = {
      ...makePost({ caption: 'Novy text' }),
      images: [
        {
          id: 5,
          thumbnail_url: 'http://api.test/t.webp',
          large_url: 'http://api.test/l.webp',
        },
      ],
    };
    (getFeedPost as jest.Mock).mockResolvedValue(withPhoto);
    mockedUpdate.mockResolvedValue(withPhoto);
    render(<FeedPostCard post={makePost()} />);
    expect(screen.queryByTestId('feed-post-image')).not.toBeInTheDocument();

    const menu = await openMenu();
    await userEvent.click(within(menu).getByTestId('feed-post-edit'));
    const input = await screen.findByTestId('feed-post-edit-input');
    await userEvent.clear(input);
    await userEvent.type(input, 'Novy text');
    await userEvent.click(screen.getByTestId('feed-post-edit-submit'));

    // Karta preberá zoznam fotiek z úpravy – nečaká na obnovenie feedu.
    expect(await screen.findByTestId('feed-post-image')).toBeInTheDocument();
  });

  it('reopens with the freshly saved text, not the stale feed prop', async () => {
    const { getFeedPost } = jest.requireMock('@/lib/feedApi');
    const afterTextEdit = makePost({ caption: 'Novy text', is_edited: true });
    mockedUpdate.mockResolvedValue(afterTextEdit);
    (getFeedPost as jest.Mock).mockResolvedValue(afterTextEdit);
    render(<FeedPostCard post={makePost({ caption: 'Povodny text' })} />);

    // Úprava A: zmena textu.
    let menu = await openMenu();
    await userEvent.click(within(menu).getByTestId('feed-post-edit'));
    let input = await screen.findByTestId('feed-post-edit-input');
    await userEvent.clear(input);
    await userEvent.type(input, 'Novy text');
    await userEvent.click(screen.getByTestId('feed-post-edit-submit'));
    await waitFor(() =>
      expect(
        screen.queryByTestId('feed-post-edit-modal'),
      ).not.toBeInTheDocument(),
    );

    // Úprava B: modal sa musí otvoriť s TEXTOM Z ÚPRAVY A, nie s propom
    // z feedu – inak by ho uloženie ticho prepísalo späť.
    menu = await openMenu();
    await userEvent.click(within(menu).getByTestId('feed-post-edit'));
    input = await screen.findByTestId('feed-post-edit-input');
    expect(input).toHaveValue('Novy text');
  });

  it('starts showing the mark right after a successful edit', async () => {
    mockedUpdate.mockResolvedValue(
      makePost({ caption: 'Novy text', is_edited: true }),
    );
    render(<FeedPostCard post={makePost({ is_edited: false })} />);

    const menu = await openMenu();
    await userEvent.click(within(menu).getByTestId('feed-post-edit'));
    const input = await screen.findByTestId('feed-post-edit-input');
    await userEvent.clear(input);
    await userEvent.type(input, 'Novy text');
    await userEvent.click(screen.getByTestId('feed-post-edit-submit'));

    expect(await screen.findByTestId('feed-post-edited')).toBeInTheDocument();
  });
});
