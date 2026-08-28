/**
 * Karty na mobile od kraja po kraj – feed aj profilové taby.
 *
 * jsdom nevyhodnocuje CSS ani media queries, takže sa neoveruje odmeraná
 * šírka, ale to, čo o nej rozhoduje: zoznam kariet ruší vodorovný padding
 * obsahu (`-mx-4`) a od `sm:` ho vracia späť (`sm:mx-0`), zvislé rozostupy
 * ostávajú a vnútorný padding karty drží text ďalej od hrany displeja.
 */

import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedList from '../FeedList';
import ProfileFeedSection from '../../profile/ProfileFeedSection';
import { listFeedPosts, listUserFeedPosts, type FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  listFeedPosts: jest.fn(),
  listUserFeedPosts: jest.fn(),
  listUserTaggedFeedPosts: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  deleteFeedPost: jest.fn(),
  deleteFeedPostImage: jest.fn(),
  updateFeedPost: jest.fn(),
  getFeedPost: jest.fn(),
  reportFeedPost: jest.fn(),
  shareFeedPost: jest.fn(),
  removeOwnFeedPostTag: jest.fn(),
  listFeedPostLikers: jest.fn(),
  listFeedCommentLikers: jest.fn(),
  parseFeedPostId: () => null,
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

const mockIsMobile = jest.fn(() => true);
jest.mock('@/hooks', () => ({
  useIsMobile: () => mockIsMobile(),
  useIsMobileState: () => ({ isMobile: mockIsMobile(), isResolved: true }),
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
    div: ({ children, ...props }: React.ComponentProps<'div'>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockedFeed = listFeedPosts as jest.MockedFunction<typeof listFeedPosts>;
const mockedUserPosts = listUserFeedPosts as jest.MockedFunction<
  typeof listUserFeedPosts
>;

function makePost(id: number): FeedPost {
  return {
    id,
    post_type: 'free_post',
    caption: `Príspevok ${id}`,
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
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
  } as FeedPost;
}

/** Šírky bežných mobilov – rozloženie sa medzi nimi nesmie líšiť. */
const MOBILE_WIDTHS = [360, 390, 414];

beforeEach(() => {
  mockedFeed.mockReset();
  mockedUserPosts.mockReset();
  mockIsMobile.mockReturnValue(true);
  mockedFeed.mockResolvedValue({
    results: [makePost(1), makePost(2)],
    next: null,
    previous: null,
  });
  mockedUserPosts.mockResolvedValue({
    results: [makePost(3)],
    next: null,
    previous: null,
  });
});

describe.each(MOBILE_WIDTHS)('šírka %ipx', (width) => {
  beforeEach(() => {
    window.innerWidth = width;
  });

  it('lets the feed cards reach both edges', async () => {
    render(<FeedList />);

    const list = await screen.findByTestId('feed-list');
    // `-mx-4` ruší vodorovný padding obsahu (`px-4` na mobile), `sm:mx-0` ho
    // od desktopu vracia – rozloženie nad `sm` sa teda nemení.
    expect(list.className).toContain('-mx-4');
    expect(list.className).toContain('sm:mx-0');
    // Zvislé rozostupy medzi príspevkami ostávajú.
    expect(list.className).toContain('space-y-4');
  });

  it('keeps the card content padded away from the screen edge', async () => {
    render(<FeedList />);

    await screen.findByTestId('feed-list');
    const card = screen.getAllByTestId('feed-post-card')[0];
    const header = card.querySelector('header');
    const footer = card.querySelector('footer');

    // Karta ide po kraj, jej obsah nie – text zostáva čitateľný.
    expect(header?.className).toContain('px-4');
    expect(footer?.className).toContain('px-4');
  });

  it('applies the same width to the profile tab list', async () => {
    render(
      <ProfileFeedSection activeTab="posts" tab="posts" ownerUserId={10} />,
    );

    const list = await screen.findByTestId('profile-feed-list-posts');
    expect(list.className).toContain('-mx-4');
    expect(list.className).toContain('sm:mx-0');
    expect(list.className).toContain('space-y-4');
  });
});

it('uses the same full-bleed width while the feed is still loading', async () => {
  let release: ((value: unknown) => void) | null = null;
  mockedFeed.mockImplementation(
    () =>
      new Promise((resolve) => {
        release = resolve as (value: unknown) => void;
      }) as ReturnType<typeof listFeedPosts>,
  );

  render(<FeedList />);

  // Kostra má rovnakú šírku ako hotový zoznam – inak by obsah po načítaní
  // poskočil do strán.
  const skeleton = await screen.findByTestId('feed-initial-loading');
  expect(skeleton.className).toContain('-mx-4');
  expect(skeleton.className).toContain('sm:mx-0');

  release?.({ results: [makePost(1)], next: null, previous: null });
  await waitFor(() => expect(screen.getByTestId('feed-list')).toBeInTheDocument());
});
