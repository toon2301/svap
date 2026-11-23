/**
 * Okno zdieľania po úprave vlastného príspevku (oprava nálezu 355, dávka K56).
 *
 * Po úprave drží novú verziu príspevku v karte `currentPost`; náhľad v okne zdieľania z nej musí vychádzať, nie zo
 * starého príspevku z feedu (`post`), inak by pred odoslaním ukázal starý text. Obnova feedu po úprave prináša ešte
 * čerstvejšiu verziu, tá má prednosť pred lokálnou, takže okno ukáže text z feedu.
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
  deleteFeedPost: jest.fn(),
  getFeedPost: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(() =>
    Promise.resolve({ results: [], next: null, previous: null, count: 0 }),
  ),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  reportFeedPost: jest.fn(),
  shareFeedPost: jest.fn(),
  removeOwnFeedPostTag: jest.fn(),
  listFeedPostLikers: jest.fn(),
  listFeedCommentLikers: jest.fn(),
}));

jest.mock('@/lib/feedImageUpload', () => ({
  uploadFeedPostImages: jest.fn(),
  isAllowedFeedImageName: () => true,
  MAX_FEED_POST_IMAGES: 5,
  FEED_IMAGE_MAX_MB: 5,
  FEED_IMAGE_MAX_BYTES: 5 * 1024 * 1024,
  FEED_IMAGE_ACCEPT: '.jpg,.png',
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_k: string, fallback: string) => fallback,
    locale: 'sk',
  }),
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

jest.mock('../../messages/GroupUserPicker', () => ({
  GroupUserPicker: () => <div />,
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

function makePost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: 1,
    post_type: 'free_post',
    caption: 'Povodny text',
    author: {
      id: 10,
      display_name: 'Jana',
      slug: 'jana',
      user_type: 'individual',
      avatar_url: null,
    },
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

/** Upraví text vlastného príspevku cez menu „…“ a počká, kým sa nový text ukáže v karte. */
async function upravText(novyText: string) {
  await userEvent.click(screen.getByTestId('feed-post-menu-trigger'));
  await userEvent.click(within(screen.getByTestId('feed-post-menu')).getByTestId('feed-post-edit'));
  const input = await screen.findByTestId('feed-post-edit-input');
  await userEvent.clear(input);
  await userEvent.type(input, novyText);
  await userEvent.click(screen.getByTestId('feed-post-edit-submit'));
  await waitFor(() =>
    expect(screen.queryByTestId('feed-post-edit-modal')).not.toBeInTheDocument(),
  );
  expect(await screen.findByText(novyText)).toBeInTheDocument();
}

/** Otvorí okno zdieľania a vráti jeho náhľad. */
async function otvorNahladZdielania() {
  await userEvent.click(screen.getByTestId('feed-share-button'));
  const modal = await screen.findByTestId('feed-share-modal');
  return within(modal).getByTestId('feed-share-preview');
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('okno zdieľania po úprave príspevku', () => {
  it('ukáže v náhľade pôvodný text, kým sa príspevok neupraví', async () => {
    render(<FeedPostCard post={makePost()} />);

    const preview = await otvorNahladZdielania();

    expect(within(preview).getByText('Povodny text')).toBeInTheDocument();
  });

  it('ukáže v náhľade text po úprave, nie starý text z feedu', async () => {
    mockedUpdate.mockResolvedValue(makePost({ caption: 'Novy text', is_edited: true }));
    render(<FeedPostCard post={makePost()} />);

    await upravText('Novy text');
    const preview = await otvorNahladZdielania();

    expect(within(preview).getByText('Novy text')).toBeInTheDocument();
    expect(within(preview).queryByText('Povodny text')).not.toBeInTheDocument();
  });

  it('po obnove feedu s čerstvejším textom ukáže v náhľade text z feedu', async () => {
    mockedUpdate.mockResolvedValue(makePost({ caption: 'Novy text', is_edited: true }));
    const { rerender } = render(<FeedPostCard post={makePost()} />);
    await upravText('Novy text');

    // Obnova feedu prinesie ešte novšiu verziu (upravil ju niekto iný alebo iné zariadenie): má prednosť.
    rerender(<FeedPostCard post={makePost({ caption: 'Text z feedu', is_edited: true })} />);
    expect(await screen.findByText('Text z feedu')).toBeInTheDocument();
    const preview = await otvorNahladZdielania();

    expect(within(preview).getByText('Text z feedu')).toBeInTheDocument();
    expect(within(preview).queryByText('Novy text')).not.toBeInTheDocument();
  });
});
