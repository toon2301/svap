/**
 * Odovzdanie výsledkov z vrstiev a dialógov karty (onDeleted, onShared, onPostUpdated) a ich zatváranie.
 *
 * Charakterizačné testy pred delením `FeedPostCard.tsx` (nález 333, dávka K48; vrstvy a dialógy sa presúvajú v kroku c).
 * Karta podáva rodičovi tri spätné volania a mobilnej obrazovke detailu aj mobilnému prehliadaču fotky ich prepošle
 * ďalej; úprava sa navyše vracia do karty. Existujúce testy to držia pre dialógy karty len čiastočne a pre mobilné
 * vrstvy takmer vôbec (zmazanie z mobilného detailu nemá test, prehliadač fotky tiež nie). Testy idú cez verejné
 * rozhranie karty (vlastnosti, DOM, `data-testid`), takže musia prejsť bez úpravy aj po každom kroku delenia.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCard from '../FeedPostCard';
import { resetFeedShareLanding } from '../feedShareLanding';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import {
  deleteFeedPost,
  reportFeedPost,
  shareFeedPost,
  updateFeedPost,
  type FeedPost,
} from '@/lib/feedApi';

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
  listFeedPostLikers: jest.fn(() =>
    Promise.resolve({ results: [], next: null, previous: null, count: 0 }),
  ),
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

let mockIsMobile = false;
jest.mock('@/hooks', () => ({
  useIsMobile: () => mockIsMobile,
  useIsMobileState: () => ({ isMobile: mockIsMobile, isResolved: true }),
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

jest.mock('framer-motion', () => ({
  motion: {
    article: ({ children, ...props }: React.ComponentProps<'article'>) => (
      <article {...props}>{children}</article>
    ),
  },
}));

const mockedDelete = deleteFeedPost as jest.MockedFunction<typeof deleteFeedPost>;
const mockedReport = reportFeedPost as jest.MockedFunction<typeof reportFeedPost>;
const mockedShare = shareFeedPost as jest.MockedFunction<typeof shareFeedPost>;
const mockedUpdate = updateFeedPost as jest.MockedFunction<typeof updateFeedPost>;

const photo = {
  id: 11,
  status: 'approved',
  thumbnail_url: 'http://api.test/11-t.webp',
  large_url: 'http://api.test/11-l.webp',
};

function makePost(overrides: Record<string, unknown> = {}): FeedPost {
  return {
    id: 7,
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
    likes_count: 2,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: true,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as unknown as FeedPost;
}

const created = () => makePost({ id: 99, caption: 'Zdieľaný príspevok', can_manage: true });
const updated = (overrides: Record<string, unknown> = {}) =>
  makePost({ caption: 'Novy text', is_edited: true, ...overrides });

async function submitEdit() {
  const input = await screen.findByTestId('feed-post-edit-input');
  await userEvent.clear(input);
  await userEvent.type(input, 'Novy text');
  await userEvent.click(screen.getByTestId('feed-post-edit-submit'));
  await waitFor(() =>
    expect(screen.queryByTestId('feed-post-edit-modal')).not.toBeInTheDocument(),
  );
}

async function submitShare() {
  const modal = await screen.findByTestId('feed-share-modal');
  await userEvent.click(within(modal).getByRole('button', { name: 'Zdieľať' }));
  await waitFor(() =>
    expect(screen.queryByTestId('feed-share-modal')).not.toBeInTheDocument(),
  );
}

async function openMobileDetail() {
  mockIsMobile = true;
  await userEvent.click(screen.getByTestId('feed-comments-button'));
  await screen.findByTestId('feed-mobile-detail');
}

async function openMobilePhotoViewer() {
  mockIsMobile = true;
  await userEvent.click(screen.getByTestId('feed-image-open-11'));
  await screen.findByTestId('feed-photo-viewer');
}

beforeEach(() => {
  jest.clearAllMocks();
  resetOverlayLayers();
  resetFeedShareLanding();
  mockIsMobile = false;
  document.body.innerHTML = '';
});

describe('mobilná obrazovka detailu odovzdá výsledky karte a rodičovi', () => {
  it('zmazanie z mobilnej obrazovky detailu zavolá onDeleted s id príspevku', async () => {
    mockedDelete.mockResolvedValue(undefined);
    const onDeleted = jest.fn();
    mockIsMobile = true;
    render(<FeedPostCard post={makePost()} onDeleted={onDeleted} />);
    await openMobileDetail();

    await userEvent.click(screen.getByTestId('feed-mobile-detail-menu-trigger'));
    await userEvent.click(await screen.findByTestId('feed-mobile-detail-delete'));
    await userEvent.click(await screen.findByTestId('feed-mobile-detail-delete-confirm-action'));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(onDeleted).toHaveBeenCalledWith(7);
    expect(mockedDelete).toHaveBeenCalledWith(7);
  });

  it('zdieľanie z mobilnej obrazovky detailu zavolá onShared s novým príspevkom', async () => {
    const newPost = created();
    mockedShare.mockResolvedValue(newPost);
    const onShared = jest.fn();
    mockIsMobile = true;
    render(<FeedPostCard post={makePost()} onShared={onShared} />);
    await openMobileDetail();

    await userEvent.click(screen.getByTestId('feed-mobile-detail-share'));
    await submitShare();

    expect(onShared).toHaveBeenCalledTimes(1);
    expect(onShared).toHaveBeenCalledWith(newPost);
  });

  it('úprava z mobilnej obrazovky detailu sa vráti aj do karty pod ňou', async () => {
    mockedUpdate.mockResolvedValue(updated());
    mockIsMobile = true;
    render(<FeedPostCard post={makePost()} />);
    await openMobileDetail();

    await userEvent.click(screen.getByTestId('feed-mobile-detail-menu-trigger'));
    await userEvent.click(await screen.findByTestId('feed-mobile-detail-edit'));
    await submitEdit();
    await userEvent.click(screen.getByTestId('feed-mobile-detail-close'));

    expect(screen.queryByTestId('feed-mobile-detail')).not.toBeInTheDocument();
    expect(screen.getByText('Novy text')).toBeInTheDocument();
    expect(screen.queryByText('Ahoj')).not.toBeInTheDocument();
  });
});

describe('mobilný prehliadač fotky odovzdá výsledky karte a rodičovi', () => {
  it('zmazanie z prehliadača fotky zavolá onDeleted s id príspevku', async () => {
    mockedDelete.mockResolvedValue(undefined);
    const onDeleted = jest.fn();
    mockIsMobile = true;
    render(<FeedPostCard post={makePost({ images: [photo] })} onDeleted={onDeleted} />);
    await openMobilePhotoViewer();

    await userEvent.click(screen.getByTestId('feed-photo-viewer-menu-trigger'));
    await userEvent.click(await screen.findByTestId('feed-photo-viewer-delete'));
    await userEvent.click(await screen.findByTestId('feed-photo-viewer-delete-confirm-action'));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(onDeleted).toHaveBeenCalledWith(7);
  });

  it('zdieľanie z prehliadača fotky zavolá onShared s novým príspevkom', async () => {
    const newPost = created();
    mockedShare.mockResolvedValue(newPost);
    const onShared = jest.fn();
    mockIsMobile = true;
    render(<FeedPostCard post={makePost({ images: [photo] })} onShared={onShared} />);
    await openMobilePhotoViewer();

    await userEvent.click(screen.getByTestId('feed-photo-viewer-share'));
    await submitShare();

    expect(onShared).toHaveBeenCalledTimes(1);
    expect(onShared).toHaveBeenCalledWith(newPost);
  });

  it('úprava z prehliadača fotky sa vráti aj do karty pod ním', async () => {
    // Upravený príspevok si fotku ponecháva, inak by sa prehliadač sám zatvoril.
    mockedUpdate.mockResolvedValue(updated({ images: [photo] }));
    mockIsMobile = true;
    render(<FeedPostCard post={makePost({ images: [photo] })} />);
    await openMobilePhotoViewer();

    await userEvent.click(screen.getByTestId('feed-photo-viewer-menu-trigger'));
    await userEvent.click(await screen.findByTestId('feed-photo-viewer-edit'));
    await submitEdit();
    await userEvent.click(screen.getByTestId('feed-photo-viewer-close'));

    expect(screen.queryByTestId('feed-photo-viewer')).not.toBeInTheDocument();
    expect(screen.getByText('Novy text')).toBeInTheDocument();
    expect(screen.queryByText('Ahoj')).not.toBeInTheDocument();
  });
});

describe('dialógy karty odovzdajú výsledky rodičovi a zatvoria sa', () => {
  it('úprava z dialógu karty zavolá onPostUpdated s novou verziou a karta ukáže nový text', async () => {
    const newVersion = updated();
    mockedUpdate.mockResolvedValue(newVersion);
    const onPostUpdated = jest.fn();
    render(<FeedPostCard post={makePost()} onPostUpdated={onPostUpdated} />);

    await userEvent.click(screen.getByTestId('feed-post-menu-trigger'));
    await userEvent.click(await screen.findByTestId('feed-post-edit'));
    await submitEdit();

    expect(onPostUpdated).toHaveBeenCalledTimes(1);
    expect(onPostUpdated).toHaveBeenCalledWith(newVersion);
    expect(screen.getByText('Novy text')).toBeInTheDocument();
  });

  it('zdieľanie z dialógu karty zavolá onShared s novým príspevkom a dialóg sa zatvorí', async () => {
    const newPost = created();
    mockedShare.mockResolvedValue(newPost);
    const onShared = jest.fn();
    render(<FeedPostCard post={makePost()} onShared={onShared} />);

    await userEvent.click(screen.getByTestId('feed-share-button'));
    await submitShare();

    expect(onShared).toHaveBeenCalledTimes(1);
    expect(onShared).toHaveBeenCalledWith(newPost);
    expect(screen.queryByTestId('feed-share-modal')).not.toBeInTheDocument();
  });

  it('zoznam lajkujúcich sa po stlačení Escape zatvorí', async () => {
    render(<FeedPostCard post={makePost()} />);

    await userEvent.click(screen.getByTestId('feed-like-count'));
    expect(await screen.findByTestId('feed-likers-dialog')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByTestId('feed-likers-dialog')).not.toBeInTheDocument(),
    );
  });

  it('po nahlásení sa okno nahlásenia zatvorí a karta ukazuje „Už nahlásené“', async () => {
    mockedReport.mockResolvedValue(undefined);
    render(<FeedPostCard post={makePost({ can_manage: false })} />);

    await userEvent.click(screen.getByTestId('feed-post-menu-trigger'));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Nahlásiť príspevok' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Odoslať' }));
    await waitFor(() =>
      expect(screen.queryByTestId('feed-report-modal')).not.toBeInTheDocument(),
    );

    await userEvent.click(screen.getByTestId('feed-post-menu-trigger'));
    expect(await screen.findByRole('menuitem', { name: 'Už nahlásené' })).toBeDisabled();
  });
});
