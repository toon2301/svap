/**
 * Menu „…“ karty príspevku: fokus, prepínanie a zatváranie po výbere položky.
 *
 * Charakterizačné testy pred delením `FeedPostCard.tsx` (nález 333, dávka K48). Existujúce testy menu overujú polohu
 * a vykreslenie portálom; nestrážia, že po zatvorení klávesnicou sa fokus vráti na spúšťač aj vtedy, keď bol fokus
 * na položke menu, že spúšťač menu prepína, že po nahlásení je položka vypnutá a že každá položka menu po kliknutí
 * menu zavrie. Testy popisujú DNEŠNÉ správanie cez verejné rozhranie karty (vlastnosti, DOM, `data-testid`), takže
 * musia prejsť bez úpravy aj po každom kroku delenia.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCard from '../FeedPostCard';
import { reportFeedPost, type FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  updateFeedPost: jest.fn(),
  deleteFeedPostImage: jest.fn(),
  deleteFeedPost: jest.fn(),
  getFeedPost: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(),
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

const mockedReport = reportFeedPost as jest.MockedFunction<typeof reportFeedPost>;

function makePost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: 1,
    post_type: 'free_post',
    caption: 'Ahoj',
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
    ...overrides,
  } as FeedPost;
}

const trigger = () => screen.getByTestId('feed-post-menu-trigger');

async function openMenu() {
  await userEvent.click(trigger());
  return screen.findByTestId('feed-post-menu');
}

beforeEach(() => {
  jest.clearAllMocks();
  document.body.innerHTML = '';
});

describe('menu „…“ karty: fokus a prepínanie', () => {
  it('po zatvorení klávesom Escape ostane fokus na spúšťači, aj keď bol fokus na položke menu', async () => {
    render(<FeedPostCard post={makePost()} />);

    await openMenu();
    // Klávesnicová navigácia presunie fokus z spúšťača do menu; až potom ho zatvoríme.
    screen.getAllByRole('menuitem')[0].focus();
    expect(trigger()).not.toHaveFocus();

    await userEvent.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByTestId('feed-post-menu')).not.toBeInTheDocument(),
    );
    expect(trigger()).toHaveFocus();
  });

  it('druhý klik na spúšťač menu zavrie a aria-expanded sleduje stav', async () => {
    render(<FeedPostCard post={makePost()} />);
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(trigger());
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('feed-post-menu')).toBeInTheDocument();

    await userEvent.click(trigger());
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('feed-post-menu')).not.toBeInTheDocument();
  });
});

describe('menu „…“ karty: výber položky', () => {
  it('po nahlásení je v menu „Už nahlásené“ a položka je vypnutá', async () => {
    mockedReport.mockResolvedValue(undefined);
    render(<FeedPostCard post={makePost()} />);

    await openMenu();
    expect(screen.getByRole('menuitem', { name: 'Nahlásiť príspevok' })).toBeEnabled();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Nahlásiť príspevok' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Odoslať' }));
    await waitFor(() =>
      expect(screen.queryByTestId('feed-report-modal')).not.toBeInTheDocument(),
    );
    expect(mockedReport).toHaveBeenCalledTimes(1);

    await openMenu();
    const reportedItem = screen.getByRole('menuitem', { name: 'Už nahlásené' });
    expect(reportedItem).toBeDisabled();
    expect(
      screen.queryByRole('menuitem', { name: 'Nahlásiť príspevok' }),
    ).not.toBeInTheDocument();
  });

  it('klik na Nahlásiť zavrie menu a otvorí okno nahlásenia', async () => {
    render(<FeedPostCard post={makePost()} />);

    await openMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Nahlásiť príspevok' }));

    expect(await screen.findByTestId('feed-report-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('feed-post-menu')).not.toBeInTheDocument();
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });

  it('klik na Upraviť zavrie menu a otvorí okno úpravy', async () => {
    render(<FeedPostCard post={makePost({ can_manage: true })} />);

    await openMenu();
    await userEvent.click(screen.getByTestId('feed-post-edit'));

    expect(await screen.findByTestId('feed-post-edit-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('feed-post-menu')).not.toBeInTheDocument();
    expect(screen.queryByTestId('feed-report-modal')).not.toBeInTheDocument();
  });

  it('klik na Zmazať zavrie menu a otvorí potvrdenie zmazania, nie nahlásenie', async () => {
    render(<FeedPostCard post={makePost({ can_manage: true })} />);

    await openMenu();
    await userEvent.click(screen.getByTestId('feed-post-delete'));

    expect(await screen.findByTestId('feed-post-delete-confirm')).toBeInTheDocument();
    expect(screen.queryByTestId('feed-post-menu')).not.toBeInTheDocument();
    expect(screen.queryByTestId('feed-report-modal')).not.toBeInTheDocument();
  });
});
