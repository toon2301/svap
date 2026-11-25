/**
 * Prehliadač fotky: skrytá diagnostika viditeľnej plochy sa zapína dlhým podržaním nadpisu „Komentáre“ (nálezy 375 až 377,
 * kolo 3c).
 *
 * Predvolene prekryv s číslami neexistuje. Podržanie nadpisu na `FEED_LONG_PRESS_MS` ho zapne (vľavo, názov „panel“) a ďalšie
 * podržanie vypne; ťuknutie, krátke podržanie ani potiahnutie hlavičky nič nezapnú a hlavička sa ďalej dá potiahnuť nadol.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPhotoViewer from '../FeedPhotoViewer';
import { FEED_LONG_PRESS_MS } from '../useFeedLongPress';
import { readKeyboardDiagnosticsFlag, toggleKeyboardDiagnostics } from '../feedKeyboardDiagnostics';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { listFeedPostComments, type FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  getFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(),
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

const mockedList = listFeedPostComments as jest.MockedFunction<typeof listFeedPostComments>;

const autor = {
  id: 10,
  display_name: 'Jana Nováková',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

function prispevok(): FeedPost {
  return {
    id: 7,
    post_type: 'free_post',
    caption: 'Text príspevku',
    author: autor,
    images: [
      {
        id: 11,
        status: 'approved',
        thumbnail_url: 'http://api.test/11-t.webp',
        large_url: 'http://api.test/11-l.webp',
      },
    ],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 2,
    comments_count: 1,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
  } as unknown as FeedPost;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedList.mockReset();
  resetOverlayLayers();
  document.body.innerHTML = '';
  mockedList.mockResolvedValue({
    results: [
      {
        id: 100,
        text: 'Komentár 1',
        author: autor,
        can_delete: false,
        can_edit: false,
        likes_count: 0,
        is_liked_by_me: false,
        replies: [],
        replies_count: 0,
        created_at: '2026-01-01T11:00:00Z',
      },
    ],
    next: null,
    previous: null,
    count: 1,
  } as never);
});

afterEach(() => {
  jest.useRealTimers();
  if (readKeyboardDiagnosticsFlag()) toggleKeyboardDiagnostics();
  window.localStorage.clear();
});

async function otvorPanel() {
  render(<FeedPhotoViewer post={prispevok()} initialIndex={0} onClose={jest.fn()} />);
  await userEvent.click(await screen.findByTestId('feed-photo-viewer-comments'));
  await screen.findByText('Komentár 1');
  return screen.getByRole('heading', { name: 'Komentáre' });
}

const prst = (x: number, y: number) => ({ touches: [{ clientX: x, clientY: y }] });

describe('skrytá diagnostika v prehliadači fotky', () => {
  it('predvolene neexistuje', async () => {
    await otvorPanel();

    expect(screen.queryByTestId('feed-kbd-diagnostics')).not.toBeInTheDocument();
  });

  it('dlhé podržanie nadpisu „Komentáre“ ju zapne a ďalšie ju vypne', async () => {
    const nadpis = await otvorPanel();
    jest.useFakeTimers();

    fireEvent.touchStart(nadpis, prst(10, 10));
    act(() => jest.advanceTimersByTime(FEED_LONG_PRESS_MS));
    const blok = screen.getByTestId('feed-kbd-diagnostics');
    expect(blok).toHaveTextContent('KBD panel');
    expect(blok).toHaveClass('left-1');

    fireEvent.touchStart(nadpis, prst(10, 10));
    act(() => jest.advanceTimersByTime(FEED_LONG_PRESS_MS));
    expect(screen.queryByTestId('feed-kbd-diagnostics')).not.toBeInTheDocument();
  });

  it('prekryv meria vrstvu prehliadača fotky a panel komentárov', async () => {
    const nadpis = await otvorPanel();
    jest.useFakeTimers();

    fireEvent.touchStart(nadpis, prst(10, 10));
    act(() => jest.advanceTimersByTime(FEED_LONG_PRESS_MS));

    const blok = screen.getByTestId('feed-kbd-diagnostics');
    expect(blok).toHaveTextContent(/vrstva \d+ až \d+/);
    expect(blok).toHaveTextContent(/panel \d+ až \d+/);
  });

  it('krátke podržanie ani ťuknutie nič nezapne', async () => {
    const nadpis = await otvorPanel();
    jest.useFakeTimers();

    fireEvent.touchStart(nadpis, prst(10, 10));
    act(() => jest.advanceTimersByTime(FEED_LONG_PRESS_MS - 100));
    fireEvent.touchEnd(nadpis);
    act(() => jest.advanceTimersByTime(FEED_LONG_PRESS_MS));

    expect(screen.queryByTestId('feed-kbd-diagnostics')).not.toBeInTheDocument();
    expect(readKeyboardDiagnosticsFlag()).toBe(false);
  });

  it('potiahnutie hlavičky nadol panel zatvorí a diagnostiku nezapne', async () => {
    await otvorPanel();
    const hlavicka = screen.getByTestId('feed-photo-comments-drag');
    const nadpis = screen.getByRole('heading', { name: 'Komentáre' });

    fireEvent.touchStart(nadpis, prst(10, 100));
    fireEvent.touchMove(nadpis, prst(10, 260));
    fireEvent.touchEnd(hlavicka);

    await waitFor(() =>
      expect(screen.queryByTestId('feed-photo-comments-sheet')).not.toBeInTheDocument(),
    );
    expect(readKeyboardDiagnosticsFlag()).toBe(false);
  });
});
