/**
 * Menu „…“ mobilnej obrazovky detailu: prepínanie, výber položky a stav po nahlásení.
 *
 * Charakterizačné testy pred delením `FeedPostMobileDetail.tsx` (nález 333, dávka K49; hlavička s menu sa presúva
 * v jednom z dvoch krokov delenia). Existujúce testy len overujú, že položky menu sú (alebo nie sú) prítomné; nik ich
 * neklikne, takže prepínanie spúšťača, zatvorenie menu po výbere položky, otvorenie správneho okna a stav „Už
 * nahlásené“ nestráži nič. Testy idú cez verejné rozhranie komponentu (`export default`, vlastnosti, DOM,
 * `data-testid`), takže musia prejsť bez úpravy aj po delení súboru.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostMobileDetail from '../FeedPostMobileDetail';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { reportFeedPost, type FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  getFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(() =>
    Promise.resolve({ results: [], next: null, previous: null, count: 0 }),
  ),
  listFeedCommentReplies: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  updateFeedPostComment: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  deleteFeedPost: jest.fn(),
  deleteFeedPostImage: jest.fn(),
  updateFeedPost: jest.fn(),
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
  useIsMobile: () => true,
  useIsMobileState: () => ({ isMobile: true, isResolved: true }),
}));

jest.mock('../../shared/useProtectedImage', () => ({
  useProtectedImage: (src: string | null) => ({
    resolvedSrc: src,
    isProtected: false,
    isLoading: false,
    isError: false,
  }),
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

const mockedReport = reportFeedPost as jest.MockedFunction<typeof reportFeedPost>;

function makePost(overrides: Record<string, unknown> = {}): FeedPost {
  return {
    id: 7,
    post_type: 'free_post',
    caption: 'Text príspevku',
    author: {
      id: 10,
      display_name: 'Jana Nováková',
      slug: 'jana',
      user_type: 'individual',
      avatar_url: null,
    },
    images: [],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 2,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: true,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as unknown as FeedPost;
}

async function renderDetail(post: FeedPost = makePost()) {
  const view = render(<FeedPostMobileDetail post={post} onClose={jest.fn()} />);
  await screen.findByTestId('feed-mobile-detail');
  return view;
}

const trigger = () => screen.getByTestId('feed-mobile-detail-menu-trigger');

async function openMenu() {
  await userEvent.click(trigger());
  return screen.findByTestId('feed-mobile-detail-menu');
}

beforeEach(() => {
  jest.clearAllMocks();
  resetOverlayLayers();
  document.body.innerHTML = '';
});

describe('menu „…“ mobilnej obrazovky detailu: prepínanie', () => {
  it('spúšťač menu prepína otvorenie a zatvorenie a aria-expanded sleduje stav', async () => {
    await renderDetail();
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('feed-mobile-detail-menu')).not.toBeInTheDocument();

    await userEvent.click(trigger());
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('feed-mobile-detail-menu')).toBeInTheDocument();

    await userEvent.click(trigger());
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('feed-mobile-detail-menu')).not.toBeInTheDocument();
  });

  it('cudzí príspevok má v menu len nahlásenie, vlastník aj úpravu a zmazanie', async () => {
    const foreign = await renderDetail(makePost({ can_manage: false }));
    await openMenu();
    expect(screen.getAllByRole('menuitem')).toHaveLength(1);
    expect(screen.getByTestId('feed-mobile-detail-report')).toBeInTheDocument();
    expect(screen.queryByTestId('feed-mobile-detail-edit')).not.toBeInTheDocument();
    expect(screen.queryByTestId('feed-mobile-detail-delete')).not.toBeInTheDocument();
    foreign.unmount();

    await renderDetail(makePost({ can_manage: true }));
    await openMenu();
    expect(screen.getAllByRole('menuitem')).toHaveLength(3);
    expect(screen.getByTestId('feed-mobile-detail-edit')).toBeInTheDocument();
    expect(screen.getByTestId('feed-mobile-detail-delete')).toBeInTheDocument();
  });
});

describe('menu „…“ mobilnej obrazovky detailu: výber položky', () => {
  it('voľba Nahlásiť zavrie menu a otvorí okno nahlásenia', async () => {
    await renderDetail();
    await openMenu();

    await userEvent.click(screen.getByTestId('feed-mobile-detail-report'));

    expect(await screen.findByTestId('feed-report-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('feed-mobile-detail-menu')).not.toBeInTheDocument();
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });

  it('voľba Upraviť zavrie menu a otvorí okno úpravy, nie potvrdenie zmazania', async () => {
    await renderDetail();
    await openMenu();

    await userEvent.click(screen.getByTestId('feed-mobile-detail-edit'));

    expect(await screen.findByTestId('feed-post-edit-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('feed-mobile-detail-menu')).not.toBeInTheDocument();
    expect(screen.queryByTestId('feed-mobile-detail-delete-confirm')).not.toBeInTheDocument();
  });

  it('voľba Zmazať zavrie menu a otvorí potvrdenie zmazania, nie okno úpravy', async () => {
    await renderDetail();
    await openMenu();

    await userEvent.click(screen.getByTestId('feed-mobile-detail-delete'));

    expect(await screen.findByTestId('feed-mobile-detail-delete-confirm')).toBeInTheDocument();
    expect(screen.queryByTestId('feed-mobile-detail-menu')).not.toBeInTheDocument();
    expect(screen.queryByTestId('feed-post-edit-modal')).not.toBeInTheDocument();
  });

  it('po nahlásení je v menu „Už nahlásené“ a položka je vypnutá', async () => {
    mockedReport.mockResolvedValue(undefined);
    await renderDetail(makePost({ can_manage: false }));
    await openMenu();
    expect(screen.getByTestId('feed-mobile-detail-report')).toBeEnabled();
    expect(screen.getByTestId('feed-mobile-detail-report')).toHaveTextContent('Nahlásiť príspevok');

    await userEvent.click(screen.getByTestId('feed-mobile-detail-report'));
    await userEvent.click(await screen.findByRole('button', { name: 'Odoslať' }));
    await waitFor(() =>
      expect(screen.queryByTestId('feed-report-modal')).not.toBeInTheDocument(),
    );
    expect(mockedReport).toHaveBeenCalledTimes(1);
    expect(mockedReport).toHaveBeenCalledWith(7, { reason: 'inappropriate', description: '' });

    await openMenu();
    expect(screen.getByTestId('feed-mobile-detail-report')).toBeDisabled();
    expect(screen.getByTestId('feed-mobile-detail-report')).toHaveTextContent('Už nahlásené');
  });
});
